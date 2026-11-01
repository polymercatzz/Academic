# Academic_Report-
เปิดผ่าน `python3 -m http.server 8765` แล้วเข้า `http://localhost:8765/`

```
shared/       academic-layout.js — sidebar + header ที่ทุกหน้าใช้
curriculum/   หลักสูตร
timetable/    ตารางเรียน / ตารางสอน
reports/      รายงานวิชาการ
grading/      บันทึกคะแนนและเช็คชื่อ (ครู) / ตรวจผลการเรียน (admin) — มี GLOSSARY และ ADR ของตัวเอง
assets/       ไฟล์ CSS/JS ของรายงานที่ย้ายมาจาก Academic_Report-
docs/         ADR และ diagram ของตารางสอน (ดู GLOSSARY-MAP.md)
```

ลิงก์ระหว่างหน้าใน sidebar เขียนเป็นชื่อไฟล์เฉย ๆ แล้ว `academic-layout.js` จะเติมโฟลเดอร์ให้เอง (ดู `PAGE_DIRS`) — เพิ่มหน้าใหม่ต้องเพิ่มชื่อไฟล์ในนั้นด้วย

ทุกหน้าโหลด `shared/academic-layout.js?v=N` — แก้ไฟล์นี้แล้วให้เพิ่มเลข `v` ในทุกหน้า ไม่อย่างนั้นเบราว์เซอร์ (รวม Live Server) จะใช้ไฟล์เก่าที่ cache ไว้
