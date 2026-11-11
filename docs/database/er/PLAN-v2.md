# แผนแก้ไขรูป ER ให้ตรงกับฐานข้อมูลฉบับที่ 2

> **สถานะ:** ทำเสร็จแล้ว (2026-11-11) · แก้ไฟล์ .drawio ทั้ง 6 ไฟล์และ export PNG ใหม่ตามแผนนี้ · คำถามตอบครบแล้ว (ดูท้ายไฟล์)
> อ้างอิง: [cross-team.md](../cross-team.md), ไฟล์ขอบเขต [00](../00-core.md)–[04](../04-attendance.md)

## ทำไมต้องทำใหม่

รอบก่อนผมสร้างไฟล์ .drawio ใหม่ทั้งหมดและให้ draw.io วางเส้นเอง (`entityRelationEdgeStyle`) ผลคือ
- เส้นทแยงตัดผ่านตาราง โดยเฉพาะ `er-grading` และ `er-timetable`
- ตำแหน่งตารางไม่เหมือนรูปเดิมในรายงาน
- เส้นจากหลายตารางวิ่งไปรวมที่ตารางของ B ด้านขวาสุด ทำให้เส้นยาวและข้ามกันไปมา

รอบนี้จึง **แก้บนไฟล์เดิม** (ฉบับใน git ก่อนที่ผมสร้างใหม่) และเปลี่ยนเฉพาะจุดที่ข้อมูลเปลี่ยน

## หลักการ (ตกลงแล้ว)

| เรื่อง | หลักการ |
|---|---|
| ไฟล์ตั้งต้น | กู้ไฟล์ `er-*.drawio` จาก commit `HEAD` (ฉบับก่อนสร้างใหม่) แล้วแก้ทับ |
| ตำแหน่งตาราง | **ไม่ย้ายตารางที่ไม่เกี่ยว** ย้ายได้เฉพาะตารางที่ถูกลบหรือเพิ่ม และตารางของ B ที่ต้องเข้ากรอบ |
| เส้นเดิม | เส้นที่ทั้งสองปลายไม่เปลี่ยน คงจุดหักมุม (waypoint) เดิมไว้ทุกจุด |
| เส้นใหม่หรือเส้นที่ต้องย้ายปลาย | ใช้เส้นหักมุมฉาก (orthogonal) วาง waypoint เอง ให้วิ่งในช่องว่างระหว่างแถวหรือคอลัมน์ของตาราง **ห้ามผ่านตัวตาราง** และไม่ทับเส้นอื่นตลอดแนว |
| ตารางของ B ในกลุ่ม 1–4 | แสดงแค่ PK แบบ stub เดิม (และ FK ที่จำเป็นต่อการวาดเส้น เช่น `registry.classroom.study_program_id`) อยู่ในกรอบเส้นประ Service B |
| ตารางของ B ใน `er-core` | แสดงฟิลด์ที่ระบบเราใช้ตาม [00-core.md หัวข้อ 3.2](../00-core.md#32-ตารางของ-team-b-ที่เราอ่าน) |
| ชื่อตารางของ B | เขียนเต็มพร้อม schema เช่น `registry.semester` |
| ตารางเชื่อม (junction) | **คงรูปแบบเดิม** (พื้นเทาเส้นประ) ไม่เปลี่ยน |
| คอลัมน์ที่ B ตกลงเพิ่ม | ตัวเอียง เช่น `registry.school_room.room_type` |
| การ export | render ด้วย draw.io viewer ที่ scale 2 พื้นขาว ขอบ 20 px เหมือนรอบก่อน ได้ไฟล์ PNG ชื่อเดิมทับของเดิม |

## วิธีจัดกรอบ Service B (ตกลง: ทาง ก.)

ไฟล์เดิมมีกรอบ Service B 1 กรอบล้อม `app_user` อย่างเดียว พอตารางของ B มีหลายตัวและกระจายอยู่ทั่วรูป มี 2 ทาง

| ทาง | วิธี | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **ก. กรอบเล็กหลายกรอบ (แนะนำ)** | ปล่อย stub ของ B อยู่ตำแหน่งเดิม แล้วล้อมด้วยกรอบเส้นประชื่อ "Service B" · stub ที่อยู่แถวเดียวกันติดกันใช้กรอบร่วมกัน | เส้นเดิมไม่ต้องย้ายเลย รูปเหมือนเดิมมากที่สุด | มีกรอบเส้นประหลายกรอบในรูปเดียว |
| ข. กรอบเดียว | ย้าย stub ของ B ทั้งหมดไปรวมเป็นแถวเดียวในกรอบใหญ่ | ดูเป็นระเบียบ เห็นชัดว่าอะไรเป็นของ B | ต้องเดินเส้นใหม่ทุกเส้นที่ชี้ไป B เส้นจะยาวขึ้น |

**ตกลงใช้ทาง ก.**

## งานรายไฟล์

พิกัดในวงเล็บคือตำแหน่งในไฟล์เดิม (x, y)

### 1. `er-core` (กลุ่มตาราง 0) — แก้มากที่สุด

ไฟล์เดิมมีตารางของเรา 8 ตาราง ฉบับที่ 2 เหลือ 2 ตาราง ที่เหลือเป็นของ B จึง**จัดวางใหม่ทั้งรูป** แต่คงรูปแบบเดิม (ขนาดตาราง ฟอนต์ ลักษณะเส้น)

| ส่วน | งาน |
|---|---|
| ตารางของเรา (ซ้าย) | `learning_area` (เพิ่ม FK `department_id`) · `semester_setting` (ใหม่: `semester_id` PK,FK, `grade_submission_deadline`, `remedial_deadline`, `unavailability_deadline`) |
| กรอบ Service B (ขวา) | วาง 12 ตารางเป็น 3 คอลัมน์ตามลำดับการอ้างถึง: ① `academic_year`, `semester`, `education_stage`, `education_level` ② `classroom`, `student_class_history`, `student` ③ `classroom_homeroom_teacher`, `employee`, `app_user`, `job_detail`, `department` |
| ลบ | `academic_year`, `semester`, `grade_level`, `student`, `classroom`, `student_classroom`, `homeroom_teacher` ของเราเดิม, `role`, `user_role` · `app_user` เดิมแทนด้วย `registry.app_user` |
| เส้น | 13 เส้นตาม ER ใน [00-core.md](../00-core.md#2-er) เดินแบบมุมฉากในช่องระหว่างคอลัมน์ · เส้น `learning_area.department_id → registry.department` เดินใต้ทุกตาราง (วาง `learning_area` ให้แถว `department_id` อยู่ระดับเดียวกับ `registry.department`) |

### 2. `er-curriculum` (กลุ่มตาราง 1)

| ตาราง | งาน |
|---|---|
| `academic_year` (0,0) | เปลี่ยนชื่อเป็น `registry.academic_year` · ล้อมกรอบ B |
| `grade_level` (715,0) | เปลี่ยนเป็น `registry.education_level` (`education_level_id INTEGER`) · ล้อมกรอบ B |
| `curriculum` (350,0) | แถว `education_level VARCHAR` → `FK education_stage_id INTEGER` |
| 🆕 `registry.education_stage` | stub PK วางข้าง `registry.academic_year` แถวบน (เลื่อน `curriculum` ไม่ได้ จึงวางที่ช่องว่างซ้ายของ `curriculum` หรือเหนือ `grade_level` ตามที่ว่าง) |
| `study_plan` (689,268) | `grade_level_id` → `education_level_id INTEGER` · เพิ่มแถว `FK study_program_id INTEGER` (ตารางสูงขึ้น 24 px ตรวจว่าไม่ชน `subject_grade_level`) |
| 🆕 `registry.study_program` | stub PK วางใกล้ `study_plan` ฝั่งขวา (ช่องระหว่าง `study_plan` กับ `curriculum_credit_requirement`) |
| `subject_grade_level` (442,656) | `grade_level_id` → `education_level_id INTEGER` |
| `classroom` (598,924) | เปลี่ยนเป็น `registry.classroom` · แถว `study_plan_id` → `study_program_id` · เส้นเดิมไป `study_plan` เปลี่ยนปลายเป็น `registry.study_program` |
| `semester` (296,924), `app_user` (0,924) | เปลี่ยนชื่อเป็น `registry.semester`, `registry.app_user` · ทั้ง 3 ตาราง (`app_user`, `semester`, `classroom`) อยู่แถวเดียวกัน ใช้กรอบ B ร่วมกัน (แทนกรอบเดิมที่ (-10,890)) |
| `student` (360,1144) | เปลี่ยนเป็น `registry.student` · ล้อมกรอบ B |
| เส้นใหม่ | `curriculum.education_stage_id → registry.education_stage` · `study_plan.study_program_id → registry.study_program` · `registry.classroom.study_program_id → registry.study_program` |

### 3. `er-grading` (กลุ่มตาราง 2)

| ตาราง | งาน |
|---|---|
| `academic_year` (0,0) | เปลี่ยนเป็น `registry.academic_year` · ล้อมกรอบ B |
| 🆕 `registry.education_stage` | stub PK วางใต้ `registry.academic_year` ในกรอบเดียวกัน (ช่องว่างระหว่าง y 54–292 ฝั่งซ้าย) |
| `grading_policy` (350,0) | แถว `education_level VARCHAR` → `FK education_stage_id INTEGER` · เส้นใหม่ไป `registry.education_stage` เดินซ้ายตรง ๆ |
| `student` (0,536) | เปลี่ยนเป็น `registry.student` · ล้อมกรอบ B · เส้นเดิมทั้ง 6 เส้นคงไว้ |
| `trait_item` (808,0) | ไม่เปลี่ยนคอลัมน์ (ข้อมูลเหลือแค่อ่าน คิดวิเคราะห์ เขียน) |
| `student_subject_result` (0,828) | ลบแถว `characteristic_level` (ตารางเตี้ยลง 24 px) · ปรับ waypoint ของเส้นที่ออกจากแถวใต้แถวที่ลบ (`grade_scale_id` ไม่กระทบ แต่แถว `calculated_at` เลื่อนขึ้น) |
| 🆕 กล่องหมายเหตุ Service C | กรอบเส้นประเล็กใกล้ `trait_item`: "คุณลักษณะอันพึงประสงค์ใช้ของ Team C (`care.characteristic_evaluation`) · `trait_item` เหลือแค่อ่าน คิดวิเคราะห์ และเขียน" ไม่มีเส้นเชื่อม |

### 4. `er-timetable` (กลุ่มตาราง 3)

| ตาราง | งาน |
|---|---|
| `room` (744,1120) | เปลี่ยนเป็น stub `registry.school_room` (PK `school_room_id` อย่างเดียว ตามข้อตกลง) · คงตำแหน่ง · ล้อมกรอบ B |
| `classroom` (0,2020) | เปลี่ยนเป็น `registry.classroom` · `home_room_id` → `school_room_id` · ล้อมกรอบ B |
| `semester` (294,0) | เปลี่ยนเป็น stub `registry.semester` (ตัดแถว `unavailability_deadline`) · ล้อมกรอบ B |
| 🆕 `semester_setting` | stub เทา (กลุ่ม 0) `semester_id` PK,FK + `unavailability_deadline` วางใต้ `registry.semester` หรือข้างกัน · เส้นไป `registry.semester` |
| `grade_level` (412,1120) | เปลี่ยนเป็น `registry.education_level` · ล้อมกรอบ B |
| `app_user` (685,0) | เปลี่ยนเป็น `registry.app_user` ในกรอบ B เดิม |
| `time_structure_grade_level`, `locked_activity` | `grade_level_id` → `education_level_id INTEGER` |
| `timetable_entry`, `room_unavailability` | `room_id` → `school_room_id` (เส้นเดิมคงไว้ แค่เปลี่ยนชื่อแถว) |

### 5. `er-attendance` (กลุ่มตาราง 4)

| ตาราง | งาน |
|---|---|
| `school_holiday` (422,124) | แทนด้วย `registry.school_calendar` ที่ตำแหน่งเดิม: `school_calendar_id` PK, `academic_year` FK, `event_name`, `event_start_date`, `event_end_date`, `event_type` · ล้อมกรอบ B |
| `academic_year` (990,0) | เปลี่ยนเป็น `registry.academic_year` · ล้อมกรอบ B (เส้นจาก `school_calendar` คงไว้) |
| `student` (782,124), `app_user` (694,0) | เปลี่ยนชื่อเป็น `registry.student`, `registry.app_user` · `app_user` อยู่ในกรอบเดิม ขยายกรอบให้ครอบ `student` ถ้าติดกัน |
| หมายเหตุ | เพิ่มข้อความสั้นใต้รูป: "`registry.school_calendar` ใช้หาวันหยุด ไม่มี FK จากกลุ่มนี้" |

### 6. `er-overview` (ภาพรวม)

| ส่วน | งาน |
|---|---|
| กลุ่ม 0 | ชื่อ "(2 ตาราง)" · รายการเหลือ `learning_area`, `semester_setting` (กล่องเตี้ยลง) |
| กลุ่ม 3 | "(17 ตาราง)" ลบ `room` |
| กลุ่ม 4 | "(3 ตาราง)" ลบ `school_holiday` |
| กล่อง Service B (680,0) | รายการตารางของ B ที่ใช้ 15 ตาราง (กล่องสูงขึ้น ตรวจไม่ชนกล่องอื่น) |
| 🆕 กล่อง Service C | รายการ 4 ตารางคุณลักษณะฯ · ลูกศรประไปกลุ่ม 2 พร้อมป้าย "ผลคุณลักษณะฯ (API)" · วางในที่ว่างซ้ายหรือขวาของกลุ่ม 2 ที่ลูกศรไม่ผ่านกล่องอื่น |
| ลูกศรเดิม | คงไว้ · ลูกศรไป Service B คงแบบเดิม |
| หัวรูป | ระบุ "ระบบวิชาการ 49 ตาราง" |

## ขั้นตอนทำงาน

1. กู้ไฟล์เดิม 6 ไฟล์: `git checkout HEAD -- docs/database/er/*.drawio`
2. แก้ทีละไฟล์ด้วยสคริปต์ที่แก้ XML ตรงจุด (เปลี่ยน `value` ของเซลล์ เพิ่ม/ลบแถว ปรับ waypoint) ไม่สร้างไฟล์ใหม่ทั้งไฟล์ ยกเว้น `er-core`
3. หลังแก้แต่ละไฟล์ render ดูใน browser ตรวจตามรายการด้านล่าง ถ้ามีเส้นทับตารางให้แก้ waypoint ก่อนไปไฟล์ถัดไป
4. Export PNG ทั้ง 6 ไฟล์ทับของเดิม
5. ส่งรูปให้ตรวจ

## รายการตรวจหลังแก้แต่ละรูป

- [ ] ไม่มีเส้นผ่านตัวตาราง และไม่มีเส้นทแยง (ยกเว้นที่รูปเดิมมีอยู่แล้ว)
- [ ] เส้นไม่ทับกันตลอดแนว ถ้าต้องขนานกันให้ห่างอย่างน้อย 10 px
- [ ] ชื่อตารางและคอลัมน์ตรงกับไฟล์ md ทุกตัวอักษร
- [ ] สัญลักษณ์ปลายเส้น (1, 0..1, 0..N, 1..N) ตรงกับ ER ใน md
- [ ] กรอบ Service B ไม่ทับตารางของเรา และป้ายกรอบไม่ทับชื่อตาราง
- [ ] ตารางที่สูงขึ้นหรือเตี้ยลงไม่ชนตารางข้างใต้
- [ ] PNG อ่านภาษาไทยได้ (ฟอนต์ TH SarabunPSK)

## คำถามที่ตอบแล้ว (2026-11-11)

1. **กรอบ Service B** → ทาง ก. กรอบเล็กหลายกรอบ ไม่ย้ายตาราง
2. **`er-core`** → จัดวางใหม่ทั้งรูป เดินเส้นมุมฉากเอง แสดงตารางของ B ครบ 12 ตาราง
3. **`registry.school_room` ใน `er-timetable`** → stub PK อย่างเดียวเหมือนตารางอื่นของ B
