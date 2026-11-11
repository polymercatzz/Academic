# เปรียบเทียบตารางของ 3 ทีม และการแบ่งความเป็นเจ้าของ

> **ฉบับที่ 2 (2026-11-11)** ปรับตามข้อตกลงกับ Team B และ Team C · ฉบับแรกเป็นข้อเสนอ ฉบับนี้ระบุว่าอะไรตกลงแล้ว อะไรยังเปิดอยู่
>
> - **Team A (ระบบของเรา)**: [รายงานฉบับขอสอบ (Final report)](../docs/) ดูแลหลักสูตร ตารางสอน เช็คชื่อ บันทึกคะแนน และรายงาน
> - **Team B**: [DEVELOPMENT OF MASTER DATA AND REGISTRATION MANAGEMENT SYSTEM FOR SCHOOLS.pdf](DEVELOPMENT%20OF%20MASTER%20DATA%20AND%20REGISTRATION%20MANAGEMENT%20SYSTEM%20FOR%20SCHOOLS.pdf) เป็นเจ้าของข้อมูลหลัก (นักเรียน ห้องเรียน ปีการศึกษา ระดับชั้น บุคลากร อาคารสถานที่ ปฏิทิน) และ IAM · ออก ปพ.1, ปพ.2
> - **Team C**: [Student Care Track.pdf](Student%20Care%20Track.pdf) ดูแลเยี่ยมบ้าน พฤติกรรม คัดกรอง แบบประเมิน และ**คุณลักษณะอันพึงประสงค์** · ออก ปพ.3–7 และบัตรนักเรียน
>
> รายละเอียดฝั่งฐานข้อมูลของเราอยู่ที่ [docs/database/cross-team.md](../docs/database/cross-team.md)

## ข้อตกลงที่ได้แล้ว

| # | เรื่อง | ข้อตกลง | ใครแก้ |
|---|---|---|---|
| 1 | ข้อมูลหลัก | ระบบเราใช้ตารางของ B แทนตารางข้อมูลหลักของเราเอง (หัวข้อ 1) | A |
| 2 | ปีการศึกษา | `academic_year` ของ B ใช้ปี พ.ศ. เป็น PK FK `academic_year SMALLINT` ของเราทุกตัวจึงใช้ต่อได้ | B |
| 3 | ห้องกายภาพ | `school_room` ของ B เพิ่ม `room_type`, `max_classes`, `short_name` และขอเพิ่ม `room_code`, `is_active` ด้วย ฝั่งเราไม่ต้องมีตารางห้อง | B |
| 4 | ภาคเรียนปัจจุบัน | ขอ B เพิ่ม `is_current` ใน `semester` ให้ทั้ง 3 ทีมใช้ค่าเดียวกัน | B |
| 5 | คอลัมน์วิชาการของภาคเรียน | `grade_submission_deadline`, `remedial_deadline`, `unavailability_deadline` อยู่ในตารางเสริม `semester_setting` ของเรา | A |
| 6 | คุณลักษณะอันพึงประสงค์ | ใช้ของ C ทั้งหมด เราตัดออก เหลือแค่ อ่าน คิดวิเคราะห์ และเขียน (หัวข้อ 3) | A |
| 7 | การตั้งชื่อ | ใช้ snake_case เอกพจน์ และแยก schema ต่อทีม ในเอกสารของเราเขียนชื่อตารางของ B และ C ในรูปแบบนี้ (หัวข้อ 5) | ทุกทีม |

## 1. ตารางที่เราใช้ของ B (ตัดออกจากระบบเรา 10 ตาราง)

ชื่อตารางของ B เขียนตามรูปแบบที่ตกลง (snake_case เอกพจน์ ใน schema `registry`) ในวงเล็บคือชื่อเดิมในรายงานของ B

| ตารางเดิมของเรา | ใช้ของ B แทน | สิ่งที่ต้องทำฝั่งเรา |
|---|---|---|
| `academic_year` | `registry.academic_year` (`AcademicYears`) | ไม่ต้องแก้ FK เพราะ B ใช้ปีเป็น PK · B ไม่มี `start_date` / `end_date` ให้คำนวณจากภาคเรียนแรกและภาคเรียนสุดท้ายของปี |
| `semester` | `registry.semester` (`Semesters`) + `academic.semester_setting` | ย้ายคอลัมน์วิชาการ 3 ตัวไปตารางเสริม · `is_current` อ่านจาก B |
| `grade_level` | `registry.education_level` (`EducationLevels`) + `registry.education_stage` (`EducationStage`) | FK `grade_level_id` ทุกตัวเปลี่ยนเป็น `education_level_id` · ม.ต้น / ม.ปลาย (`education_level` เดิม) เปลี่ยนเป็น `education_stage_id` ใน `curriculum`, `grading_policy` |
| `student` | `registry.student` (`Student`) | อ่านอย่างเดียว |
| `classroom` | `registry.classroom` (`Classroom`) | `home_room_id` เปลี่ยนเป็น `school_room_id` ของ B · `study_plan_id` ใช้ `study_program_id` ของ B (หัวข้อ 2) |
| `student_classroom` | `registry.student_class_history` (`StudentClassHistory`) | ของ B มี `start_date` / `end_date` เช็คชื่อและคะแนนต้องหาห้องของนักเรียนตามวันที่ |
| `homeroom_teacher` | `registry.classroom_homeroom_teacher` (`ClassroomHomeroomTeacher`) | `user_id` → `employee_id` |
| `app_user` | `registry.app_user` (`User`) + `employee` + `job_detail` + `position` + `department` | ตำแหน่ง สังกัด และสถานะ อ่านจาก `job_detail` |
| `room` | `registry.school_room` (`SchoolRoom`) + `building` | B เพิ่มคอลัมน์ให้ครบ (ข้อตกลง 3) |
| `school_holiday` | `registry.school_calendar` (`SchoolCalendar`, ประเภท = วันหยุด) | ของ B เก็บเป็นช่วงวันที่ ต้องกระจายเป็นรายวันตอนเช็คชื่อ |

## 2. ตารางที่ทับกับ B บางส่วน แต่ยังเป็นของเรา

- **`learning_area` กับ `registry.department`**: ของเราใช้จัดหมวดรายวิชาตามหลักสูตร และมีประเภทกิจกรรมพัฒนาผู้เรียน ส่วนของ B คือหน่วยงานที่ครูสังกัด
  - เก็บ `learning_area` ไว้สำหรับรายวิชา
  - สังกัดของครูอ่านจาก `registry.job_detail.department_id` *(ยังไม่ได้ตกลงกับ B)*
- **`study_plan` กับ `registry.study_program`**: ของ B เป็นประเภทแผนแบบถาวรที่ใช้ตอนรับสมัคร ของเราเป็นแผนในหลักสูตรของแต่ละระดับชั้นพร้อมรายวิชา
  - เพิ่ม FK `study_program_id` ใน `study_plan` *(ยังไม่ได้ตกลงกับ B)*
- **`time_structure` / `period` กับ `registry.school_schedule`**: คนละจุดประสงค์ เก็บทั้งคู่ แต่ `school_days` ต้องไม่ขัดกับวันเรียนของ B
- **`teacher_subject`**: B ไม่มีตารางนี้ เป็นของเรา ตัดคำกำกับ "(งานบุคคล)" ในรายงาน
- **`notification`**: เรากับ C ต่างมีตารางนี้ แยก schema กันได้

## 3. คุณลักษณะอันพึงประสงค์ใช้ของ Team C

ตกลงให้ C เป็นเจ้าของ (`care.desirable_characteristic`, `care.characteristic_round`, `care.characteristic_evaluation`, `care.characteristic_eval_item`)

ฝั่งเราต้องแก้:
- `trait_item`: ตัดค่า `characteristic` เหลือแค่ `reading_thinking` (อ่าน คิดวิเคราะห์ และเขียน 5 ด้าน)
- `student_trait_score`: เก็บเฉพาะผลอ่าน คิดวิเคราะห์ และเขียน
- หน้าจอครูผู้สอน: ตัดแท็บประเมินคุณลักษณะฯ ออกจากหน้าบันทึกคะแนน
- รายงาน `v_student_development`: ส่วนคุณลักษณะฯ ต้องดึงจาก C ผ่าน API
- ถ้าเกณฑ์ตัดสินผลของเราใช้ผลคุณลักษณะฯ ต้องอ่านจาก C

## 4. ข้อมูลของเราที่ทีมอื่นดึงไปใช้ (ต้องเตรียม API)

- **B ต้องใช้**
  - ผลการเรียนรายวิชา, GPAX, `subject` สำหรับออก ปพ.1
  - หน่วยกิตเทียบเกณฑ์หลักสูตร (`curriculum_credit_requirement`) สำหรับตัดสินจบการศึกษา
  - สถานะอนุมัติผลการเรียนปลายปี สำหรับการเลื่อนชั้น
- **C ต้องใช้**
  - ผลการเรียน, GPA รายภาค, ผลชุมนุม, เวลาเรียน, ผลอ่าน คิดวิเคราะห์ และเขียน สำหรับออก ปพ.3–7
  - คะแนนรายช่อง สำหรับ ปพ.5
  - ผลการเรียน ใช้เป็นค่าตั้งต้นในแบบคัดกรอง

ส่งเฉพาะผลที่ฝ่ายวิชาการอนุมัติแล้ว

## 5. การตั้งชื่อที่ใช้ในเอกสาร

- ชื่อตารางและคอลัมน์ใช้ snake_case เอกพจน์ แยก schema ต่อทีม: `academic` (A), `registry` (B), `care` (C) *(ชื่อ schema ของ B และ C ยังต้องยืนยัน)*
- ตารางของทีมอื่นเขียนพร้อม schema เช่น `registry.student`, `care.home_visit` เพื่อไม่ให้สับสนกับตารางของเรา
- กล่าวถึงครั้งแรกให้วงเล็บชื่อเดิมในรายงานของทีมนั้นด้วย เช่น `registry.semester` (`Semesters`) จนกว่า B และ C จะแก้รายงานตาม
- PK ใช้ `<ชื่อตาราง>_id` · FK ใช้ชื่อเดียวกับ PK ที่อ้าง

## 6. คำถามที่ยังเปิดอยู่

1. **ชื่อ schema** ของ B และ C จะใช้ `registry` และ `care` หรือไม่ และ B กับ C จะเปลี่ยนชื่อตารางเป็น snake_case จริงไหม
2. **สังกัดครู** ตกลงใช้ `registry.department` แทน `app_user.learning_area_id` ไหม และ `learning_area` ของเราต้องผูกกับ `department` หรือไม่
3. **แผนการเรียน** B ยอมให้ `study_plan` ของเราอ้าง `registry.study_program` ไหม
4. **รูปแบบการเชื่อม** sync สำเนาข้อมูลของ B เข้ามา (FK ยังบังคับได้) หรือเรียก API ทุกครั้ง (FK ข้าม schema ไม่ได้ ต้องตรวจในแอป)
5. **บทบาทผู้ใช้** ครูผู้สอน / ครูฝ่ายวิชาการ จะ map กับ `access_role` หรือ `permission` ของ B อย่างไร
6. **บัญชีนักเรียนและผู้ปกครอง** `registry.app_user` ผูกกับ `employee` อย่างเดียว ถ้าจะให้นักเรียนดูผลการเรียน B ต้องรองรับก่อน (C ก็ต้องใช้)
7. **สถานะนักเรียน** ค่าใน `registry.student.status` ของ B ตรงกับ `studying` / `transferred` / `graduated` ที่รายงานของเราใช้หรือไม่
8. **วันหยุดเฉพาะระดับชั้น** `registry.school_calendar` แยกตามระดับชั้นได้ไหม (เช่น ม.6 สอบ O-NET)

## สรุปตัวเลข

ระบบเราเดิมมี 58 ตาราง
- ตัดออก ใช้ของ B แทน: 10 ตาราง
- เพิ่มตารางเสริม: 1 ตาราง (`semester_setting`)
- เหลือเป็นของเรา: **49 ตาราง**
- `trait_item` และ `student_trait_score` ยังอยู่ แต่เหลือแค่อ่าน คิดวิเคราะห์ และเขียน
