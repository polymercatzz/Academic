# โมดูลและหน้า

ทุกหน้าโหลด `shared/academic-layout.js` ตารางในแต่ละหัวข้อบอกว่าหน้าอยู่ในเมนูของบทบาทไหน ทำอะไร และใช้ไฟล์ใดนอกจากตัวมันเอง

## หลักสูตร — `curriculum/`

ข้อมูลฝังอยู่ในแต่ละหน้า ไม่ได้บันทึกลง `localStorage` รีโหลดแล้วการแก้ไขหายหมด

| หน้า | เมนู | ทำอะไร |
|---|---|---|
| [curriculum-management.html](../curriculum/curriculum-management.html) | admin · จัดการหลักสูตร | ค้นหาและดูหลักสูตร จัดการแผนการเรียน (เพิ่ม แก้ ทำสำเนา ลบ นำเข้า) เพิ่มรายวิชาเข้าแผน และ**มอบหมายครูผู้สอน**ให้แต่ละห้อง รองรับครูร่วมสอนและปุ่มกำหนดครูอัตโนมัติ · รองรับ hash `#<curriculumId>/<planId>` เพื่อลิงก์ตรงไปยังแผน |
| [course-management.html](../curriculum/course-management.html) | admin · จัดการรายวิชา | ค้นหาและกรองรายวิชา เพิ่ม แก้ ทำสำเนา ลบ สร้างรหัสวิชาอัตโนมัติตามหลักการกำหนดรหัส นำเข้าจาก Excel (ตรวจข้อมูลก่อนยืนยัน) ตั้งองค์ประกอบคะแนนและเกณฑ์ผ่านรายวิชา |
| [curriculum-structure.html](../curriculum/curriculum-structure.html) | admin · โครงสร้างหลักสูตร | หน้าอ้างอิงแบบอ่านอย่างเดียว: โครงสร้างหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับเดิมและฉบับปรับปรุง) โครงสร้างเวลาเรียน เกณฑ์วัดผลและเกณฑ์จบ |

## ตารางสอน — `timetable/`

- [timetable-core.js](../timetable/timetable-core.js) (`window.TT`): store, กฎตรวจ Conflict และคำเตือน (`evaluate`, `computeIssues`), จัดอัตโนมัติ (`autoSchedule`), ตรวจความพร้อม (`readiness`), วงจรฉบับ (`copyVersion`, `publish`, `divergence`, `mergeDivergence`), คำร้อง (`submitRequest`, `decideRequest`), นำเข้า Excel (`validateImport`) และ UI ร่วม (toast, confirm, grid, timeline)
- [timetable-data.js](../timetable/timetable-data.js) (`window.TT_SEED`): ข้อมูลจำลองแบบ deterministic รหัสวิชา แผน และครู `t01`–`t26` ตรงกับ `curriculum-management.html`
- ลำดับการโหลด: tailwind → `timetable-core.js` → `timetable-data.js` → script ของหน้า
- ศัพท์: [timetable/GLOSSARY.md](../timetable/GLOSSARY.md) · ADR: [timetable/docs/adr/](../timetable/docs/adr/) · ภาพ flow: [teaching-schedule-swimlane.html](../timetable/docs/diagrams/teaching-schedule-swimlane.html)

| หน้า | เมนู | ทำอะไร |
|---|---|---|
| [timetable.html](../timetable/timetable.html) | admin · ตารางสอน | จัดการฉบับ (ร่าง / เผยแพร่ / ฉบับเก่า) สร้างใหม่หรือคัดลอกเป็นฉบับร่าง ตั้งโครงสร้างเวลาแยกตามช่วงชั้นและกิจกรรมล็อกเวลา ตั้งเงื่อนไขการจัด จัดเองแบบลากวางหรือจัดอัตโนมัติ ตรวจ Conflict ด้วยเวลาจริง นำเข้าและส่งออก Excel แล้วเผยแพร่ |
| [timetable-approvals.html](../timetable/timetable-approvals.html) | admin · คำขออนุมัติ (มีตัวเลขค้าง) | พิจารณาคำร้องขอเปลี่ยนการจัด (อนุมัติ / อนุมัติพร้อมแก้ไข / ไม่อนุมัติ โดยดูก่อนและหลัง) และเวลาไม่ว่างของครู การอนุมัติคำร้องสร้างฉบับเผยแพร่ใหม่ทันที ([ADR 0001](../timetable/docs/adr/0001-published-timetable-is-immutable.md)) |
| [my-timetable.html](../timetable/my-timetable.html) | ครู · ตารางสอนของฉัน | ดูตารางสอนของตนเอง ตารางเรียนรายห้อง และตารางการใช้ห้อง ยื่นหรือยกเลิกคำร้องขอเปลี่ยนการจัด ส่งออก Excel และ PDF |
| [teacher-profile.html](../timetable/teacher-profile.html) | ครู · โปรไฟล์และเวลาไม่ว่าง | ดูรายวิชาที่สอนได้ กรอก แก้ ลบ หรือคัดลอกเวลาไม่ว่างประจำสัปดาห์จากภาคก่อน ได้จนถึงวันปิดรับ |

## บันทึกคะแนนและเช็คชื่อ — `grading/`

เป็นแอปที่ยกมาจาก demo เดิม เก็บโค้ดไว้ตามเดิมใน `grading/assets/` และต่อเข้า layout กลางผ่าน [grading-layout.js](../grading/grading-layout.js) รายละเอียดและลำดับสาธิตอยู่ใน [grading/README.md](../grading/README.md)

| ไฟล์ | หน้าที่ |
|---|---|
| `assets/js/data.js` | ค่าคงที่: ผู้ใช้ รายวิชา ห้อง การมอบหมายครู เกณฑ์เกรด คุณลักษณะฯ ตัวชี้วัด |
| `assets/js/seed.js` | สร้างข้อมูลจำลองทั้งโรงเรียน (ม.1–ม.3 × 3 ห้อง × 9 วิชา) ให้มีครบทุกสถานะ |
| `assets/js/attendance-core.js` | ตารางสอนจำลองของ grading และการคำนวณเวลาเรียน (%) ใช้ร่วมกันทั้งสองหน้า |
| `assets/js/app.js` | router, การคำนวณผลการเรียน, ตารางกรอกคะแนน, การส่งผล (มุมมองครู) |
| `assets/js/academic.js` | มุมมองฝ่ายวิชาการ: ภาพรวม กล่องงาน หน้าตรวจ หมุดข้อสังเกต รายงาน |
| `assets/js/attendance.js` | หน้าเช็คชื่อรายคาบ |
| `assets/js/remedial.js` | บันทึกผลการสอบซ่อม (UC-20) และกฎการสอบซ่อม (`remedialPassed`) ที่ใช้คำนวณระดับผลการเรียน |
| `assets/js/clubs.js` | ชุมนุม: ครูที่ปรึกษาบันทึกผล ผ / มผ และฝ่ายวิชาการเปิดชุมนุมและตรวจผล (UC-27) |
| `assets/js/holidays.js` | วันหยุดของโรงเรียน (UC-25) · การข้ามคาบในวันหยุดอยู่ที่ `holidayOn` ใน `attendance-core.js` |

| หน้า / route | เมนู | ทำอะไร |
|---|---|---|
| `scores.html#/` | ครู · รายวิชาของฉัน | การ์ดของแต่ละห้องที่สอน แสดงความคืบหน้า สถานะ และวันที่เหลือก่อนกำหนดส่ง |
| `scores.html#/s/<id>` | ครู | หน้าห้องเรียนที่สอน: โครงสร้างคะแนน (ต้องรวม 100%) กรอกคะแนน (ใช้คีย์บอร์ด วางจาก Excel ได้) ผลการเรียนและส่งผล ประวัติการแก้ไข ขอปลดล็อก |
| `scores.html#/followup` | ครู · นักเรียนที่ต้องติดตาม | นักเรียนที่ได้ 0 / ร / มส ในห้องที่ตนสอน |
| `scores.html#/remedial` | ครู · บันทึกผลสอบซ่อม | นักเรียนที่ได้ 0 ในห้องที่ตนสอน บันทึกผลได้ไม่เกิน 2 ครั้ง ผ่าน 50% ได้ระดับ 1 บันทึกได้หลังอนุมัติแต่ไม่ได้ระหว่างรอตรวจ ([grading ADR 0012](../grading/docs/adr/0012-remedial-after-approval.md)) |
| `scores.html#/clubs` | ครู · ชุมนุมของฉัน | การ์ดชุมนุมที่เป็นครูที่ปรึกษา · `#/clubs/<id>` เพิ่ม/นำออกสมาชิก กรอกเวลาเข้าร่วม (%) ให้ ผ / มผ (เสนอตามเวลาเข้าร่วม) แล้วส่งผล |
| `scores.html#/criteria` | ทั้งสองบทบาท · เกณฑ์การตัดสินผล | เกณฑ์เกรดและเกณฑ์ มส |
| `scores.html#/a` | admin · ภาพรวมทั้งโรงเรียน | ตาราง ห้อง × รายวิชา สีตามสถานะ มีตัวกรอง และแท็บรายครู |
| `scores.html#/a/inbox` | admin · กล่องงาน | ห้องที่รอตรวจ (อนุมัติหลายห้องพร้อมกันได้) และคำขอปลดล็อก |
| `scores.html#/a/s/<id>` | admin | หน้าตรวจแบบอ่านอย่างเดียว โหมดปักหมุด แล้วตีกลับ (ต้องมีเหตุผล) หรืออนุมัติ |
| `scores.html#/a/clubs` | admin · ชุมนุมและกิจกรรม | เปิด แก้ ลบชุมนุม กำหนดครูที่ปรึกษาและจำนวนรับ ดูผล แล้วอนุมัติหรือตีกลับพร้อมเหตุผล |
| `scores.html#/a/holidays` | admin · วันหยุดของโรงเรียน (เมนูตารางเรียน) | เพิ่มหรือลบวันหยุดในภาคเรียน คาบในวันหยุดไม่ต้องเช็คชื่อและไม่นับเวลาเรียน เตือนเมื่อกำหนดย้อนหลังทับคาบที่เช็คแล้ว |
| `scores.html#/a/reports` | admin · รายงานภาพรวม | ส่งออก CSV สถานะการส่ง และนักเรียน 0 / ร / มส ทั้งโรงเรียน |
| `attendance.html#/` | ครู · คาบวันนี้ | คาบที่สอนวันนี้ กดเช็คชื่อ (ค่าเริ่มต้นคือมาทุกคน กด `1`–`4` = มา / สาย / ลา / ขาด) และคาบที่ยังไม่เช็ค |
| `attendance.html#/sections` | ครู · ห้องที่ฉันสอน | เวลาเรียนรายห้องรายนักเรียน รายชื่อ มส (`/ms`) และกลุ่มเสี่ยง (`/risk`) |
| `attendance.html#/h` | ครู · ห้องประจำชั้น ม.2/1 | ตารางนักเรียน × คาบของทุกวิชาในหนึ่งวัน (ดูอย่างเดียว) และสรุปทั้งภาค (`/h/sum`) |

วงจรสถานะของห้องเรียนที่สอน ([grading ADR 0002](../grading/docs/adr/0002-section-status-lifecycle.md)):

```
nostructure ──▶ draft ──ส่งผล──▶ pending ──อนุมัติ──▶ approved
                  ▲                 │
                  └──── ตีกลับ ─────┘          (ขอปลดล็อก → admin อนุมัติ → กลับเป็น draft)
```

## รายงานวิชาการ — `reports/`

หน้าส่วนใหญ่เป็นหน้าเดี่ยวที่ฝังข้อมูลจำลองไว้ใน `<script>` ของตัวเอง

| หน้า | เมนู | ทำอะไร |
|---|---|---|
| [overview.html](../reports/overview.html) | admin · ภาพรวม | ความคืบหน้างานวิชาการของปีการศึกษา งานที่ต้องดำเนินการ นักเรียนที่ต้องติดตาม สัญญาณที่ควรตรวจสอบ · เป็นหน้าแรกของระบบ |
| [student-retake-management.html](../reports/student-retake-management.html) | admin · รายงานผลการสอบซ่อม | ภาพรวมการสอบซ่อม แยกมุมมองรายนักเรียนและรายวิชา (`?view=subject`) |
| ↳ [student-retake-detail.html](../reports/student-retake-detail.html) | (หน้าย่อย) | รายละเอียดการสอบซ่อมของนักเรียนหนึ่งคน |
| ↳ [subject-retake-detail.html](../reports/subject-retake-detail.html) | (หน้าย่อย) | รายละเอียดการสอบซ่อมของรายวิชาหนึ่ง |
| ↳ [student-list-by-classroom.html](../reports/student-list-by-classroom.html) | (หน้าย่อย) | รายชื่อนักเรียนสอบซ่อมแยกตามห้อง |
| [fail-student-detail.html](../reports/fail-student-detail.html) | admin · รายงานนักเรียนต้องปรับปรุง | รายชื่อนักเรียนที่ได้ 0 / ร / มส พร้อมตัวกรอง |
| [student-score-ranking.html](../reports/student-score-ranking.html) | admin · รายงานจัดอันดับคะแนนรายวิชา | เลือกรายวิชาเพื่อดูอันดับคะแนน |
| ↳ [student-score-ranking-detail.html](../reports/student-score-ranking-detail.html) | (หน้าย่อย) | อันดับคะแนนของรายวิชาที่เลือก |
| [subject-results.html](../reports/subject-results.html) | admin · รายงานสรุปผลการเรียนรู้ | สรุปผลการเรียนรายวิชา ส่งข้อมูลไปหน้ารายละเอียดผ่าน `localStorage['studentResultsData']` |
| ↳ [student-results-detail.html](../reports/student-results-detail.html) | (หน้าย่อย) | รายละเอียดผลการเรียนของรายวิชา |
| [academic-report.html](../reports/academic-report.html) | admin · 5 เมนู · ครู · รายงานผู้ไม่มีสิทธิ์สอบ | หน้าเดียวที่สลับรายงานด้วย hash (ดูด้านล่าง) · บทบาทครูเปิดได้เฉพาะ `#unable-exam` และเห็นเฉพาะห้องและรายวิชาที่ตนสอน (ครู persona คือ อ.อนุชา สอนคณิตฯ ม.1/1 ม.1/2 ม.2/1) |
| [teacher-attendance.html](../reports/teacher-attendance.html) | ครู · รายงานการเข้าเรียน | รายงานการเข้าเรียนในมุมมองครูคณิตศาสตร์ |

`academic-report.html` ใช้ไฟล์ใน [assets/academic-report/](../assets/academic-report/)

| hash | รายงาน | module |
|---|---|---|
| `#attendance` | การเข้าเรียน | `js/core/script.js` |
| `#unable-exam` | ผู้ไม่มีสิทธิ์สอบ | `js/modules/unable-exam-report.js` |
| `#score-subject` | คะแนนรายวิชา | `js/modules/score-per-subject.js` |
| `#average-score-year` | คะแนนเฉลี่ยรายปี | `js/modules/average-score-year.js` |
| `#record-report` | ระเบียนสะสม / GPAX | `js/modules/record-report.js` |

[scope-chip.js](../assets/academic-report/js/scope-chip.js) คัดลอกข้อความจากการ์ดขอบเขตข้อมูล (เช่น "ภาคการเรียนปัจจุบัน") ในหน้า ไปแสดงเป็น chip บน header กลาง ใช้ใน `academic-report.html` และ `teacher-attendance.html`
