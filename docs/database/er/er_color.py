"""ใส่สีส้มอ่อนให้ระบบนอกขอบเขต (Service B และ Service C) ในรูป ER และเพิ่มกล่องคำอธิบายสัญลักษณ์

ใช้กับ ER ฉบับที่ 2 (PLAN-v2.md) ที่มีกรอบ Service B หลายกรอบ
- กรอบนอกขอบเขต = เซลล์ id ขึ้นต้น ext_user_box, box_b_, box_c_ (รูปกลุ่มตาราง)
  และ ext_user_pkg, ext_c_pkg (รูปภาพรวม)
- ตารางที่มุมซ้ายบนอยู่ในกรอบใด ระบายสีส้มตาม

ใช้: python er_color.py   (แก้ไฟล์ er-*.drawio ในโฟลเดอร์นี้ รันซ้ำได้ ผลเหมือนเดิม)
จากนั้น export PNG ด้วย: python er_render.py
"""
import glob, os, re
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_STROKE = '#C55A11'   # เส้นของระบบนอกขอบเขต
OUT_HEAD = '#FBD9BF'     # หัวตาราง / หัวกล่อง
OUT_BODY = '#FFF4EC'     # พื้นกรอบ / เนื้อตาราง
FONT = 'fontFamily=TH SarabunPSK;fontSize=18;fontColor=#000000;'
BOX_PREFIX = ('ext_user_box', 'box_b_', 'box_c_')
PKG_IDS = ('ext_user_pkg', 'ext_c_pkg')
NAME_B = 'ระบบงานทะเบียนและ IAM (Service B)'
NAME_C = 'Student Care Track (Service C)'


def set_style(st, **kv):
    for k, v in kv.items():
        if re.search(rf'(^|;){k}=', st): st = re.sub(rf'(^|;){k}=[^;]*', rf'\g<1>{k}={v}', st)
        else: st = st.rstrip(';') + f';{k}={v};'
    return st


def geom(c):
    g = c.find('mxGeometry')
    return [float(g.get(k, 0)) for k in ('x', 'y', 'width', 'height')] if g is not None else None


def legend(layer, items, x, y):
    for k, (style, label) in enumerate(items):
        yy = y + k * 34
        box = etree.SubElement(layer, 'mxCell', id=f'legend_box_{k}', value='', style=style, vertex='1', parent='1')
        etree.SubElement(box, 'mxGeometry', x=str(x), y=str(yy), width='46', height='24', **{'as': 'geometry'})
        txt = etree.SubElement(layer, 'mxCell', id=f'legend_txt_{k}', value=label,
                               style='text;html=1;align=left;verticalAlign=middle;' + FONT, vertex='1', parent='1')
        etree.SubElement(txt, 'mxGeometry', x=str(x + 56), y=str(yy - 3), width='700', height='30', **{'as': 'geometry'})


def top_vertices(layer):
    return [c for c in layer if c.tag == 'mxCell' and c.get('parent') == '1' and c.get('vertex') == '1']


for path in sorted(glob.glob(os.path.join(HERE, 'er-*.drawio'))):
    tree = etree.parse(path)
    layer = tree.getroot().find('.//root')
    for c in list(layer):
        if (c.get('id') or '').startswith('legend_'): layer.remove(c)

    boxes = [c for c in top_vertices(layer) if (c.get('id') or '').startswith(BOX_PREFIX)]
    pkgs = [c for c in top_vertices(layer) if c.get('id') in PKG_IDS]
    has_c = any((c.get('id') or '').startswith(('box_c_', 'ext_c_')) for c in boxes + pkgs)

    # กรอบเส้นประ: พื้นส้มอ่อน ย้ายไปไว้ล่างสุด (ต่อจากเซลล์ 0 และ 1) ไม่บังตารางและเส้น
    for b in boxes:
        b.set('style', set_style(b.get('style'), fillColor=OUT_BODY, strokeColor=OUT_STROKE))
        layer.remove(b); layer.insert(2, b)
    # กล่องในรูปภาพรวม (swimlane): หัวส้ม เนื้อส้มอ่อน
    for p in pkgs:
        p.set('style', set_style(p.get('style'), fillColor=OUT_HEAD, swimlaneFillColor=OUT_BODY, strokeColor=OUT_STROKE))

    # ตารางที่อยู่ในกรอบ
    rects = [geom(b) for b in boxes]
    n = 0
    for c in top_vertices(layer):
        st = c.get('style') or ''
        if not st.startswith('shape=table;') and not st.startswith('shape=table'): continue
        if st.startswith('shape=tableRow'): continue
        x, y, _, _ = geom(c)
        if any(bx <= x <= bx + bw and by <= y <= by + bh for bx, by, bw, bh in rects):
            c.set('style', set_style(st, fillColor=OUT_HEAD, swimlaneFillColor=OUT_BODY, strokeColor=OUT_STROKE))
            n += 1

    # กล่องคำอธิบายสัญลักษณ์ ใต้รูปชิดซ้าย
    xs, ys = [], []
    for c in top_vertices(layer):
        g = geom(c)
        if g: xs.append(g[0]); ys.append(g[1] + g[3])
    out_label = 'ระบบนอกขอบเขต : ' + NAME_B + (' และ ' + NAME_C if has_c else '')
    out_style = f'rounded=0;html=1;dashed=1;dashPattern=8 4;fillColor={OUT_HEAD};strokeColor={OUT_STROKE};'
    if pkgs:
        items = [('rounded=0;html=1;fillColor=#F2F2F2;strokeColor=#000000;', 'กลุ่มตารางของระบบงานวิชาการ'),
                 (out_style, out_label)]
    else:
        items = [('rounded=0;html=1;fillColor=#FFFFFF;strokeColor=#000000;', 'ตารางในกลุ่มตารางนี้'),
                 ('rounded=0;html=1;dashed=1;fillColor=#F2F2F2;strokeColor=#000000;', 'ตารางจากกลุ่มตารางอื่นของระบบงานวิชาการ'),
                 (out_style, out_label)]
    legend(layer, items, min(xs), max(ys) + 40)
    tree.write(path, encoding='utf-8', xml_declaration=False)
    print(os.path.basename(path), f': กรอบ {len(boxes)} กล่องภาพรวม {len(pkgs)} ตาราง {n} ตาราง เป็นสีส้มอ่อน')
