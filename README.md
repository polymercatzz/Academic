# Academic_Report-

ชุด prototype สำหรับระบบรายงานงานวิชาการของโรงเรียน โดยใช้ `HTML + CSS + JavaScript` และ mock data ภายใน frontend

## เอกสารหลัก

- [SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
- [STYLE_GUIDE.md](STYLE_GUIDE.md)
- [MODULE_AUTHORING_GUIDE.md](docs/MODULE_AUTHORING_GUIDE.md)
- [ATTENDANCE_REPORT.md](docs/ATTENDANCE_REPORT.md)

## โมดูลที่มีอยู่ตอนนี้

- รายงานการเข้าเรียน
- Score per Subject
- รายงานคะแนนเฉลี่ยรายปี
- รายงานผลการเรียนระเบียนสะสม / GPAX
- รายงานผู้ไม่มีสิทธิ์สอบ

## ไฟล์สำคัญ

- [index.html](index.html)
- [styles.css](assets/css/styles.css)
- [script.js](assets/js/core/script.js)
- [score-per-subject.js](assets/js/modules/score-per-subject.js)
- [average-score-year.js](assets/js/modules/average-score-year.js)
- [record-report.js](assets/js/modules/record-report.js)
- [unable-exam-report.js](assets/js/modules/unable-exam-report.js)

## แนวทางใช้งานต่อ

ถ้าจะเพิ่มระบบใหม่หรือสั่งงาน AI ให้เริ่มจาก:

1. อ่าน [SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
2. อ่าน [STYLE_GUIDE.md](STYLE_GUIDE.md)
3. ใช้ [MODULE_AUTHORING_GUIDE.md](docs/MODULE_AUTHORING_GUIDE.md) เป็นคู่มือสร้างโมดูลเพิ่ม
