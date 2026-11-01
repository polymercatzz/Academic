/* ข้อมูลจำลอง (mock) สำหรับ Demo ระบบบันทึกคะแนน
 * ทุกอย่างสร้างจาก seed คงที่ เพื่อให้เปิดกี่ครั้งก็ได้ข้อมูลชุดเดิม */

const SCHOOL = 'โรงเรียนสาธิตวิชาการ (Demo)';

/* ผู้ใช้ในระบบ — roles: teacher = ครูผู้สอน, academic = ครูฝ่ายวิชาการ (ADR 0003) */
const USERS = [
  { id: 'u1', name: 'ครูสมศรี ใจดี', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', roles: ['teacher', 'academic'] },
  { id: 'u2', name: 'ครูประภาพร ศรีสุข', position: 'หัวหน้าฝ่ายวิชาการ', dept: 'กลุ่มสาระการเรียนรู้ภาษาไทย', roles: ['teacher', 'academic'] },
  { id: 'u3', name: 'ครูวิไลวรรณ ทองมา', position: 'ครู', dept: 'กลุ่มสาระการเรียนรู้ภาษาไทย', roles: ['teacher'] },
  { id: 'u4', name: 'ครูธนพล แก้วประเสริฐ', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', roles: ['teacher'] },
  { id: 'u5', name: 'ครูกิตติศักดิ์ บุญยืน', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', roles: ['teacher'] },
  { id: 'u6', name: 'ครูนภัสสร จันทร์หอม', position: 'ครู', dept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', roles: ['teacher'] },
  { id: 'u7', name: 'ครูอนุชา พรหมวงศ์', position: 'ครูผู้ช่วย', dept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', roles: ['teacher'] },
  { id: 'u8', name: 'ครูสุดารัตน์ มณีรัตน์', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', roles: ['teacher'] },
  { id: 'u9', name: 'ครูพงษ์ศักดิ์ ศรีวิไล', position: 'ครู', dept: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', roles: ['teacher'] },
  { id: 'u10', name: 'ครูจิราพร สายสุวรรณ', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม', roles: ['teacher'] },
  { id: 'u11', name: 'ครูวีระพงษ์ ทองสุข', position: 'ครู', dept: 'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', roles: ['teacher'] },
  { id: 'u12', name: 'ครูชลธิชา นาคประเสริฐ', position: 'ครูชำนาญการ', dept: 'กลุ่มสาระการเรียนรู้ศิลปะ', roles: ['teacher'] },
  { id: 'u13', name: 'ครูสมชาย รุ่งเรือง', position: 'ครูชำนาญการพิเศษ', dept: 'กลุ่มสาระการเรียนรู้การงานอาชีพ', roles: ['teacher'] },
];
const CURRENT_USER_ID = 'u1';
const TEACHER = { ...USERS.find((u) => u.id === CURRENT_USER_ID), school: SCHOOL };
const userById = (id) => USERS.find((u) => u.id === id);

/* รายวิชาพื้นฐาน = คอลัมน์ของตาราง ห้อง × รายวิชา ในมุมมองฝ่ายวิชาการ */
const SUBJECTS = [
  { slot: 'th', prefix: 'ท', num: '101', name: 'ภาษาไทย', short: 'ภาษาไทย', credit: 1.5, hours: 60, variant: 0 },
  { slot: 'ma', prefix: 'ค', num: '101', name: 'คณิตศาสตร์', short: 'คณิตศาสตร์', credit: 1.5, hours: 60, variant: 0 },
  { slot: 'sc', prefix: 'ว', num: '101', name: 'วิทยาศาสตร์', short: 'วิทยาศาสตร์', credit: 1.5, hours: 60, variant: 0 },
  { slot: 'te', prefix: 'ว', num: '103', name: 'เทคโนโลยี', suffix: ' (วิทยาการคำนวณ)', short: 'เทคโนโลยี', credit: 0.5, hours: 20, variant: 1 },
  { slot: 'so', prefix: 'ส', num: '101', name: 'สังคมศึกษา', short: 'สังคมศึกษา', credit: 1.5, hours: 60, variant: 1 },
  { slot: 'hi', prefix: 'ส', num: '102', name: 'ประวัติศาสตร์', short: 'ประวัติศาสตร์', credit: 0.5, hours: 20, variant: 1 },
  { slot: 'pe', prefix: 'พ', num: '101', name: 'สุขศึกษาและพลศึกษา', short: 'สุขศึกษา-พละ', credit: 1.0, hours: 40, variant: 2 },
  { slot: 'ar', prefix: 'ศ', num: '101', name: 'ศิลปะ', short: 'ศิลปะ', credit: 1.0, hours: 40, variant: 2 },
  { slot: 'wo', prefix: 'ง', num: '101', name: 'การงานอาชีพ', short: 'การงานอาชีพ', credit: 1.0, hours: 40, variant: 2 },
];
const GRADES = [1, 2, 3];
const ROOMS = GRADES.flatMap((g) => [1, 2, 3].map((r) => `ม.${g}/${r}`));

/* ครูผู้สอน: slot -> [ม.1, ม.2, ม.3] (ค่าเป็น id หรือ array รายห้อง 1-3) */
const ASSIGN = {
  th: ['u2', 'u2', 'u3'],
  ma: ['u4', 'u1', 'u4'],
  sc: ['u5', 'u5', 'u6'],
  te: ['u7', ['u1', 'u7', 'u7'], 'u7'],
  so: ['u8', 'u8', 'u9'],
  hi: ['u10', 'u10', 'u9'],
  pe: ['u11', 'u11', 'u11'],
  ar: ['u12', 'u12', 'u12'],
  wo: ['u13', 'u13', 'u13'],
};
function teacherFor(slot, grade, roomNo) {
  const a = ASSIGN[slot][grade - 1];
  return Array.isArray(a) ? a[roomNo - 1] : a;
}

const TERMS = [
  { key: '2569-1', year: 2569, term: 1, label: 'ปีการศึกษา 2569 ภาคเรียนที่ 1', current: true },
  { key: '2568-2', year: 2568, term: 2, label: 'ปีการศึกษา 2568 ภาคเรียนที่ 2' },
  { key: '2569-2', year: 2569, term: 2, label: 'ปีการศึกษา 2569 ภาคเรียนที่ 2' },
];

/* เกณฑ์ระดับผลการเรียน 8 ระดับ (ระดับมัธยมศึกษา) */
const GRADE_SCALE = [
  { min: 80, grade: '4',   meaning: 'ผลการเรียนดีเยี่ยม' },
  { min: 75, grade: '3.5', meaning: 'ผลการเรียนดีมาก' },
  { min: 70, grade: '3',   meaning: 'ผลการเรียนดี' },
  { min: 65, grade: '2.5', meaning: 'ผลการเรียนค่อนข้างดี' },
  { min: 60, grade: '2',   meaning: 'ผลการเรียนน่าพอใจ' },
  { min: 55, grade: '1.5', meaning: 'ผลการเรียนพอใช้' },
  { min: 50, grade: '1',   meaning: 'ผ่านเกณฑ์ขั้นต่ำ' },
  { min: 0,  grade: '0',   meaning: 'ต่ำกว่าเกณฑ์ขั้นต่ำ (มีสิทธิ์สอบซ่อม)' },
];

const SPECIAL_MARKS = {
  'ร': 'รอส่งงาน / รอการตัดสิน',
  'ข': 'ขาดสอบ',
};
const MIN_ATTENDANCE = 80;

const ATTRIBUTES = [
  { id: 'a1', name: 'รักชาติ ศาสน์ กษัตริย์' },
  { id: 'a2', name: 'ซื่อสัตย์สุจริต' },
  { id: 'a3', name: 'มีวินัย' },
  { id: 'a4', name: 'ใฝ่เรียนรู้' },
  { id: 'a5', name: 'อยู่อย่างพอเพียง' },
  { id: 'a6', name: 'มุ่งมั่นในการทำงาน' },
  { id: 'a7', name: 'รักความเป็นไทย' },
  { id: 'a8', name: 'มีจิตสาธารณะ' },
];

const RTW = [
  { id: 'r1', name: 'อ่านเพื่อหาข้อมูลสารสนเทศ' },
  { id: 'r2', name: 'จับประเด็นสำคัญ ข้อเท็จจริง ความคิดเห็น' },
  { id: 'r3', name: 'วิเคราะห์ วิจารณ์อย่างสมเหตุสมผล' },
  { id: 'r4', name: 'สรุปคุณค่า แนวคิด แง่คิด' },
  { id: 'r5', name: 'เขียนแสดงความคิดเห็น สื่อสาร' },
];

const LEVELS = [
  { v: 3, label: 'ดีเยี่ยม' },
  { v: 2, label: 'ดี' },
  { v: 1, label: 'ผ่าน' },
  { v: 0, label: 'ไม่ผ่าน' },
];

const INDICATORS = {
  'ค22101': [
    { id: 'ค1.1 ม.2/1', text: 'เข้าใจและใช้สมบัติของเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็ม' },
    { id: 'ค1.2 ม.2/1', text: 'เข้าใจหลักการการดำเนินการของพหุนาม' },
    { id: 'ค2.2 ม.2/1', text: 'ใช้ความรู้ทางเรขาคณิตในการสร้างรูปเรขาคณิต' },
    { id: 'ค2.2 ม.2/5', text: 'เข้าใจและใช้ทฤษฎีบทพีทาโกรัสและบทกลับในการแก้ปัญหา' },
    { id: 'ค3.1 ม.2/1', text: 'เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอข้อมูล' },
  ],
  'ค22201': [
    { id: 'ผลการเรียนรู้ 1', text: 'แก้โจทย์ปัญหาเกี่ยวกับเลขยกกำลังได้' },
    { id: 'ผลการเรียนรู้ 2', text: 'ใช้สมบัติของพหุนามแก้ปัญหาได้' },
    { id: 'ผลการเรียนรู้ 3', text: 'ให้เหตุผลทางเรขาคณิตได้' },
  ],
  'ว22103': [
    { id: 'ว4.2 ม.2/1', text: 'ออกแบบอัลกอริทึมที่ใช้แนวคิดเชิงคำนวณในการแก้ปัญหา' },
    { id: 'ว4.2 ม.2/2', text: 'ออกแบบและเขียนโปรแกรมที่ใช้ตรรกะและฟังก์ชัน' },
    { id: 'ว4.2 ม.2/3', text: 'อภิปรายองค์ประกอบและหลักการทำงานของระบบคอมพิวเตอร์' },
    { id: 'ว4.2 ม.2/4', text: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย' },
  ],
};

/* ---------- ตัวสร้างข้อมูลแบบกำหนด seed ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOY_NAMES = ['ณัฐวุฒิ','ธนกร','ศุภกร','ภูมิพัฒน์','อภิสิทธิ์','วรเมธ','กิตติภพ','ปัณณวัฒน์','ธีรภัทร','ภัทรพล','จิรายุ','ปิยะพงษ์','ธนวัฒน์','วีรภัทร','พงศกร','ภาคิน','ต้นกล้า','ชยพล','กฤตภาส','ธนภูมิ','สิรวิชญ์','ณภัทร'];
const GIRL_NAMES = ['ปวีณา','กัญญาณัฐ','พิมพ์ชนก','ชนิดา','ธัญชนก','ณิชา','สุพิชชา','อรปรียา','เบญญาภา','ชุติมา','ศิริประภา','กมลชนก','นันทิชา','ณัฐธิดา','รัชนก','สิรินดา','ปริยากร','ภัทรวดี','วรัญญา','ญาณิศา','ขวัญข้าว','ปุณยวีร์'];
const LAST_NAMES = ['สุขสวัสดิ์','ทองคำ','ศรีสมบูรณ์','วงศ์ใหญ่','แก้วมณี','บุญมา','พรหมมา','จันทร์เพ็ญ','รัตนพันธ์','สายทอง','มีสุข','ชัยมงคล','ประเสริฐศรี','อินทร์แก้ว','เพชรรัตน์','ศรีวงศ์','นาคสวัสดิ์','พึ่งทอง','บุญเรือง','สมบัติทอง','เจริญผล','ทองดี','แสงอรุณ','พานิชกุล','วัฒนสุข'];

function makeStudents(rand, count, idStart) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const boy = rand() < 0.5;
    const pool = boy ? BOY_NAMES : GIRL_NAMES;
    list.push({
      id: String(idStart + i),
      prefix: boy ? 'ด.ช.' : 'ด.ญ.',
      first: pool[Math.floor(rand() * pool.length)],
      last: LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)],
      ability: 0.52 + rand() * 0.45,
    });
  }
  // เรียงเลขที่ตามแบบโรงเรียน: ชายก่อน แล้วตามด้วยหญิง
  list.sort((a, b) => (a.prefix === b.prefix ? 0 : a.prefix === 'ด.ช.' ? -1 : 1));
  list.forEach((s, i) => { s.no = i + 1; });
  return list;
}

function mathStructure() {
  return [
    { id: 'c1', group: 'collect', name: 'แบบฝึกหัดเลขยกกำลัง', max: 10, weight: 10, indicators: ['ค1.1 ม.2/1'] },
    { id: 'c2', group: 'collect', name: 'ทดสอบย่อย 1', max: 20, weight: 10, indicators: ['ค1.1 ม.2/1'] },
    { id: 'c3', group: 'collect', name: 'ใบงานพหุนาม', max: 10, weight: 10, indicators: ['ค1.2 ม.2/1'] },
    { id: 'c4', group: 'collect', name: 'ทดสอบย่อย 2', max: 20, weight: 10, indicators: ['ค1.2 ม.2/1', 'ค2.2 ม.2/1'] },
    { id: 'c5', group: 'collect', name: 'โครงงานพีทาโกรัส', max: 20, weight: 10, indicators: ['ค2.2 ม.2/5'] },
    { id: 'c6', group: 'collect', name: 'จิตพิสัย', max: 10, weight: 10, indicators: [] },
    { id: 'c7', group: 'mid',     name: 'สอบกลางภาค', max: 40, weight: 20, indicators: ['ค1.1 ม.2/1', 'ค1.2 ม.2/1'] },
    { id: 'c8', group: 'final',   name: 'สอบปลายภาค', max: 40, weight: 20, indicators: ['ค2.2 ม.2/5', 'ค3.1 ม.2/1'] },
  ];
}

function techStructure() {
  return [
    { id: 'c1', group: 'collect', name: 'ออกแบบอัลกอริทึม', max: 10, weight: 15, indicators: ['ว4.2 ม.2/1'] },
    { id: 'c2', group: 'collect', name: 'เขียนโปรแกรม Scratch', max: 20, weight: 20, indicators: ['ว4.2 ม.2/2'] },
    { id: 'c3', group: 'collect', name: 'ใบงานระบบคอมพิวเตอร์', max: 10, weight: 15, indicators: ['ว4.2 ม.2/3'] },
    { id: 'c4', group: 'collect', name: 'ชิ้นงานความปลอดภัยออนไลน์', max: 20, weight: 20, indicators: ['ว4.2 ม.2/4'] },
    { id: 'c7', group: 'mid',     name: 'สอบกลางภาค', max: 20, weight: 10, indicators: ['ว4.2 ม.2/1', 'ว4.2 ม.2/2'] },
    { id: 'c8', group: 'final',   name: 'สอบปลายภาค', max: 40, weight: 20, indicators: ['ว4.2 ม.2/3', 'ว4.2 ม.2/4'] },
  ];
}

/* fill: สัดส่วนองค์ประกอบ (ตามลำดับ) ที่มีคะแนนแล้ว, 1 = ครบ */
function fillScores(rand, students, structure, fill, opts = {}) {
  const scores = {};
  const upto = Math.round(structure.length * fill);
  students.forEach((s) => {
    scores[s.id] = {};
    structure.forEach((c, idx) => {
      if (idx >= upto) return;
      let p = s.ability + (rand() - 0.5) * 0.25;
      p = Math.max(0, Math.min(1, p));
      scores[s.id][c.id] = String(Math.round(c.max * p));
    });
  });
  (opts.special || []).forEach(([i, comp, mark]) => {
    const s = students[i];
    if (s && scores[s.id]) scores[s.id][comp] = mark;
  });
  (opts.lowAbility || []).forEach((i) => {
    const s = students[i];
    if (!s) return;
    structure.forEach((c, idx) => {
      if (idx < upto) scores[s.id][c.id] = String(Math.round(c.max * (0.18 + rand() * 0.22)));
    });
  });
  (opts.blanks || []).forEach(([i, comp]) => {
    const s = students[i];
    if (s) delete scores[s.id][comp];
  });
  return scores;
}

function fillLevels(rand, students, items, fill) {
  const out = {};
  students.forEach((s, i) => {
    out[s.id] = {};
    if (i / students.length >= fill) return;
    items.forEach((it) => {
      const base = s.ability > 0.75 ? 3 : s.ability > 0.5 ? 2 : s.ability > 0.35 ? 2 : 1;
      out[s.id][it.id] = String(Math.max(0, Math.min(3, base + (rand() < 0.2 ? (rand() < 0.5 ? -1 : 1) : 0))));
    });
  });
  return out;
}

function makeAttendance(rand, students, lowIdx = []) {
  const att = {};
  students.forEach((s, i) => {
    att[s.id] = lowIdx.includes(i) ? 62 + Math.round(rand() * 14) : 84 + Math.round(rand() * 16);
  });
  return att;
}

