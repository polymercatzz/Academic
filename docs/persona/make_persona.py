"""สร้างการ์ด Persona เป็นไฟล์ draw.io (ฟอนต์ TH SarabunPSK สีโทนเดียวต่อคน ตั้งได้ที่ 'color')

ใช้: python make_persona.py            -> สร้าง persona-*.drawio ทุกคน
     ใส่รูปคน: วางไฟล์ persona-<id>.png ไว้ใน photos/ แล้วรันใหม่ (ถ้าไม่มีจะเป็นกรอบเส้นประ)
"""
import base64, html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = 'fontFamily=TH SarabunPSK;fontColor=#000000;'

PERSONAS = [
    {
        'id': 'sunisa',
        'color': ('#8A6A48', '#F4ECE2'),  # สีหลัก (เส้นและตัวอักษรเน้น) · สีอ่อน (พื้นหัวกล่อง)
        'name': 'อ.สุนิสา ปัญญาดี',
        'title': 'หัวหน้างานวิชาการ',
        'info': [
            ('อายุ', '48 ปี'),
            ('สังกัด', 'กลุ่มกิจกรรมพัฒนาผู้เรียน ไม่มีคาบสอนวิชาหลัก'),
            ('บทบาทในระบบ', 'ครูฝ่ายวิชาการ'),
            ('ใช้ระบบเมื่อ', 'ช่วงเตรียมภาคเรียน ระหว่างภาคเรียน และปลายภาคเรียน'),
        ],
        'quote': 'อยากรู้ทันทีว่าห้องไหนยังมีปัญหา',
        'boxes': [
            ('เป้าหมาย', [
                'เผยแพร่ตารางสอนทันเวลา ไม่มีการชน และตรงกับเวลาไม่ว่างของครู',
                'เปลี่ยนตารางระหว่างภาคเรียนได้ และย้อนดูได้ว่าใครเปลี่ยนอะไร',
                'รู้ว่าห้องไหนยังไม่ส่งผล ตรวจและอนุมัติได้เร็ว',
                'ได้รายงานภาพรวมสำหรับผู้บริหาร',
            ]),
            ('งานหลัก', [
                'ดูแลหลักสูตร แผนการเรียน รายวิชา และมอบหมายครูผู้สอน',
                'จัด ตรวจการชน และเผยแพร่ตารางสอน',
                'พิจารณาคำร้องและเวลาไม่ว่างของครู',
                'ตรวจ อนุมัติ หรือตีกลับผลการเรียน และดูรายงานวิชาการ',
            ]),
            ('ปัญหาในระบบเดิม', [
                'ทุกหน้าต้องเลือกปี ภาค ชั้น และห้องใหม่',
                'รายงานเป็นตารางใหญ่ เรียงหรือกรองไม่ได้',
                'ข้อมูลที่ต้องแก้อยู่ลึกหลายหน้า',
                'ไม่รู้ว่าคาบไหนยังไม่เช็คชื่อ',
                'ไฟล์ส่งออกต้องจัดรูปแบบต่อก่อนส่งผู้บริหาร',
            ]),
        ],
    },
    {
        'id': 'somsri',
        'color': ('#6A5A9C', '#EEEAF7'),
        'name': 'ครูสมศรี ใจดี',
        'title': 'ครูผู้สอนและกรรมการฝ่ายวิชาการ',
        'info': [
            ('อายุ', '38 ปี'),
            ('ตำแหน่ง', 'ครูชำนาญการ กลุ่มสาระการเรียนรู้คณิตศาสตร์'),
            ('สอน', 'คณิตศาสตร์ ม.2 จำนวน 3 ห้อง คณิตศาสตร์เพิ่มเติม และวิทยาการคำนวณ'),
            ('หน้าที่อื่น', 'ครูประจำชั้น ม.2/1 และกรรมการฝ่ายวิชาการ'),
            ('บทบาทในระบบ', 'ครูผู้สอน และครูฝ่ายวิชาการ'),
            ('ใช้ระบบเมื่อ', 'ทุกวันเพื่อเช็คชื่อ และมากในช่วงต้นและปลายภาคเรียน'),
        ],
        'quote': 'อยากกรอกคะแนนครั้งเดียว แล้วส่งผลได้เลย',
        'boxes': [
            ('เป้าหมาย', [
                'รู้ตารางสอนของตนเอง และไม่ถูกจัดคาบตรงกับเวลาประชุม',
                'เช็คชื่อได้เร็วในต้นคาบ และรู้ล่วงหน้าว่านักเรียนคนไหนใกล้ มส',
                'กรอกคะแนนโดยไม่ต้องคำนวณเอง เห็นทันทีเมื่อกรอกผิด และส่งผลครั้งเดียว',
                'เห็นการขาดเรียนของนักเรียนในห้องประจำชั้นทุกวิชา',
            ]),
            ('งานหลัก', [
                'ดูตารางสอน ยื่นคำร้องขอเปลี่ยนการจัด และกรอกเวลาไม่ว่าง',
                'เช็คชื่อรายคาบ และติดตามนักเรียนห้องประจำชั้น',
                'ตั้งโครงสร้างคะแนน กรอกคะแนน และส่งผลการเรียน',
                'ช่วยตรวจผลการเรียนในบทบาทกรรมการฝ่ายวิชาการ',
            ]),
            ('ปัญหาในระบบเดิม', [
                'ตรวจว่าเช็คชื่อครบหรือยัง ต้องตั้งตัวกรองทุกครั้ง',
                'ต้องเลือกดูรายวัน รายสัปดาห์ หรือรายเดือนแยกกัน',
                'คะแนนเก็บอยู่หลายไฟล์',
                'ต้องรวมคะแนนและตรวจความถูกต้องเองก่อนส่งผล',
            ]),
        ],
    },
]

def esc(s): return html.escape(s, quote=True)

def cell(cid, value, style, x, y, w, h):
    return (f'<mxCell id="{cid}" value="{esc(value)}" style="{style}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')

def build(p):
    W, LEFT, GAP, PAD = 760, 250, 18, 18
    FB, FH, FN, FT = 22, 25, 28, 23   # ขนาดฟอนต์ เนื้อหา หัวกล่อง ชื่อ ตำแหน่ง (การ์ดกว้าง 760 px ย่อลงหน้า A4 ประมาณครึ่งหนึ่ง)
    CR, CL = 56, 34                   # จำนวนตัวอักษรต่อบรรทัดโดยประมาณ คอลัมน์ขวา / ซ้าย
    RX = PAD + LEFT + GAP          # x ของคอลัมน์ขวา
    RW = W - RX - PAD              # ความกว้างคอลัมน์ขวา
    LINE = 27                      # ความสูงต่อบรรทัด (18px)
    AC, TI = p.get('color', ('#000000', '#FFFFFF'))
    cells = []
    # คอลัมน์ซ้าย: รูป ชื่อ ข้อมูลทั่วไป คำพูด
    photo = os.path.join(HERE, 'photos', f"persona-{p['id']}.png")
    PW, PH = 190, 207
    px = PAD + (LEFT - PW) // 2
    if os.path.exists(photo):
        b64 = base64.b64encode(open(photo, 'rb').read()).decode()
        cells.append(cell('ph', '', f'shape=image;imageAspect=1;aspect=fixed;image=data:image/png,{b64};'
                          f'strokeColor={AC};imageBorder={AC};strokeWidth=2;', px, PAD, PW, PH))
    else:
        cells.append(cell('ph', 'รูปภาพ', 'html=1;rounded=1;arcSize=6;dashed=1;fillColor=#FFFFFF;strokeColor=#000000;'
                          f'fontSize={FB};' + FONT, px, PAD, PW, PH))
    ny = PAD + PH + 10
    cells.append(cell('nm', f'<font color="{AC}" style="font-size:{FN}px"><b>{esc(p["name"])}</b></font><br><span style="font-size:{FT}px">{esc(p["title"])}</span>',
                      'html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;' + FONT, PAD, ny, LEFT, 30 + FN + FT + (FT + 6) * (len(p['title']) // 30)))
    info = ''.join(f'<div style="margin-bottom:4px"><font color="{AC}"><b>{esc(k)}</b></font> : {esc(v)}</div>' for k, v in p['info'])
    iy = ny + 30 + FN + FT + (FT + 6) * (len(p['title']) // 30) + 6
    LH = round(FB * 1.3)
    info_h = sum(5 + LH * (1 + (len(k) + len(v) + 3) // CL) for k, v in p['info']) + 10
    cells.append(cell('in', f'<div style="font-size:{FB}px;text-align:left;line-height:1.3">{info}</div>',
                      'html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=8;' + FONT,
                      PAD, iy, LEFT, info_h))
    # คอลัมน์ขวา: กล่อง 3 กล่อง ถ้าคอลัมน์ซ้ายสูงกว่า แบ่งความสูงที่เหลือให้ทุกกล่องเท่ากัน
    HEAD = FH + 22; QH = 2 * FB + 34
    hs = [HEAD + 10 + sum(1 + len(t) // CR for t in items) * round(FB * 1.36) + 16 for _, items in p['boxes']]
    left_h = iy + info_h + 12 + (QH if p.get('quote') else 0) + PAD
    right_h = PAD + sum(hs) + GAP * (len(hs) - 1) + PAD
    extra = max(0, left_h - right_h)
    hs = [h + extra // len(hs) for h in hs]
    y = PAD
    for i, ((head, items), h) in enumerate(zip(p['boxes'], hs)):
        body = ''.join(f'<li>{esc(t)}</li>' for t in items)
        cells.append(cell(f'b{i}', f'<b style="font-size:{FH}px">{esc(head)}</b>',
                          f'swimlane;html=1;startSize={HEAD};rounded=1;arcSize=6;fillColor={TI};swimlaneFillColor=#FFFFFF;'
                          f'strokeColor={AC};align=left;spacingLeft=14;horizontal=1;' + FONT, RX, y, RW, h))
        cells.append(cell(f'l{i}', f'<ul style="margin:0;padding-left:24px;font-size:{FB}px;text-align:left;line-height:1.35">{body}</ul>',
                          'html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;verticalAlign=middle;align=left;'
                          'spacingLeft=14;spacingRight=14;' + FONT, RX, y + HEAD + 4, RW, h - HEAD - 4))
        y += h + GAP
    H = y - GAP + PAD
    if p.get('quote'):
        cells.append(cell('qt', f'<span style="font-size:{FB}px">“{esc(p["quote"])}”</span>',
                          f'html=1;whiteSpace=wrap;rounded=1;arcSize=10;fillColor={TI};strokeColor={AC};'
                          'align=center;spacingLeft=8;spacingRight=8;' + FONT, PAD, H - PAD - QH, LEFT, QH))
    frame = cell('fr', '', f'rounded=1;arcSize=2;fillColor=#FFFFFF;strokeColor={AC};strokeWidth=2;html=1;', 0, 0, W, H)
    xml = (f'<mxfile host="Claude"><diagram id="persona-{p["id"]}" name="Persona {esc(p["name"])}">'
           '<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
           'fold="1" page="0" pageScale="1" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
           + frame + ''.join(cells) + '</root></mxGraphModel></diagram></mxfile>')
    out = os.path.join(HERE, f"persona-{p['id']}.drawio")
    open(out, 'w', encoding='utf-8').write(xml)
    print('wrote', out, f'{W}x{H}')

if __name__ == '__main__':
    for p in PERSONAS: build(p)
