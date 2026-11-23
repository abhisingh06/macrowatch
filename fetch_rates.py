import json
import os
from datetime import date
from pathlib import Path
import requests

KEY = os.environ["FRED_API_KEY"]


def observations(series_id, limit):
    """Most recent readings of a FRED series, newest first, skipping empty days."""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {"series_id": series_id, "api_key": KEY, "file_type": "json",
              "sort_order": "desc", "limit": limit}
    obs = requests.get(url, params=params, timeout=20).json()["observations"]
    return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]   # "." = no data that day


def latest(series_id):
    """Return (date, value) for the most recent reading of a FRED series."""
    return observations(series_id, 10)[0]


# 1. Start from your hand-kept list
banks = json.loads(Path("central_banks.json").read_text())["banks"]

# 2. Overwrite USD and EUR with live numbers from FRED
_, upper = latest("DFEDTARU")
_, lower = latest("DFEDTARL")
_, ecb = latest("ECBDFR")

for b in banks:
    if b["code"] == "USD":
        b["rate"] = (upper + lower) / 2              # midpoint of the Fed's range
        b["note"] = f"range {lower:.2f} to {upper:.2f}%"
    elif b["code"] == "EUR":
        b["rate"] = ecb

# 3. Treasury yields for the debrief
_, us2y = latest("DGS2")
as_of, us10y = latest("DGS10")
curve_bp = round((us10y - us2y) * 100)              # 10Y minus 2Y, in basis points

# 4. About 6 months of the curve (10Y minus 2Y) for the desktop chart
two = dict(observations("DGS2", 130))
ten = dict(observations("DGS10", 130))
curve_history = [[d, round((ten[d] - two[d]) * 100)] for d in sorted(set(two) & set(ten))]

output = {
    "date": date.today().isoformat(),
    "banks": banks,
    "treasuries": {"2Y": us2y, "10Y": us10y, "curve_bp": curve_bp, "as_of": as_of},
    "curve_history": curve_history,
}
Path("data").mkdir(exist_ok=True)
Path("data/rates.json").write_text(json.dumps(output, indent=2))

for b in banks:
    print(f"{b['code']}  {b['bank']:20} {b['rate']:>6.3f}%")
print(f"2Y {us2y:.2f}%   10Y {us10y:.2f}%   curve {curve_bp:+} bp   ({len(curve_history)} days of curve history)")
print("Saved data/rates.json")
