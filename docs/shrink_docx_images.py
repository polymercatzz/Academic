"""Shrink PNG images inside a .docx without touching its XML.
usage: python shrink_docx_images.py in.docx out.docx DPI [quantize]
Each image is resized so it has at most DPI pixels per inch at the largest size
it is shown in the document, then saved as optimized PNG (optionally 256-colour).
"""
import io, re, sys, zipfile
from PIL import Image

src, dst, dpi = sys.argv[1], sys.argv[2], int(sys.argv[3])
quant = len(sys.argv) > 4 and sys.argv[4] == 'quantize'
zin = zipfile.ZipFile(src)
names = zin.namelist()

# largest display width (EMU) per media target
disp = {}
for part in names:
    m = re.match(r'word/(document|header\d*|footer\d*)\.xml$', part)
    if not m:
        continue
    rels_name = f'word/_rels/{part[5:]}.rels'
    if rels_name not in names:
        continue
    rels = dict(re.findall(r'Id="([^"]+)"[^>]*?Target="([^"]+)"', zin.read(rels_name).decode()))
    rels.update({k: v for v, k in re.findall(r'Target="([^"]+)"[^>]*?Id="([^"]+)"', zin.read(rels_name).decode())})
    xml = zin.read(part).decode()
    for dr in re.findall(r'<w:drawing>.*?</w:drawing>', xml, re.S):
        ext = re.search(r'<wp:extent cx="(\d+)"', dr)
        emb = re.search(r'r:embed="([^"]+)"', dr)
        if ext and emb and emb.group(1) in rels:
            t = 'word/' + rels[emb.group(1)].lstrip('/').replace('word/', '')
            disp[t] = max(disp.get(t, 0), int(ext.group(1)))

before = after = 0
zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for info in zin.infolist():
    data = zin.read(info.filename)
    if info.filename.startswith('word/media/') and info.filename.lower().endswith('.png'):
        before += len(data)
        im = Image.open(io.BytesIO(data))
        im.load()
        emu = disp.get(info.filename)
        if emu:
            target_w = round(emu / 914400 * dpi)
            if im.width > target_w:
                h = round(im.height * target_w / im.width)
                im = im.convert('RGBA' if 'A' in im.getbands() or im.mode == 'P' else 'RGB').resize((target_w, h), Image.LANCZOS)
        if im.mode == 'RGBA' and im.getchannel('A').getextrema() == (255, 255):
            im = im.convert('RGB')
        if quant and im.mode in ('RGB', 'RGBA'):
            im = im.quantize(256, method=Image.Quantize.FASTOCTREE if im.mode == 'RGBA' else Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        buf = io.BytesIO()
        im.save(buf, 'PNG', optimize=True)
        new = buf.getvalue()
        if len(new) < len(data):
            data = new
        after += len(data)
        zout.writestr(info, data, zipfile.ZIP_STORED)
    else:
        zout.writestr(info, data)
zout.close()
print(f'images: {before/1e6:.1f} MB -> {after/1e6:.1f} MB')
