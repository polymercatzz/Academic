/*
 * timetable-data.js — deterministic mock database for the timetable pages.
 * Subject codes, plan ids (p1, p28, …) and teachers t01–t26 mirror curriculum-management.html
 * so links like curriculum-management.html#CUR-2570-01/p88 land on the right plan.
 * "external" = data owned by another team (งานบุคคล / อาคารสถานที่), mocked here.
 */
window.TT_SEED = function (useDb) {
  const SCHOOL = { name: 'โรงเรียนสาธิตวิชาการ' };
  const iso = (d, t = '09:00') => new Date(`${d}T${t}:00+07:00`).toISOString();

  /* ---------------- curriculum (mirrors curriculum-management.html) ---------------- */
  const BLUEPRINT = [
    { letter: 'ท', name: 'ภาษาไทย', type: 'พื้นฐาน', hours: 3, seq: 1, tag: 'core' },
    { letter: 'ค', name: 'คณิตศาสตร์', type: 'พื้นฐาน', hours: 3, seq: 1, tag: 'core' },
    { letter: 'ว', name: 'วิทยาศาสตร์และเทคโนโลยี', type: 'พื้นฐาน', hours: 3, seq: 1, tag: 'core', roomType: 'lab' },
    { letter: 'ว', name: 'วิทยาการคำนวณ', type: 'พื้นฐาน', hours: 1, seq: 3, tag: 'core', roomType: 'com' },
    { letter: 'ส', name: 'สังคมศึกษา', type: 'พื้นฐาน', hours: 3, seq: 1, tag: 'core' },
    { letter: 'ส', name: 'ประวัติศาสตร์', type: 'พื้นฐาน', hours: 1, seq: 3, tag: 'core' },
    { letter: 'พ', name: 'สุขศึกษาและพลศึกษา', type: 'พื้นฐาน', hours: 2, seq: 1, tag: 'core', roomType: 'gym' },
    { letter: 'ศ', name: 'ศิลปะ', type: 'พื้นฐาน', hours: 2, seq: 1, tag: 'core', roomType: 'art' },
    { letter: 'ง', name: 'การงานอาชีพ', type: 'พื้นฐาน', hours: 2, seq: 1, tag: 'core' },
    { letter: 'อ', name: 'ภาษาอังกฤษ', type: 'พื้นฐาน', hours: 3, seq: 1, tag: 'core' },
    { letter: 'ค', name: 'คณิตศาสตร์เพิ่มเติม', type: 'เพิ่มเติม', hours: 3, seq: 1, tag: 'sci' },
    { letter: 'ว', name: 'วิทยาศาสตร์เพิ่มเติม', type: 'เพิ่มเติม', hours: 3, seq: 1, tag: 'sci' },
    { letter: 'ว', name: 'โครงงานวิทยาศาสตร์', type: 'เพิ่มเติม', hours: 2, seq: 3, tag: 'sci', roomType: 'lab', coTeach: true },
    { letter: 'อ', name: 'ภาษาอังกฤษเพื่อการสื่อสาร', type: 'เพิ่มเติม', hours: 2, seq: 1, tag: 'en' },
    { letter: 'จ', name: 'ภาษาจีน', type: 'เพิ่มเติม', hours: 2, seq: 1, tag: 'cn' },
    { letter: 'ก', name: 'แนะแนว', type: 'กิจกรรม', hours: 1, seq: 1, tag: 'act' },
    { letter: 'ก', name: 'ชุมนุม', type: 'กิจกรรม', hours: 1, seq: 3, tag: 'act' }
  ];
  const PLAN_TEMPLATES = { regular: ['core', 'act', 'en'], sci: ['core', 'act', 'sci'], lang: ['core', 'act', 'en', 'cn'] };
  const subjects = [];
  for (let level = 1; level <= 6; level++) {
    const levelDigit = level <= 3 ? '2' : '3';
    const yearIndex = (level - 1) % 3;
    [1, 2].forEach((term) => BLUEPRINT.forEach((bp, bi) => {
      const typeDigit = bp.type === 'พื้นฐาน' ? '1' : bp.type === 'เพิ่มเติม' ? '2' : '9';
      const code = `${bp.letter}${levelDigit}${yearIndex + 1}${typeDigit}${String(bp.seq + term - 1).padStart(2, '0')}`;
      subjects.push({
        code, name: bp.type === 'กิจกรรม' ? bp.name : `${bp.name} ${yearIndex * 2 + term}`, group: bp.letter === 'จ' ? 'อ' : bp.letter, type: bp.type,
        hours: bp.hours, level, term, bp: bi, tag: bp.tag, roomType: bp.roomType || null, coTeach: !!bp.coTeach
      });
    }));
  }
  const PLAN_ROWS = [
    ['p1', 'CUR-2570-01', 1, 'ห้องเรียนปกติ', [1, 2, 3, 4], 'regular'],
    ['p28', 'CUR-2570-01', 1, 'ห้องเรียนพิเศษวิทยาศาสตร์-คณิตศาสตร์', [5], 'sci'],
    ['p59', 'CUR-2570-01', 1, 'ห้องเรียนพิเศษภาษา', [6], 'lang'],
    ['p88', 'CUR-2570-01', 2, 'ห้องเรียนปกติ', [1, 2, 3, 4], 'regular'],
    ['p115', 'CUR-2570-01', 2, 'ห้องเรียนพิเศษวิทยาศาสตร์-คณิตศาสตร์', [5], 'sci'],
    ['p146', 'CUR-2570-01', 3, 'ห้องเรียนปกติ', [1, 2, 3, 4], 'regular'],
    ['p173', 'CUR-2570-01', 3, 'ห้องเรียนพิเศษวิทยาศาสตร์-คณิตศาสตร์', [5], 'sci'],
    ['p204', 'CUR-2569-02', 4, 'แผนการเรียนวิทยาศาสตร์-คณิตศาสตร์', [1, 2, 3], 'sci'],
    ['p235', 'CUR-2569-02', 4, 'แผนการเรียนศิลป์-ภาษา', [4, 5], 'lang'],
    ['p264', 'CUR-2569-02', 5, 'แผนการเรียนวิทยาศาสตร์-คณิตศาสตร์', [1, 2, 3], 'sci'],
    ['p295', 'CUR-2569-02', 5, 'แผนการเรียนศิลป์-ภาษา', [4, 5], 'lang'],
    ['p324', 'CUR-2569-02', 6, 'แผนการเรียนวิทยาศาสตร์-คณิตศาสตร์', [1, 2, 3], 'sci'],
    ['p355', 'CUR-2569-02', 6, 'แผนการเรียนศิลป์-ภาษา', [4, 5], 'lang']
  ];
  const plans = PLAN_ROWS.map(([id, curriculumId, level, name, rooms, template]) => {
    const tags = PLAN_TEMPLATES[template];
    const pick = (term) => subjects.filter((s) => s.level === level && s.term === term && tags.includes(s.tag)).map((s) => s.code);
    return { id, curriculumId, level, name, template, classIds: rooms.map((n) => `${level}-${n}`), subjects: { 1: pick(1), 2: pick(2) } };
  });

  /* ---------------- external: classes, rooms, teachers ---------------- */
  const classes = [];
  plans.forEach((p) => p.classIds.forEach((cid) => {
    const [level, n] = cid.split('-').map(Number);
    classes.push({ id: cid, name: `ม.${level}/${n}`, level, students: 30 + ((level * 7 + n * 5) % 13), advisor: null, homeroom: `R${level}0${n}` });
  }));
  classes.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id, undefined, { numeric: true }));
  const rooms = [
    ...classes.map((c) => ({ id: c.homeroom, name: `ห้อง ${c.homeroom.slice(1)}`, short: `ห้อง ${c.homeroom.slice(1)}`, type: 'regular', cap: 45, building: `อาคาร ${c.level <= 3 ? '1' : '2'}`, maxClasses: 1 })),
    ...[1, 2, 3, 4].map((n) => ({ id: `LAB${n}`, name: `ห้องปฏิบัติการวิทยาศาสตร์ ${n}`, short: `Lab วิทย์ ${n}`, type: 'lab', cap: 45, building: 'อาคารวิทยาศาสตร์', maxClasses: 1 })),
    { id: 'COM1', name: 'ห้องคอมพิวเตอร์ 1', short: 'ห้องคอม 1', type: 'com', cap: 45, building: 'อาคาร 3', maxClasses: 1 },
    { id: 'COM2', name: 'ห้องคอมพิวเตอร์ 2', short: 'ห้องคอม 2', type: 'com', cap: 45, building: 'อาคาร 3', maxClasses: 1 },
    { id: 'GYM', name: 'โรงยิมเนเซียม', short: 'โรงยิม', type: 'gym', cap: 90, building: 'โรงยิม', maxClasses: 2 },
    { id: 'FIELD', name: 'สนามกีฬา', short: 'สนามกีฬา', type: 'gym', cap: 120, building: 'สนาม', maxClasses: 2 },
    { id: 'ART1', name: 'ห้องศิลปะ 1', short: 'ห้องศิลปะ 1', type: 'art', cap: 45, building: 'อาคาร 5', maxClasses: 1 },
    { id: 'ART2', name: 'ห้องศิลปะ 2', short: 'ห้องศิลปะ 2', type: 'art', cap: 45, building: 'อาคาร 5', maxClasses: 1 },
    { id: 'MUS', name: 'ห้องดนตรี', short: 'ห้องดนตรี', type: 'music', cap: 45, building: 'อาคาร 5', maxClasses: 1 },
    { id: 'LIB', name: 'ห้องสมุด', short: 'ห้องสมุด', type: 'regular', cap: 60, building: 'อาคาร 1', maxClasses: 1 }
  ];
  const GROUP_LETTER = { 'ภาษาไทย': 'ท', 'คณิตศาสตร์': 'ค', 'วิทยาศาสตร์และเทคโนโลยี': 'ว', 'สังคมศึกษา ศาสนา และวัฒนธรรม': 'ส', 'สุขศึกษาและพลศึกษา': 'พ', 'ศิลปะ': 'ศ', 'การงานอาชีพ': 'ง', 'ภาษาต่างประเทศ': 'อ', 'กิจกรรมพัฒนาผู้เรียน': 'ก' };
  // [id, name, group, stage('lower'|'upper'|'both'), subjects restriction (blueprint names) | null]
  const TEACHER_ROWS = [
    ['t01', 'อ.ปาริฉัตร ทองดี', 'ภาษาไทย', 'lower'], ['t02', 'อ.วรรณา ใจงาม', 'ภาษาไทย', 'lower'], ['t03', 'อ.ชลธิชา วัฒนกุล', 'คณิตศาสตร์', 'lower'],
    ['t04', 'อ.กมลชนก พรหมมา', 'คณิตศาสตร์', 'lower'], ['t05', 'อ.อนุชา แสงทอง', 'คณิตศาสตร์', 'both'], ['t06', 'อ.ปวีณา ศรีสุข', 'วิทยาศาสตร์และเทคโนโลยี', 'lower'],
    ['t07', 'อ.พิมพ์ชนก รุ่งเรือง', 'วิทยาศาสตร์และเทคโนโลยี', 'lower'], ['t08', 'อ.ณัฐพล มีสุข', 'วิทยาศาสตร์และเทคโนโลยี', 'upper'], ['t09', 'อ.มณฑิรา บุญมา', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'lower'],
    ['t10', 'อ.สมศักดิ์ ชัยวงศ์', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'upper'], ['t11', 'อ.ธนกฤต แก้วใส', 'สุขศึกษาและพลศึกษา', 'both'], ['t12', 'อ.อรอุมา ศิลปชัย', 'ศิลปะ', 'both'],
    ['t13', 'อ.ประเสริฐ ทำดี', 'การงานอาชีพ', 'both'], ['t14', 'อ.จิราพร สายทอง', 'ภาษาต่างประเทศ', 'lower', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']], ['t15', 'อ.ศศิธร นาคสวัสดิ์', 'ภาษาต่างประเทศ', 'upper', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']],
    ['t16', 'อ.หลี่ ฮวา', 'ภาษาต่างประเทศ', 'lower', ['ภาษาจีน']], ['t17', 'อ.สุนิสา ปัญญาดี', 'กิจกรรมพัฒนาผู้เรียน', 'both', []], ['t18', 'อ.กิตติพงษ์ ศรีเมือง', 'ภาษาไทย', 'upper'],
    ['t19', 'อ.รัชนี วงศ์ใหญ่', 'วิทยาศาสตร์และเทคโนโลยี', 'upper'], ['t20', 'อ.วีระ พลอยงาม', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'both'], ['t21', 'อ.ดารุณี คำแสง', 'ภาษาต่างประเทศ', 'both', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']],
    ['t22', 'อ.ชัยวัฒน์ บุญยืน', 'สุขศึกษาและพลศึกษา', 'both'], ['t23', 'อ.นภัสสร ทองคำ', 'ศิลปะ', 'both'], ['t24', 'อ.สมพร รักงาน', 'การงานอาชีพ', 'both'],
    ['t25', 'อ.ภานุวัฒน์ เพชรรัตน์', 'คณิตศาสตร์', 'upper'], ['t26', 'อ.อัญชลี มณีวงศ์', 'กิจกรรมพัฒนาผู้เรียน', 'both', []],
    // ครูเพิ่มเติมจากระบบงานบุคคล (ไม่มีในหน้าหลักสูตร)
    ['t27', 'อ.ศิริรัตน์ พึ่งบุญ', 'ภาษาไทย', 'both'], ['t28', 'อ.ธีรวัฒน์ ยอดดี', 'ภาษาไทย', 'upper'],
    ['t29', 'อ.วิไลวรรณ สุขใจ', 'คณิตศาสตร์', 'lower'], ['t30', 'อ.ณรงค์ชัย ดวงแก้ว', 'คณิตศาสตร์', 'upper'], ['t31', 'อ.เบญจมาศ อินทร์ทอง', 'คณิตศาสตร์', 'both'],
    ['t32', 'อ.สุทธิพงษ์ ใจเย็น', 'วิทยาศาสตร์และเทคโนโลยี', 'lower'], ['t33', 'อ.กาญจนา ปานทอง', 'วิทยาศาสตร์และเทคโนโลยี', 'upper'], ['t34', 'อ.อภิชาติ คงมั่น', 'วิทยาศาสตร์และเทคโนโลยี', 'both'],
    ['t35', 'อ.ปิยะนุช ศรีวงศ์', 'วิทยาศาสตร์และเทคโนโลยี', 'lower'], ['t36', 'อ.ชยพล มณีรัตน์', 'วิทยาศาสตร์และเทคโนโลยี', 'upper'], ['t37', 'อ.นันทนา บุญเรือง', 'วิทยาศาสตร์และเทคโนโลยี', 'both'],
    ['t38', 'อ.ทวีศักดิ์ ภูมิใจ', 'วิทยาศาสตร์และเทคโนโลยี', 'both'],
    ['t39', 'อ.อรวรรณ ชื่นชม', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'lower'], ['t40', 'อ.ประยุทธ แสนดี', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'upper'], ['t41', 'อ.สุดารัตน์ นวลจันทร์', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'both'],
    ['t42', 'อ.วรเชษฐ์ สมบูรณ์', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'both'],
    ['t43', 'อ.พงศกร แข็งขัน', 'สุขศึกษาและพลศึกษา', 'lower'], ['t44', 'อ.จันทร์เพ็ญ ฟ้าใส', 'สุขศึกษาและพลศึกษา', 'upper'],
    ['t45', 'อ.ลลิตา วาดเขียน', 'ศิลปะ', 'lower'], ['t46', 'อ.ธนพร เสียงทอง', 'ศิลปะ', 'upper'],
    ['t47', 'อ.เกียรติศักดิ์ ช่างคิด', 'การงานอาชีพ', 'lower'], ['t48', 'อ.มาลี ปลูกงาม', 'การงานอาชีพ', 'upper'],
    ['t49', 'Mr. David Brown', 'ภาษาต่างประเทศ', 'both', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']], ['t50', 'อ.กนกพร ภาษาดี', 'ภาษาต่างประเทศ', 'lower', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']],
    ['t51', 'อ.สมใจ พูดเก่ง', 'ภาษาต่างประเทศ', 'upper', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']], ['t52', 'Ms. Emily Clark', 'ภาษาต่างประเทศ', 'both', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']],
    ['t53', 'อ.ปรีชา อ่านมาก', 'ภาษาต่างประเทศ', 'upper', ['ภาษาอังกฤษ', 'ภาษาอังกฤษเพื่อการสื่อสาร']],
    ['t54', 'อ.วิชัย คำนวณดี', 'คณิตศาสตร์', 'upper'], ['t55', 'อ.สุภาพร ทดลองดี', 'วิทยาศาสตร์และเทคโนโลยี', 'upper']
  ];
  const stageLevels = { lower: [1, 2, 3], upper: [4, 5, 6], both: [1, 2, 3, 4, 5, 6] };
  const canTeachFor = (letter, stage, only) => subjects.filter((s) => s.type !== 'กิจกรรม' && s.group === letter && stageLevels[stage].includes(s.level) && (!only || only.includes(BLUEPRINT[s.bp].name)) && (only || BLUEPRINT[s.bp].letter !== 'จ')).map((s) => s.code);
  const teachers = TEACHER_ROWS.map(([id, name, groupName, stage, only = null]) => {
    const letter = GROUP_LETTER[groupName];
    return { id, name, group: letter, stage, canTeach: only && !only.length ? [] : canTeachFor(letter, stage, only), position: letter === 'ก' ? 'ครูแนะแนว' : 'ครูผู้สอน' };
  });
  teachers.find((t) => t.id === 't17').position = 'หัวหน้างานวิชาการ';

  const db = {
    schema: 3, school: SCHOOL,
    external: { teachers, classes, rooms },
    curriculum: { subjects, plans },
    assignments: {},
    terms: {
      '2569-1': { start: '2026-05-15', end: '2026-09-30', unavailDeadline: '2026-04-30' },
      '2569-2': { start: '2026-11-02', end: '2027-03-20', unavailDeadline: '2026-10-01' },
      '2570-1': { start: '2027-05-17', end: '2027-09-30', unavailDeadline: '2026-10-30' }
    },
    versions: [], unavailability: [], requests: [], notifications: [], history: []
  };
  useDb(db);

  /* ---------------- การมอบหมายสอน (owned by curriculum page) ---------------- */
  const termNo = (term) => Number(term.split('-')[1]);
  const FORCE = { // ครูตัวอย่าง (t05) สอนทั้ง ม.ต้นและ ม.ปลาย
    '3-1': { 1: 't05' }, '3-2': { 1: 't05' }, '4-1': { 1: 't05', 10: 't05' }, '4-2': { 1: 't05' }
  };
  function buildAssignments(term, { historicQualified = {}, gaps = null } = {}) {
    const load = {};
    const list = [];
    const qualified = (code) => teachers.filter((t) => t.canTeach.includes(code) || (historicQualified[t.id] || []).includes(code));
    classes.forEach((c) => {
      const plan = plans.find((p) => p.classIds.includes(c.id));
      plan.subjects[termNo(term)].map((code) => subjects.find((s) => s.code === code)).filter((s) => s.type !== 'กิจกรรม').forEach((s) => {
        if (gaps && gaps(c, plan, s)) { list.push({ classId: c.id, code: s.code, teachers: [] }); return; }
        const forced = FORCE[c.id]?.[s.bp];
        let pick;
        if (forced) pick = [forced];
        else {
          const pool = qualified(s.code).filter((t) => !(t.id === 't05' && !forced)).sort((a, b) => (load[a.id] || 0) - (load[b.id] || 0) || a.id.localeCompare(b.id));
          pick = pool.slice(0, s.coTeach ? 2 : 1).map((t) => t.id);
        }
        pick.forEach((tid) => { load[tid] = (load[tid] || 0) + s.hours; });
        list.push({ classId: c.id, code: s.code, teachers: pick });
      });
    });
    return list;
  }
  const historic = { t16: subjects.filter((s) => BLUEPRINT[s.bp].letter === 'จ').map((s) => s.code) };
  db.assignments['2569-1'] = buildAssignments('2569-1', { historicQualified: historic });
  db.assignments['2569-2'] = buildAssignments('2569-2', { historicQualified: historic });
  // 2570-1: ม.2 ห้องปกติมอบหมายไม่ครบ (เหมือนหน้าจัดการหลักสูตร), ม.3 วิทย์-คณิตยังไม่มอบหมาย, ภาษาจีน ม.ปลายไม่มีครูที่สอนได้
  db.assignments['2570-1'] = buildAssignments('2570-1', {
    gaps: (c, plan, s) => {
      if (plan.id === 'p173') return true;
      if (plan.id === 'p88') {
        const order = subjects.filter((x) => x.level === 2 && PLAN_TEMPLATES.regular.includes(x.tag)).map((x) => x.code);
        return order.indexOf(s.code) % 4 === 1;
      }
      return false;
    }
  });
  // ครูประจำชั้น: ครูที่สอนห้องนั้นใน 2/2569 (ม.1/6 ยังไม่มี — รอข้อมูลจากงานบุคคล)
  const used = new Set();
  classes.forEach((c) => {
    if (c.id === '1-6') return;
    const a = db.assignments['2569-2'].filter((x) => x.classId === c.id).flatMap((x) => x.teachers).find((t) => !used.has(t) && t !== 't05');
    if (a) { c.advisor = a; used.add(a); }
  });
  classes.find((c) => c.id === '4-1').advisor = 't05';

  /* ---------------- เวลาไม่ว่างของครู ---------------- */
  let uid = 0;
  const un = (term, teacherId, day, start, end, reason, note, status, at, extra = {}) => db.unavailability.push({ id: `UN-${++uid}`, term, teacherId, day, start, end, reason, note, status, by: extra.by || 'teacher', createdAt: iso(at), decidedAt: status === 'pending' ? null : iso(at, '15:00'), decidedBy: status === 'pending' ? null : 'อ.สุนิสา ปัญญาดี', adminNote: extra.adminNote || '' });
  un('2569-1', 't05', 0, '08:30', '10:10', 'ประชุม', 'ประชุมฝ่ายวิชาการเช้าวันจันทร์', 'approved', '2026-04-20');
  un('2569-2', 't05', 0, '08:30', '10:10', 'ประชุม', 'ประชุมฝ่ายวิชาการเช้าวันจันทร์', 'approved', '2026-09-15');
  un('2569-2', 't06', 3, '13:30', '15:10', 'อื่น ๆ ในโรงเรียน', 'อบรมครูวิทยาศาสตร์ สสวท. ในโรงเรียน', 'approved', '2026-09-18');
  un('2569-2', 't11', 4, '13:30', '15:10', 'คุมกิจกรรม / นักกีฬา', 'คุมซ้อมนักกีฬาโรงเรียน', 'approved', '2026-09-20');
  un('2569-2', 't14', 2, '08:30', '10:10', 'อื่น ๆ ในโรงเรียน', 'พาลูกไปหาหมอ', 'rejected', '2026-09-22', { adminNote: 'เป็นธุระส่วนตัว ไม่ใช่ภารกิจในโรงเรียน กรุณาใช้การลา' });
  un('2570-1', 't05', 0, '08:30', '10:10', 'ประชุม', 'ประชุมฝ่ายวิชาการเช้าวันจันทร์ (คัดลอกจากภาคก่อน)', 'approved', '2026-10-12');
  un('2570-1', 't05', 1, '13:30', '15:10', 'งานบริหาร / งานฝ่าย', 'ประชุมกรรมการพัฒนาหลักสูตร', 'pending', '2026-10-13');
  un('2570-1', 't09', 4, '08:30', '09:20', 'ประชุม', 'ประชุมงานกิจการนักเรียน', 'pending', '2026-10-13');
  un('2570-1', 't21', 3, '13:30', '16:00', 'คุมกิจกรรม / นักกีฬา', 'คุมชมรมโต้วาทีภาษาอังกฤษ', 'approved', '2026-10-12', { by: 'admin' });
  un('2570-1', 't14', 2, '13:30', '15:10', 'อื่น ๆ ในโรงเรียน', 'ธุระที่ธนาคาร', 'rejected', '2026-10-13', { adminNote: 'เป็นธุระส่วนตัว' });

  /* ---------------- โครงสร้างเวลา / กิจกรรมล็อกเวลา / เงื่อนไข ---------------- */
  const timeStructures = () => [
    { id: 'lower', name: 'ม.ต้น', levels: [1, 2, 3], days: [0, 1, 2, 3, 4], start: '08:30', periodMin: 50, periods: 8, breaks: [{ after: 4, min: 50, name: 'พักกลางวัน' }], homeroom: { min: 30, name: 'เข้าแถว · โฮมรูม' } },
    { id: 'upper', name: 'ม.ปลาย', levels: [4, 5, 6], days: [0, 1, 2, 3, 4], start: '08:30', periodMin: 55, periods: 8, breaks: [{ after: 4, min: 50, name: 'พักกลางวัน' }], homeroom: { min: 30, name: 'เข้าแถว · โฮมรูม' } }
  ];
  const mathTeachers = teachers.filter((t) => t.group === 'ค').map((t) => t.id);
  const activities = () => [
    { id: 'A-club', name: 'ชุมนุม', scope: 'school', day: 2, periods: [8], staff: 'all', teacherIds: [], lockClasses: true },
    { id: 'A-scout', name: 'ลูกเสือ-เนตรนารี', scope: 'stage', stageId: 'lower', day: 2, periods: [7], staff: 'advisor', teacherIds: [], lockClasses: true },
    { id: 'A-guide', name: 'แนะแนว', scope: 'school', day: 4, periods: [7], staff: 'advisor', teacherIds: [], lockClasses: true },
    { id: 'A-math', name: 'ประชุมกลุ่มสาระคณิตศาสตร์', scope: 'school', day: 1, periods: [8], staff: 'teachers', teacherIds: mathTeachers, lockClasses: false }
  ];
  const conditions = () => {
    const subject = {};
    subjects.forEach((s) => {
      const bpName = BLUEPRINT[s.bp].name;
      if (bpName === 'โครงงานวิทยาศาสตร์' || bpName === 'การงานอาชีพ') subject[s.code] = { double: true };
      if (['ภาษาไทย', 'คณิตศาสตร์', 'ภาษาอังกฤษ'].includes(bpName)) subject[s.code] = { maxPerDay: 1, prefer: 'morning', priority: 1 };
      if (bpName === 'สุขศึกษาและพลศึกษา') subject[s.code] = { maxPerDay: 1, forbidden: ['0-5', '1-5', '2-5', '3-5', '4-5'] };
    });
    return {
      defaults: { teacherMaxPerDay: 5, teacherMaxConsecutive: 3, teacherMaxPerWeek: 24 },
      teacher: { t05: { maxPerDay: 4 }, t17: { maxPerWeek: 4 } },
      subject,
      room: { COM1: { unavailable: [{ day: 4, start: '08:30', end: '11:00', note: 'ปิดปรับปรุงระบบเครือข่าย' }] } }
    };
  };
  function newVersion(id, term, name, status, at, extra = {}) {
    const entries = {}; classes.forEach((c) => { entries[c.id] = {}; });
    const v = { id, term, name, status, basedOn: null, createdAt: iso(at), createdBy: 'อ.สุนิสา ปัญญาดี', publishedAt: status === 'draft' ? null : iso(at, '16:00'), publishedBy: status === 'draft' ? null : 'อ.สุนิสา ปัญญาดี', timeStructures: timeStructures(), activities: activities(), conditions: conditions(), entries, appliedRequests: [], ...extra };
    db.versions.push(v);
    return v;
  }
  const fill = (v, seed, opts = {}) => { v.entries = TT.autoSchedule(v, { mode: 'smart', keep: true, seed, ...opts }).entries; };
  const hist = (term, versionId, at, user, action, detail) => db.history.push({ id: `H-${db.history.length + 1}`, term, versionId, at: iso(at[0], at[1]), user, action, detail });

  /* 1/2569 — เผยแพร่ฉบับเดียว */
  const v691 = newVersion('V-2569-1-1', '2569-1', 'ตารางสอน 1/2569', 'published', '2026-05-02');
  fill(v691, 11);
  hist('2569-1', v691.id, ['2026-05-02', '16:00'], 'อ.สุนิสา ปัญญาดี', 'เผยแพร่ตาราง', 'เผยแพร่ "ตารางสอน 1/2569"');

  /* 2/2569 — v1 (เก่า) → อนุมัติคำร้อง → rev 1 (เก่า) → rev 2 (เผยแพร่) + ฉบับร่างที่ล้าหลัง */
  const v1 = newVersion('V-2569-2-1', '2569-2', 'ตารางสอน 2/2569', 'published', '2026-09-28');
  fill(v1, 7);
  hist('2569-2', v1.id, ['2026-09-26', '10:00'], 'อ.สุนิสา ปัญญาดี', 'สร้างฉบับร่าง', 'คัดลอกจาก "ตารางสอน 1/2569" (ภาคเรียนที่ 1/2569)');
  hist('2569-2', v1.id, ['2026-09-27', '14:00'], 'อ.สุนิสา ปัญญาดี', 'จัดตารางอัตโนมัติ', 'จัดอัตโนมัติตามเงื่อนไข · ครูทุกคน');
  hist('2569-2', v1.id, ['2026-09-28', '16:00'], 'อ.สุนิสา ปัญญาดี', 'เผยแพร่ตาราง', 'เผยแพร่ "ตารางสอน 2/2569"');

  const draft = TT.copyVersion(v1, { term: '2569-2', name: 'ร่าง ปรับห้อง Lab', by: 'อ.สุนิสา ปัญญาดี' }).version;
  draft.id = 'V-2569-2-D1'; draft.createdAt = iso('2026-10-03', '10:30');
  db.history.shift();

  const reqAt = { at: '2026-10-05' };
  const t05Entries = (v) => Object.entries(v.entries).flatMap(([cid, slots]) => Object.entries(slots).filter(([, e]) => e.teachers.includes('t05')).map(([slot, e]) => ({ cid, slot, e })));
  const mkReq = (id, teacherId, type, classId, slot, target, reason, note, at) => {
    const r = { id, term: '2569-2', versionId: TT.publishedOf('2569-2').id, teacherId, type, classId, slot, target, reason, note, status: 'pending', createdAt: iso(at, '08:45'), decidedAt: null, decidedBy: null, adminNote: '', final: null };
    db.requests.push(r);
    return r;
  };
  // R1: ครูอนุชาขอย้ายคาบ (อนุมัติ)
  const a1 = t05Entries(v1).find((x) => x.cid === '3-1');
  const sg1 = TT.suggestMoves(v1, a1.cid, a1.slot); const m1 = sg1[Math.min(2, sg1.length - 1)];
  const r1 = mkReq('RQ-1', 't05', 'move', a1.cid, a1.slot, { slot: m1.slot }, 'สอนติดกันเกินไป', 'วันนี้สอน 4 คาบติดกัน ขอย้ายไปวันที่คาบน้อยกว่า', reqAt.at);
  TT.decideRequest('RQ-1', { approve: true, adminNote: '', by: 'อ.สุนิสา ปัญญาดี' });
  // R2: ครูณัฐพลขอย้ายไปช่องที่ชน → อนุมัติพร้อมแก้ไข
  const pub2 = TT.publishedOf('2569-2');
  const t08list = Object.entries(pub2.entries).flatMap(([cid, slots]) => Object.entries(slots).filter(([, e]) => e.teachers.includes('t08')).map(([slot]) => ({ cid, slot })));
  const pick2 = t08list.find((x) => TT.suggestMoves(pub2, x.cid, x.slot).length) || t08list[0];
  const a2cid = pick2.cid; const a2slot = pick2.slot;
  const occupiedSlot = TT.classSlots(pub2, a2cid).find((k) => !pub2.entries[a2cid][k] && !TT.classActivityAt(pub2, a2cid, k) && TT.checkPlacement(pub2, a2cid, k, pub2.entries[a2cid][a2slot], { ignore: [`${a2cid}|${a2slot}`] }).some((i) => i.sev === 'error'));
  const m2 = TT.suggestMoves(pub2, a2cid, a2slot)[0];
  mkReq('RQ-2', 't08', 'move', a2cid, a2slot, { slot: occupiedSlot || m2.slot }, 'ใช้ห้องปฏิบัติการต่อเนื่อง', 'ขอย้ายให้ต่อจากคาบทดลองของอีกห้อง เพื่อไม่ต้องเก็บอุปกรณ์', '2026-10-08');
  TT.decideRequest('RQ-2', { approve: true, final: { slot: m2.slot }, adminNote: 'ช่องที่ขอชนกับคาบสอนอื่นของครู จึงปรับเป็นช่องที่ว่างแทน', by: 'อ.สุนิสา ปัญญาดี' });
  // R3: เปลี่ยนห้องไปห้องคอม (ไม่อนุมัติ)
  const pub3 = TT.publishedOf('2569-2');
  const a3 = t05Entries(pub3).find((x) => x.cid === '4-1');
  mkReq('RQ-3', 't05', 'room', a3.cid, a3.slot, { room: 'COM2' }, 'ใช้โปรแกรม GeoGebra', 'สอนเรื่องกราฟ อยากให้นักเรียนใช้โปรแกรมจริง', '2026-10-09');
  TT.decideRequest('RQ-3', { approve: false, adminNote: 'ห้องคอม 2 มีคาบวิทยาการคำนวณเต็มทั้งสัปดาห์ แนะนำให้ใช้ Notebook cart แทน', by: 'อ.สุนิสา ปัญญาดี' });
  // R4: ครูอนุชาขอสลับคาบของตนเอง (รออนุมัติ)
  const own41 = t05Entries(pub3).filter((x) => x.cid === '4-1');
  const s1 = own41.find((x) => x.e.code.startsWith('ค31'));
  const s2 = own41.find((x) => x.e.code !== s1.e.code && x.slot.split('-')[0] !== s1.slot.split('-')[0]) || own41.find((x) => x.slot !== s1.slot);
  mkReq('RQ-4', 't05', 'swap', s1.cid, s1.slot, { swap: `${s2.cid}|${s2.slot}` }, 'จัดลำดับเนื้อหา', 'ขอสลับให้คณิตพื้นฐานมาก่อนคณิตเพิ่มเติมในสัปดาห์', '2026-10-13');
  // R5: ครูธนกฤตขอย้ายไปช่องที่เกิด Conflict (admin ต้องอนุมัติพร้อมแก้ไขหรือปฏิเสธ)
  const pe = Object.entries(pub3.entries).flatMap(([cid, slots]) => Object.entries(slots).filter(([, e]) => e.teachers.includes('t11')).map(([slot]) => ({ cid, slot })))[0];
  const peBad = TT.classSlots(pub3, pe.cid).find((k) => !pub3.entries[pe.cid][k] && !TT.classActivityAt(pub3, pe.cid, k) && TT.checkPlacement(pub3, pe.cid, k, pub3.entries[pe.cid][pe.slot], { ignore: [`${pe.cid}|${pe.slot}`] }).some((i) => i.sev === 'error'))
    || TT.classSlots(pub3, pe.cid).find((k) => k !== pe.slot && !TT.classActivityAt(pub3, pe.cid, k));
  mkReq('RQ-5', 't11', 'move', pe.cid, pe.slot, { slot: peBad }, 'สภาพอากาศ', 'ช่วงบ่ายแดดร้อนมาก ขอย้ายพลศึกษาไปช่วงเช้า', '2026-10-13');
  // R6: ขอเปลี่ยนห้อง (รออนุมัติ)
  const en = Object.entries(pub3.entries).flatMap(([cid, slots]) => Object.entries(slots).filter(([, e]) => e.teachers.includes('t21')).map(([slot]) => ({ cid, slot })))[0];
  mkReq('RQ-6', 't21', 'room', en.cid, en.slot, { room: 'LIB' }, 'กิจกรรมการอ่าน', 'คาบนี้ทำกิจกรรม Extensive Reading ขอใช้ห้องสมุด', '2026-10-14');
  // fix timestamps produced by decideRequest
  const fixVersion = (rq, at) => { const r = db.requests.find((x) => x.id === rq); r.decidedAt = iso(at, '15:30'); const nv = r.resultVersionId && db.versions.find((x) => x.id === r.resultVersionId); if (nv) { nv.createdAt = iso(at, '15:30'); nv.publishedAt = iso(at, '15:30'); } };
  fixVersion('RQ-1', '2026-10-06'); fixVersion('RQ-2', '2026-10-10'); fixVersion('RQ-3', '2026-10-10');
  db.history.filter((h) => h.term === '2569-2' && h.at > iso('2026-10-14', '00:00')).forEach((h, i) => { h.at = iso(['2026-10-10', '2026-10-10', '2026-10-10', '2026-10-06', '2026-10-06'][i] || '2026-10-10', '15:30'); });

  // ฉบับร่าง: แก้ไขบางคาบ ทำให้เกิด Conflict / คำเตือน / คาบรอจัด
  const D = draft.entries;
  const t05d = Object.entries(D).flatMap(([cid, slots]) => Object.entries(slots).filter(([, e]) => e.teachers.includes('t05')).map(([slot]) => ({ cid, slot }))).find((x) => x.cid === '3-2');
  if (t05d && !D['3-2']['0-1']) { D['3-2']['0-1'] = { ...D['3-2'][t05d.slot], src: 'manual' }; delete D['3-2'][t05d.slot]; }
  else if (t05d) { const tmp = D['3-2']['0-1']; D['3-2']['0-1'] = { ...D['3-2'][t05d.slot], src: 'manual' }; D['3-2'][t05d.slot] = tmp; }
  const sciCids = ['1-1', '1-2', '2-1'];
  sciCids.forEach((cid) => { const k = Object.keys(D[cid]).find((s) => D[cid][s].room?.startsWith('LAB')); if (k) D[cid][k] = { ...D[cid][k], room: TT.cls(cid).homeroom, src: 'manual' }; });
  // ครูสอนซ้อน: ม.1/3 ใช้ครูเดียวกับ ม.1/4 ในช่องเดียวกัน
  const k13 = Object.keys(D['1-3']).find((s) => D['1-4'][s] && !D['1-3'][s].locked && D['1-3'][s].code.startsWith('ท') && D['1-4'][s].code.startsWith('ท'));
  if (k13) D['1-3'][k13] = { ...D['1-3'][k13], teachers: [...D['1-4'][k13].teachers], src: 'manual' };
  else { const k = Object.keys(D['1-3']).find((s) => D['1-4'][s]); if (k) D['1-3'][k] = { ...D['1-3'][k], teachers: [...D['1-4'][k].teachers], src: 'manual' }; }
  ['2-2', '5-4'].forEach((cid) => { Object.keys(D[cid]).slice(0, 2).forEach((k) => delete D[cid][k]); });
  Object.values(D['1-1']).slice(0, 4).forEach((e) => { e.locked = true; });
  hist('2569-2', draft.id, ['2026-10-03', '10:30'], 'อ.สุนิสา ปัญญาดี', 'สร้างฉบับร่าง', 'คัดลอกจาก "ตารางสอน 2/2569" (ภาคเรียนที่ 2/2569)');
  hist('2569-2', draft.id, ['2026-10-04', '11:00'], 'อ.สุนิสา ปัญญาดี', 'ย้ายคาบ', 'ปรับวิชาวิทยาศาสตร์บางคาบจาก Lab กลับห้องประจำชั้น');

  /* 1/2570 — ร่างแรก สร้างใหม่ทั้งหมด: ม.ปลายจัดอัตโนมัติแล้ว ม.ต้นยังจัดเองไม่เสร็จ */
  const v70 = newVersion('V-2570-1-D1', '2570-1', 'ร่างแรก 1/2570', 'draft', '2026-10-12');
  fill(v70, 31, { classIds: classes.filter((c) => c.level >= 4).map((c) => c.id) });
  const manual = TT.autoSchedule(v70, { mode: 'standard', keep: true, seed: 5, classIds: ['1-1', '1-2'] }).entries;
  ['1-1', '1-2'].forEach((cid) => { Object.entries(manual[cid]).slice(0, 14).forEach(([k, e]) => { v70.entries[cid][k] = { ...e, src: 'manual' }; }); });
  hist('2570-1', v70.id, ['2026-10-12', '09:10'], 'อ.สุนิสา ปัญญาดี', 'สร้างฉบับร่าง', 'สร้างใหม่ทั้งหมด "ร่างแรก 1/2570" · วันปิดรับเวลาไม่ว่าง 30 ต.ค. 2569');
  hist('2570-1', v70.id, ['2026-10-12', '14:20'], 'อ.สุนิสา ปัญญาดี', 'จัดตารางอัตโนมัติ', 'จัดอัตโนมัติตามเงื่อนไข · ม.4–ม.6');
  hist('2570-1', v70.id, ['2026-10-13', '10:05'], 'อ.สุนิสา ปัญญาดี', 'เพิ่มคาบ', 'จัดเอง ม.1/1 และ ม.1/2 บางส่วน');

  /* notifications */
  db.notifications = [
    { id: 'N-1', to: 'admin', title: 'คำร้องขอเปลี่ยนการจัดใหม่', text: 'อ.ดารุณี คำแสง · เปลี่ยนห้องเรียน', link: 'timetable-approvals.html', at: iso('2026-10-14', '08:45'), read: false },
    { id: 'N-2', to: 'admin', title: 'คำร้องขอเปลี่ยนการจัดใหม่', text: 'อ.ธนกฤต แก้วใส · ย้ายคาบ', link: 'timetable-approvals.html', at: iso('2026-10-13', '08:45'), read: false },
    { id: 'N-3', to: 'admin', title: 'คำร้องขอเปลี่ยนการจัดใหม่', text: 'อ.อนุชา แสงทอง · สลับคาบของตนเอง', link: 'timetable-approvals.html', at: iso('2026-10-13', '08:40'), read: false },
    { id: 'N-4', to: 'admin', title: 'เวลาไม่ว่างรออนุมัติ', text: 'อ.อนุชา แสงทอง · อังคาร 13:30–15:10', link: 'timetable-approvals.html#unavailability', at: iso('2026-10-13', '09:00'), read: false },
    { id: 'N-5', to: 't05', title: 'คำร้องไม่ได้รับอนุมัติ', text: 'เปลี่ยนห้องเรียน ม.4/1 — ห้องคอม 2 มีคาบเต็ม', link: 'my-timetable.html#requests', at: iso('2026-10-10', '15:30'), read: false },
    { id: 'N-6', to: 't05', title: 'คำร้องได้รับอนุมัติ', text: 'ย้ายคาบ ม.3/1 — ตารางสอนฉบับใหม่เผยแพร่แล้ว', link: 'my-timetable.html#requests', at: iso('2026-10-06', '15:30'), read: true },
    { id: 'N-7', to: 't05', title: 'เปิดรับเวลาไม่ว่าง 1/2570', text: 'กรอกได้ถึง 30 ต.ค. 2569', link: 'teacher-profile.html', at: iso('2026-10-12', '09:15'), read: false },
    { id: 'N-8', to: 't08', title: 'คำร้องได้รับอนุมัติพร้อมแก้ไข', text: 'admin ปรับช่องปลายทางเป็นช่องที่ว่าง', link: 'my-timetable.html#requests', at: iso('2026-10-10', '15:30'), read: false }
  ];
  db.history.sort((a, b) => (a.at < b.at ? 1 : -1));
  return db;
};
