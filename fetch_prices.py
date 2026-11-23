import json
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import yfinance as yf

# Name on screen -> Yahoo's ticker symbol
TICKERS = {
    "S&P 500": "^GSPC",
    "Dow": "^DJI",
    "Nasdaq": "^IXIC",
    "10Y yield": "^TNX",
    "Dollar index": "DX-Y.NYB",
    "USD/JPY": "JPY=X",
    "WTI crude": "CL=F",
    "Gold": "GC=F",
    "VIX": "^VIX",
}

# threads=False downloads one ticker at a time, which avoids yfinance's
# "database is locked" error when several downloads hit its cache at once
data = yf.download(list(TICKERS.values()), period="10d", interval="1d", progress=False, threads=False)
closes = data["Close"]


def series_for(ticker):
    """Last few daily closes for one ticker. Retries once on its own if the batch download missed it."""
    series = closes[ticker].dropna() if ticker in closes else None
    if series is None or len(series) < 2:
        time.sleep(2)
        try:
            series = yf.Ticker(ticker).history(period="10d")["Close"].dropna()
        except Exception:
            series = None
    return series


# Decide which trading day this debrief is about.
# If the market is still open (before 4:15pm New York time), today's prices are live, not a close,
# so we use the last FINISHED day instead. Everything below lines up to that same day.
now = datetime.now(ZoneInfo("America/New_York"))
spx = series_for("^GSPC")
trading_days = sorted({ts.date() for ts in spx.index}) if spx is not None else []
close_day = trading_days[-1] if trading_days else now.date()
if close_day == now.date() and (now.hour, now.minute) < (16, 15) and len(trading_days) > 1:
    close_day = trading_days[-2]
    print(f"Market still open, using the last full close: {close_day}")


def up_to_close_day(series):
    """Keep only prices from the close day or earlier, so every market matches the same day."""
    return series[[ts.date() <= close_day for ts in series.index]]


board = []     # one entry per market; this list is what the app reads
missing = []

for name, ticker in TICKERS.items():
    series = series_for(ticker)
    if series is not None:
        series = up_to_close_day(series)
    if series is None or len(series) < 2:
        print(f"{name:15} no data today, skipping")
        missing.append(name)
        continue

    today = float(series.iloc[-1])       # last close
    yesterday = float(series.iloc[-2])   # the close before that

    if "yield" in name:
        change = round((today - yesterday) * 100)            # basis points
        unit = "bp"
    else:
        change = round((today - yesterday) / yesterday * 100, 2)
        unit = "%"

    board.append({
        "label": name,
        "value": round(today, 2),
        "change": change,
        "unit": unit,
        "dir": "up" if change > 0 else "down" if change < 0 else "flat",
    })
    print(f"{name:15} {today:>10.2f}   {change:+} {unit}")

# Stop if most of the tape is missing: better no debrief than a wrong one
if len(board) < 6:
    raise SystemExit(f"Only {len(board)} markets downloaded (missing: {', '.join(missing)}). Stopping.")

folder = Path("data")
folder.mkdir(exist_ok=True)
output = {"date": close_day.isoformat(), "board": board, "missing": missing}

(folder / "latest.json").write_text(json.dumps(output, indent=2))

# History for the desktop charts: about 3 months of daily closes for each market, up to the close day.
# Wrapped in try/except so a chart problem can never stop the debrief.
try:
    hist = yf.download(list(TICKERS.values()), period="3mo", interval="1d", progress=False, threads=False)["Close"]
    history = {}
    for name, ticker in TICKERS.items():
        if ticker in hist:
            s = up_to_close_day(hist[ticker].dropna())
            history[name] = [[ts.date().isoformat(), round(float(v), 2)] for ts, v in s.items()]
    (folder / "history.json").write_text(json.dumps({"date": close_day.isoformat(), "series": history}))
    print(f"Saved chart history for {len(history)} markets")
except Exception as err:
    print(f"Chart history skipped: {err}")
(folder / f"{output['date']}.json").write_text(json.dumps(output, indent=2))
print("Saved data/latest.json")
