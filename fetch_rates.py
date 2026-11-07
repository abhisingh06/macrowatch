import os
import requests

KEY = os.environ["FRED_API_KEY"] #reads the secret, so the key never appears in the code

def latest(series_id):
    """Return (date, value) for the most recent reading of a FRED series."""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": KEY,
        "file_type": "json",
        "sort_order": "desc", # newest first
        "limit": 10,
    }
    obs = requests.get(url, params=params, timeout=20).json()["observations"]
    for o in obs:
        if o["value"]!= ".": # FRED uses "." for days with no date, like holdiays 
            return o["date"], float(o["value"])
#Name on screen => FRED's code for that data series
SERIES = {
    "Fed funds (upper)": "DFEDTARU",
    "Fed funds (lower)": "DFEDTARL",
    "2Y Treasury": "DGS2",
    "10Y Treasury": "DGS10",
    "ECB deposit rate": "ECBDFR",

    }
for name, sid in SERIES.items():
    d, v = latest(sid)
    print(f"{name:20} {v:>6.2f}% (as of {d})")