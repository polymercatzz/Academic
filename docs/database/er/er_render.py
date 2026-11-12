"""แปลง er-*.drawio เป็น PNG ด้วย diagrams.net viewer ใน Edge แบบ headless (scale 2 แล้วตัดขอบขาว)

ใช้: python er_render.py [er-core.drawio ...]   (ไม่ใส่ชื่อ = ทุกไฟล์)
ต้องต่ออินเทอร์เน็ต (โหลด viewer-static.min.js จาก viewer.diagrams.net)
"""
import glob, html, json, os, subprocess, sys, tempfile, time
from lxml import etree
from PIL import Image, ImageChops

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
HERE = os.path.dirname(os.path.abspath(__file__))

def extent(xml_path):
    root = etree.parse(xml_path).getroot(); xs, ys = [], []
    for c in root.iter('mxCell'):
        g = c.find('mxGeometry')
        if g is None or c.get('parent') != '1': continue
        if c.get('vertex') == '1':
            x, y = float(g.get('x', 0)), float(g.get('y', 0))
            xs += [x, x + float(g.get('width', 0))]; ys += [y, y + float(g.get('height', 0))]
        for p in g.iter('mxPoint'):
            xs.append(float(p.get('x', 0))); ys.append(float(p.get('y', 0)))
    return max(xs) - min(xs), max(ys) - min(ys)

def render(path):
    xml = open(path, encoding='utf-8').read()
    w, h = extent(path)
    cfg = json.dumps({'xml': xml, 'toolbar': '', 'nav': False, 'resize': False, 'border': 10})
    page = ('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}'
            '.mxgraph{position:absolute;left:0;top:0}</style></head><body>'
            f'<div class="mxgraph" style="width:{int(w) + 60}px" data-mxgraph="{html.escape(cfg, quote=True)}"></div>'
            '<script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script></body></html>')
    tmp = os.path.join(tempfile.gettempdir(), 'er-render.html')
    open(tmp, 'w', encoding='utf-8').write(page)
    out = path.replace('.drawio', '.png')
    if os.path.exists(out): os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                    f'--window-size={int(w) + 80},{int(h) + 160}', '--virtual-time-budget=20000', f'--screenshot={out}',
                    'file:///' + tmp.replace('\\', '/')], check=False, capture_output=True)
    for _ in range(80):
        if os.path.exists(out) and os.path.getsize(out) > 0: break
        time.sleep(0.5)
    im = Image.open(out).convert('RGB')
    bbox = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).getbbox()
    if bbox:
        m = 12
        im = im.crop((max(bbox[0] - m, 0), max(bbox[1] - m, 0), min(bbox[2] + m, im.width), min(bbox[3] + m, im.height)))
    im.save(out)
    print('wrote', os.path.basename(out), im.size)

if __name__ == '__main__':
    names = sys.argv[1:] or [os.path.basename(p) for p in sorted(glob.glob(os.path.join(HERE, 'er-*.drawio')))]
    for n in names: render(os.path.join(HERE, n))
