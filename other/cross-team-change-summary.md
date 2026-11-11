# สรุปการแก้ไขฐานข้อมูลข้ามทีม (Team A · B · C)

> **จาก:** Team A (ระบบบริหารจัดการงานวิชาการ) · **วันที่:** 11 พฤศจิกายน 2569
> **ถึง:** Team B (ระบบบริหารข้อมูลหลักและงานทะเบียน + IAM) และ Team C (Student Care Track)
>
> เอกสารนี้สรุปว่า Team A แก้การออกแบบฐานข้อมูลอะไรไปแล้วตามข้อตกลงล่าสุด แต่ละทีมต้องแก้อะไร และยังมีอะไรต้องตกลงกัน
> รายละเอียดเต็มอยู่ใน repo ของ Team A: `docs/database/cross-team.md` และ `docs/database/00-core.md` – `05-reports.md`

## 1. ข้อตกลงที่ได้แล้ว

| # | เรื่อง | ข้อตกลง |
|---|---|---|
| 1 | ข้อมูลหลัก | Team A เลิกเก็บข้อมูลหลักเอง ใช้ตารางของ Team B แทน 10 ตาราง (หัวข้อ 2) |
| 2 | ปีการศึกษา | Team B เปลี่ยน PK ของ `academic_year` เป็นปี พ.ศ. (`SMALLINT` เช่น `2569`) |
| 3 | ห้องกายภาพ | Team B เพิ่ม `room_type`, `max_classes`, `short_name` ใน `school_room` |
| 4 | คุณลักษณะอันพึงประสงค์ | ใช้ของ Team C ทั้งหมด Team A ตัดออกจากระบบตัวเอง |
| 5 | การตั้งชื่อ | ใช้ snake_case เอกพจน์ทั้งตารางและคอลัมน์ และแยก schema ต่อทีม |

## 2. ตารางที่ Team A ตัดออก และไปใช้ของ Team B แทน

ชื่อตารางของ B เขียนตามรูปแบบที่ตกลง ในวงเล็บคือชื่อเดิมในรายงานของ B

| ตารางเดิมของ Team A | ใช้ของ Team B | หมายเหตุ |
|---|---|---|
| `academic_year` | `registry.academic_year` (`AcademicYears`) | FK ของ A ใช้ปี พ.ศ. ตามข้อตกลง 2 |
| `semester` | `registry.semester` (`Semesters`) | คอลัมน์งานวิชาการย้ายไปตารางใหม่ของ A คือ `semester_setting` |
| `grade_level` | `registry.education_level` (`EducationLevels`) + `registry.education_stage` (`EducationStage`) | ม.ต้น / ม.ปลาย ใช้ `education_stage_id` |
| `student` | `registry.student` (`Student`) | อ่านอย่างเดียว |
| `classroom` | `registry.classroom` (`Classroom`) | A ใช้ `study_program_id` หาแผนการเรียน และ `school_room_id` เป็นห้องประจำ |
| `student_classroom` | `registry.student_class_history` (`StudentClassHistory`) | A หาห้องของนักเรียนตามวันที่ (`start_date` / `end_date`) |
| `homeroom_teacher` | `registry.classroom_homeroom_teacher` (`ClassroomHomeroomTeacher`) | |
| `app_user` (+ `role`, `user_role`) | `registry.app_user` (`User`) + `employee` + `job_detail` + `position` + `department` + `permission` | ชื่อครู ตำแหน่ง สังกัด และสถานะ อ่านจาก B |
| `room` | `registry.school_room` (`SchoolRoom`) + `registry.building` | ตามข้อตกลง 3 |
| `school_holiday` | `registry.school_calendar` (`SchoolCalendar`) | A ใช้แถวที่เป็นวันหยุด |

**ผลต่อ Team A:** จาก 58 ตาราง เหลือ 49 ตาราง (ตัดออก 10 ตาราง เพิ่ม `semester_setting` 1 ตาราง)

## 3. สิ่งที่แต่ละทีมต้องทำ

### Team B

| # | สิ่งที่ต้องทำ | สถานะ |
|---|---|---|
| B1 | เปลี่ยน PK ของ `academic_year` เป็นปี พ.ศ. (`SMALLINT`) และ FK `academic_year` ในตารางอื่นของ B ให้ตรงกัน | ตกลงแล้ว |
| B2 | เพิ่มใน `school_room`: `room_type`, `max_classes`, `short_name` | ตกลงแล้ว |
| B3 | เพิ่มใน `school_room`: `room_code` (UK) และ `is_active` | **ขอเพิ่ม** |
| B4 | เพิ่มใน `semester`: `is_current` (มีได้ภาคเดียว) เป็นภาคเรียนปัจจุบันของทั้ง 3 ระบบ | **ขอเพิ่ม** |
| B5 | ตกลงชุดค่าของ `school_room.room_type`: `regular`, `lab`, `computer`, `sport`, `art`, `music` | **ขอยืนยัน** |
| B6 | เปลี่ยนชื่อตารางและคอลัมน์เป็น snake_case เอกพจน์ เช่น `Semesters` → `semester`, `studentID` → `student_id` | **ขอยืนยัน** |
| B7 | ไม่ลบแถวเก่าใน `student_class_history` ของนักเรียนที่ย้ายออกหรือจบ เพราะผลการเรียนย้อนหลังของ A อ้างถึง | **ขอยืนยัน** |
| B8 | เตรียม Internal API ให้ A อ่านข้อมูลในหัวข้อ 2 | ต้องทำ |

### Team C

| # | สิ่งที่ต้องทำ | สถานะ |
|---|---|---|
| C1 | เป็นเจ้าของการประเมินคุณลักษณะอันพึงประสงค์ (`desirable_characteristic`, `characteristic_round`, `characteristic_evaluation`, `characteristic_eval_item`) | ตกลงแล้ว |
| C2 | เตรียม API ให้ A อ่านผลคุณลักษณะฯ ราย นักเรียน × ภาคเรียน (ใช้ในรายงานผลการประเมินพัฒนาผู้เรียนของ A) | ต้องทำ |
| C3 | เปลี่ยนชื่อตารางเป็น snake_case เอกพจน์ เช่น `TeacherResponsibility` → `teacher_responsibility` และ FK `term_id` → `semester_id` | **ขอยืนยัน** |

### Team A (ทำแล้วในเอกสารออกแบบ)

| # | สิ่งที่แก้ |
|---|---|
| A1 | ตัด 10 ตารางในหัวข้อ 2 ออก FK ทุกตัวชี้ไปตารางของ B แทน · `grade_level_id` → `education_level_id` · `room_id` → `school_room_id` |
| A2 | เพิ่ม `semester_setting` (`semester_id` PK/FK → `registry.semester`, `grade_submission_deadline`, `remedial_deadline`, `unavailability_deadline`) |
| A3 | `curriculum` และ `grading_policy` ใช้ `education_stage_id` แทนคอลัมน์ `education_level` |
| A4 | `study_plan` เพิ่ม `study_program_id` → `registry.study_program` ห้องหาแผนของตัวเองจาก `registry.classroom.study_program_id` |
| A5 | `trait_item` และ `student_trait_score` เหลือแค่อ่าน คิดวิเคราะห์ และเขียน · ตัด `student_subject_result.characteristic_level` |
| A6 | `teacher_subject` (วิชาที่ครูสอนได้) เป็นของ A เพราะ B ไม่มีข้อมูลนี้ |
| A7 | ยังต้องทำ: แก้รูป ER, แก้รายงานฉบับเต็ม และเตรียม API ให้ B และ C (หัวข้อ 4) |

## 4. ข้อมูลของ Team A ที่ทีมอื่นดึงไปใช้

Team A จะเปิด Internal API ส่งเฉพาะ**ผลที่ฝ่ายวิชาการอนุมัติแล้ว**

| ผู้ใช้ | ใช้ทำอะไร | ข้อมูลที่ A ส่งให้ |
|---|---|---|
| Team B | ออก ปพ.1 | ผลการเรียนรายวิชา, GPA / GPAX, ข้อมูลรายวิชา (รหัส ชื่อ หน่วยกิต กลุ่มสาระ) |
| Team B | ตัดสินสำเร็จการศึกษา | หน่วยกิตที่ได้เทียบเกณฑ์ขั้นต่ำของหลักสูตร รายกลุ่มสาระ |
| Team B | เลื่อนชั้นปลายปี | สถานะว่าผลการเรียนของห้อง / ระดับชั้นอนุมัติครบหรือยัง |
| Team C | ออก ปพ.3–7 | ผลการเรียน, GPA รายภาค, ผลชุมนุม (ผ / มผ), เวลาเรียน, ผลอ่าน คิดวิเคราะห์ และเขียน |
| Team C | ปพ.5 | คะแนนรายช่องและโครงสร้างคะแนนของแต่ละรายวิชา |
| Team C | ค่าตั้งต้นในแบบคัดกรอง | ผลการเรียน (ต้องระบุว่าใช้ฟิลด์ไหน) |

## 5. การตั้งชื่อที่เสนอให้ใช้ร่วมกัน

| เรื่อง | ข้อตกลง | ตัวอย่าง |
|---|---|---|
| schema | แยกต่อทีม | `academic` (A) · `registry` (B) · `care` (C) |
| ชื่อตาราง | snake_case เอกพจน์ | `student_class_history` ไม่ใช่ `StudentClassHistory` หรือ `students` |
| PK | `<ชื่อตาราง>_id` | `student_id` |
| FK | ชื่อเดียวกับ PK ที่อ้าง ถ้าอ้างตารางเดียวกันหลายครั้งใช้ชื่อตามหน้าที่ | `semester_id`, `created_by`, `approved_by` |
| คำสงวน | เลี่ยงคำสงวนของ PostgreSQL | `app_user` ไม่ใช่ `user` |
| ชื่อใน API (JSON) | แต่ละทีมแปลงเป็น camelCase ได้ที่ชั้น API โดยฐานข้อมูลยังเป็น snake_case | `studentId` ↔ `student_id` |

เหตุผล: PostgreSQL แปลงชื่อที่ไม่ใส่เครื่องหมายคำพูดเป็นตัวพิมพ์เล็กเสมอ ถ้าตั้งชื่อเป็น PascalCase หรือ camelCase ต้องใส่ `"..."` ทุกครั้งที่ query

## 6. คำถามที่ยังต้องตกลงกัน

| # | คำถาม | ถามทีม |
|---|---|---|
| Q1 | ใช้ชื่อ schema `registry` และ `care` ได้ไหม และจะเปลี่ยนชื่อตารางเป็น snake_case จริงหรือไม่ (B6, C3) | B, C |
| Q2 | สังกัดกลุ่มสาระของครู ให้ A อ่านจาก `registry.job_detail.department_id` และผูก `learning_area` ของ A กับ `registry.department` ได้ไหม | B |
| Q3 | `study_plan` ของ A อ้าง `registry.study_program` และใช้ `registry.classroom.study_program_id` หาแผนของห้องได้ไหม ห้องต้องมี `study_program_id` ทุกห้องหรือไม่ | B |
| Q4 | ระบบเชื่อมกันแบบไหน: sync สำเนาข้อมูลของ B เข้า schema ของแต่ละทีม (FK บังคับได้) หรือเรียก API ทุกครั้ง (FK ข้าม service ไม่ได้ ต้องตรวจในแอป) | B, C |
| Q5 | บทบาทครูผู้สอนและครูฝ่ายวิชาการของ A จะ map กับ `access_role` หรือ `permission` ของ B อย่างไร | B |
| Q6 | บัญชีนักเรียนและผู้ปกครอง: `app_user` ของ B ผูกกับ `employee` อย่างเดียว ถ้า C (และ A ในอนาคต) ต้องให้นักเรียน / ผู้ปกครองเข้าระบบ B จะรองรับอย่างไร | B, C |
| Q7 | ค่าใน `registry.student.status` ตรงกับ `studying` / `transferred` / `graduated` ไหม มีพักการเรียน / ลาออกหรือไม่ | B |
| Q8 | `school_calendar.event_type` ใช้ค่าอะไรสำหรับวันหยุด และแยกวันหยุดตามระดับชั้นได้ไหม (เช่น ม.6 สอบ O-NET) | B |
| Q9 | ห้องเรียนที่มีชื่อพิเศษ เช่น "ห้อง EP" B จะเก็บไว้ที่ไหน | B |
| Q10 | ผลคุณลักษณะฯ ที่ C ส่งให้ A เป็นผลรวมรายภาค (`overall_level`) หรือรายข้อด้วย และใช้ผลครั้งล่าสุดเมื่อมีการประเมินซ้ำใช่ไหม | C |
