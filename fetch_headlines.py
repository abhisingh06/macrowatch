import calendar
import json
import re
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
import feedparser
import yfinance as yf

AGENT = "MacroWatch/1.0 (student project)"

# source name -> (category, feed address)
FEEDS = {
    "WSJ Markets":       ("news", "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"),
    "WSJ World":         ("news", "https://feeds.a.dj.com/rss/RSSWorldNews.xml"),
    "WSJ US Business":   ("news", "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml"),
    "MarketWatch":       ("news", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    "MarketWatch Pulse": ("news", "https://feeds.content.dowjones.io/public/rss/mw_marketpulse"),
    "CNBC Top News":     ("news", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
    "CNBC Economy":      ("news", "https://www.cnbc.com/id/20910258/device/rss/rss.html"),
    "Federal Reserve":   ("central bank", "https://www.federalreserve.gov/feeds/press_all.xml"),
    "Fed speeches":      ("central bank", "https://www.federalreserve.gov/feeds/speeches.xml"),
    "ECB":               ("central bank", "https://www.ecb.europa.eu/rss/press.html"),
    "Bank of England":   ("central bank", "https://www.bankofengland.co.uk/rss/news"),
}

# Yahoo news for each big macro market, not just stocks
YAHOO = {
    "^GSPC": "stocks", "^TNX": "rates", "DX-Y.NYB": "dollar",
    "CL=F": "oil", "GC=F": "gold", "JPY=X": "yen",
}

PER_SOURCE = 8
MAX_AGE_DAYS = 3       # ignore anything older than this (3 so Monday still sees Friday)
headlines = []
seen = set()           # titles already saved, so stories aren't repeated
skipped_old = 0
now = datetime.now(timezone.utc)

# Only use news from up to 2 hours after the close this debrief covers.
# (If the script runs before today's close, the debrief is about the last full day,
# so news from today shouldn't leak in.)
try:
    close_day = json.loads(Path("data/latest.json").read_text())["date"]
    y, m, d = map(int, close_day.split("-"))
    cutoff = datetime(y, m, d, 18, 0, tzinfo=ZoneInfo("America/New_York"))
except Exception:
    cutoff = None


def clean(text, limit=300):
    """Strip HTML tags and extra spaces, and cap the length."""
    text = re.sub(r"<[^>]+>", "", text or "")
    return " ".join(text.split())[:limit]


def too_old(when):
    """True if a datetime is too old, or newer than the debrief's cutoff. Items with no date are kept."""
    if when is None:
        return False
    if cutoff is not None and when > cutoff:
        return True
    reference = min(now, cutoff) if cutoff is not None else now
    return (reference - when).days > MAX_AGE_DAYS


def add(source, category, title, link, when, summary=""):
    global skipped_old
    key = title.strip().lower()
    if not key or key in seen:                 # skip blanks and duplicates
        return False
    if too_old(when):                          # skip stale stories
        skipped_old += 1
        return False
    seen.add(key)
    headlines.append({"source": source, "category": category, "title": title.strip(),
                      "link": link, "published": when.isoformat() if when else "",
                      "summary": clean(summary)})
    return True


def rss_time(e):
    t = e.get("published_parsed") or e.get("updated_parsed")
    return datetime.fromtimestamp(calendar.timegm(t), tz=timezone.utc) if t else None


def yahoo_time(text):
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")) if text else None
    except ValueError:
        return None


# 1. RSS feeds
for source, (category, url) in FEEDS.items():
    try:
        feed = feedparser.parse(url, agent=AGENT)
        added = sum(add(source, category, e.get("title", ""), e.get("link", ""),
                        rss_time(e), e.get("summary", ""))
                    for e in feed.entries[:PER_SOURCE])
        print(f"{source:18} {added} headlines" if feed.entries else f"{source:18} no headlines")
    except Exception as err:
        print(f"{source:18} failed: {err}")

# 2. Yahoo Finance via yfinance
for ticker, topic in YAHOO.items():
    try:
        added = 0
        for item in yf.Ticker(ticker).news[:PER_SOURCE]:
            c = item.get("content", item)
            link = c.get("canonicalUrl")
            added += add(f"Yahoo ({topic})", "news", c.get("title", ""),
                         link.get("url", "") if isinstance(link, dict) else c.get("link", ""),
                         yahoo_time(c.get("pubDate", "")), c.get("summary", ""))
        print(f"{'Yahoo ' + topic:18} {added} headlines")
    except Exception as err:
        print(f"{'Yahoo ' + topic:18} failed: {err}")

Path("data").mkdir(exist_ok=True)
Path("data/headlines.json").write_text(json.dumps(headlines, indent=2))
print(f"Skipped {skipped_old} headlines that were too old or newer than the close being covered")
print(f"Saved {len(headlines)} unique headlines to data/headlines.json")
