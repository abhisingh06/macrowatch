"""Pull FULL articles from official, free-to-use sources (central banks and
global institutions) so the debrief can go deep on niche stories."""
import calendar
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import trafilatura

AGENT = "MacroWatch/1.0 (student project)"

# source name -> RSS feed address
SOURCES = {
    "Federal Reserve":            "https://www.federalreserve.gov/feeds/press_all.xml",
    "Fed speeches":               "https://www.federalreserve.gov/feeds/speeches.xml",
    "NY Fed Liberty Street":      "https://libertystreeteconomics.newyorkfed.org/feed/",
    "SF Fed Economic Letter":     "https://www.frbsf.org/subscriptions/economic-letter-rss-feed/",
    "St. Louis Fed On the Economy": "https://www.stlouisfed.org/on-the-economy/rss",
    "ECB":                        "https://www.ecb.europa.eu/rss/press.html",
    "Bank of England speeches":   "https://www.bankofengland.co.uk/rss/speeches",
    "BIS central bank speeches":  "https://www.bis.org/doclist/cbspeeches.rss",
}

DAYS_BACK = 4        # 4 days so a Monday run still catches Friday's items
PER_SOURCE = 2       # at most 2 full articles from each source
MAX_CHARS = 6000     # cap each article (about 1,000 words) to keep costs down
MIN_CHARS = 500      # skip pages where we couldn't get real article text
SKIP_WORDS = ["enforcement", "termination", "application", "board meeting"]  # routine Fed notices


def age_in_days(entry):
    """How many days old an RSS item is, or None if it has no date."""
    t = entry.get("published_parsed") or entry.get("updated_parsed")
    if not t:
        return None
    published = datetime.fromtimestamp(calendar.timegm(t), tz=timezone.utc)
    return (datetime.now(timezone.utc) - published).days


docs = []

for source, url in SOURCES.items():
    feed = feedparser.parse(url, agent=AGENT)
    if not feed.entries:
        print(f"{source:30} feed not found (tell Claude)")
        continue

    got = 0
    for e in feed.entries:
        if got >= PER_SOURCE:
            break
        title = e.get("title", "").strip()
        age = age_in_days(e)
        if age is not None and age > DAYS_BACK:
            continue                                   # too old
        if any(w in title.lower() for w in SKIP_WORDS):
            continue                                   # routine notice, not a story

        try:
            page = trafilatura.fetch_url(e.get("link", ""))
            text = trafilatura.extract(page) if page else None   # pulls just the article text
        except Exception:
            text = None
        time.sleep(1)                                  # be polite: one request per second

        if not text or len(text) < MIN_CHARS:
            continue
        docs.append({
            "source": source,
            "title": title,
            "link": e.get("link", ""),
            "published": e.get("published", ""),
            "text": text[:MAX_CHARS],
        })
        got += 1

    print(f"{source:30} {got} full articles" if got else f"{source:30} nothing new in the last {DAYS_BACK} days")

Path("data").mkdir(exist_ok=True)
Path("data/deep.json").write_text(json.dumps(docs, indent=2))
print(f"Saved {len(docs)} full articles to data/deep.json")
