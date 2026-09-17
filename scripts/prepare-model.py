"""Download Apple's iPhone Duo USDZ and flatten its open pose into public/model.

Apple's model is not ours to redistribute, so public/model is gitignored and each
clone runs this once:  pip install usd-core && python3 scripts/prepare-model.py."""

from pathlib import Path
from urllib.request import urlretrieve
from zipfile import ZipFile

from pxr import Sdf, Usd


assets = Path(__file__).resolve().parents[1] / "public" / "model"
textures = assets / "textures"
textures.mkdir(parents=True, exist_ok=True)

model = assets / "iPhone_Duo_Star_White.usdz"
model_url = "https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz"
if not model.exists():
    print("Downloading the Apple reference model...", flush=True)
    urlretrieve(model_url, model)

with ZipFile(model) as archive:
    for name in archive.namelist():
        if Path(name).suffix.lower() in {".png", ".jpg", ".jpeg", ".avif"}:
            (textures / Path(name).name).write_bytes(archive.read(name))

print("Preparing the unfolded pose...", flush=True)
stage = Usd.Stage.Open(str(model))
stage.GetDefaultPrim().GetVariantSet("Pose").SetVariantSelection("Landscape")
flattened = Usd.Stage.Open(stage.Flatten())
for prim in flattened.Traverse():
    for attribute in prim.GetAttributes():
        value = attribute.Get()
        if isinstance(value, Sdf.AssetPath) and value.path:
            # Flattening resolves USDZ references to package paths; use local texture paths for the browser.
            filename = Path(value.path.split("[")[-1].rstrip("]")).name
            attribute.Set(Sdf.AssetPath(f"textures/{filename}"))
flattened.GetRootLayer().Export(str(assets / "iPhone_Duo_Render.usdc"))

print("Model ready in public/model.")
