# ข้อมูลและการจัดเก็บ

ไม่มี backend ข้อมูลทุกชุดสร้างจาก JavaScript ตอนเปิดหน้า ถ้าหน้านั้นให้แก้ไขได้ จะบันทึกการแก้ไขลง `localStorage` ของเบราว์เซอร์เครื่องนั้น ข้อมูลจึงไม่แชร์ข้ามเครื่องหรือข้ามเบราว์เซอร์

## แหล่งข้อมูลจำลอง

| โมดูล | สร้างจาก | บันทึกการแก้ไข |
|---|---|---|
| หลักสูตร | ข้อมูลฝังใน `curriculum/*.html` | ไม่บันทึก |
| ตารางสอน | `TT_SEED` ใน [timetable-data.js](../timetable/timetable-data.js) | `tt-store-v1` |
| บันทึกคะแนนและเช็คชื่อ | [data.js](../grading/assets/js/data.js) + [seed.js](../grading/assets/js/seed.js) + ตารางสอนจำลองใน [attendance-core.js](../grading/assets/js/attendance-core.js) | `gradebook-demo-v2` |
| รายงาน `academic-report.html` | `buildInlineMockDatabase()` ใน [script.js](../assets/academic-report/js/core/script.js) และ [score-per-subject.js](../assets/academic-report/js/modules/score-per-subject.js) | ไม่บันทึก (จำแค่ตัวกรองล่าสุด) |
| รายงานหน้าอื่น | `const ... = [...]` ใน `<script>` ของแต่ละหน้า | ไม่บันทึก |

## คีย์ใน `localStorage`

| คีย์ | เจ้าของ | เก็บอะไร |
|---|---|---|
| `tt-role` | `academic-layout.js`, `timetable-core.js` | บทบาทปัจจุบัน `admin` / `teacher` (ไม่มีค่า = admin) |
| `tt-store-v1` | `timetable-core.js` | store ตารางสอนทั้งหมด: ฉบับ คาบ คำร้อง เวลาไม่ว่าง การแจ้งเตือน ประวัติ (มี `schema`; ถ้าเลขไม่ตรง `SCHEMA` จะสร้าง seed ใหม่) |
| `gradebook-demo-v2` | `grading/assets/js/app.js`, `attendance.js` | ห้องเรียนที่สอน คะแนน ผลสอบซ่อม (`sec.remedialAttempts`) รอบการตรวจ คำขอปลดล็อก การเช็คชื่อและวันหยุด (`db.att`, `db.att.holidays`) และชุมนุม (`db.clubs`) · ข้อมูลที่บันทึกไว้ก่อนมีชุมนุมและวันหยุด จะได้ชุมนุมตัวอย่างเพิ่มแต่ไม่มีวันหยุดตัวอย่าง (กดรีเซ็ตเพื่อให้ได้ครบ) |
| `gradebook-demo-role` | `grading/assets/js/app.js` | มุมมองของแอป grading · `grading-layout.js` ตั้งค่าให้ตาม `tt-role` ทุกครั้ง |
| `studentResultsData` | `reports/subject-results.html` | ข้อมูลที่ส่งต่อไปยัง `student-results-detail.html` |
| `*:lastSearch` | หน้ารายงานทุกหน้า ผ่าน `AcademicLayout.lastSearch()` | ตัวกรองที่ค้นล่าสุด: `attendanceReport`, `unableExamReport:index`, `scorePerSubject`, `averageScoreYear`, `recordReport` (ใน `academic-report.html`) · `subjectResults`, `failStudentDetail`, `studentRetakeManagement`, `studentListByClassroom`, `studentScoreRanking`, `teacherAttendance` |

`sessionStorage['ar-sidebar-scroll']` เก็บตำแหน่ง scroll ของ sidebar · หน้าสอบซ่อมและรายชื่อตามห้องใช้ `sessionStorage` เพิ่มเพื่อคืนตำแหน่ง scroll และตารางเมื่อกดย้อนกลับจากหน้ารายละเอียด

ปีการศึกษาที่ถือเป็น "ปัจจุบัน" อยู่ที่ `CURRENT_TERM` ใน `academic-layout.js` (อ่านผ่าน `AcademicLayout.currentTerm`) ข้อมูลจำลองทุกโมดูลใช้ปี 2569

ปุ่ม "รีเซ็ตข้อมูลตัวอย่าง" ใน sidebar ลบเฉพาะ `tt-store-v1` และ `gradebook-demo-v2` (รายชื่ออยู่ใน `DEMO_STORES` ของ `academic-layout.js`) ถ้าเพิ่ม store ใหม่ที่ต้องรีเซ็ตได้ ให้เพิ่มคีย์ในรายการนั้นด้วย

## การสื่อสารระหว่างหน้า

- หน้าในโมดูลตารางสอนและ layout กลางอ่านจาก `tt-store-v1` ชุดเดียวกัน หลังแก้ store ให้เรียก `AcademicLayout.refresh()` เพื่อวาดตัวเลขบนเมนูและกระดิ่งใหม่ ถ้าเปิดหลายแท็บ ระบบจะ sync ผ่าน event `storage`
- `scores.html` และ `attendance.html` ใช้ `gradebook-demo-v2` ชุดเดียวกัน เวลาเรียน (%) ที่เห็นในหน้าเช็คชื่อจึงเป็นตัวเลขเดียวกับที่ใช้ตัดสิน มส ในหน้าผลการเรียน ([grading ADR 0011](../grading/docs/adr/0011-attendance-drives-ms-and-locks-with-submission.md))

## จุดที่ยังไม่เชื่อมกัน

สิ่งที่ควรรู้ก่อนแก้หรือก่อนสาธิต

1. **ข้อมูลแต่ละโมดูลแยกกัน** — หลักสูตร ตารางสอน grading และรายงาน ต่างมีข้อมูลจำลองของตัวเอง การมอบหมายสอนในหน้าหลักสูตรไม่ได้ไหลไปที่ตารางสอน ตารางสอนที่เผยแพร่ไม่ได้ไหลไปที่หน้าเช็คชื่อ (grading ใช้ตารางสอนจำลองใน `attendance-core.js`) และคะแนนที่อนุมัติแล้วไม่ได้ไหลไปที่รายงาน
2. **persona ไม่ตรงกัน** — ครูในตารางสอนคือ อ.อนุชา แสงทอง (`t05`) แต่ครูใน grading คือครูสมศรี ใจดี (`u1`) ส่วน admin ในตารางสอนคือ อ.สุนิสา ชุดที่ตกลงแล้วและรายการที่ต้องแก้อยู่ใน [personas.md](personas.md)
3. **รหัสคนละชุด** — ตารางสอนใช้รหัสครู `t01`–`t26` ส่วน grading ใช้ `u1`–`u13`
4. **หน้าหลักสูตรไม่บันทึก** — แก้แล้วรีโหลดหน้าจะหายหมด
5. **mock JSON ที่ไม่ได้ใช้** — ไฟล์ใน `assets/academic-report/data/mock/*.json` ไม่มีโค้ดส่วนไหนโหลด เพราะ `script.js` สร้างข้อมูลชุดเดียวกันแบบ inline (`buildInlineMockDatabase`) ซึ่งใช้ผ่าน `file://` ได้ ถ้าแก้ข้อมูลรายงานต้องแก้ใน JS ไม่ใช่ใน JSON ส่วน `.DS_Store` ในโฟลเดอร์ `assets/` เป็นไฟล์ขยะจาก macOS
6. **สิทธิ์บังคับแค่ระดับหน้าจอ** — หน้ารายงานและหน้าหลักสูตรไม่ตรวจบทบาท ถ้าเปิด URL ตรงก็เข้าได้ทุกบทบาท
7. **ER ไม่ครบ** — [grading/docs/er-tables.drawio](../grading/docs/er-tables.drawio) เป็นไฟล์ว่าง ER ที่ใช้ได้คือ [er-diagram.html](../grading/docs/er-diagram.html) (ต้องต่ออินเทอร์เน็ตเพื่อโหลด Mermaid) และ [er-data-dictionary.md](../grading/docs/er-data-dictionary.md)
8. **ต้องต่ออินเทอร์เน็ต** — Tailwind, SheetJS และ Mermaid โหลดจาก CDN ถ้าเปิดแบบ offline หน้าจะไม่มี style
