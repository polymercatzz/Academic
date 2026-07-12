# Academic Report System Overview

## ภาพรวมระบบ

โปรเจกต์นี้เป็น prototype ระบบรายงานงานวิชาการของโรงเรียนในรูปแบบ frontend ล้วน โดยใช้ `HTML + CSS + JavaScript` และใช้ mock data ภายในไฟล์ script เพื่อจำลองพฤติกรรมของระบบจริง

เป้าหมายหลักของระบบ:

- ใช้ theme เดียวกันทั้งระบบ
- ใช้ sidebar เดียวและเปลี่ยนหน้าใน `main` เดียวกัน
- ใช้ component pattern เดียวกับ Attendance Report
- รองรับการเพิ่มโมดูลรายงานใหม่ในอนาคตโดยไม่ต้องออกแบบใหม่ทุกครั้ง
- เหมาะกับข้อมูลนักเรียนจำนวนมากและตารางแนวนอนที่ซับซ้อน

## เทคโนโลยีที่ใช้

- `index.html` เป็นโครงหน้าหลักของทุกโมดูล
- `styles.css` เป็น design system และ style กลางของทั้งระบบ
- `script.js` เป็น logic หลักของระบบ Attendance และตัวควบคุม sidebar/page switch
- script แยกตามโมดูล เช่น
  - `score-per-subject.js`
  - `unable-exam-report.js`
  - `record-report.js`

## โครงสร้างปัจจุบันของระบบ

- `attendance`
  - รายงานการเข้าเรียน
  - มี search panel, summary, quick/report view, table, edit/export action

- `score-subject`
  - Score per Subject
  - รายงานผลพัฒนาผู้เรียนรายวิชา
  - เน้นตารางแนวนอน, sticky student info, subject chooser, export, print preview

- `record-report`
  - รายงานผลการเรียนระเบียนสะสม / GPAX
  - ใช้ filter ชุดเดียวกัน แต่เปลี่ยนผลลัพธ์ตามประเภทรายงาน
  - มี preview ก่อน export/print

- `unable-exam`
  - รายงานผู้ไม่มีสิทธิ์สอบ
  - คัดกรองนักเรียนจาก attendance threshold

- `placeholder`
  - พื้นที่สำรองสำหรับโมดูลอื่นที่ยังไม่ถูกทำใน prototype

## แนวทาง UX กลางของระบบ

ทุกโมดูลควรยึด pattern เดียวกัน:

1. `Page Header`
   - eyebrow
   - title
   - subtitle
   - card ด้านขวาสำหรับค่าตั้งต้น/สถานะ

2. `Search Panel`
   - section title
   - filters ที่จัดเป็นกลุ่ม
   - ปุ่ม `ล้างเงื่อนไข` และ `ค้นหาข้อมูล`

3. `Results Panel`
   - results header
   - summary metrics ถ้าจำเป็น
   - toolbar ของตาราง
   - table / empty state / print preview panel

4. `Large Data Table`
   - sticky header
   - sticky columns ฝั่งข้อมูลนักเรียน
   - horizontal scroll
   - zebra rows
   - hover state

## ไฟล์หลักในโปรเจกต์

- [index.html](C:\Users\Panavat\Documents\GitHub\Academic_Report-\index.html)
- [styles.css](C:\Users\Panavat\Documents\GitHub\Academic_Report-\styles.css)
- [script.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\script.js)
- [score-per-subject.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\score-per-subject.js)
- [record-report.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\record-report.js)
- [unable-exam-report.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\unable-exam-report.js)

## แนวทางข้อมูล mock

ตอนนี้ระบบใช้ mock data แบบ inline ภายในแต่ละโมดูล เพื่อให้:

- เปิดไฟล์แล้วทำงานได้ทันที
- behavior ของ filter และ table มีความสัมพันธ์จริง
- นำไปแปลงเป็น API/data layer จริงได้ภายหลัง

แนวทางที่ใช้ร่วมกัน:

- filter ที่ cascade ต้องอิง relation จริง เช่น `grade -> classroom`
- ตารางต้องสะท้อนข้อมูลตาม filter จริง
- ควรมีข้อมูลหลายห้อง หลายระดับชั้น และหลายสถานะ
- ค่าที่ใช้ใน summary ต้องคำนวณจากผลลัพธ์จริงของหน้า

## การทำงานของ sidebar

sidebar ใช้ nav กลางใน `index.html` และใช้ `setActiveModule()` ใน [script.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\script.js) เพื่อ:

- เปลี่ยนปุ่ม active
- เปลี่ยนหน้า `.app-page`
- เปลี่ยนชื่อโมดูลปัจจุบันใน footer

หากเพิ่มโมดูลใหม่ ต้องเพิ่มทั้ง:

- ปุ่มใน sidebar
- `data-page` section ใน `main`
- `moduleLabels`
- รายชื่อโมดูลที่ใช้งานได้ใน `setActiveModule()`

## ข้อจำกัดปัจจุบัน

- ยังไม่มี backend จริง
- export/print ส่วนใหญ่เป็น preview + alert
- ข้อมูล mock ยังอยู่ในไฟล์ script
- ยังไม่มี routing จริงนอกเหนือจาก SPA ภายในหน้าเดียว
- ยังไม่มี test automation สำหรับ browser

## เอกสารที่เกี่ยวข้อง

- [README.md](C:\Users\Panavat\Documents\GitHub\Academic_Report-\README.md)
- [ATTENDANCE_REPORT.md](C:\Users\Panavat\Documents\GitHub\Academic_Report-\ATTENDANCE_REPORT.md)
- [STYLE_GUIDE.md](C:\Users\Panavat\Documents\GitHub\Academic_Report-\STYLE_GUIDE.md)
- [MODULE_AUTHORING_GUIDE.md](C:\Users\Panavat\Documents\GitHub\Academic_Report-\MODULE_AUTHORING_GUIDE.md)
