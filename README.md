# Academic_Report-
เปิดผ่าน `python3 -m http.server 8765` แล้วเข้า `http://localhost:8765/`

อ่านภาพรวมของระบบ (โมดูล หน้า actor ข้อมูล และวิธีเพิ่มหน้า) ได้ที่ [docs/](docs/README.md)

```
shared/       academic-layout.js — sidebar + header ที่ทุกหน้าใช้
curriculum/   หลักสูตร
timetable/    ตารางเรียน / ตารางสอน — มี GLOSSARY, ADR และ diagram ของตัวเอง
reports/      รายงานวิชาการ
grading/      บันทึกคะแนนและเช็คชื่อ (ครู) / ตรวจผลการเรียน (admin) — มี GLOSSARY และ ADR ของตัวเอง
assets/       ไฟล์ CSS/JS ของรายงานที่ย้ายมาจาก Academic_Report-
docs/         เอกสารภาพรวมของทั้งระบบ
```

ลิงก์ระหว่างหน้าใน sidebar เขียนเป็นชื่อไฟล์เฉย ๆ แล้ว `academic-layout.js` จะเติมโฟลเดอร์ให้เอง (ดู `PAGE_DIRS`) — เพิ่มหน้าใหม่ต้องเพิ่มชื่อไฟล์ในนั้นด้วย

ทุกหน้าโหลด `shared/academic-layout.js?v=N` — แก้ไฟล์นี้แล้วให้เพิ่มเลข `v` ในทุกหน้า ไม่อย่างนั้นเบราว์เซอร์ (รวม Live Server) จะใช้ไฟล์เก่าที่ cache ไว้
