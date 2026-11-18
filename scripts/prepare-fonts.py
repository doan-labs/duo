"""Fetch Apple's SF Pro and cut the web subset the shell loads.

SF Pro is Apple's to license, not ours to redistribute: the variable font is
downloaded from Apple's own SF Pro distribution and condensed into git-ignored
public/fonts/sf-pro.woff2, the same rule that keeps public/model out of Git.
Every clone runs this once:  pip install fonttools brotli
                             python3 scripts/prepare-fonts.py
"""

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import urlretrieve

dmg_url = "https://devimages-cdn.apple.com/design/resources/download/SF-Pro.dmg"
assets = Path(__file__).resolve().parents[1] / "public" / "fonts"
out = assets / "sf-pro.woff2"

# Latin plus the cyrillic, punctuation, currency and arrow ranges the shell and
# its apps write in; everything else stays out of the subset.
keep = (
    list(range(0x20, 0x180))
    + list(range(0x400, 0x500))
    + list(range(0x2000, 0x2070))
    + [0x20AC, 0x20A4, 0x20BD, 0x20B9, 0x2122, 0x2103]
    + list(range(0x2190, 0x21B0))
)


def sevenzip() -> str | None:
    for name in ("7zz", "7z", "7za"):
        path = shutil.which(name)
        if not path:
            continue
        # p7zip 16.02 shares the binary names and the banner shape but cannot
        # read Apple's lzfse images; 7-Zip 21.02 and newer can. The banner may
        # start with blank lines, so scan until a version line shows up.
        ok = False
        for line in subprocess.run([path, "i"], capture_output=True, text=True).stdout.splitlines():
            if "p7zip" in line or "[64]" in line:
                break
            found = re.search(r"7-Zip (\d+)\.(\d+)", line)
            if found:
                ok = (int(found.group(1)), int(found.group(2))) >= (21, 2)
                break
        if ok:
            return path
    return None


def via_7zip(z: str, dmg: Path, work: Path) -> Path:
    # The image holds an installer package whose payload is a gzip cpio; 7-Zip
    # peels all four layers. The gzip member comes out as "Payload~".
    def run(*args: str) -> None:
        subprocess.run([z, *args], check=True, capture_output=True)

    run("e", str(dmg), "SFProFonts.pkg", f"-o{work}", "-y")
    run("e", str(work / "SFProFonts.pkg"), "SFProFontsPackage.pkg/Payload", f"-o{work}", "-y")
    run("e", str(work / "Payload"), f"-o{work}", "-y")
    cpio = work / ("Payload~" if (work / "Payload~").exists() else "Payload")
    # `e` extracts flat: the payload's Library/Fonts tree collapses into work itself.
    run("e", str(cpio), f"-o{work}", "-y")
    return work / "SF-Pro.ttf"


def via_hdiutil(dmg: Path, work: Path) -> Path:
    # macOS reads the image natively and pkgutil unpacks the installer.
    mount = work / "vol"
    mount.mkdir()
    subprocess.run(
        ["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", str(mount), str(dmg)],
        check=True,
        capture_output=True,
    )
    try:
        expanded = work / "pkg"
        subprocess.run(
            ["pkgutil", "--expand-full", str(mount / "SFProFonts.pkg"), str(expanded)],
            check=True,
            capture_output=True,
        )
        return expanded / "SFProFontsPackage.pkg" / "Library" / "Fonts" / "SF-Pro.ttf"
    finally:
        subprocess.run(["hdiutil", "detach", str(mount), "-quiet"], capture_output=True)


def condense(font: Path) -> None:
    # Pin the width axis, keep the weight ladder and optical sizing, then brotli
    # the remainder: 21 MB of distribution becomes a couple hundred KB of web font.
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    f = TTFont(font)
    s = subset.Subsetter(
        subset.Options(
            layout_features="*",
            drop_tables=["DSIG"],
            name_IDs=[1, 2, 3, 4, 6],
            glyph_names=False,
            notdef_outline=True,
        )
    )
    s.populate(unicodes=keep)
    s.subset(f)
    instantiateVariableFont(f, {"wdth": 100}, inplace=True)
    f.flavor = "woff2"
    f.save(out)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--dmg", help="path to an SF-Pro.dmg already on disk, instead of downloading")
args = parser.parse_args()

if out.exists():
    print(f"{out} already exists.")
    sys.exit(0)

try:
    from fontTools import subset  # noqa: F401
except ModuleNotFoundError:
    sys.exit("fonttools is missing:  pip install fonttools brotli")

work = Path(tempfile.mkdtemp(prefix="sf-pro-"))
try:
    if args.dmg:
        dmg = Path(args.dmg).resolve()
    else:
        dmg = work / "SF-Pro.dmg"
        print("Downloading Apple's SF Pro distribution (about 210 MB)...", flush=True)
        urlretrieve(dmg_url, dmg)

    print("Extracting the variable font...", flush=True)
    if sys.platform == "darwin" and shutil.which("hdiutil"):
        font = via_hdiutil(dmg, work)
    else:
        z = sevenzip()
        if not z:
            sys.exit(
                "Install 7-Zip 21.02 or newer (7z, 7zz or 7za on PATH) to unpack the distribution outside macOS."
            )
        font = via_7zip(z, dmg, work)

    assets.mkdir(parents=True, exist_ok=True)
    print(f"Writing {out}...", flush=True)
    condense(font)
finally:
    shutil.rmtree(work, ignore_errors=True)

print(f"SF Pro ready in public/fonts ({out.stat().st_size // 1024} KB).")
