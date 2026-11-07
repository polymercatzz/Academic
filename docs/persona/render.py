"""แปลง persona-*.drawio เป็น PNG ด้วย diagrams.net viewer ใน Edge แบบ headless

ใช้: python render.py persona-sunisa.drawio [ชื่อไฟล์อื่น ...]
ต้องต่ออินเทอร์เน็ต (โหลด viewer-static.min.js จาก viewer.diagrams.net)
"""
import html, json, os, re, subprocess, sys, tempfile, time

EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
HERE = os.path.dirname(os.path.abspath(__file__))

def render(name):
    src = os.path.join(HERE, name)
    xml = open(src, encoding='utf-8').read()
    m = re.search(r'<mxCell id="fr"[^>]*>\s*<mxGeometry[^>]*width="(\d+)" height="(\d+)"', xml)
    w, h = (int(m.group(1)), int(m.group(2))) if m else (1000, 800)
    cfg = json.dumps({'xml': xml, 'toolbar': '', 'nav': False, 'resize': False, 'border': 0})
    page = ('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}.mxgraph{position:absolute;left:2px;top:2px}</style></head><body>'
            f'<div class="mxgraph" style="width:{w + 4}px" data-mxgraph="{html.escape(cfg, quote=True)}"></div>'
            '<script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script></body></html>')
    tmp = os.path.join(tempfile.gettempdir(), 'persona-render.html')
    open(tmp, 'w', encoding='utf-8').write(page)
    out = os.path.join(HERE, name.replace('.drawio', '.png'))
    if os.path.exists(out): os.remove(out)
    subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                    f'--window-size={w + 4},{h + 120}', '--virtual-time-budget=15000', f'--screenshot={out}',
                    'file:///' + tmp.replace('\\', '/')], check=False, capture_output=True)
    for _ in range(60):
        if os.path.exists(out) and os.path.getsize(out) > 0: break
        time.sleep(0.5)
    from PIL import Image, ImageChops
    im = Image.open(out).convert('RGB')
    bbox = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).getbbox()
    if bbox:
        m = 8
        im.crop((max(bbox[0] - m, 0), max(bbox[1] - m, 0), min(bbox[2] + m, im.width), min(bbox[3] + m, im.height))).save(out)
    print('wrote', out, os.path.exists(out))

if __name__ == '__main__':
    for n in sys.argv[1:]: render(n)
