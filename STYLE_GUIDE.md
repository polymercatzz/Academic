# Academic Report Style Guide

## เป้าหมายของ style guide

เอกสารนี้ใช้เป็นมาตรฐานกลางสำหรับการทำหน้าใหม่หรือปรับหน้าเดิมในระบบ Academic Report เพื่อให้ทุกหน้าดูเป็นผลิตภัณฑ์เดียวกัน

หลักการสำคัญ:

- ไม่ออกแบบแฟนซี
- เน้นใช้งานจริงในโรงเรียน
- อ่านง่าย สแกนเร็ว
- รองรับข้อมูลจำนวนมาก
- ใช้ component และ spacing ซ้ำให้มากที่สุด
- ไม่ใส่คำอธิบายเมื่อชื่อหัวข้อ, label, ค่า filter หรือข้อมูลบนหน้าจอสื่อความหมายครบแล้ว

## Content Design

ค่าเริ่มต้นของระบบคือ **ไม่ใส่ข้อความอธิบาย** เว้นแต่ข้อความนั้นจำเป็นต่อการทำงานจริง

ควรใส่ข้อความอธิบายเมื่อ:

- ป้องกันความเข้าใจผิดที่มีโอกาสเกิดขึ้นจริง
- อธิบายสูตร เกณฑ์ หรือผลที่จะเกิดจากการตั้งค่า
- แสดง validation, error หรือ empty state
- ระบุขอบเขตข้อมูลสำคัญ เช่น ห้อง รายวิชา ภาคเรียน หรือช่วงเวลา

ไม่ควรใส่เมื่อ:

- เป็นการกล่าวซ้ำหัวข้อหรือ label
- บอกว่าตารางเลื่อนได้ ตรึงคอลัมน์ หรือแสดงข้อมูลที่เห็นอยู่แล้ว
- อธิบายฟังก์ชันของปุ่มที่ชื่อปุ่มสื่อครบแล้ว
- เป็นข้อความเชิงแนะนำหรือเชิงการตลาดที่ไม่ช่วยตัดสินใจ

ใช้ field label เป็นคำนามสั้น ๆ และใช้ข้อความบนปุ่มเป็นคำสั่งที่ชัดเจน

## Theme หลัก

ธีมของระบบต้องอิง:

- `Primary Blue`
- `Gray`
- `White`

และคงโทน professional / quiet / utilitarian

หลีกเลี่ยง:

- สีฉูดฉาด
- gradient เยอะ
- card marketing style
- hero layout แบบ landing page

## Typography

ใช้โทนตัวอักษรแบบระบบรายงาน:

- หัวข้อชัด
- เนื้อหากระชับ
- ข้อความรองใช้สี muted
- ป้ายสรุป/metric ใช้ตัวเลขเด่นแต่ไม่ oversized

ภาษา:

- ใช้ภาษาไทยเป็นหลัก
- คงคำมาตรฐานเชิงระบบที่จำเป็นได้ เช่น `GPAX`, `GPA`, `PDF`, `Excel`, `CSV`

## Layout Pattern

หน้าที่ต้องค้นหาก่อนจึงมีข้อมูลควรยึดโครงนี้:

1. `page-header`
2. `search-panel`
3. `results-panel`
4. `table-toolbar`
5. `table-wrap`

หน้าที่มี default data ที่มีความหมายควรใช้ลำดับ:

1. `results-panel` สำหรับสรุปภาพรวม
2. `search-panel` สำหรับปรับขอบเขตข้อมูล
3. `table-toolbar`
4. `table-wrap`

ถ้ามี summary:

- วางไว้เหนือ table
- ใช้ `summary-grid`
- ไม่สร้าง card หนักเกินจำเป็น

## Spacing

ยึด spacing ของระบบเดิม:

- ใช้ระยะห่างสม่ำเสมอ
- ระยะระหว่าง section ต้องไม่แน่นเกินไป
- form field ภายใน grid ต้องจัดแนวเท่ากัน
- ปุ่ม action ต้องอยู่เป็นกลุ่มที่เดาได้

แนวคิด:

- filter ต้องอ่านจากบนลงล่างได้ง่าย
- summary ต้องสแกนได้ใน 1 รอบสายตา
- table toolbar ต้องไม่แตก pattern จากหน้าอื่น

## Form Components

ฟอร์มของระบบควรใช้:

- `select`
- `input[type="text"]`
- `input[type="number"]`
- radio/segmented control
- button primary / secondary

กฎสำคัญ:

- ถ้า filter cascade ต้อง disable ช่องถัดไปจนกว่าจะเลือกช่องก่อน
- ปุ่มค้นหาควรถูก disable ถ้ายังไม่ครบ minimum required filters
- ต้องมี default value ถ้ามีเงื่อนไขที่ระบบรู้อยู่แล้ว
- ถ้ามี advanced filters ให้ซ่อนไว้ก่อน
- ถ้า filter อัปเดตผลอัตโนมัติ ห้ามเพิ่มปุ่มค้นหา ปุ่มล้างเงื่อนไข หรือข้อความสรุป filter ซ้ำด้านล่าง

## Buttons

รูปแบบปุ่มในระบบ:

- `btn btn-primary`
  - ใช้กับคำสั่งหลัก เช่น `ค้นหาข้อมูล`, `ยืนยัน`

- `btn btn-secondary`
  - ใช้กับคำสั่งรอง เช่น `ล้างเงื่อนไข`, `ส่งออก`, `พิมพ์`, `Preview`

กฎ:

- คำสั่งที่เกี่ยวข้องกันให้อยู่กลุ่มเดียวกัน
- export หลาย format ควรรวมใน dropdown เดียว
- อย่าแยกปุ่ม export แบบเก่าหลายปุ่มถ้าไม่จำเป็น

## Table Pattern

ทุกตารางข้อมูลใหญ่ควรมี:

- sticky header
- sticky columns ฝั่งข้อมูลนักเรียน
- horizontal scroll
- zebra rows
- hover row
- readable empty state

เมื่อมี column จำนวนมาก:

- ตรึง `ลำดับ`, `รหัสนักเรียน`, `ชื่อ`
- ส่วนข้อมูลเชิงลึกเลื่อนแนวนอนได้
- อย่าแบ่งตารางเป็นหลายชุดถ้า user ต้องเทียบข้ามวิชา/ข้ามข้อมูล

## Summary Metrics

summary card ควรใช้เมื่อ:

- ต้องช่วยลดความซับซ้อนก่อนอ่านตาราง
- มีค่าที่ผู้ใช้ต้องเห็นทันที
- ช่วยตัดสินใจว่า filter ที่เลือกถูกต้องหรือไม่

ไม่ควรใช้เมื่อ:

- ข้อมูลซ้ำกับ table ตรง ๆ
- ไม่มีประโยชน์ก่อนการอ่านรายละเอียด

## Preview / Export / Print

แนวทางร่วมของระบบ:

- ใช้ `preview panel` ก่อน export หรือ print ถ้าหน้านั้นมีความสำคัญสูง
- ใช้ `alert` เป็น placeholder behavior ได้ใน prototype
- รวม export format ใน dropdown เดียว

ตัวอย่าง flow ที่ควรใช้:

1. ผู้ใช้ค้นหา
2. ผู้ใช้กด `ส่งออก` หรือ `พิมพ์`
3. ระบบเปิด panel ให้เลือก template / language / scope
4. ผู้ใช้กดสร้าง preview
5. ผู้ใช้กดยืนยัน

## Responsive

ลำดับการออกแบบ:

- desktop first
- tablet
- mobile

พฤติกรรมที่ควรคงไว้:

- grid ลดจากหลายคอลัมน์เป็น 2 และ 1 คอลัมน์
- toolbar wrap ได้
- export menu ขยายเต็มความกว้างบนจอเล็กได้
- ตารางยังเลื่อนแนวนอนได้

## Accessibility

ทุกหน้าควรมี:

- keyboard navigation
- visible focus
- label ชัดเจน
- contrast ที่เพียงพอ
- title/tooltip เมื่อข้อความยาวหรือย่อ

## สิ่งที่ห้ามทำ

- ออกแบบหน้าใหม่จากศูนย์โดยไม่อิงระบบเดิม
- เปลี่ยนสี/spacing/typography จนดูคนละระบบ
- ทำตารางหลายก้อนเพื่อหลบปัญหา column เยอะโดยไม่จำเป็น
- ใช้ข้อความอธิบาย UI เยอะจนหน้าแน่น
- เพิ่มปุ่ม action กระจัดกระจายหลายตำแหน่ง

## ไฟล์อ้างอิงหลัก

ดู style และ component pattern จาก:

- [index.html](C:\Users\Panavat\Documents\GitHub\Academic_Report-\index.html)
- [styles.css](C:\Users\Panavat\Documents\GitHub\Academic_Report-\styles.css)
- [score-per-subject.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\score-per-subject.js)
- [record-report.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\record-report.js)
- [unable-exam-report.js](C:\Users\Panavat\Documents\GitHub\Academic_Report-\unable-exam-report.js)
