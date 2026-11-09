import json
import os
from datetime import date
from pathlib import Path
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

#1. Start for hand-kept list
banks = json.loads(Path("central_banks.json").read_text())["banks"]

#2. Overwrite USD and EUR with live numbers from FRED
_, upper = latest("DFEDTARU")
_, lower = latest("DFEDTARL")
_, ecb = latest("ECBDFR")

for b in banks:
    if b["code"] == "USD":
        b["rate"] = (upper + lower) / 2
        b["note"] = f"range {lower:.2f} to {upper:.2f}%"
    elif b["code"] == "EUR":
        b["rate"] = ecb

#3. Treasury yields for the debrief
_, us2y = latest("DGS2")
as_of, us10y = latest("DGS10")
curve_bp = round((us10y - us2y)*100)

output = {
    "date": date.today().isoformat(),
    "banks": banks,
    "treasuries": {"2Y": us2y, "10Y": us10y, "curve_bp": curve_bp, "as_of": as_of},
}
Path("data").mkdir(exist_ok=True)
Path("data/rates.json").write_text(json.dumps(output, indent=2))

for b in banks:
    print(f"{b['code']}  {b['bank']:20} {b['rate']:6.3f}%")
print(f"2Y {us2y:.2f}%                   10Y{us10y: .2f}%   curve{curve_bp:+} bp")
print("Saved data/rates.json")