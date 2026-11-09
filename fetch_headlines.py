import json
from pathlib import Path
import feedparser
import yfinance as yf

AGENT = "MacroWatch/1.0 (student project)"
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
YAHOO = {"^GSPC": "stocks", "^TNX": "rates", "DX-Y.NYB": "dollar",
    "CL=F": "oil", "GC=F": "gold", "JPY=X": "yen"}

PER_SOURCE = 8
headlines = []
seen = set()

def add(source, category, title, link, published):
    key = title.strip().lower()
    if not key or key in seen:
        return False
    seen.add(key)
    headlines.append({"source": source, "category": category, "title": title.strip(), "link": link, "published": published})
    return True

#1. RSS feeds
for source, (category, url) in FEEDS.items():
    try:
        feed = feedparser.parse(url, agent="MacroWatch student project")
        added = sum(add(source, category, e.get("title", ""), e.get("link", ""),
                        e.get("published", "")) for e in feed.entries[:PER_SOURCE])
        print(f"{source:18} {added} headlines" if feed.entries else f"{source:18} no headlines")
    except Exception as err:
        print(f"{source:18} failed: {err}")

#2. Yahoo Finance via yfinance
for ticker, topic in YAHOO.items():
    try:
        added = 0
        for item in yf.Ticker(ticker).news[:PER_SOURCE]:
            c = item.get("content", item)
            link = c.get("conanicalUrl")
            added += add(f"Yahoo ({topic})", "news", c.get("title", ""),
                        link.get("url", "") if isinstance(link, dict) else c.get("lik", ""),
                        c.get("pubDate", ""))
        print(f"{'Yahoo ' + topic:18} {added} headlines")
    except Exception as err:
        print(f"{'Yahoo ' +topic:18} failed: {err}")

Path("data").mkdir(exist_ok=True)
Path("data/headlines.json").write_text(json.dumps(headlines, indent=2))
print(f"Saved {len(headlines)} headlines to data/headlines.json")
