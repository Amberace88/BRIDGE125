"""Dev helper: tile PNGs into one contact sheet.  python3 contact.py out.png a.png b.png ..."""
import sys

from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGBA') for f in files]
cols = min(3, len(ims))
cw = max(i.width for i in ims)
ch = max(i.height for i in ims)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * cw, rows * ch), (40, 42, 48, 255))
for k, im in enumerate(ims):
    sheet.alpha_composite(im, ((k % cols) * cw, (k // cols) * ch))
sheet.save(out)
