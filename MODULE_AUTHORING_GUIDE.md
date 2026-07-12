# Module Authoring Guide

## เป้าหมาย

เอกสารนี้ใช้สำหรับ:

- เพิ่มหน้าใหม่ในระบบ Academic Report
- สั่งงาน AI/Codex ให้สร้างโมดูลใหม่ในมาตรฐานเดียวกัน
- ลดโอกาสที่หน้าถัดไปจะหลุด theme หรือหลุด UX pattern

## Checklist ก่อนเริ่มทำโมดูลใหม่

ก่อนเพิ่มหน้าใหม่ ให้ตอบให้ได้ก่อนว่า:

1. โมดูลนี้มี business goal อะไร
2. ผู้ใช้หลักคือใคร
3. ต้องใช้ filter อะไรบ้าง
4. filter ไหนเป็น required
5. ต้องมี summary หรือไม่
6. table ใหญ่แค่ไหน
7. ต้องใช้ sticky column หรือ horizontal scroll หรือไม่
8. export / print ต้องมี preview หรือไม่
9. mobile/tablet ต้องเห็นอะไรเป็นลำดับแรก

## วิธีเพิ่มโมดูลใหม่ในระบบ

### 1. เพิ่มเมนูใน sidebar

แก้ [index.html](C:\Users\Panavat\Documents\GitHub\Academic_Report-\index.html)

- เพิ่มปุ่ม `nav-item`
- ใส่ `data-system="module-name"`

ตัวอย่าง:

```html
<button class="nav-item" type="button" data-system="new-module">
  <span>ชื่อโมดูล</span>
  <small>คำอธิบายสั้น</small>
</button>
```

### 2. เพิ่ม section ของหน้า

ใน `main.app` ให้เพิ่ม:

```html
<section class="app-page" data-page="new-module">
  <!-- page header -->
  <!-- search panel -->
  <!-- results panel -->
</section>
```

### 3. ต่อ routing ใน script.js

แก้ [script.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\script.js)

- เพิ่มชื่อใน `moduleLabels`
- เพิ่มชื่อ module ใน list ของ `setActiveModule()`
- ถ้าต้องการไม่ให้ขึ้น placeholder toast ต้องเพิ่มใน allowed modules ของ nav click handler

### 4. สร้างไฟล์ logic แยก

สร้างไฟล์ใหม่ เช่น:

- `new-module.js`

แนวทาง:

- ใช้ IIFE ครอบไฟล์
- query element ของหน้าใหม่เฉพาะส่วนที่ต้องใช้
- ถ้า element หลักไม่มี ให้ `return` ทันที
- แยก `state`
- แยก `buildInlineMockDatabase()`
- แยก `render*()`
- แยก `attachEvents()`
- เรียก `init()` ท้ายไฟล์

โครงแนะนำ:

```js
(() => {
  const els = {
    searchBtn: document.getElementById("newSearchBtn")
  };

  if (!els.searchBtn) return;

  const state = {
    rows: []
  };

  function buildInlineMockDatabase() {}
  function renderTable() {}
  function attachEvents() {}
  function init() {}

  attachEvents();
  init();
})();
```

### 5. ต่อ script ใน index.html

ใส่ `<script src="new-module.js"></script>` ใต้ script อื่นช่วงท้ายหน้า

### 6. เพิ่ม style เฉพาะเท่าที่จำเป็น

แก้ [styles.css](C:\Users\Panavat\Documents\GitHub\Academic_Report-\styles.css)

กฎ:

- ใช้ class ใหม่เฉพาะส่วนที่ไม่สามารถ reuse ของเดิมได้
- อย่า override style กลางโดยไม่จำเป็น
- reuse component pattern ของ `search-panel`, `results-panel`, `summary-grid`, `table-toolbar`, `export-dropdown`

## Prompt Template สำหรับสั่ง AI เพิ่มระบบใหม่

ใช้ prompt ลักษณะนี้:

```md
คุณเป็น Senior UX/UI Designer และ Frontend Architect

งานนี้คือออกแบบหน้า "ชื่อระบบ"

เงื่อนไขสำคัญ

- ห้าม redesign จากศูนย์
- ใช้ theme เดียวกับ Attendance Report, Score per Subject และหน้าอื่น ๆ
- ใช้ HTML, CSS, JS เท่านั้น
- ใช้ sidebar เดียวกับ index
- ให้แต่ละหน้าแสดงผลตามเมนูที่เลือกในระบบปัจจุบัน
- ใช้ภาษาไทยเป็นหลัก

Business Goal

- ...

Filter

- ...

Result

- ...

Table

- ...

Export / Print

- ...

Responsive

- desktop first
- tablet
- mobile

Accessibility

- keyboard navigation
- visible focus
- color contrast
```

## Prompt เสริมสำหรับงานแก้ UX

ถ้าต้องการให้ AI แก้หน้าที่มีอยู่แล้ว ใช้ prompt แนวนี้:

```md
ช่วยปรับหน้า "ชื่อหน้า" ในระบบปัจจุบัน

เงื่อนไข:

- อย่าเปลี่ยน theme
- อย่าเปลี่ยน sidebar
- อย่า redesign ใหม่ทั้งหมด
- reuse filter section, table style, export component และ responsive behavior เดิม
- ปรับเฉพาะจุดที่ทำให้ใช้งานง่ายขึ้น

Pain Points

- ...
```

## Prompt เสริมสำหรับงานเพิ่มข้อมูล mock

```md
ช่วยเพิ่ม mock data ให้หน้า "ชื่อหน้า"

เงื่อนไข:

- ข้อมูลต้องสัมพันธ์กับ filter
- ต้องใช้ค่าจริงตามโครงข้อมูล mock เดิม
- ถ้าไม่มี schema เดิม ให้สร้างใหม่แบบที่ต่อยอดเป็น API ได้
- ต้องมีหลายห้อง หลายระดับชั้น และหลายสถานะ
```

## มาตรฐานชื่อ element / id ที่แนะนำ

เพื่อให้ดูแลต่อได้ง่าย:

- prefix ตามโมดูล เช่น `score`, `record`, `unable`
- ปุ่มใช้ suffix `Btn`
- dropdown/menu ใช้ suffix `Dropdown`, `Menu`
- table ใช้ `Thead`, `Tbody`
- preview/print ใช้ `Preview`, `Print`

ตัวอย่าง:

- `recordSearchBtn`
- `recordExportMenu`
- `scoreColumnToggleBtn`
- `unablePaginationStatus`

## มาตรฐานการเขียน mock behavior

ใน prototype ให้ยึดแบบนี้:

- export ใช้ dropdown เดียว
- print/export ใช้ preview panel ถ้าหน้าซับซ้อน
- ตอนยืนยัน action ใช้ `alert()` ได้
- ถ้ามี toast กลางระบบ ให้ใช้ซ้ำ

## มาตรฐานการเขียน empty state

empty state ที่ดีควรมี:

- ข้อความสั้น
- บอกว่าตอนนี้ยังไม่มีผลลัพธ์
- ถ้าเหมาะสมให้บอกว่าควรปรับ filter อะไร

ตัวอย่าง:

- `กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน`
- `ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก`

## สิ่งที่ควรหลีกเลี่ยงเวลาเพิ่มโมดูล

- สร้างไฟล์ HTML แยกใหม่ถ้าโมดูลควรอยู่ใน SPA เดิม
- ตั้ง class แบบไม่สื่อความหมาย
- ใช้ข้อความอังกฤษเยอะเกินไป
- เพิ่ม filter เยอะโดยไม่จัดลำดับความสำคัญ
- แก้ CSS กลางจนกระทบหน้าเดิม

## ลำดับตรวจงานก่อนส่ง

1. sidebar เปลี่ยนหน้าได้จริง
2. ปุ่ม active ถูกต้อง
3. filter cascade ถูกต้อง
4. ปุ่มค้นหาถูก disable/enable ถูกต้อง
5. summary ตรงกับผลค้นหา
6. table sticky/header/scroll ทำงานตรง pattern
7. export/print ทำงานตาม flow
8. mobile/tablet ไม่พัง
9. ภาษาไทยสอดคล้องกัน
10. ไม่มีไฟล์เก่าที่ไม่ได้ใช้ค้างอยู่
