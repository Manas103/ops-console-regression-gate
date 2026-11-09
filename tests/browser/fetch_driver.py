# Downloads the Chrome for Testing driver binary whose version exactly matches
# the Chromium build `playwright install chromium` fetches for the pinned
# playwright version in package.json (1.65.0 -> Chromium build 1254 ->
# Chrome for Testing 158.0.8127.18, printed by the install step itself).
# Bumping the pinned playwright version means bumping VERSION here too.
import io
import urllib.request
import zipfile
import os

VERSION = "158.0.8127.18"
URL = f"https://storage.googleapis.com/chrome-for-testing-public/{VERSION}/win64/chromedriver-win64.zip"
OUT_DIR = os.path.join(os.path.dirname(__file__), "driver")

os.makedirs(OUT_DIR, exist_ok=True)
with urllib.request.urlopen(URL) as resp:
    data = resp.read()

with zipfile.ZipFile(io.BytesIO(data)) as zf:
    zf.extractall(OUT_DIR)

for root, _dirs, files in os.walk(OUT_DIR):
    for f in files:
        if f.lower().endswith(".exe"):
            print(os.path.join(root, f))
