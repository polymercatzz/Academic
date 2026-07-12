# Attendance Report Notes

## Overview

หน้านี้ถูกปรับจากตารางรายชื่อนักเรียนธรรมดาให้เป็นเครื่องมือวิเคราะห์การเข้าเรียนเบื้องต้นของโรงเรียน

แนวคิดหลัก:

- ใช้งานได้ทันทีโดยไม่ต้องพึ่ง backend
- ข้อมูล mock ต้องสัมพันธ์กับสิ่งที่ผู้ใช้เลือก
- รองรับทั้งการดูเร็วและการดูรายงานแบบมีมิติเวลา
- โครงข้อมูลต้องต่อยอดเป็น API หรือฐานข้อมูลจริงได้ในอนาคต

ไฟล์หลักที่เกี่ยวข้อง:

- `index.html`
- `styles.css`
- `script.js`

## Current UI Direction

ชื่อแนวคิดของหน้า:

- `Attendance Analysis Tool`

เป้าหมาย UX:

- ครูอ่านข้อมูลสำคัญได้ใน 3 วินาที
- ค้นหาตามห้องและวิชาจริง
- เห็นคาบเรียนจริง ไม่ใช่วันที่สุ่ม
- สลับมุมมองได้ตามงาน

โครงหน้าปัจจุบัน:

1. Search Panel
2. Summary Metrics
3. View Mode Switcher
4. Analysis Table

View mode มี 2 แบบ:

- `Quick View`
  ใช้ดูสถานะล่าสุดของนักเรียนตามผลค้นหา
- `Report View`
  ใช้ดู attendance matrix ตามวันที่และคาบเรียนจริง

## Data Design

ตอนนี้ใช้ relational mock data แบบ inline ใน `script.js`

จุดเริ่มต้นของข้อมูล:

- `buildInlineMockDatabase()`

โครง entity:

- `academicYears`
- `semesters`
- `grades`
- `classrooms`
- `teachers`
- `subjects`
- `schedules`
- `students`
- `attendance`

ความสัมพันธ์หลัก:

`Academic Year -> Semester -> Classroom -> Subject -> Teacher -> Weekly Schedule -> Student -> Attendance`

ตัวอย่าง field สำคัญ:

- `classroom.gradeId`
- `schedule.classroomId`
- `schedule.subjectId`
- `schedule.teacherId`
- `schedule.semesterId`
- `student.classroomId`
- `attendance.scheduleId`
- `attendance.studentId`

## Mock Data Rules

กฎที่ใช้สร้างข้อมูล mock:

- ตารางเรียนไม่เรียนทุกวัน
- แต่ละวิชามี `weeklySlots` ของตัวเอง
- attendance ถูกสร้างเฉพาะวันที่ตรงกับ schedule จริง
- นักเรียนแต่ละคนมี profile พฤติกรรม เช่น `steady`, `late`, `absence`, `leave`, `activity`
- status ถูกสร้างจาก profile เพื่อให้ข้อมูลดูสมจริงและแตกต่างกัน

ฟังก์ชันที่สร้าง session ตามตารางเรียน:

- `buildScheduleSessions(weeklySlots, year, month)`

ผลลัพธ์:

- ถ้าเลือกวิชาคณิตของห้องหนึ่งในเดือนกรกฎาคม
- ระบบจะสร้างเฉพาะวัน/คาบที่วิชาคณิตห้องนั้นมีเรียนจริงในเดือนนั้น

## Search Behavior

ฟังก์ชันหลักของการค้นหา:

- `buildSearchResult()`

ลำดับการกรอง:

1. หา date range จาก search type
2. หา semester ที่เกี่ยวข้อง
3. กรอง grade
4. กรอง classroom
5. กรอง subject
6. หา schedule ที่ตรงเงื่อนไข
7. หา student ของห้องนั้น
8. หา attendance ที่ผูกกับ `scheduleId + studentId` และอยู่ในช่วงวัน

สิ่งที่หน้า search ทำตอนนี้:

- เลือกชั้นแล้วห้องจะเปลี่ยนตาม
- เลือกห้องแล้ววิชาจะเปลี่ยนตาม
- เลือกวิชาแล้ว report จะเหลือเฉพาะคาบจริงของวิชานั้น

## Table Behavior

Quick View:

- แสดงสถานะล่าสุด
- แสดงจำนวน มาเรียน / สาย / ขาด / ลา
- แสดงเปอร์เซ็นต์เข้าเรียน

Report View:

- แสดง matrix รายคาบ
- sticky header
- freeze คอลัมน์รหัสและชื่อ
- hover highlight คอลัมน์

ฟังก์ชัน render หลัก:

- `renderQuickHeader()`
- `renderQuickRows()`
- `renderReportHeader()`
- `renderReportRows()`
- `renderTable()`

## Edit and Action State

สถานะ action ปัจจุบัน:

- `แก้ไขรายบุคคล`
  ใช้งานได้ใน `Quick View`
- `แก้ไขแบบกลุ่ม`
  ยังเป็น placeholder
- `ส่งออก Excel / PDF`
  ยังเป็น placeholder

ฟังก์ชันที่เกี่ยวข้อง:

- `toggleEditMode()`
- `saveChanges()`
- `openBulkEdit()`
- `mockExport()`

## Known Limitations

ข้อจำกัดที่ตั้งใจยอมรับในรอบนี้:

- ยังไม่มี backend จริง
- ข้อมูล mock อยู่ใน `script.js`
- ไม่มี persistence จริงหลัง refresh
- bulk edit ยังไม่ทำจริง
- export ยังไม่ทำจริง
- attendance ตอนนี้สร้างสำหรับการสาธิตเดือนกรกฎาคม 2026 เป็นหลัก

## Recommended Next Steps

ลำดับงานถัดไปที่แนะนำ:

1. ย้าย relational mock data ออกจาก `script.js` ไปเป็น data module หรือ mock service ภายใน frontend
2. แยก data layer ออกจาก UI layer ให้ชัด
3. ทำ bulk edit สำหรับหลายคนหรือหลายคาบ
4. ทำ export ให้ตรงกับผลค้นหาจริง
5. เพิ่ม attendance trend เช่น ขาดต่อเนื่อง, มาสายบ่อย, เปรียบเทียบรายสัปดาห์
6. เตรียม schema ให้ตรงกับ backend API จริง

## Quick Re-entry Guide

ถ้ากลับมาทำต่อทีหลัง ให้เริ่มดูตามนี้:

1. เปิด `script.js`
2. ดู `buildInlineMockDatabase()`
3. ดู `buildSearchResult()`
4. ดู `searchData()`
5. ดู `renderTable()` และสอง view mode

ถ้าจะเปลี่ยนข้อมูล:

- แก้ entity ใน `buildInlineMockDatabase()`

ถ้าจะเปลี่ยน search logic:

- แก้ `buildSearchResult()`

ถ้าจะเปลี่ยนหน้าตาราง:

- แก้ `renderQuick*`, `renderReport*` และ `styles.css`
