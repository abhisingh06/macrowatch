import json
import time
from datetime import date
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
data = yf.download(list(TICKERS.values()), period="5d", interval="1d", progress=False, threads=False)
closes = data["Close"]


def series_for(ticker):
    """Last few daily closes for one ticker. Retries once on its own if the batch download missed it."""
    series = closes[ticker].dropna() if ticker in closes else None
    if series is None or len(series) < 2:
        time.sleep(2)
        try:
            series = yf.Ticker(ticker).history(period="5d")["Close"].dropna()
        except Exception:
            series = None
    return series


board = []     # one entry per market; this list is what the app reads
missing = []

for name, ticker in TICKERS.items():
    series = series_for(ticker)
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
output = {"date": date.today().isoformat(), "board": board, "missing": missing}

(folder / "latest.json").write_text(json.dumps(output, indent=2))
(folder / f"{output['date']}.json").write_text(json.dumps(output, indent=2))
print("Saved data/latest.json")
