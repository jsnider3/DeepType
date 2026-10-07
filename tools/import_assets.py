#!/usr/bin/env python3
"""Import assets from an installed copy of Typer Shark Deluxe into public/assets/original/.

The game's content is copyrighted, so it is never committed: this script rebuilds it
locally from the user's own install.

  images/  PopCap stores alpha as a separate `_name.gif` mask next to `name.jpg|gif`.
           Each pair is merged into one RGBA PNG, upscaled with Real-ESRGAN (if available)
           and written at SCALE x the original 640x480-era size. A manifest records the
           original (logical) size of each image so game code keeps 640x480 coordinates.
  sounds/  Converted to .ogg.
  music/   The .mo3 module is rendered to .ogg (ffmpeg/libopenmpt) and also copied as-is.
  data/    Copied verbatim (configs, word lists, lessons, font descriptors).

Usage: python3 tools/import_assets.py [--game-dir DIR] [--no-upscale] [--force]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "original"
CACHE = ROOT / ".import-cache"
# Real-ESRGAN (Windows ncnn/Vulkan build, run through WSL interop) is a general tool, not
# part of this repo: $REALESRGAN_DIR, then PATH, then %LOCALAPPDATA%\Programs.
ESRGAN_EXE = "realesrgan-ncnn-vulkan.exe"
ESRGAN_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"
ESRGAN_MODEL = "realesrgan-x4plus-anime"  # x4 then Lanczos down to SCALE: cleanest edges in testing
SCALE = 2
MAX_UPSCALE_DIFF = 15  # premultiplied mean abs diff after shrinking back; see valid_upscale

DEFAULT_GAME_DIRS = [
    "/mnt/c/Program Files (x86)/Steam/steamapps/common/Typer Shark Deluxe",
    "C:/Program Files (x86)/Steam/steamapps/common/Typer Shark Deluxe",
    os.path.expanduser("~/.steam/steam/steamapps/common/Typer Shark Deluxe"),
]


def find_game_dir(arg):
    for d in ([arg] if arg else DEFAULT_GAME_DIRS):
        if d and (Path(d) / "WinTS.exe").exists():
            return Path(d)
    sys.exit("Could not find Typer Shark Deluxe. Pass --game-dir <install folder>.")


def merge_images(src: Path, dst: Path):
    """Merge name + _name mask pairs into RGBA PNGs. Returns {name: [w, h]} logical sizes."""
    dst.mkdir(parents=True, exist_ok=True)
    files = {p.name: p for p in src.iterdir() if p.is_file()}
    stems = {}
    for name, p in files.items():
        stem = p.stem
        if stem.startswith("_"):
            stems.setdefault(stem[1:], {})["mask"] = p
        else:
            stems.setdefault(stem, {})["color"] = p
    sizes = {}
    for stem, parts in sorted(stems.items()):
        color, mask = parts.get("color"), parts.get("mask")
        if color is not None:
            im = Image.open(color)
            im = im.convert("RGBA")  # keeps GIF transparency index if present
            if mask is not None:
                a = Image.open(mask).convert("L")
                if a.size != im.size:  # overhand.gif ships a smaller mask; the rest is transparent
                    full = Image.new("L", im.size, 0)
                    full.paste(a, (0, 0))
                    a = full
                im.putalpha(a)
        else:
            # Alpha-only image (fonts, bubbles): the game treats it as white with that alpha.
            a = Image.open(mask).convert("L")
            im = Image.new("RGBA", a.size, (255, 255, 255, 255))
            im.putalpha(a)
        im.save(dst / f"{stem}.png")
        sizes[stem] = list(im.size)
    return sizes


def default_esrgan_dir():
    r"""%LOCALAPPDATA%\Programs\realesrgan-ncnn-vulkan, seen from WSL or Windows."""
    local = os.environ.get("LOCALAPPDATA")
    if local:
        return Path(local) / "Programs" / "realesrgan-ncnn-vulkan"
    users = Path("/mnt/c/Users")
    user = os.environ.get("WINUSER") or os.environ.get("USER", "")
    if (users / user).exists():
        return users / user / "AppData" / "Local" / "Programs" / "realesrgan-ncnn-vulkan"
    return None


def ensure_esrgan():
    candidates = []
    if os.environ.get("REALESRGAN_DIR"):
        candidates.append(Path(os.environ["REALESRGAN_DIR"]) / ESRGAN_EXE)
    on_path = shutil.which(ESRGAN_EXE) or shutil.which("realesrgan-ncnn-vulkan")
    if on_path:
        candidates.append(Path(on_path))
    default = default_esrgan_dir()
    if default:
        candidates.append(default / ESRGAN_EXE)
    for exe in candidates:
        if exe.exists() and (exe.parent / "models").exists():
            return exe
    if not default or not Path("/mnt/c/Windows").exists():
        return None  # Only the Windows build is wired up (runs via WSL interop).
    print(f"Installing Real-ESRGAN to {default} ...")
    default.mkdir(parents=True, exist_ok=True)
    zpath = default / "realesrgan.zip"
    subprocess.run(["curl", "-sSL", "-o", str(zpath), ESRGAN_URL], check=True)
    import zipfile
    zipfile.ZipFile(zpath).extractall(default)
    zpath.unlink()
    exe = default / ESRGAN_EXE
    return exe if exe.exists() else None


def premultiplied_diff(a, b):
    """Mean abs difference of premultiplied RGBA (colour under transparent pixels is ignored)."""
    x = np.asarray(a, dtype=np.float32)
    y = np.asarray(b, dtype=np.float32)
    x[..., :3] *= x[..., 3:] / 255
    y[..., :3] *= y[..., 3:] / 255
    return float(np.abs(x - y).mean())


def winpath(p: Path) -> str:
    """Path as the Windows exe sees it (it can't resolve /mnt/c/... paths)."""
    s = str(p.resolve())
    if s.startswith("/mnt/") and len(s) > 6 and s[6] == "/":
        return f"{s[5].upper()}:\\" + s[7:].replace("/", "\\")
    return s


def valid_upscale(hi: Path, lo: Path):
    """An upscale is usable if it exists, is 4x the source, and shrinks back to roughly the
    source (flaky GPU runs produce blank or noise images that are otherwise well-formed)."""
    if not hi.exists():
        return False
    try:
        a, b = Image.open(hi).convert("RGBA"), Image.open(lo).convert("RGBA")
        if a.size != (b.size[0] * 4, b.size[1] * 4):
            return False
        return premultiplied_diff(a.resize(b.size, Image.BOX), b) < MAX_UPSCALE_DIFF
    except OSError:
        return False


def upscale(src: Path, dst: Path, sizes, force: bool):
    dst.mkdir(parents=True, exist_ok=True)
    exe = ensure_esrgan()
    up = CACHE / "esrgan-x4"
    good = set()
    if exe:
        up.mkdir(parents=True, exist_ok=True)
        good = {s for s in sizes if not force and valid_upscale(up / f"{s}.png", src / f"{s}.png")}
        todo = [s for s in sizes if s not in good]
        if todo:
            print(f"Upscaling {len(todo)} images with Real-ESRGAN ({ESRGAN_MODEL})...")
        for i, s in enumerate(todo):
            # One image per call: the exe's folder mode silently writes blank or garbage
            # images under WSL. The Windows exe resolves relative paths against its cwd.
            for attempt in range(2):
                subprocess.run([str(exe), "-i", winpath(src / f"{s}.png"), "-o", winpath(up / f"{s}.png"),
                                "-n", ESRGAN_MODEL, "-s", "4", "-f", "png"],
                               cwd=exe.parent, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if valid_upscale(up / f"{s}.png", src / f"{s}.png"):
                    good.add(s)
                    break
            if (i + 1) % 25 == 0:
                print(f"  {i + 1}/{len(todo)}")
        failed = [s for s in sizes if s not in good]
        if failed:
            print(f"Real-ESRGAN failed on {len(failed)} images; using Lanczos for: {', '.join(failed)}")
    else:
        print("Real-ESRGAN unavailable; falling back to Lanczos upscaling.")
    for s, (w, h) in sizes.items():
        target = (w * SCALE, h * SCALE)
        im = Image.open(up / f"{s}.png" if s in good else src / f"{s}.png").convert("RGBA")
        im = im.resize(target, Image.LANCZOS)
        im.save(dst / f"{s}.png", optimize=False)


def make_favicon(images: Path, dst: Path):
    """Browser-tab icon: the grinning head from the first shark swim frame."""
    shark = Image.open(images / "shark_basic_swim.png").convert("RGBA")
    k = shark.width / 3200  # crop box is in original 1x pixels
    head = shark.crop(tuple(round(v * k) for v in (8.5, 15, 58.5, 65)))
    head.resize((64, 64), Image.LANCZOS).save(dst / "favicon.png")


def convert_sounds(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    names = {}
    for p in sorted(src.iterdir()):
        stem = p.stem
        if stem.startswith("cached_"):
            continue  # decoded duplicates the original game writes as a cache
        names[stem] = p
    for p in sorted(src.iterdir()):  # use cached copies only when the original is missing
        if p.stem.startswith("cached_") and p.stem[7:] not in names:
            names[p.stem[7:]] = p
    for stem, p in names.items():
        out = dst / f"{stem}.ogg"
        if p.suffix.lower() == ".ogg":
            shutil.copy(p, out)
        else:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-c:a", "libvorbis", "-q:a", "6", str(out)], check=True)
    return sorted(names)


def convert_music(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    out = []
    for p in sorted(src.iterdir()):
        shutil.copy(p, dst / p.name)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-c:a", "libvorbis", "-q:a", "6", str(dst / f"{p.stem}.ogg")], check=True)
        out.append(p.stem)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game-dir")
    ap.add_argument("--no-upscale", action="store_true")
    ap.add_argument("--force", action="store_true", help="re-run the upscaler for every image")
    args = ap.parse_args()

    game = find_game_dir(args.game_dir)
    print(f"Importing from {game}")
    OUT.mkdir(parents=True, exist_ok=True)

    merged = CACHE / "merged"
    sizes = merge_images(game / "images", merged)
    print(f"Merged {len(sizes)} images")
    if args.no_upscale:
        scale = 1
        shutil.rmtree(OUT / "images", ignore_errors=True)
        shutil.copytree(merged, OUT / "images")
    else:
        scale = SCALE
        upscale(merged, OUT / "images", sizes, args.force)

    make_favicon(OUT / "images", OUT)
    sounds = convert_sounds(game / "sounds", OUT / "sounds")
    print(f"Converted {len(sounds)} sounds")
    music = convert_music(game / "music", OUT / "music")

    shutil.rmtree(OUT / "data", ignore_errors=True)
    shutil.copytree(game / "data", OUT / "data")

    manifest = {"scale": scale, "images": sizes, "sounds": sounds, "music": music,
                "data": sorted(p.name for p in (OUT / "data").iterdir())}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"Done -> {OUT}")


if __name__ == "__main__":
    main()
