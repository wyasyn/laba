"""Generates the app icon, adaptive icon and splash PNGs (and their SVG sources). Needs ImageMagick.

Run: python3 scripts/generate-icons.py
"""
import math, os, subprocess

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
SRC = os.path.join(OUT, "svg")
os.makedirs(SRC, exist_ok=True)

BG_DARK = "#121212"
INK_LIGHT = "#FAFAFA"
INK_DARK = "#171717"
RED = "#FF3B30"


def arc(cx, cy, r, side, spread=42):
    a = math.radians(spread)
    sx = 1 if side == "right" else -1
    x1, y1 = cx + sx * r * math.cos(a), cy - r * math.sin(a)
    x2, y2 = cx + sx * r * math.cos(a), cy + r * math.sin(a)
    sweep = 1 if side == "right" else 0
    return f"M{x1:.1f} {y1:.1f} A{r} {r} 0 0 {sweep} {x2:.1f} {y2:.1f}"


def glyph(ink, dot, scale=1.0):
    """TV with a broadcast signal inside, drawn on a 1024 grid centred at 512."""
    cx, cy = 512, 500
    w = [
        f'<rect x="232" y="290" width="560" height="410" rx="120" fill="none" stroke="{ink}" stroke-width="58"/>',
        f'<path d="M382 712 L344 786 M642 712 L680 786" stroke="{ink}" stroke-width="58" stroke-linecap="round"/>',
        f'<circle cx="{cx}" cy="{cy}" r="42" fill="{dot}"/>',
    ]
    for r in (96, 158):
        for side in ("left", "right"):
            w.append(f'<path d="{arc(cx, cy, r, side)}" fill="none" stroke="{ink}" stroke-width="36" stroke-linecap="round"/>')
    # Legs make the glyph bottom heavy, so lift it to centre it optically.
    t = f"translate({512 - 512 * scale} {512 - 512 * scale - 36 * scale}) scale({scale})"
    return f'<g transform="{t}">' + "".join(w) + "</g>"


def svg(body, bg=None):
    rect = f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{rect}{body}</svg>'


files = {
    # iOS / store icon: full bleed, no transparency.
    "icon": svg(glyph(INK_LIGHT, RED, 0.86), BG_DARK),
    # Android adaptive foreground: glyph kept inside the 66% safe zone.
    "adaptive-icon": svg(glyph(INK_LIGHT, RED, 0.7)),
    "icon-monochrome": svg(glyph("#FFFFFF", "#FFFFFF", 0.7)),
    "splash": svg(glyph(INK_DARK, RED)),
    "splash-dark": svg(glyph(INK_LIGHT, RED)),
}

for name, content in files.items():
    path = os.path.join(SRC, f"{name}.svg")
    open(path, "w").write(content)
    subprocess.run(["magick", "-background", "none", path, "PNG32:" + os.path.join(OUT, f"{name}.png")], check=True)
    print("wrote", name)
