from PIL import Image, ImageDraw, ImageFont
import os

RED = (200, 16, 46)      # #C8102E
WHITE = (255, 255, 255)
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def draw_meeple(draw, cx, cy, size):
    """Draw a white meeple: rounded-rect body + circle head."""
    head_r = int(size * 0.22)
    body_w = int(size * 0.55)
    body_h = int(size * 0.52)
    shoulder_dip = int(size * 0.10)

    # Head
    head_cx = cx
    head_cy = cy - body_h // 2 - head_r + int(size * 0.04)
    draw.ellipse(
        [head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r],
        fill=WHITE
    )

    # Body: trapezoid-ish — draw as polygon
    bl = cx - body_w // 2
    br = cx + body_w // 2
    bt = cy - body_h // 2 + shoulder_dip
    bb = cy + body_h // 2
    # Shoulder dip to simulate meeple silhouette
    mid_top_l = cx - int(size * 0.08)
    mid_top_r = cx + int(size * 0.08)
    body_points = [
        (bl, bt),
        (mid_top_l, bt - shoulder_dip),
        (mid_top_r, bt - shoulder_dip),
        (br, bt),
        (br, bb),
        (bl, bb),
    ]
    draw.polygon(body_points, fill=WHITE)
    # Round bottom corners
    corner_r = int(size * 0.08)
    draw.ellipse([bl, bb - corner_r * 2, bl + corner_r * 2, bb], fill=WHITE)
    draw.ellipse([br - corner_r * 2, bb - corner_r * 2, br, bb], fill=WHITE)


def draw_dice(draw, x, y, side):
    """Draw a white dice square with red dots at top-left corner (x,y)."""
    r = int(side * 0.12)  # corner radius
    # Draw rounded square
    draw.rounded_rectangle([x, y, x + side, y + side], radius=r, fill=WHITE)

    # Draw 5 red dots (like face "5" of a die)
    dot_r = int(side * 0.09)
    pad = int(side * 0.22)
    positions = [
        (x + pad, y + pad),
        (x + side - pad, y + pad),
        (x + side // 2, y + side // 2),
        (x + pad, y + side - pad),
        (x + side - pad, y + side - pad),
    ]
    for (dx, dy) in positions:
        draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r], fill=RED)


def get_font(size):
    """Try to get a bold font, fallback to default."""
    font_paths = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/verdanab.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def get_font_regular(size):
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/verdana.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_graphic(draw, img_w, img_h, graphic_scale=1.0):
    """
    Draw the meeple + dice + 'LudiGest' text.
    graphic_scale < 1.0 adds padding (for adaptive icon).
    Returns the bounding box used.
    """
    # Central graphic zone
    zone_w = int(img_w * 0.55 * graphic_scale)
    zone_h = int(img_h * 0.45 * graphic_scale)

    meeple_size = int(min(zone_w, zone_h) * 0.75)
    dice_side = int(meeple_size * 0.42)

    # Total width: meeple + gap + dice
    gap = int(meeple_size * 0.12)
    total_w = meeple_size + gap + dice_side
    start_x = (img_w - total_w) // 2

    # Vertical center for graphic (slightly above image center to leave room for text)
    graphic_cy = int(img_h * 0.40)

    # Meeple center
    meeple_cx = start_x + meeple_size // 2
    meeple_cy = graphic_cy

    draw_meeple(draw, meeple_cx, meeple_cy, meeple_size)

    # Dice: vertically centered relative to meeple body
    dice_x = start_x + meeple_size + gap
    dice_y = meeple_cy - dice_side // 2
    draw_dice(draw, dice_x, dice_y, dice_side)

    return graphic_cy, meeple_size


def make_icon(path, w=1024, h=1024, graphic_scale=1.0):
    img = Image.new("RGB", (w, h), RED)
    draw = ImageDraw.Draw(img)

    graphic_cy, meeple_size = draw_graphic(draw, w, h, graphic_scale)

    # Text "LudiGest"
    font_size = int(w * 0.10 * graphic_scale)
    font = get_font(font_size)
    text = "LudiGest"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    text_y = int(graphic_cy + meeple_size * 0.60)
    draw.text(((w - tw) // 2, text_y), text, fill=WHITE, font=font)

    img.save(path, "PNG")
    print(f"Saved: {path}  ({w}x{h})")


def make_splash(path, w=1284, h=2778):
    img = Image.new("RGB", (w, h), RED)
    draw = ImageDraw.Draw(img)

    # Scale graphic for splash
    graphic_scale = 0.85
    zone_w = int(w * 0.55 * graphic_scale)
    zone_h = int(h * 0.45 * graphic_scale)
    meeple_size = int(min(zone_w, zone_h) * 0.75)
    dice_side = int(meeple_size * 0.42)
    gap = int(meeple_size * 0.12)
    total_w = meeple_size + gap + dice_side

    graphic_cy = int(h * 0.38)
    start_x = (w - total_w) // 2
    meeple_cx = start_x + meeple_size // 2
    draw_meeple(draw, meeple_cx, graphic_cy, meeple_size)
    dice_x = start_x + meeple_size + gap
    dice_y = graphic_cy - dice_side // 2
    draw_dice(draw, dice_x, dice_y, dice_side)

    # "LudiGest" title
    font_size_title = int(w * 0.12)
    font_title = get_font(font_size_title)
    title = "LudiGest"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    title_y = int(graphic_cy + meeple_size * 0.62)
    draw.text(((w - tw) // 2, title_y), title, fill=WHITE, font=font_title)

    # Subtitle
    font_size_sub = int(w * 0.055)
    font_sub = get_font_regular(font_size_sub)
    subtitle = "Votre ludothèque BRED"
    bbox2 = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = bbox2[2] - bbox2[0]
    sub_y = title_y + font_size_title + int(h * 0.018)
    draw.text(((w - sw) // 2, sub_y), subtitle, fill=WHITE, font=font_sub)

    img.save(path, "PNG")
    print(f"Saved: {path}  ({w}x{h})")


if __name__ == "__main__":
    out = OUTPUT_DIR
    make_icon(os.path.join(out, "icon.png"), 1024, 1024, graphic_scale=1.0)
    make_icon(os.path.join(out, "adaptive-icon.png"), 1024, 1024, graphic_scale=0.80)
    make_splash(os.path.join(out, "splash.png"), 1284, 2778)
    print("Done.")
