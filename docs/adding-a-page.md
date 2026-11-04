# เพิ่มหน้าใหม่

## 1. สร้างไฟล์ในโฟลเดอร์ของโมดูล

วางไฟล์ไว้ใน `curriculum/`, `timetable/`, `reports/` หรือ `grading/` ตามโมดูล โครงหน้าขั้นต่ำมีดังนี้ (ดูตัวอย่างจริงใน [reports/subject-retake-detail.html](../reports/subject-retake-detail.html))

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ชื่อหน้า</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100">
  <div id="layoutSidebar"></div>
  <div class="lg:pl-80">
    <div id="layoutHeader"></div>
    <script src="../shared/academic-layout.js?v=10"></script>
    <script>AcademicLayout.mount({ active: 'my-page', eyebrow: 'กลุ่มเมนู', title: 'ชื่อหน้า' });</script>
    <main class="px-4 py-6 lg:px-8"><!-- เนื้อหา --></main>
  </div>
</body>
</html>
```

ใช้เลข `?v=` เดียวกับหน้าอื่น (ตอนนี้คือ `v=10`)

ตัวเลือกของ `AcademicLayout.mount`

| option | ความหมาย |
|---|---|
| `active` | `key` ของเมนูที่จะไฮไลต์ |
| `eyebrow`, `title` | ข้อความบน header |
| `rightHtml` | HTML ที่จะวางด้านขวาของ header เช่นปุ่มย้อนกลับ ถ้ามี `#timestampText` อยู่ในนั้น จะไม่แสดงการ์ด "ข้อมูลล่าสุด" ซ้ำ |
| `persona` | `{ admin?, teacher? }` แทนชื่อผู้ใช้ใน sidebar ใช้เมื่อข้อมูลจำลองของหน้าเป็นของผู้ใช้คนอื่น (เช่น grading) |

ฟังก์ชันอื่นที่ใช้ได้: `AcademicLayout.role()` คืนค่า `'admin'` / `'teacher'` · `AcademicLayout.url('file.html')` แปลงชื่อไฟล์เป็น path เต็ม · `AcademicLayout.refresh()` วาด sidebar และ header ใหม่

## 2. ลงทะเบียนใน `shared/academic-layout.js`

1. เพิ่มชื่อไฟล์ใน `PAGE_DIRS` ใต้โฟลเดอร์ของมัน ถ้าไม่เพิ่ม ลิงก์จากเมนูและจากการแจ้งเตือนจะชี้ผิดโฟลเดอร์
2. ถ้าต้องการให้หน้าอยู่ในเมนู ให้เพิ่ม item ใน `*MenuItems` ที่ตรงกับกลุ่ม: `curriculumMenuItems`, `scheduleMenuItems`, `reportMenuItems`, `reviewMenuItems` (admin) หรือ `teacherMenuItems`, `scoreMenuItems`, `checkInMenuItems` (ครู)

   ```js
   { key: 'my-page', href: 'my-page.html', label: 'ชื่อเมนู', icon: '<path d="..."/>' }
   ```

   `href` เขียนเป็นชื่อไฟล์เฉย ๆ ส่วนหน้าย่อยที่ไม่มีเมนูของตัวเอง ให้ส่ง `active` เป็น key ของหน้าแม่
3. **เพิ่มเลข `?v=N` ในทุกหน้า** ที่โหลด `academic-layout.js` ไม่อย่างนั้นเบราว์เซอร์จะใช้ไฟล์เก่าที่ cache ไว้

   ```bash
   grep -rl "academic-layout.js?v=10" --include=*.html .
   ```

## 3. ถ้าหน้าเป็นของบทบาทเดียว

ตรวจบทบาทที่หัว script แล้วแสดงข้อความแทนเนื้อหา แบบเดียวกับหน้าตารางสอน (เช่น `if (TT.role() !== 'admin')` ใน [timetable.html](../timetable/timetable.html)) หน้าที่ไม่ใช้ `TT` ให้ใช้ `AcademicLayout.role()`

## 4. ถ้าหน้าเก็บข้อมูล

- ถ้าเป็นข้อมูลตารางสอน ให้ใช้ store เดิมผ่าน `TT` (`timetable-core.js`) ไม่ต้องสร้างคีย์ใหม่
- ถ้าต้องสร้างคีย์ใหม่และต้องการให้ปุ่มรีเซ็ตลบได้ ให้เพิ่มคีย์ใน `DEMO_STORES` และบันทึกคีย์ไว้ในตารางของ [data.md](data.md)
- ครอบการอ่านเขียน `localStorage` ด้วย `try/catch` ทุกครั้ง เหมือนโค้ดเดิม

## 5. ศัพท์และการตัดสินใจ

ใช้คำตามอภิธานศัพท์ของโมดูล ([GLOSSARY-MAP.md](GLOSSARY-MAP.md)) ถ้ามีการตัดสินใจที่ย้อนกลับยาก ให้เขียน ADR ใหม่ไว้ใน `docs/adr/` ของโมดูลนั้น
