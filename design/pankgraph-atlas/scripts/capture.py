#!/usr/bin/env python3
"""Regenerate preview screenshots (screenshots/<id>.png, 1440x1080) from the live page HTML.

Usage:  python3 scripts/capture.py [--server http://127.0.0.1:8000] <screen-id> [<screen-id> ...]
        python3 scripts/capture.py --group "Recovery dialogs" --group "Empty & error states"
Requires Google Chrome (macOS) and the atlas served over HTTP (python3 serve or `python3 -m http.server`).
Pages load with ?capture=1 so the atlas toolbar is hidden, exactly like the original captures.
"""
import argparse, json, pathlib, shutil, subprocess, sys, tempfile, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1440, 1080

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--group", action="append", default=[])
    ap.add_argument("--server", default="http://127.0.0.1:8000")
    a = ap.parse_args()
    screens = json.loads((ROOT / "inventories/screens.json").read_text())
    screens = screens.get("screens", screens) if isinstance(screens, dict) else screens
    ids = list(a.ids) + [s["id"] for s in screens if s.get("group") in a.group]
    if not ids:
        sys.exit("no screen ids given")
    if not pathlib.Path(CHROME).exists():
        sys.exit(f"Chrome not found at {CHROME}")
    profile = tempfile.mkdtemp(prefix="atlas-capture-")
    failed = []
    for sid in ids:
        out = ROOT / "screenshots" / f"{sid}.png"
        url = f"{a.server}/pages/{sid}.html?capture=1"
        cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
               f"--user-data-dir={profile}", f"--window-size={W},{H}", "--force-device-scale-factor=1",
               "--virtual-time-budget=4000", f"--screenshot={out}", url]
        # headless Chrome writes the PNG then may keep running: wait for a stable file, then stop it.
        if out.exists(): out.unlink()
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        size, stable, waited = -1, 0, 0.0
        while waited < 60 and stable < 3:
            time.sleep(0.5); waited += 0.5
            cur = out.stat().st_size if out.exists() else -1
            stable = stable + 1 if (cur > 0 and cur == size) else 0
            size = cur
        proc.kill(); proc.wait()
        ok = out.exists() and out.stat().st_size > 10_000
        print(("OK   " if ok else "FAIL ") + sid)
        if not ok:
            failed.append(sid)
    shutil.rmtree(profile, ignore_errors=True)
    if failed:
        sys.exit(f"{len(failed)} capture(s) failed: {', '.join(failed)}")

if __name__ == "__main__":
    main()
