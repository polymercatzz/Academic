# ตารางเทียบ ตารางฐานข้อมูล ↔ Use case

> ทำเมื่อ 2026-11-04 · เทียบ 58 ตารางใน `docs/database/` กับ UC-1 ถึง UC-16 ในเล่ม (หลังตัด UC-17) และหน้าจอเดโมในระบบจำลอง ([modules.md](../modules.md))
> ใช้ตัดสินว่าตารางไหนจะ (ก) เพิ่ม/ขยาย UC (ข) ตัดออกจากเล่ม หรือ (ค) ย้ายไปเป็นแผนในอนาคตในบท 5
> **อัปเดต 2026-11-04:** ตัด UC-17 ส่งออกรายงานออกจากเล่มแล้ว — UC ที่เพิ่มใหม่ในไฟล์นี้ใช้เลขหลังเลื่อน (UC-17–27, เดิม UC-18–28)

**สถานะ**

- ✓ = มี UC รองรับชัดเจน (มีใน flow หรือ pre/post-condition)
- △ = UC พูดถึงแบบผ่าน ๆ หรือใช้โดยอ้อม แต่ไม่มี flow ของตัวเอง
- ✗ = ไม่มี UC ไหนพูดถึง

## สรุป

| สถานะ | จำนวน |
|---|---|
| ✓ มี UC รองรับ | 58 |
| △ พูดถึงแต่ไม่มี flow | 0 |
| ✗ ไม่มี UC | 0 |
| **รวม** | **58** |

ตาราง ✗ และ △ เกือบทั้งหมด **มีหน้าจอในเดโมแล้ว** ปัญหาส่วนใหญ่จึงอยู่ที่ use case ในเล่มเขียนไม่ครอบคลุมสิ่งที่ระบบทำจริง ไม่ใช่ตารางเกิน ยกเว้นกลุ่มเช็คชื่อที่ขัดกับข้อ 1.3.4

> **อัปเดต 2026-11-04:** ผู้ใช้ตัดสินให้ G5–G7 อยู่ในขอบเขต → เพิ่ม UC-23 เช็คชื่อนักเรียนรายคาบ · UC-24 ตรวจสอบเวลาเรียนและผู้ไม่มีสิทธิ์สอบ · UC-25 กำหนดวันหยุดของโรงเรียน · UC-26 ประเมินคุณลักษณะอันพึงประสงค์และการอ่าน คิดวิเคราะห์ และเขียน · UC-27 จัดการชุมนุมและบันทึกผลกิจกรรม และเติมตัวชี้วัดใน UC-2, UC-11 · ทุกตารางมี UC รองรับแล้ว
> ⚠️ เดโมยังไม่มีหน้าจอ: บันทึกผลสอบซ่อม (UC-20), กำหนดวันหยุด (UC-25), บันทึกผลชุมนุม ผ/มผ (UC-27)

## ข้อเสนอแยกตามกลุ่ม

| # | กลุ่ม | ตาราง | สถานะ | มีในเดโม | ข้อเสนอ |
|---|---|---|---|---|---|
| G1 | ส่งผล ตรวจ อนุมัติ ปลดล็อก | `grade_submission`, `review_note`, `unlock_request` | ✓ (เพิ่ม UC-17–19 แล้ว 2026-11-04) | ✓ `scores.html` (ส่งผล, ขอปลดล็อก) · `#/a/inbox`, `#/a/s/<id>` (ตรวจ, ปักหมุด, ตีกลับ, อนุมัติ) | ✅ เพิ่มแล้ว: UC-17 ส่งผลการเรียน · UC-18 ตรวจและอนุมัติผลการเรียน · UC-19 ขอปลดล็อกผลการเรียน |
| G2 | สอบซ่อม | `remedial_attempt` | ✓ (เพิ่ม UC-20 แล้ว 2026-11-04) | ✓ `reports/student-retake-*` | ✅ เพิ่มแล้ว: UC-20 บันทึกผลการสอบซ่อม · ⚠️ เดโมมีแต่หน้ารายงานสอบซ่อม ยังไม่มีหน้าบันทึกผล (ดู 02-grading.md คำถามเปิด) — ต้องทำหน้าจอก่อนแคปบท 4 |
| G3 | คำร้องและเวลาไม่ว่างของครู | `schedule_change_request`, `teacher_unavailability` | ✓ (เพิ่ม UC-21, 22 แล้ว 2026-11-04) | ✓ `my-timetable.html` (ยื่นคำร้อง) · `timetable-approvals.html` · `teacher-profile.html` (เวลาไม่ว่าง) | ✅ เพิ่มแล้ว: UC-21 ยื่นและพิจารณาคำร้องขอเปลี่ยนการจัดตารางสอน · UC-22 กรอกและพิจารณาเวลาไม่ว่างของครู |
| G4 | รายละเอียดการจัดตาราง | `teacher_subject`, `time_structure_grade_level`, `locked_activity`, `locked_activity_teacher`, `room_unavailability`, `timetable_entry_teacher` | ✓ (เติมใน UC-4–7 แล้ว 2026-11-04) | ✓ `timetable.html` | ✅ เติมแล้ว — เดิม: ไม่ต้องเพิ่ม UC — เติมคำใน UC-4 ข้อ 5–6 (ช่วงชั้น, กิจกรรมล็อกเวลา), UC-5 (ครูร่วมสอน), UC-6/UC-7 (วิชาที่ครูสอนได้, ห้องไม่พร้อมใช้) |
| G5 | ชุมนุม | `teaching_group`, `student_enrollment`, `activity_result` | △ ×2, ✗ ×1 | △ มีในหลักสูตรและตารางสอน (`curriculum-management.html`, `timetable.html`) แต่ไม่มีหน้าบันทึกผล ผ/มผ | ตัดสินว่าชุมนุมอยู่ในขอบเขตไหม — ถ้าใช่ **(ก)** เติมใน UC-3 และ UC-13; ถ้าไม่ **(ค)** · หมายเหตุ UC-8 ใช้คำว่า "กลุ่มการสอน" ซึ่งไม่ตรงกับตารางใด |
| G6 | คุณลักษณะฯ / อ่านคิดเขียน / ตัวชี้วัด | `trait_item`, `student_trait_score`, `indicator`, `assessment_item_indicator` | ✗ ×4 | ✓ `scores.html` (มีในข้อมูลและหน้ากรอกคะแนน) | **(ก)** ขยาย UC-12 ให้รวมการประเมินคุณลักษณะฯ และผูกตัวชี้วัด หรือ **(ค)** ถ้าจะไม่สาธิตในบท 4 |
| G7 | เช็คชื่อ + ครูประจำชั้น | `attendance_session`, `attendance_record`, `school_holiday`, `homeroom_teacher` | ✗ ×4 | ✓ `attendance.html`, `reports/teacher-attendance.html`, `academic-report.html#attendance` | **(ข) หรือ (ค)** ให้ตรงกับข้อ 1.3.4 — ⚠️ ถ้าตัด เกณฑ์ มส (`student_subject_result.attendance_percent`) และรายงานผู้ไม่มีสิทธิ์สอบต้องรับเวลาเรียนจากระบบอื่น/กรอกเอง |
| G8 | ตารางเสริมของรายงาน | `curriculum_credit_requirement`, `report_threshold` | ✓ (เติมใน UC-16 แล้ว) | ✓ `academic-report.html#record-report`, `fail-student-detail.html` | ✅ เติมแล้ว — เติมใน UC-16 ว่ามีรายงานหน่วยกิตสะสม และเกณฑ์ของรายงาน |
| G9 | ตารางอื่นที่ใช้โดยอ้อม | `subject_score_component` | ✓ (เติมใน UC-2, UC-11 แล้ว) | ✓ `course-management.html` (ตั้งองค์ประกอบคะแนนตั้งต้น) | ✅ เติมแล้ว — เติมใน UC-2 ว่าตั้งโครงสร้างคะแนนตั้งต้นของรายวิชาได้ และ UC-11 คัดลอกมาเป็นจุดเริ่ม |

ถ้าเลือก (ก) ทุกกลุ่มยกเว้น G5–G7 → เพิ่ม UC ประมาณ 3–4 ตัว (G1, G2, G3) ตารางในเล่มคงเหลือ 58 − (ที่ตัด) ตารางทุกตัวมี UC รองรับ
ถ้าตัด/ย้าย G5–G7 ทั้งหมด → เหลือ 47 ตาราง

## รายตาราง

### ขอบเขต 0 ข้อมูลหลัก (9)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| academic_year | ✓ | UC-1, 4, 15, 16 | เลือกปีการศึกษา |
| semester | ✓ | UC-4, 12, 15 | เลือกภาคเรียน |
| grade_level | ✓ | UC-1, 3 | ระดับชั้น |
| learning_area | ✓ | UC-2 | กลุ่มสาระ |
| app_user | ✓ | ทุก UC | ครูผู้สอน / ครูฝ่ายวิชาการ |
| student | ✓ | UC-12, 15 | รายชื่อนักเรียน |
| classroom | ✓ | UC-4, 12 | ห้องเรียน |
| student_classroom | ✓ | UC-11 pre, UC-12 | นักเรียนในห้อง |
| homeroom_teacher | ✓ | UC-24 A-1 | ใช้ในเช็คชื่อและรายงาน (G7) |

### ขอบเขต 1 หลักสูตร (11)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| subject | ✓ | UC-1, 2 | |
| subject_grade_level | ✓ | UC-1, 2 | ระดับชั้นที่เปิด |
| subject_score_component | ✓ | UC-2, UC-11 | G9 |
| indicator | ✓ | UC-2, UC-11 | G6 |
| curriculum | ✓ | UC-3 | |
| study_plan | ✓ | UC-3 | แผนการเรียน (สายวิทย์–คณิต / ศิลป์ ตามข้อ 1.3.2 ข้อ 4) |
| study_plan_subject | ✓ | UC-3 | รายวิชาในแผน |
| class_subject | ✓ | UC-3, 4, 11, 12 | รายวิชา × ห้อง × ภาค |
| class_subject_teacher | ✓ | UC-3, UC-4 pre | "มอบหมายรายวิชาให้ครูผู้สอน" |
| teaching_group | ✓ | UC-27 | G5 ชุมนุม |
| student_enrollment | ✓ | UC-27 | G5 |

### ขอบเขต 2 บันทึกคะแนน (15)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| assessment_category | ✓ | UC-11 | หมวดคะแนน |
| assessment_item | ✓ | UC-11, 12 | องค์ประกอบคะแนน |
| assessment_item_indicator | ✓ | UC-11 | G6 |
| student_score | ✓ | UC-12 | รวม "ขาดสอบ / รอส่งงาน" (UC-12 A-3) |
| trait_item | ✓ | UC-26 | G6 |
| student_trait_score | ✓ | UC-26 | G6 |
| grading_policy | ✓ | UC-13, 14 | เกณฑ์การตัดสินผล |
| grade_scale | ✓ | UC-13 | ช่วงคะแนนของแต่ละเกรด |
| student_subject_result | ✓ | UC-13, 14, 15, 16 | |
| remedial_attempt | ✓ | UC-20 | G2 |
| activity_result | ✓ | UC-27 | G5 |
| grade_submission | ✓ | UC-17, 18 | G1 |
| review_note | ✓ | UC-18 A-1, UC-17 A-1 | G1 |
| unlock_request | ✓ | UC-19 | G1 |
| grade_change_log | ✓ | UC-12 ข้อ 15 | "บันทึกคะแนนและประวัติการแก้ไข" |

### ขอบเขต 3 ตารางสอน (18)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| room | ✓ | UC-4, 6, 7, 8 | ห้องที่ใช้สอน, ห้องเฉพาะ |
| teacher_subject | ✓ | UC-7 | G4 |
| timetable_version | ✓ | UC-4 A-1, UC-9 | ฉบับร่าง / ฉบับแก้ไข |
| time_structure | ✓ | UC-4 ข้อ 5–6 | วัน เวลาเรียน เวลาพัก จำนวนคาบ |
| time_structure_grade_level | ✓ | UC-4 ข้อ 5 | G4 |
| period | ✓ | UC-4 ข้อ 5–6 | |
| locked_activity | ✓ | UC-4 ข้อ 5–6 | G4 |
| locked_activity_teacher | ✓ | UC-4 ข้อ 6 | G4 |
| teacher_condition | ✓ | UC-6 | เงื่อนไขรายครู |
| subject_condition | ✓ | UC-6 | ช่วงเช้า, คาบต่อเนื่อง, ห้องเฉพาะ |
| subject_forbidden_slot | ✓ | UC-6 | ช่วงเวลาที่ห้ามจัด |
| room_unavailability | ✓ | UC-6 | G4 |
| timetable_entry | ✓ | UC-5 ถึง UC-9 | |
| timetable_entry_teacher | ✓ | UC-5 ข้อ 4 | G4 ครูร่วมสอน |
| teacher_unavailability | ✓ | UC-22 | G3 |
| schedule_change_request | ✓ | UC-21 | G3 |
| timetable_history | ✓ | UC-4 A-1, UC-9 | "บันทึกประวัติการเปลี่ยนแปลง" |
| notification | ✓ | UC-9 | "แจ้งเตือนครูผู้สอน" |

### ขอบเขต 4 เช็คชื่อ (3)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| attendance_session | ✓ | UC-23 | G7 นอกขอบเขตตามข้อ 1.3.4 |
| attendance_record | ✓ | UC-23, 24 | G7 |
| school_holiday | ✓ | UC-25 | G7 |

### ขอบเขต 5 รายงาน (2)

| ตาราง | สถานะ | UC | หมายเหตุ |
|---|---|---|---|
| curriculum_credit_requirement | ✓ | UC-16 ข้อ 3 | G8 |
| report_threshold | ✓ | UC-16 ข้อ 5 | G8 |
