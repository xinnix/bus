from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2400, 1200
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

brand_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Didot.ttc", 205, index=0)
serif_bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf", 105)
serif_italic = ImageFont.truetype("/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf", 78)
cjk_font = ImageFont.truetype("/Users/xinnix/Library/Fonts/PingFang.ttc", 92, index=0)
cjk_small = ImageFont.truetype("/Users/xinnix/Library/Fonts/PingFang.ttc", 54, index=0)

def text_width(draw, text, font, spacing=0):
    if not text:
        return 0
    w = 0
    for ch in text:
        box = draw.textbbox((0, 0), ch, font=font)
        w += box[2] - box[0] + spacing
    return w - spacing if w else 0

def draw_spaced(draw, xy, text, font, fill, spacing=0, anchor_center_x=None):
    x, y = xy
    total = text_width(draw, text, font, spacing)
    if anchor_center_x is not None:
        x = anchor_center_x - total / 2
    for ch in text:
        bbox = draw.textbbox((0, 0), ch, font=font)
        draw.text((x, y), ch, font=font, fill=fill)
        x += bbox[2] - bbox[0] + spacing
    return total

white = (255, 255, 255, 255)
shadow = (20, 0, 30, 90)

# Brand with generous letterspacing
brand = "LUO LIH-FEN"
brand_spacing = 28
# shadow
draw_spaced(d, (0, 105), brand, brand_font, shadow, brand_spacing, anchor_center_x=W/2 + 4)
draw_spaced(d, (0, 101), brand, brand_font, white, brand_spacing, anchor_center_x=W/2)

# English lines
for text, font, y in [
    ("Gardenia Peptides", serif_bold, 405),
    ("Firming Sculpt Cream", serif_italic, 545),
]:
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2 + 3, y + 3), text, font=font, fill=shadow)
    d.text(((W - tw) / 2, y), text, font=font, fill=white)

# Chinese product name
cn = "罗丽芬栀萃多肽紧塑霜"
bbox = d.textbbox((0, 0), cn, font=cjk_font)
tw = bbox[2] - bbox[0]
cx = (W - tw) / 2
d.text((cx + 2, 735 + 2), cn, font=cjk_font, fill=shadow)
d.text((cx, 735), cn, font=cjk_font, fill=white)

# Net weight, right of Chinese line
nw = "净含量:50g"
bbox = d.textbbox((0, 0), nw, font=cjk_small)
tw2 = bbox[2] - bbox[0]
d.text((cx + tw + 55, 790), nw, font=cjk_small, fill=white)

img.save("assets/product/label_texture.png")

# preview on a purple background
bg = Image.new("RGBA", (W, H), (54, 22, 61, 255))
bg.alpha_composite(img)
bg.convert("RGB").save("assets/product/label_preview.jpg", quality=95)
print("saved", os.path.getsize("assets/product/label_texture.png"))
