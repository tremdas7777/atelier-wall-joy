#!/usr/bin/env python3
"""Extract embedded photos from German screenshots for social templates."""
from PIL import Image
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
ASSETS = os.path.join(ROOT, "public/assets")
OUT = os.path.join(ROOT, "public/assets/social/photos")
os.makedirs(OUT, exist_ok=True)

CROPS = {
    "setup-triple.webp": ("prova-de-6.webp", (40, 520, 580, 980)),
    "polo-dual.webp": ("prova-de-1.webp", (30, 430, 580, 900)),
    "city-laptop.webp": ("prova-de-4.webp", (30, 700, 580, 1050)),
    "tutto-laptop.webp": ("prova-de-5.webp", (30, 520, 580, 920)),
}

for name, (src, box) in CROPS.items():
    im = Image.open(os.path.join(ASSETS, src))
    im.crop(box).save(os.path.join(OUT, name), "WEBP", quality=88)
    print("wrote", name)

# Copy existing full screenshots for de + pt
ORDER_DE = ["prova-de-6.webp", "prova-de-1.webp", "prova-de-2.webp", "prova-de-3.webp", "prova-de-4.webp", "prova-de-5.webp"]
NOVA = sorted([f for f in os.listdir(ASSETS) if f.startswith("prova-nova-")])

for i, src in enumerate(ORDER_DE, 1):
    out_dir = os.path.join(ROOT, "public/assets/social/de")
    os.makedirs(out_dir, exist_ok=True)
    Image.open(os.path.join(ASSETS, src)).save(os.path.join(out_dir, f"{i}.webp"), "WEBP", quality=88)

for i, src in enumerate(NOVA, 1):
    out_dir = os.path.join(ROOT, "public/assets/social/pt")
    os.makedirs(out_dir, exist_ok=True)
    Image.open(os.path.join(ASSETS, src)).save(os.path.join(out_dir, f"{i}.webp"), "WEBP", quality=88)

print("de + pt copies done")
