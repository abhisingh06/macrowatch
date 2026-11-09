import json
from datetime import date
from pathlib import Path
import anthropic

DATA = Path("data")
prices = json.loads((DATA / "latest.json").read_text())
rates = json.loads((DATA / "rates.json").read_text())
headlines = json.loads((DATA / "headlines.json").read_text())

# Full articles from official sources (optional: skip if the file isn't there)
deep_path = DATA / "deep.json"
deep = json.loads(deep_path.read_text()) if deep_path.exists() else []

# Storylines from earlier debriefs, so today's headlines connect to the bigger story
story_path = DATA / "storylines.json"
past_stories = json.loads(story_path.read_text()) if story_path.exists() else []

if not prices["board"]:
    raise SystemExit("No prices in data/latest.json. Run fetch_prices.py first.")

# Turn the data into plain text Claude can read (note the f before each string)
tape = "\n".join(f"{b['label']}: {b['value']} ({b['change']:+} {b['unit']})" for b in prices["board"])
t = rates["treasuries"]
bank_lines = "\n".join(f"{b['code']} ({b['bank']}): {b['rate']}%" for b in rates["banks"])
# Number each headline (with its summary) so Claude can point to one without retyping its link
numbered = "\n".join(
    f"[{i}] ({h['source']}, {h['category']}, {h.get('published', '')[:10] or 'no date'}) {h['title']} | {h.get('summary', '')}"
    for i, h in enumerate(headlines)
)

deep_text = "\n\n".join(
    f"[D{i}] {d['source']}: {d['title']}\n{d['text']}" for i, d in enumerate(deep)
) or "None today."

past_text = "\n".join(
    f"- {p['name']} (running since {p['first_seen']}): {p['backstory']} Latest: {p['today']}"
    for p in past_stories
) or "None yet. This is the first debrief."

# The "system" prompt sets the rules Claude follows every time
STYLE = """You write MacroWatch, an in-depth end-of-day macro debrief for a college sophomore preparing for sales and trading.
Rules:
- Plain, college-student language. No em dashes.
- Define any jargon in a few words in [brackets] right after it.
- Stay at the macro level: connect moves across stocks, rates, FX, commodities, credit and central banks. Skip small single-stock moves unless they say something about the whole market.
- Dig through ALL the headlines, especially central bank items and smaller stories. Find things most people would miss that could move rates, currencies or credit, and explain the chain of cause and effect step by step.
- Treat headlines as chapters of bigger ongoing storylines (for example: a war pushing up oil, which pushes up inflation, which pushes central banks to hike). For every important headline, explain the story behind it: how we got here, what today added, and where it leads.
- When an ongoing storyline from earlier debriefs continues, reuse its exact name.
- Use the FULL ARTICLES for depth. Explain their ideas in your own words; quote at most a short phrase.
- Use each headline's date. Build the debrief around the most recent news and ignore stale stories.
- Use ONLY the numbers and headlines provided. Never invent figures, dates or quotes.
- If the headlines don't explain a move, say the cause is unclear."""

FORMAT = """Return ONLY a JSON object (no other text) with exactly these keys:
"headline": the day in under 12 words,
"mood": "risk-on", "risk-off" or "mixed",
"summary": 4 to 5 sentences on what happened and why,
"one_thing": the single most important takeaway, 1 to 2 sentences,
"cross_asset": {"stocks": ..., "rates": ..., "fx": ..., "commodities": ...}, each 2 to 3 sentences on how that market reacted and why,
"storylines": 3 to 5 objects, one per big ongoing narrative driving markets, each {"name": short and stable like "Iran war and oil", "status": "new", "developing" or "fading", "backstory": 2 to 3 sentences on how we got here, "today": what today's headlines and articles added, "headline_ids": numbers of the headlines that belong to this story, "doc_ids": D numbers of related full articles as plain integers, "market_link": step by step how this story moves markets, "next_chapter": what would push the story forward next, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)},
"stories": 5 to 7 objects, each {"tag": short theme like "Oil -> inflation", "title": ..., "what": what happened, "why": why it matters for the bigger picture, "watch": what to watch next},
"under_the_radar": 3 to 4 objects, each {"title": ..., "what": the smaller story, "chain": step by step how it could reach the big markets, "watch": the signal that would show it's becoming important, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)},
"deep_dive": 1 to 2 objects, each {"doc": the D number as a plain integer, "why_now": why this piece matters this week, "key_points": 3 to 5 plain sentences, "market_angle": which markets it could move and in which direction, "trade_idea": one trade a desk might consider and its main risk, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)}. Use an empty list if no full articles were provided,
"watch_next": 3 to 5 objects, each {"when": ..., "event": ..., "why": ...}, using only events named in the headlines,
"terms": 5 to 8 objects, each {"term": ..., "def": one plain sentence with a simple analogy},
"quiz": 5 objects, each {"q": question, "options": [4 answers], "answer": index 0-3 of the right one, "explain": 1 to 2 sentences},
"market_map": a cause-and-effect map of today centered on the main storyline, {"nodes": 6 to 10 objects, each {"id": short lowercase id like "oil", "label": short name like "Oil", "kind": "market" for something that trades or "driver" for an idea like "Inflation expectations" or "Fed hike odds", "board_label": the exact label from THE TAPE if this node is on it, otherwise null}, "edges": 6 to 12 objects, each {"from": node id, "to": node id, "effect": "pushes up" or "pushes down", "why": one plain sentence explaining the link today}},
"cross_asset_notes": 2 to 4 short lines to write down about the day's key levels and moves across markets, each with why it matters,
"take": one open question asking the reader to make and defend a trade call on the single most important theme of the day (the same theme as "one_thing" and the top storyline). Pick whatever market best expresses that theme (stocks, Treasuries, the dollar, a currency pair, oil, gold or credit), never default to the same market every day, and ask what would prove them wrong,
"read_ids": the numbers of the 4 headlines most worth reading in full."""

prompt = f"""Closing data for {prices['date']}:

THE TAPE
{tape}

ONGOING STORYLINES FROM EARLIER DEBRIEFS
{past_text}

TREASURIES: 2Y {t['2Y']}%, 10Y {t['10Y']}%, curve (10Y minus 2Y) {t['curve_bp']:+} bp

CENTRAL BANK RATES
{bank_lines}

HEADLINES (number, source, category, date, title | summary)
{numbered}

FULL ARTICLES (official sources, D number, source, title, text)
{deep_text}

{FORMAT}"""

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    system=STYLE,
    messages=[{"role": "user", "content": prompt}],
)

# Claude may send a "thinking" block first, so find the block that holds the actual answer
text = next((b.text for b in response.content if b.type == "text"), "")
(DATA / "debrief_raw.txt").write_text(text)      # keep the raw answer for troubleshooting

if response.stop_reason == "max_tokens":
    raise SystemExit("Claude ran out of room before finishing. Raise max_tokens.")

start, end = text.find("{"), text.rfind("}")    # find where the JSON begins and ends
if start == -1 or end == -1:
    raise SystemExit("No JSON in Claude's answer. Open data/debrief_raw.txt to see what it wrote.")
debrief = json.loads(text[start:end + 1])

# Swap the headline numbers for the real titles and links from YOUR data
debrief["reads"] = [
    {"title": headlines[i]["title"], "source": headlines[i]["source"], "url": headlines[i]["link"]}
    for i in debrief.pop("read_ids", []) if 0 <= i < len(headlines)
]
# Swap each deep dive's D number for the real title, source and link
for dd in debrief.get("deep_dive", []):
    i = dd.pop("doc", None)
    if isinstance(i, int) and 0 <= i < len(deep):
        dd.update({"title": deep[i]["title"], "source": deep[i]["source"], "url": deep[i]["link"]})

# Attach real headlines and articles to each storyline, and track how long it has run
first_seen = {p["name"]: p["first_seen"] for p in past_stories}
for st in debrief.get("storylines", []):
    st["headlines"] = [
        {"title": headlines[i]["title"], "source": headlines[i]["source"], "url": headlines[i]["link"]}
        for i in st.pop("headline_ids", []) if isinstance(i, int) and 0 <= i < len(headlines)
    ]
    st["articles"] = [
        {"title": deep[i]["title"], "source": deep[i]["source"], "url": deep[i]["link"]}
        for i in st.pop("doc_ids", []) if isinstance(i, int) and 0 <= i < len(deep)
    ]
    st["first_seen"] = first_seen.get(st["name"], prices["date"])

# Save storyline memory for tomorrow: today's stories, plus older ones seen in the last 14 days
today_names = {st["name"] for st in debrief.get("storylines", [])}
memory = [
    {"name": st["name"], "backstory": st["backstory"], "today": st["today"],
     "first_seen": st["first_seen"], "last_seen": prices["date"]}
    for st in debrief.get("storylines", [])
]
for p in past_stories:
    recent = (date.fromisoformat(prices["date"]) - date.fromisoformat(p["last_seen"])).days <= 14
    if p["name"] not in today_names and recent:
        memory.append(p)
story_path.write_text(json.dumps(memory, indent=2))

# Give each market-map bubble its real move from the tape (numbers never come from the AI)
board_by_label = {row["label"]: row for row in prices["board"]}
for node in (debrief.get("market_map") or {}).get("nodes", []):
    row = board_by_label.get(node.get("board_label"))
    if row:
        node.update({"value": row["value"], "change": row["change"], "unit": row["unit"], "dir": row["dir"]})

debrief["date"] = prices["date"]
debrief["board"] = prices["board"]               # numbers straight from Yahoo, never from the AI

output = json.dumps(debrief, indent=2)
(DATA / "debrief_latest.json").write_text(output)
(DATA / f"debrief_{prices['date']}.json").write_text(output)

print(debrief["headline"])
print(debrief["summary"])
print("Tokens:", response.usage.input_tokens, "in,", response.usage.output_tokens, "out")
print("Saved data/debrief_latest.json")
