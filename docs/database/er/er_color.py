"""ใส่สีส้มอ่อนให้ระบบนอกขอบเขต (ระบบงานทะเบียนและ IAM, Service B) ในรูป ER และเพิ่มกล่องคำอธิบายสัญลักษณ์

ใช้: python er_color.py   (แก้ไฟล์ er-*.drawio ในโฟลเดอร์นี้ รันซ้ำได้ ผลเหมือนเดิม)
จากนั้น export PNG: python ../../persona/render.py ไม่ใช้กับ ER ให้ใช้ er_render.py
"""
import glob, os, re
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_STROKE = '#C55A11'   # เส้นของระบบนอกขอบเขต
OUT_HEAD = '#FBD9BF'     # หัวตาราง / หัวกล่อง
OUT_BODY = '#FFF4EC'     # พื้นกรอบ / เนื้อตาราง
FONT = 'fontFamily=TH SarabunPSK;fontSize=18;fontColor=#000000;'

def set_style(st, **kv):
    for k, v in kv.items():
        if re.search(rf'(^|;){k}=', st): st = re.sub(rf'(^|;){k}=[^;]*', rf'\g<1>{k}={v}', st)
        else: st = st.rstrip(';') + f';{k}={v};'
    return st

def geom(c):
    g = c.find('mxGeometry')
    return [float(g.get(k, 0)) for k in ('x', 'y', 'width', 'height')] if g is not None else None

def legend(root_layer, items, x, y):
    cells = []
    for k, (style, label) in enumerate(items):
        yy = y + k * 34
        cells.append(etree.Element('mxCell', id=f'legend_box_{k}', value='', style=style, vertex='1', parent='1'))
        etree.SubElement(cells[-1], 'mxGeometry', x=str(x), y=str(yy), width='46', height='24', **{'as': 'geometry'})
        cells.append(etree.Element('mxCell', id=f'legend_txt_{k}', value=label,
                                   style='text;html=1;align=left;verticalAlign=middle;' + FONT, vertex='1', parent='1'))
        etree.SubElement(cells[-1], 'mxGeometry', x=str(x + 56), y=str(yy - 3), width='420', height='30', **{'as': 'geometry'})
    for c in cells: root_layer.append(c)

for path in sorted(glob.glob(os.path.join(HERE, 'er-*.drawio'))):
    tree = etree.parse(path); root = tree.getroot()
    layer = root.find('.//root')
    for c in list(layer):
        if (c.get('id') or '').startswith('legend_'): layer.remove(c)
    cells = {c.get('id'): c for c in layer.iter('mxCell')}
    box = cells.get('ext_user_box') if cells.get('ext_user_box') is not None else cells.get('ext_user_pkg')
    if box is None:  # ไม่มีระบบนอกขอบเขต ใส่เฉพาะคำอธิบายสัญลักษณ์ 2 แบบ
        xs, ys = [], []
        for c in layer.iter('mxCell'):
            if c.get('parent') == '1' and c.get('vertex') == '1':
                g = geom(c); xs += [g[0]]; ys += [g[1] + g[3]]
        legend(layer, [('rounded=0;html=1;fillColor=#FFFFFF;strokeColor=#000000;', 'ตารางในกลุ่มตารางนี้'),
                       ('rounded=0;html=1;dashed=1;fillColor=#F2F2F2;strokeColor=#000000;', 'ตารางจากกลุ่มตารางอื่นของระบบงานวิชาการ')],
               min(xs), max(ys) + 40)
        tree.write(path, encoding='utf-8', xml_declaration=False)
        print(os.path.basename(path), ': ไม่มีระบบนอกขอบเขต ใส่เฉพาะคำอธิบายสัญลักษณ์'); continue
    overview = box.get('id') == 'ext_user_pkg'
    bx, by, bw, bh = geom(box)
    if overview:
        box.set('style', set_style(box.get('style'), fillColor=OUT_HEAD, swimlaneFillColor=OUT_BODY, strokeColor=OUT_STROKE))
    else:
        box.set('style', set_style(box.get('style'), fillColor=OUT_BODY, strokeColor=OUT_STROKE))
        layer.remove(box); layer.insert(2, box)   # กรอบอยู่ล่างสุด ไม่บังตาราง
    n = 0
    for c in layer.iter('mxCell'):
        if c.get('parent') != '1' or c.get('vertex') != '1' or c is box: continue
        g = geom(c)
        if g and (c.get('style') or '').startswith('shape=table') and bx <= g[0] <= bx + bw and by <= g[1] <= by + bh:
            c.set('style', set_style(c.get('style'), fillColor=OUT_HEAD, swimlaneFillColor=OUT_BODY, strokeColor=OUT_STROKE))
            n += 1
    # กล่องคำอธิบายสัญลักษณ์ ใต้รูปชิดซ้าย
    xs, ys = [], []
    for c in layer.iter('mxCell'):
        if c.get('parent') == '1' and c.get('vertex') == '1':
            g = geom(c); xs += [g[0]]; ys += [g[1] + g[3]]
    lx, ly = min(xs), max(ys) + 40
    out_style = f'rounded=0;html=1;dashed=1;dashPattern=8 4;fillColor={OUT_HEAD};strokeColor={OUT_STROKE};'
    if overview:
        items = [('rounded=0;html=1;fillColor=#F2F2F2;strokeColor=#000000;', 'กลุ่มตารางของระบบงานวิชาการ'),
                 (out_style, 'ระบบนอกขอบเขต : ระบบงานทะเบียนและ IAM (Service B)')]
    else:
        items = [('rounded=0;html=1;fillColor=#FFFFFF;strokeColor=#000000;', 'ตารางในกลุ่มตารางนี้'),
                 ('rounded=0;html=1;dashed=1;fillColor=#F2F2F2;strokeColor=#000000;', 'ตารางจากกลุ่มตารางอื่นของระบบงานวิชาการ'),
                 (out_style, 'ระบบนอกขอบเขต : ระบบงานทะเบียนและ IAM (Service B)')]
    legend(layer, items, lx, ly)
    tree.write(path, encoding='utf-8', xml_declaration=False)
    print(os.path.basename(path), f': กรอบ + ตาราง {n} ตาราง เป็นสีส้มอ่อน, เพิ่มคำอธิบายสัญลักษณ์')
