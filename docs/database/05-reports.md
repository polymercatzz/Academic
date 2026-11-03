# ขอบเขต 5 — รายงาน

> **สถานะ:** ร่าง (2026-11-03) · อ้างตารางจาก [ขอบเขต 0–4](README.md#ขอบเขต) · ข้อตกลงอยู่ที่ [README.md](README.md#ข้อตกลง)

รายงานส่วนใหญ่ไม่ต้องมีตารางใหม่ เพราะเป็นการสรุปข้อมูลจากขอบเขต 0–4 ขอบเขตนี้จึงมี 3 อย่าง
1. **ตารางเสริม 2 ตาราง และคอลัมน์ 1 คอลัมน์** สำหรับข้อมูลที่รายงานต้องใช้แต่ยังไม่มีที่เก็บ
2. **view และ function** ที่หน้ารายงานทุกหน้าอ่าน เพื่อให้ตัวเลขเดียวกันออกมาเท่ากันทุกหน้า
3. **กติกาการคำนวณ** ที่ตอนนี้แต่ละหน้าในระบบจำลองคิดไม่เหมือนกัน

## 1. ที่มาในระบบจำลอง

| หน้า | ตัวเลขหลัก | view ที่ใช้ |
|---|---|---|
| [overview.html](../../reports/overview.html) ภาพรวม | งานคะแนนค้าง ความคืบหน้าส่ง / ตรวจ / อนุมัติ สอบซ่อมค้างและเกินกำหนด ห้องเสี่ยง นักเรียนต้องติดตาม | `v_grading_progress`, `v_subject_grade_distribution`, `v_remedial_status`, `v_student_followup` |
| [student-retake-management.html](../../reports/student-retake-management.html) + รายละเอียด, [student-list-by-classroom.html](../../reports/student-list-by-classroom.html) | รายการสอบซ่อมรายนักเรียน / รายวิชา / รายห้อง สถานะ รอสอบซ่อม / สอบซ่อมแล้ว / ติดตามงาน ความเร่งด่วน | `v_remedial_status` |
| [fail-student-detail.html](../../reports/fail-student-detail.html) นักเรียนต้องปรับปรุง | นักเรียนที่ได้ 0 / ร / มส ต่อห้องเรียนที่สอน ช่วงคะแนน สาเหตุหลัก ระดับความเสี่ยง | `v_fail_student` |
| [student-score-ranking.html](../../reports/student-score-ranking.html) + รายละเอียด | อันดับคะแนนรวม คะแนนตามหมวด ร้อยละที่ต่ำกว่า 50 | `v_score_ranking`, `v_category_score` |
| [subject-results.html](../../reports/subject-results.html) + รายละเอียด | จำนวนต่อระดับผลการเรียน 8 ระดับ + ร / มส / ผ / มผ, GPA เฉลี่ย, อัตราผ่าน ≥ 3, แนวโน้มเทียบภาคก่อน | `v_subject_grade_distribution` |
| `academic-report.html#attendance`, [teacher-attendance.html](../../reports/teacher-attendance.html) | มา / สาย / ขาด / ลา รายนักเรียน ร้อยละ ใกล้ มส | `v_attendance_summary` ([ขอบเขต 4](04-attendance.md#4-ค่าที่คำนวณ-ไม่เก็บ)) |
| `#unable-exam` ผู้ไม่มีสิทธิ์สอบ | นักเรียน × วิชา ที่เวลาเรียนต่ำกว่าเกณฑ์ | `v_unable_exam` |
| `#score-subject` คะแนนรายวิชา | คะแนนรวมรายวิชาของนักเรียนในห้อง ต่ำกว่า 60% คะแนนที่ยังไม่บันทึก | `v_student_result` |
| `#average-score-year` คะแนนเฉลี่ยรายปี | คะแนนเฉลี่ยและระดับเฉลี่ยรายนักเรียน / ห้อง อันดับ สูงสุด / ต่ำสุด | `v_student_result`, `v_student_term_gpa` |
| `#record-report` ระเบียนสะสม / GPAX | GPA รายภาค GPAX สะสมถึงปีที่เลือก หน่วยกิตลงทะเบียน / ผ่าน / ที่ยังขาดรายกลุ่มสาระ วิชาไม่ผ่าน | `fn_student_gpax()`, `v_credit_progress` |
| ระบบเดิมที่ยังไม่มีหน้าใหม่ ([pain-points.md](../pain-points.md#รายหน้า)) | ผลสัมฤทธิ์ระดับ 3 ขึ้นไป · ประเมินพัฒนาผู้เรียน | `v_achievement_level3`, `v_student_development` |

## 2. ตารางเสริม

```mermaid
erDiagram
    curriculum ||--o{ curriculum_credit_requirement : "หน่วยกิตขั้นต่ำ"
    learning_area ||--o{ curriculum_credit_requirement : "ของกลุ่มสาระ"

    curriculum_credit_requirement {
        INTEGER curriculum_credit_requirement_id PK
        INTEGER curriculum_id FK
        INTEGER learning_area_id FK
        VARCHAR subject_type
        NUMERIC required_credits
    }
    report_threshold {
        VARCHAR threshold_key PK
        NUMERIC threshold_value
        VARCHAR description
    }
    semester {
        INTEGER semester_id PK
        DATE remedial_deadline "เพิ่มในขอบเขตนี้"
    }
    curriculum {
        INTEGER curriculum_id PK
    }
    learning_area {
        INTEGER learning_area_id PK
    }
```

#### `curriculum_credit_requirement` — หน่วยกิตขั้นต่ำตามหลักสูตร

| ฟิลด์ | ชนิดข้อมูล | คีย์ | Null | คำอธิบาย |
|---|---|---|---|---|
| curriculum_credit_requirement_id | INTEGER | PK | N | รหัส |
| curriculum_id | INTEGER | FK → curriculum | N | หลักสูตร |
| learning_area_id | INTEGER | FK → learning_area | N | กลุ่มสาระ |
| subject_type | VARCHAR(20) | | N | `basic` · `additional` (ค่าชุดเดียวกับ `subject.subject_type`) |
| required_credits | NUMERIC(4,1) | | N | หน่วยกิตขั้นต่ำตลอดหลักสูตร |
| | | UK (curriculum_id, learning_area_id, subject_type) | | |
| | | CHECK (`required_credits >= 0`) · CHECK (`subject_type IN ('basic', 'additional')`) | | |

หน้าระเบียนสะสมแสดง "หน่วยกิตที่ยังขาด" รายกลุ่มสาระ (`subjectGroups[].requiredCredits` ใน `record-report.js`) และหน้าโครงสร้างหลักสูตรแสดงเกณฑ์จบ แต่ขอบเขต 1 ยังไม่มีที่เก็บตัวเลขนี้ ตารางนี้ผูกกับหลักสูตร จึงเป็นข้อมูลของขอบเขต 1 ที่ใส่ไว้ตรงนี้ เพราะมีแต่รายงานที่ใช้

#### `report_threshold` — เกณฑ์ที่รายงานใช้ร่วมกัน

| ฟิลด์ | ชนิดข้อมูล | คีย์ | Null | คำอธิบาย |
|---|---|---|---|---|
| threshold_key | VARCHAR(50) | PK | N | ชื่อเกณฑ์ |
| threshold_value | NUMERIC(6,2) | | N | ค่า |
| description | VARCHAR(200) | | N | คำอธิบายที่แสดงในหน้าตั้งค่า |

ค่าตั้งต้นที่พบในระบบจำลอง (ตอนนี้เขียนตายตัวอยู่ในโค้ดของแต่ละหน้า)

| threshold_key | ค่า | ใช้ที่ |
|---|---|---|
| `low_score_percent` | 60 | คะแนนรายวิชา / คะแนนเฉลี่ยรายปี: ต่ำกว่าเกณฑ์ |
| `ranking_follow_up_score` | 50 | ลำดับคะแนน: ต้องติดตาม และใช้นับร้อยละความเสี่ยง |
| `ranking_risk_high_percent` | 25 | ลำดับคะแนน: เสี่ยงสูง |
| `ranking_risk_medium_percent` | 15 | ลำดับคะแนน: เสี่ยงปานกลาง |
| `subject_pass_grade` | 3 | ผลการเรียนรายวิชา: นับเป็น "ผ่านเกณฑ์" (≥ 3) |
| `room_risk_pass_rate` | 50 | ภาพรวม: ห้องเสี่ยงเมื่ออัตราผ่านต่ำกว่านี้ |
| `gpax_warning` | 2.00 | ระเบียนสะสม: ควรติดตาม |
| `fail_risk_high_count` | 4 | นักเรียนต้องปรับปรุง: เสี่ยงสูงเมื่อนักเรียนต่ำกว่าเกณฑ์ในวิชาเดียวกันตั้งแต่ 4 คน |
| `remedial_urgent_subjects` | 3 | สอบซ่อม: เร่งด่วนสูงเมื่อนักเรียนติดตั้งแต่ 3 วิชา |

เวลาเรียนขั้นต่ำไม่อยู่ที่นี่ ใช้ `grading_policy.min_attendance_percent` ([ขอบเขต 2](02-grading.md)) เพราะเป็นเกณฑ์ตัดสินผล ไม่ใช่เกณฑ์ของรายงาน

#### เพิ่มใน `semester` (ขอบเขต 0)

| ฟิลด์ | ชนิดข้อมูล | คีย์ | Null | คำอธิบาย |
|---|---|---|---|---|
| remedial_deadline | DATE | | Y | กำหนดสอบซ่อมของภาค หน้าภาพรวมใช้นับ "สอบซ่อมเกินกำหนด" |

## 3. view และ function

```mermaid
flowchart LR
    subgraph base["ตารางขอบเขต 0–4"]
        R[student_subject_result]
        RA[remedial_attempt]
        AR[activity_result]
        S[student_score / assessment_item]
        AT[attendance_session / record]
        TS[student_trait_score]
        CS[class_subject + grading_status]
        GS[grade_submission]
    end
    CSI[v_class_subject_info]
    SR[v_student_result]
    AS[v_attendance_summary]
    CS --> CSI
    R --> SR
    CSI --> SR
    AT --> AS
    CSI --> AS
    SR --> TG[v_student_term_gpa]
    SR --> GPAX["fn_student_gpax(year)"]
    SR --> CP[v_credit_progress]
    SR --> DIST[v_subject_grade_distribution]
    AR --> DIST
    SR --> RANK[v_score_ranking]
    S --> CAT[v_category_score]
    SR --> FAIL[v_fail_student]
    AS --> FAIL
    SR --> REM[v_remedial_status]
    RA --> REM
    AS --> UE[v_unable_exam]
    CSI --> GP[v_grading_progress]
    GS --> GP
    SR --> FU[v_student_followup]
    REM --> FU
    SR --> ACH[v_achievement_level3]
    TS --> DEV[v_student_development]
```

### 3.1 view พื้นฐาน

#### `v_class_subject_info` — ห้องเรียนที่สอนพร้อมข้อมูลที่ใช้กรอง

ทุกหน้ารายงานกรองด้วย ปี ภาค ระดับชั้น ห้อง แผน กลุ่มสาระ ครู และวิชา view นี้รวมคอลัมน์เหล่านี้ไว้แถวเดียว

| คอลัมน์ | ที่มา |
|---|---|
| class_subject_id, grading_status | `class_subject` |
| academic_year, semester_id, semester_no | `semester` |
| grade_level_id, grade_short_name, education_level | `classroom` → `grade_level` |
| classroom_id, classroom_name (`ม.2/1`) | `classroom` |
| study_plan_id, plan_name | `study_plan_subject` → `study_plan` |
| subject_id, subject_code, subject_name, subject_type, credit, learning_area_id | `subject` |
| primary_teacher_id, teacher_ids (array) | `class_subject_teacher` |

#### `v_student_result` — ผลการเรียนที่รายงานใช้

`student_subject_result` + `v_class_subject_info` + ระดับ (`grade_scale.grade_value`) และคอลัมน์ `is_final = (grading_status = 'approved')`

**รายงานทางการ (GPA, GPAX, ระเบียนสะสม, ผลสัมฤทธิ์) ใช้เฉพาะ `is_final`** รายงานติดตามงาน (นักเรียนต้องปรับปรุง ลำดับคะแนน คะแนนรายวิชา) ใช้ทุกแถว เพื่อให้งานวิชาการเห็นปัญหาก่อนครูส่งผล และแสดงป้ายว่ายังไม่อนุมัติ

#### `v_attendance_summary` — เวลาเรียนรายนักเรียน × ห้องเรียนที่สอน

นิยามอยู่ใน [ขอบเขต 4](04-attendance.md#4-ค่าที่คำนวณ-ไม่เก็บ) คอลัมน์: checked_sessions, present, late, leave, absent, attendance_percent, remaining_absence (ขาดได้อีก), is_below_min

### 3.2 ผลการเรียนและหน่วยกิต

#### `v_student_term_gpa` — GPA รายภาค

| คอลัมน์ | การคำนวณ |
|---|---|
| student_id, semester_id | |
| gpa | `ROUND(SUM(grade_value × credit) / SUM(credit), 2)` |
| registered_credits | `SUM(credit)` ของวิชา `basic` / `additional` ทุกวิชาในภาค |
| earned_credits | `SUM(credit)` ที่ `grade_value >= 1` |
| failed_subjects | จำนวนที่ `grade_value = 0` หรือ `grade_result = 'มส'` |
| pending_subjects | จำนวนที่ `grade_result = 'ร'` หรือยังไม่ `is_final` |

GPA นับเฉพาะ `is_final` และวิชาที่มีระดับ 0–4 (รวม 0) ไม่นับ ร และวิชากิจกรรม ตรงกับ `calculateWeightedGpa()` ใน [record-report.js](../../assets/academic-report/js/modules/record-report.js) · หลังสอบซ่อม `student_subject_result.grade_result` ถูกอัปเดตเป็นระดับใหม่ GPA จึงใช้ระดับหลังสอบซ่อม

#### `fn_student_gpax(p_end_year SMALLINT)` — GPAX สะสม

function ที่คืนตาราง (student_id, gpax, registered_credits, earned_credits, failed_subjects) โดยคิดแบบเดียวกับ `v_student_term_gpa` แต่รวมทุกภาคที่ `academic_year <= p_end_year` หน้าระเบียนสะสมใช้ปีที่เลือกเป็นปีสิ้นสุด ("ผลสะสมถึงปีการศึกษา …") จึงต้องรับปีเป็นพารามิเตอร์ ทำเป็น view ธรรมดาไม่ได้

#### `v_credit_progress` — หน่วยกิตรายกลุ่มสาระเทียบกับเกณฑ์

นักเรียน × กลุ่มสาระ × ประเภทวิชา: earned_credits จาก `v_student_result` (`is_final`, `grade_value >= 1`) เทียบกับ `curriculum_credit_requirement` ของหลักสูตรที่ห้องปัจจุบันของนักเรียนใช้ ได้ missing_credits

### 3.3 สรุปรายวิชาและอันดับ

#### `v_subject_grade_distribution` — การกระจายระดับผลการเรียน

ต่อห้องเรียนที่สอน: students, จำนวนแต่ละระดับ (`g4`, `g35`, `g3`, `g25`, `g2`, `g15`, `g1`, `g0`), `r`, `ms`, avg_gpa, pass_count (≥ `subject_pass_grade`), pass_rate, prev_pass_rate และ trend (เทียบกับรายวิชาเดียวกันของระดับชั้นเดียวกันในภาคก่อน) ชุมนุมนับ `pass` / `fail` จาก `activity_result` แยกแถว

หน้าผลการเรียนรายวิชาสรุปทั้งระดับชั้นด้วย ให้ `GROUP BY` subject_id + semester_id จาก view นี้อีกชั้น

#### `v_score_ranking` — อันดับคะแนนรวม

`RANK() OVER (PARTITION BY class_subject_id ORDER BY total_score DESC)` (อันดับแบบ 1, 1, 3 ตาม `average-score-year.js`) และ `rank_in_grade` ที่ partition ด้วย subject_id + semester_id เพื่อจัดอันดับข้ามห้อง · นักเรียนที่ `total_score IS NULL` ไม่ได้อันดับ ห้องเรียนที่สอนที่ไม่มีคะแนนเลยแสดงเป็น "ยังไม่มีคะแนน"

#### `v_category_score` — คะแนนตามหมวด

นักเรียน × ห้องเรียนที่สอน × `assessment_category`: คะแนนที่แปลงแล้วรวมในหมวด (`Σ score / max_score × weight_percent`) หน้ารายละเอียดลำดับคะแนนแสดงคอลัมน์ เก็บ / กลางภาค / ปลายภาค จาก view นี้

### 3.4 ติดตามนักเรียน

#### `v_fail_student` — นักเรียนต้องปรับปรุง

แถวของ `v_student_result` ที่ `grade_result IN ('0', 'ร', 'มส')` พร้อม total_score, score_band (`< 20` / `20–39` / `40–49`) และ **main_cause** ที่คำนวณจากข้อมูลจริงตามลำดับ

1. `มส` → `low_attendance` ขาดเรียน
2. มี `student_score.score_status = 'absent'` → `missed_exam` ขาดสอบ
3. มี `score_status = 'pending_work'` → `missing_work` ไม่ส่งงาน
4. อื่น ๆ → `low_score` คะแนนต่ำกว่าเกณฑ์

ระบบจำลองเดาสาเหตุจากข้อความหมายเหตุ (`fail-student-detail.html` บรรทัด 519–525) ซึ่งผิดได้ถ้าครูเขียนต่างไป

#### `v_remedial_status` — สถานะสอบซ่อม

ผลการเรียนที่ต้องสอบซ่อม (`grade_result = '0'` หรือมี `remedial_attempt`) รวมกับครั้งล่าสุดของ `remedial_attempt` ต่อหมวด

| คอลัมน์ | ค่า |
|---|---|
| remedial_status | `waiting` รอสอบซ่อม (ยังไม่มีครั้งไหน หรือครั้งล่าสุดเป็น `scheduled`) · `done` สอบซ่อมแล้ว (`passed` / `failed`) · `follow_up` ติดตามงาน |
| category_type | `collect` / `midterm` / `final` จาก `assessment_category` · NULL = ทั้งรายวิชา |
| is_overdue | `waiting` และวันนี้เลย `semester.remedial_deadline` |

ความเร่งด่วนรายนักเรียน (เร่งด่วนสูง / ต้องติดตาม / ปกติ) คำนวณจากจำนวนวิชาใน view นี้ ตามเกณฑ์ใน `report_threshold`

#### `v_unable_exam` — ผู้ไม่มีสิทธิ์สอบ

แถวของ `v_attendance_summary` ที่ `attendance_percent < grading_policy.min_attendance_percent` ของระดับนั้น (หน้ารายงานให้ปรับเกณฑ์ชั่วคราวได้ ส่งเป็นเงื่อนไข `WHERE` ตอน query ไม่ต้องแก้ view)

#### `v_student_followup` — นักเรียนที่ต้องติดตาม

ต่อนักเรียนในภาคเรียน: risk_subjects (วิชาที่อยู่ใน `v_fail_student` หรือ `v_unable_exam`), overdue_remedial, high_risk (risk_subjects ≥ 2 หรือมีสอบซ่อมเกินกำหนด) ใช้ในหน้าภาพรวม

### 3.5 ความคืบหน้างานวิชาการ

#### `v_grading_progress` — ความคืบหน้าการส่งและอนุมัติผล

ต่อภาคเรียน (และแยกตามระดับชั้น / ห้อง / ครู ได้): จำนวนห้องเรียนที่สอนตาม `grading_status`, submitted_percent (`pending` + `approved`), approved_percent, รอบที่รอตรวจ (`grade_submission.decision IS NULL`), overdue (ยังไม่ส่งและเลย `semester.grade_submission_deadline`)

### 3.6 รายงานของระบบเดิมที่ยังไม่มีหน้าใหม่

#### `v_achievement_level3` — ผลสัมฤทธิ์ระดับ 3 ขึ้นไป

ปีการศึกษา × ระดับชั้น × กลุ่มสาระ: students, level3_up (`grade_value >= 3`), percent จาก `v_student_result` ที่ `is_final`

#### `v_student_development` — ผลการประเมินพัฒนาผู้เรียน

`student_trait_score` สรุปเป็นระดับ ดีเยี่ยม / ดี / ผ่าน / ไม่ผ่าน แบ่ง 3 ชั้นตามที่ระบบเดิมแยก (ภาพรวม → ห้อง → นักเรียน) ใน view เดียว ใช้ `GROUPING SETS` เพื่อ drill-down ได้โดยไม่ต้อง query ใหม่ (pain point P4 ใน [pain-points.md](../pain-points.md#ปัญหาที่ซ้ำกันหลายหน้า))

## 4. กติกาการคำนวณที่ระบบจำลองยังคิดไม่ตรงกัน

| เรื่อง | ระบบจำลอง | ในฐานข้อมูล |
|---|---|---|
| **เวลาเรียน (%)** | `script.js` (#attendance) ใช้เพดานจำนวนครั้งที่ขาด · `unable-exam-report.js` นับลาเป็นไม่มาเรียน · `teacher-attendance.html` นับลาเป็นมาเรียน (บรรทัด 525) | (มา + สาย) ÷ คาบที่เช็คแล้ว ตาม ADR 0011 ทุกหน้าอ่านจาก `v_attendance_summary` |
| **สถานะการเข้าเรียน** | academic-report ใช้ป้ายภาษาไทย 7 แบบ (ตรงเวลา สาย ขาด ลากิจ ลาป่วย กิจกรรม วันหยุด) · teacher-attendance ใช้ `present` / `late` / `absent` / `leave` | 4 ค่าของ `attendance_record.status` · วันหยุดใช้ `school_holiday` · กิจกรรมใช้ `session_status = 'no_class'` · ลากิจ / ลาป่วยยังแยกไม่ได้ (ดูคำถามเปิด) |
| **คะแนนเฉลี่ยของสอบซ่อม** | แปลง `ร` เป็น 0.5 ตอนหาค่าเฉลี่ย (`student-retake-management.html`) | ไม่นับ ร ในค่าเฉลี่ย |
| **สถานะ "ต้องติดตาม / ดีเด่น"** | ในคะแนนเฉลี่ยรายปีเป็นค่าที่ใส่ไว้ในข้อมูลจำลอง ไม่ได้คำนวณ | ยังไม่มีนิยาม (ดูคำถามเปิด) |
| **เกณฑ์** | ตัวเลขตายตัวกระจายอยู่ในโค้ดแต่ละหน้า | `report_threshold` ที่เดียว |

## 5. ประสิทธิภาพ

- **materialized view** สำหรับ `v_subject_grade_distribution` และผลของ `fn_student_gpax` ระดับปีปัจจุบัน `REFRESH MATERIALIZED VIEW CONCURRENTLY` หลังอนุมัติผล (`grade_submission.decision = 'approved'`) เพราะข้อมูลทางการเปลี่ยนเฉพาะตอนอนุมัติเท่านั้น
- **index ที่รายงานต้องใช้** (นอกเหนือจาก PK / UK)
  - `student_subject_result (student_id)` สำหรับ GPA / GPAX รายคน
  - `attendance_record (student_id)` และ `attendance_session (class_subject_id, class_date)`
  - `class_subject (semester_id)`, `classroom (academic_year, grade_level_id)`
  - `remedial_attempt (student_subject_result_id, attempt_no DESC)` สำหรับหาครั้งล่าสุด
- การจำตัวกรองที่ค้นล่าสุดอยู่ในเบราว์เซอร์ (`AcademicLayout.lastSearch()`) ไม่ต้องเก็บในฐานข้อมูล

## 6. คำถามที่ยังเปิดอยู่

- **มส นับใน GPA ไหม** ตอนนี้นับเป็นวิชาไม่ผ่าน แต่ไม่นับใน GPA (เหมือน ร) เพราะไม่มีระดับใน `grade_scale` ระบบจำลองไม่มีกรณี มส ในระเบียนสะสมให้เทียบ ถ้าโรงเรียนนับ มส เป็น 0 ต้องเปลี่ยนสูตร
- **ลากิจ / ลาป่วย** หน้ารายงานการเข้าเรียนแยกสองแบบ แต่การเช็คชื่อ (ขอบเขต 4, ADR 0011) มีแค่ "ลา" ถ้าต้องแยก ต้องเพิ่มค่าใน `attendance_record.status`
- **สถานะ "ต้องติดตาม" และ "ผลการเรียนดีเด่น"** ในคะแนนเฉลี่ยรายปีจะคิดจากอะไร เช่น ต่ำกว่า `low_score_percent` และ GPA ≥ 3.50
- **สมรรถนะสำคัญ** ระบบเดิมประเมินพัฒนาผู้เรียน 3 ประเภท (คุณลักษณะ / อ่าน คิดวิเคราะห์ และเขียน / สมรรถนะ) แต่ `trait_item.trait_type` ในขอบเขต 2 มีแค่ 2 ประเภท ถ้าต้องมีรายงานนี้ ต้องเพิ่ม `competency`
- **ใครแก้ `report_threshold` ได้** งานวิชาการทุกคน หรือเฉพาะหัวหน้า (เกี่ยวกับสิทธิ์ผู้ใช้ ซึ่งอยู่นอกขอบเขต)
