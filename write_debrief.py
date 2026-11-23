import json
import random
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
STYLE = """You write MacroWatch, an in-depth end-of-day macro debrief for a college student who is new to markets and preparing for sales and trading.
Rules:
- Write for a smart beginner: someone who knows nothing about markets yet but wants the same depth a pro would get. Keep the analysis deep; make the words simple.
- Short sentences, everyday words, one idea per sentence. No em dashes.
- Mark every market term the first time it appears in a paragraph by wrapping it in double square brackets, like [[10-year yield]] or [[basis point]], even common ones like yield or risk-off. Never assume the reader already knows a term. Do NOT write the definition in the text; the app shows it when the reader taps the term, using the "glossary".
- Never use [[ ]] in headlines, titles, labels, quiz options or quiz order items.
- Explain why each move matters to a normal person or business when you can (mortgages, gas prices, jobs, savings), then connect it to the bigger picture.
- Use a quick everyday analogy for any idea that is hard to picture (for example: a bond yield is like the interest rate on a loan to the government).
- Spell out every cause-and-effect chain one step at a time with arrows or "which means", never skipping a step a beginner would need.
- Prefer exact numbers over vague words, and say what a number means ("2 basis points, which is a tiny move").
- Stay at the macro level: connect moves across stocks, rates, FX, commodities, credit and central banks. Skip small single-stock moves unless they say something about the whole market.
- Dig through ALL the headlines, especially central bank items and smaller stories. Find things most people would miss that could move rates, currencies or credit, and explain the chain of cause and effect step by step.
- Treat headlines as chapters of bigger ongoing storylines (for example: a war pushing up oil, which pushes up inflation, which pushes central banks to hike). For every important headline, explain the story behind it: how we got here, what today added, and where it leads.
- When an ongoing storyline from earlier debriefs continues, reuse its exact name.
- Use the FULL ARTICLES for depth. Explain their ideas in your own words; quote at most a short phrase.
- Use each headline's date. Build the debrief around the most recent news and ignore stale stories.
- Use ONLY the numbers and headlines provided. Never invent figures, dates or quotes.
- If the headlines don't explain a move, say the cause is unclear."""

FORMAT_MAIN = """Return ONLY a JSON object (no other text) with exactly these keys:
"headline": the day in under 12 words,
"mood": "risk-on", "risk-off" or "mixed",
"summary": 4 to 5 sentences on what happened and why,
"one_thing": the single most important takeaway, 1 to 2 sentences,
"cross_asset": {"stocks": ..., "rates": ..., "fx": ..., "commodities": ...}, each 2 to 3 sentences on how that market reacted and why,
"storylines": 3 to 4 objects, one per big ongoing narrative driving markets, each {"name": short and stable like "Iran war and oil", "status": "new", "developing" or "fading", "backstory": 2 to 3 sentences on how we got here, "today": what today's headlines and articles added, "headline_ids": numbers of the headlines that belong to this story, "doc_ids": D numbers of related full articles as plain integers, "market_link": step by step how this story moves markets, "next_chapter": what would push the story forward next, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)},
"stories": 4 to 5 objects, each {"tag": short theme like "Oil -> inflation", "title": ..., "what": what happened, "why": why it matters for the bigger picture, "watch": what to watch next},
"under_the_radar": 2 to 3 objects, each {"title": ..., "what": the smaller story, "chain": step by step how it could reach the big markets, "watch": the signal that would show it's becoming important, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)},
"deep_dive": 1 to 2 objects, each {"doc": the D number as a plain integer, "why_now": why this piece matters this week, "key_points": 3 to 5 plain sentences, "market_angle": which markets it could move and in which direction, "trade_idea": one trade a desk might consider and its main risk, "note": 1 to 3 short lines the reader should write in their notebook from this section (key numbers, the cause and effect, one sentence they could say in an interview)}. Use an empty list if no full articles were provided,
"watch_next": 3 to 5 objects, each {"when": ..., "event": ..., "why": ...}, using only events named in the headlines,
"terms": 4 to 6 objects, each {"term": ..., "def": one plain sentence with a simple analogy},
"cross_asset_notes": 2 to 4 short lines to write down about the day's key levels and moves across markets, each with why it matters,
"take": one open question asking the reader to make and defend a trade call on the single most important theme of the day (the same theme as "one_thing" and the top storyline). Pick whatever market best expresses that theme (stocks, Treasuries, the dollar, a currency pair, oil, gold or credit), never default to the same market every day, and ask what would prove them wrong,
"read_ids": the numbers of the 4 headlines most worth reading in full."""

FORMAT_STUDY = """Return ONLY a JSON object (no other text) with exactly these keys:
"glossary": an object whose keys are EXACTLY the terms listed under TERMS TO DEFINE (same spelling), each value {"def": one or two plain sentences a beginner understands, "analogy": a short everyday comparison, "today": one sentence on what this term did or meant in today's market},
"market_chains": 2 to 3 objects, one per cause-and-effect chain behind today's biggest moves, each {"title": one or two words like "Rates" or "Oil", "steps": 3 to 5 objects in cause-to-effect order, each {"label": short name like "Fed hike odds rise", "explain": one plain sentence a beginner understands, "detail": 2 to 3 sentences going deeper, "icon": one of "news", "bank", "oil", "chart_up", "chart_down", "dollar", "gold", "jobs", "inflation", "globe", "chip", "house", "direction": "up", "down" or null, "board_label": the exact label from THE TAPE if this step is a market on it, otherwise null}, "links": the short connecting phrase between each pair of steps, like "which means", "so" or "and then" (one fewer than the number of steps)},
"quiz": 16 objects mixing question types and topics, each {"type": "mc", "tf", "updown" or "order", "topic": one of "stocks", "rates", "fx", "commodities", "central_banks", "terms", "storylines", "map", "q": the question, "options": for "mc" exactly 4 answers, for "tf" ["True", "False"], for "updown" ["Up", "Down"], for "order" an empty list, "answer": index of the right option (use 0 for "order"), "items": for "order" only, 3 to 4 short steps listed in the CORRECT cause-to-effect order (otherwise an empty list), "explain": 1 to 2 plain sentences on why}. Include at least 3 "updown", 2 "order" and 3 "tf" questions, and cover at least 6 different topics. "updown" questions ask what a market would probably do if something happened. Follow the QUIZ RULES below."""

QUIZ_RULES = """QUIZ RULES (the quiz should feel like a sharp interviewer testing whether you understood TODAY, not a vocabulary test):
- Every question must be about today's actual moves, numbers, causes or storylines. Use the real figures from THE TAPE and the headlines (for example: "The 10-year yield rose 6 bp while the Nasdaq fell 2.5%. What best explains why tech fell more than the Dow?").
- Test reasoning, not memory: ask why something moved, what it means for another market, what would happen next, or which explanation fits the numbers. At most 2 questions may be pure definitions.
- Make it challenging: a beginner who skimmed the debrief should get about half right; one who read it carefully should get most right.
- Wrong answers must be believable. Each one should be a real mistake a beginner would make (mixing up cause and effect, getting the direction backwards, blaming the wrong event from today's headlines, confusing rates with prices).
- All four answers must be the SAME length (within a few words), the same grammar and the same level of detail. The right answer must never be the longest, the most specific, or the only one with a number or a hedge word like "usually" or "likely".
- Never use "all of the above", "none of the above", jokes or obviously silly answers.
- "tf" statements should be tricky: about half should be false, and a false one should be wrong in one specific detail (the direction, the number, or the cause), not wildly wrong.
- "updown" questions should include cases where the obvious guess is wrong, and the explanation should say why.
- "order" chains should come from today's actual cause-and-effect, with steps a beginner could plausibly mix up.
- The reading test: every question must need TODAY'S DEBRIEF to answer. Tie it to a specific detail the debrief gave (a named storyline, a number from the tape, a cause, a deep dive point, an under-the-radar story). If a finance student could answer it from general knowledge or common sense alone, rewrite it.
- No giveaways: the question must not repeat or hint at words from the right answer, and the right answer must not be the only one that "sounds smart", sounds balanced, or matches the question's tone.
- Before finishing, check every multiple-choice question: if one answer stands out by length, detail, numbers or wording, rewrite the other three to match it. If the right answer could be guessed without reading, replace the question."""

DATA_BLOCK = f"""Closing data for {prices['date']}:

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
{deep_text}"""

client = anthropic.Anthropic()
used = {"in": 0, "out": 0}


def ask(task, name):
    """Send one request to Claude and return its JSON answer as a dictionary."""
    # Stream the answer: long answers take a while, and streaming keeps the connection alive
    with client.messages.stream(
        model="claude-sonnet-5-5",
        max_tokens=32000,
        system=STYLE,
        messages=[{"role": "user", "content": f"{DATA_BLOCK}\n\n{task}"}],
    ) as stream:
        response = stream.get_final_message()
    used["in"] += response.usage.input_tokens
    used["out"] += response.usage.output_tokens

    # Claude may send a "thinking" block first, so find the block that holds the actual answer
    text = next((b.text for b in response.content if b.type == "text"), "")
    (DATA / f"debrief_raw_{name}.txt").write_text(text)     # keep the raw answer for troubleshooting
    if response.stop_reason == "max_tokens":
        raise SystemExit(f"Claude ran out of room in the {name} part. Raise max_tokens.")
    start, end = text.find("{"), text.rfind("}")           # find where the JSON begins and ends
    if start == -1 or end == -1:
        raise SystemExit(f"No JSON in the {name} part. Open data/debrief_raw_{name}.txt to see what it wrote.")
    return json.loads(text[start:end + 1])


# Part 1: the debrief itself
debrief = ask(FORMAT_MAIN, "main")

# Part 2: glossary, Market Map chains and quiz, built on top of part 1
import re
marked = sorted({m for m in re.findall(r"\[\[([^\]]+)\]\]", json.dumps(debrief))})
study = ask(
    "TODAY'S DEBRIEF (already written, build on it and stay consistent with it)\n"
    + json.dumps({k: v for k, v in debrief.items() if k != "read_ids"})
    + "\n\nTERMS TO DEFINE\n" + ("\n".join(marked) or "(none)")
    + f"\n\n{FORMAT_STUDY}\n\n{QUIZ_RULES}",
    "study",
)
debrief.update({k: study.get(k) for k in ("glossary", "market_chains", "quiz") if study.get(k) is not None})

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
for chain in debrief.get("market_chains", []):
    for step in chain.get("steps", []):
        row = board_by_label.get(step.get("board_label"))
        if row:
            step.update({"value": row["value"], "change": row["change"], "unit": row["unit"], "dir": row["dir"]})

# Keep only quiz questions the app can show, and fix their answer choices
clean_quiz = []
for q in debrief.get("quiz", []):
    kind = q.get("type", "mc")
    if kind == "tf":
        q["options"] = ["True", "False"]
    elif kind == "updown":
        q["options"] = ["Up", "Down"]
    if kind == "order":
        if len(q.get("items", [])) >= 3:
            clean_quiz.append(q)
    elif isinstance(q.get("answer"), int) and 0 <= q["answer"] < len(q.get("options", [])):
        if kind == "mc":
            right = q["options"][q["answer"]]
            random.shuffle(q["options"])             # put the right answer in a random spot
            q["answer"] = q["options"].index(right)
        clean_quiz.append(q)
debrief["quiz"] = clean_quiz

debrief["date"] = prices["date"]
debrief["board"] = prices["board"]               # numbers straight from Yahoo, never from the AI

output = json.dumps(debrief, indent=2)
(DATA / "debrief_latest.json").write_text(output)
(DATA / f"debrief_{prices['date']}.json").write_text(output)

# Add today's questions to a rolling bank of the last 10 debriefs for "This week" practice
bank_path = DATA / "quiz_bank.json"
bank = json.loads(bank_path.read_text()) if bank_path.exists() else []
bank = [q for q in bank if q.get("date") != prices["date"]] + [dict(q, date=prices["date"]) for q in clean_quiz]
keep_dates = sorted({q["date"] for q in bank})[-10:]
bank = [q for q in bank if q["date"] in keep_dates]
bank_path.write_text(json.dumps(bank, indent=2))

print(debrief["headline"])
print(debrief["summary"])
print("Tokens:", used["in"], "in,", used["out"], "out")
print("Saved data/debrief_latest.json")
