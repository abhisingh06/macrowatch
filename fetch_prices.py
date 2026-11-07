import json
from datetime import date
from pathlib import Path
import yfinance as yf

#Name on Screen --> Yahoo's ticker symbol
TICKERS = { "S&P 500": "^GSPC",
    "Dow": "^DJI",
    "Nasdaq": "^IXIC",
    "10Y yield": "^TNX",
    "Dollar index": "DX-Y.NYB",
    "USD/JPY": "JPY=X",
    "WTI crude": "CL=F",
    "Gold": "GC=F",
    "VIX": "^VIX", 
    }

#Get the last 5 days of daily pries for all tickers at once 
data =yf.download(list(TICKERS.values()), period = "5d", interval = "1d", progress=False)
closes = data["Close"]

board = [] #one entry per market; this list is what the app will read

for name, ticker in TICKERS.items():
    series = closes[ticker].dropna() #drop empty days (holidays, ect.)
    today = series.iloc[-1] #last close
    yesterday = series.iloc[-2] # the close before that

    if "yield" in name:
        change = round((today-yesterday)*100)   # yields: change in basis points
        unit = "bp"
    else:
        change = round((today-yesterday)/yesterday*100,2)
        unit = "%"

    board.append( {
        "label": name,
        "value": round(today, 2),
        "change": change,
        "unit": unit,
        "dir": "up" if change > 0 else "down" if change < 0 else "flat",
    })
    print(f"{name:15} {today:>10.2f}  {change:+} {unit}")

#Save to a "data" folder one file that's always the newest, plus a dated copy for history
folder = Path("data")
folder.mkdir(exist_ok=True)
output = {"date": date.today().isoformat(), "board": board}

(folder/"latest.json").write_text(json.dumps(output, indent=2))
(folder/ f"{output['date']}.json").write_text(json.dumps(output, indent=2))
print("Saved data/latest.json")