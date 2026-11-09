"""Read today's MacroWatch debrief in the terminal until the app is built.

python view_debrief.py           full debrief, then quiz and your take
python view_debrief.py --notes   same, plus what to write down after each important section
"""
import json
import sys
import textwrap
from pathlib import Path

d = json.loads(Path("data/debrief_latest.json").read_text())
WIDTH = 90


def say(text, indent="  "):
    print(textwrap.fill(str(text), WIDTH, initial_indent=indent, subsequent_indent=indent))


def heading(title):
    print("\n" + title.upper())
    print("-" * len(title))


NOTES = "--notes" in sys.argv   # notes mode: show what to write down after each important section


def note(lines):
    """Print a 'write this down' box, only in notes mode."""
    if not NOTES or not lines:
        return
    if isinstance(lines, str):
        lines = [lines]
    print("    [NOTES: write this down]")
    for line in lines:
        say(f"* {line}", "      ")


def run_quiz():
    quiz = d.get("quiz", [])
    if not quiz:
        return
    heading("Quiz")
    score = 0
    for i, q in enumerate(quiz, 1):
        print()
        say(f"{i}. {q['q']}")
        for j, opt in enumerate(q["options"]):
            say(f"{'abcd'[j]}) {opt}", "     ")
        pick = input("  Your answer (a/b/c/d): ").strip().lower()
        right = "abcd"[q["answer"]]
        if pick == right:
            score += 1
            print("  Right.")
        else:
            print(f"  Not quite. The answer is {right}.")
        say(q.get("explain", ""))
    print(f"\n  Score: {score} / {len(quiz)}")


def your_take():
    take = d.get("take")
    if not take:
        return
    heading("Your take")
    say(take)
    answer = input("\n  Your call (or press Enter to skip): ").strip()
    if not answer:
        return
    import anthropic
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=2000,
        system=("You are a supportive but honest senior macro trader coaching a college sophomore "
                "who wants to work in sales and trading. Plain language, no em dashes, no flattery."),
        messages=[{"role": "user", "content": (
            "In under 170 words: 1) does the call hold up and why, 2) the strongest part, "
            "3) what they missed or the main risk, 4) one sharper way a trader would phrase it, "
            "5) a score out of 10. Use only the facts in this debrief.\n\n"
            f"DEBRIEF: {json.dumps({k: d.get(k) for k in ('headline', 'summary', 'cross_asset', 'storylines', 'board')})}\n\n"
            f"QUESTION: {take}\n\nTHEIR ANSWER: {answer}")}],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    heading("Feedback")
    for para in text.split("\n"):
        if para.strip():
            say(para)


# ---------- full debrief ----------
print(f"\nMACROWATCH | {d.get('date', '')} | {d.get('mood', '')}")
print(d.get("headline", ""))
heading("Summary")
say(d.get("summary", ""))
if d.get("one_thing"):
    heading("If you remember one thing")
    say(d["one_thing"])

heading("The tape")
for b in d.get("board", []):
    print(f"  {b['label']:15} {b['value']:>10}   {b['change']:+} {b['unit']}")

for name, text in (d.get("cross_asset") or {}).items():
    heading(f"Cross-asset: {name}")
    say(text)
note(d.get("cross_asset_notes"))

for st in d.get("storylines", []):
    heading(f"Storyline: {st.get('name')} ({st.get('status')}, since {st.get('first_seen')})")
    say(f"Backstory: {st.get('backstory')}")
    say(f"Today: {st.get('today')}")
    say(f"How it moves markets: {st.get('market_link')}")
    say(f"Next chapter: {st.get('next_chapter')}")
    for h in st.get("headlines", []) + st.get("articles", []):
        say(f"> {h['source']}: {h['title']}  {h['url']}", "    ")
    note(st.get("note"))

for s in d.get("under_the_radar", []):
    heading(f"Under the radar: {s.get('title')}")
    say(s.get("what", ""))
    say(f"Chain: {s.get('chain')}")
    say(f"Watch for: {s.get('watch')}")
    note(s.get("note"))

for dd in d.get("deep_dive", []):
    heading(f"Deep dive: {dd.get('title', '')}")
    say(f"{dd.get('source', '')}  {dd.get('url', '')}")
    say(f"Why now: {dd.get('why_now')}")
    for p in dd.get("key_points", []):
        say(f"- {p}", "    ")
    say(f"Market angle: {dd.get('market_angle')}")
    say(f"Trade idea: {dd.get('trade_idea')}")
    note(dd.get("note"))

if d.get("terms"):
    heading("Terms")
    for t in d["terms"]:
        say(f"{t['term']}: {t['def']}")

if d.get("reads"):
    heading("Worth reading in full")
    for r in d["reads"]:
        say(f"{r['source']}: {r['title']}  {r['url']}")

if input("\nTake the quiz now? (y/n): ").strip().lower().startswith("y"):
    run_quiz()
your_take()
