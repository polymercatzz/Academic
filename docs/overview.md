# ภาพรวมระบบ

Academic Report คือต้นแบบ (mockup) ระบบงานวิชาการของโรงเรียนมัธยม ครอบคลุมหลักสูตร ตารางสอน การบันทึกคะแนนและเช็คชื่อ และรายงานวิชาการ ใช้สาธิตหน้าจอและการทำงาน ยังไม่ใช่ระบบที่ใช้งานจริง

## เทคโนโลยี

- HTML + JavaScript ล้วน ไม่มี build step ไม่มี backend ไม่มีฐานข้อมูล
- Tailwind โหลดจาก CDN (`cdn.tailwindcss.com`) ต้องต่ออินเทอร์เน็ต หน้าตารางสอนใช้ SheetJS (xlsx) จาก CDN ส่วนรายงานใช้ Chart.js ที่อยู่ใน `assets/academic-report/vendor/`
- ข้อมูลทั้งหมดเป็นข้อมูลจำลองที่สร้างจาก JS และเก็บการแก้ไขไว้ใน `localStorage` ของเบราว์เซอร์ ([data.md](data.md))
- ไม่มีระบบล็อกอิน บทบาทเลือกจากปุ่มสลับใน sidebar

เปิดใช้งาน:

```bash
python3 -m http.server 8765
```

แล้วเข้า `http://localhost:8765/` ([index.html](../index.html) จะพาไปหน้า [reports/overview.html](../reports/overview.html))

## โครงสร้างโฟลเดอร์

```
index.html     redirect ไปหน้าภาพรวม
shared/        academic-layout.js (sidebar + header กลาง) · layout-compat.css
curriculum/    หลักสูตร — 3 หน้า
timetable/     ตารางสอน — 4 หน้า + timetable-core.js (engine/store) + timetable-data.js (seed)
               GLOSSARY.md · docs/adr · docs/diagrams
grading/       บันทึกคะแนน + เช็คชื่อ — 2 หน้า (SPA แบบ hash route) + assets/ ของตัวเอง
               grading-layout.js (ต่อเข้ากับ layout กลาง) · GLOSSARY.md · docs/
reports/       รายงานวิชาการ — 12 หน้า
assets/academic-report/   CSS, JS core/module ของ reports/academic-report.html, Chart.js, mock JSON
docs/          เอกสารภาพรวมนี้
```

## โมดูล

| โมดูล | ทำอะไร | ผู้ใช้หลัก |
|---|---|---|
| **หลักสูตร** | จัดการหลักสูตร แผนการเรียน รายวิชา และมอบหมายครูผู้สอน | admin |
| **ตารางสอน** | สร้าง จัด (เองหรืออัตโนมัติ) และเผยแพร่ตารางสอน · ครูดูตาราง กรอกเวลาไม่ว่าง ยื่นคำร้องเปลี่ยนการจัด · admin อนุมัติคำร้อง | admin, ครู |
| **บันทึกคะแนนและเช็คชื่อ** | ครูตั้งโครงสร้างคะแนน กรอกคะแนน เช็คชื่อรายคาบ และส่งผล · admin ตรวจ อนุมัติ หรือตีกลับ | ครู, admin |
| **รายงานวิชาการ** | รายงานภาพรวม สอบซ่อม นักเรียนต้องปรับปรุง จัดอันดับ ผลการเรียนรู้ การเข้าเรียน ผู้ไม่มีสิทธิ์สอบ คะแนนเฉลี่ย ระเบียนสะสม/GPAX | admin (มีหน้าเดียวสำหรับครู) |

รายละเอียดทีละหน้าอยู่ใน [modules.md](modules.md)

## ลำดับงานตามธุรกิจ

ลำดับนี้คือลำดับในโลกจริง ในโค้ดแต่ละโมดูลยังใช้ข้อมูลจำลองของตัวเอง ไม่ได้ส่งต่อข้อมูลกันจริง ([data.md](data.md#จุดที่ยังไม่เชื่อมกัน))

```
หลักสูตร ── มอบหมายสอน ──▶ ตารางสอน ── เผยแพร่ ──▶ ครูสอนและเช็คชื่อรายคาบ
                                                       │
                                                       ▼
                         รายงานวิชาการ ◀── อนุมัติ ◀── ครูกรอกคะแนนและส่งผล
                                              (admin ตรวจ / ตีกลับ)
```

## ส่วนกลาง: `shared/academic-layout.js`

ทุกหน้าโหลด [shared/academic-layout.js](../shared/academic-layout.js) แล้วเรียก `AcademicLayout.mount({...})` ไฟล์นี้ทำหน้าที่

- วาด sidebar และ header ลงใน `#layoutSidebar` / `#layoutHeader`
- เลือกชุดเมนูตามบทบาทใน `localStorage['tt-role']`: admin เห็น หลักสูตร / ตารางเรียน / รายงานวิชาการ / ผลการเรียน ส่วนครูเห็น งานของฉัน / บันทึกคะแนน / เช็คชื่อ
- แปลงลิงก์ที่เขียนเป็นชื่อไฟล์ให้เป็น path เต็มด้วย `PAGE_DIRS` จึงใช้ได้จากทุกโฟลเดอร์และใช้ผ่าน `file://` ได้
- แสดงกระดิ่งแจ้งเตือนและตัวเลขบนเมนู "คำขออนุมัติ" โดยอ่านจาก store ของตารางสอน (`tt-store-v1`)
- ปุ่มสลับบทบาท (เปลี่ยน `tt-role` แล้วไปหน้า home ของบทบาทนั้น) และปุ่มรีเซ็ตข้อมูลตัวอย่าง (ลบ `tt-store-v1` และ `gradebook-demo-v2`)
- จำตำแหน่ง scroll ของ sidebar ไว้ใน `sessionStorage`

API ที่หน้าอื่นใช้: `mount(options)`, `refresh()`, `role()`, `url(file)` ดูวิธีใช้ใน [adding-a-page.md](adding-a-page.md)

หน้าในโมดูล grading ไม่ได้เรียก `mount` เอง แต่ใช้ [grading/grading-layout.js](../grading/grading-layout.js) เป็นตัวกลาง ไฟล์นี้อ่าน hash route แล้วเลือกเมนูที่ active ส่ง persona ครูสมศรีเข้าไป และเติม breadcrumb ให้
