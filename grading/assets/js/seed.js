/* สร้างข้อมูลจำลองทั้งโรงเรียน (ม.1–ม.3 ชั้นละ 3 ห้อง × 9 รายวิชาพื้นฐาน)
 * ตั้งใจจัดข้อมูลให้เห็นทุกสถานะ: ยังไม่เริ่ม / กำลังบันทึก / ตีกลับ / รอตรวจ / อนุมัติ / มีคำขอปลดล็อก */

function genericStructure(variant) {
  if (variant === 0) return [
    { id: 'c1', group: 'collect', name: 'งานที่ 1', max: 10, weight: 15, indicators: [] },
    { id: 'c2', group: 'collect', name: 'งานที่ 2', max: 10, weight: 15, indicators: [] },
    { id: 'c3', group: 'collect', name: 'ทดสอบย่อย', max: 20, weight: 15, indicators: [] },
    { id: 'c6', group: 'collect', name: 'จิตพิสัย', max: 10, weight: 15, indicators: [] },
    { id: 'c7', group: 'mid', name: 'สอบกลางภาค', max: 30, weight: 20, indicators: [] },
    { id: 'c8', group: 'final', name: 'สอบปลายภาค', max: 40, weight: 20, indicators: [] },
  ];
  if (variant === 1) return [
    { id: 'c1', group: 'collect', name: 'ใบงานที่ 1', max: 10, weight: 20, indicators: [] },
    { id: 'c2', group: 'collect', name: 'ใบงานที่ 2', max: 10, weight: 20, indicators: [] },
    { id: 'c3', group: 'collect', name: 'ชิ้นงาน', max: 20, weight: 20, indicators: [] },
    { id: 'c6', group: 'collect', name: 'จิตพิสัย', max: 10, weight: 10, indicators: [] },
    { id: 'c8', group: 'final', name: 'สอบปลายภาค', max: 30, weight: 30, indicators: [] },
  ];
  return [
    { id: 'c1', group: 'collect', name: 'ปฏิบัติ 1', max: 20, weight: 20, indicators: [] },
    { id: 'c2', group: 'collect', name: 'ปฏิบัติ 2', max: 20, weight: 20, indicators: [] },
    { id: 'c3', group: 'collect', name: 'ชิ้นงาน', max: 20, weight: 20, indicators: [] },
    { id: 'c6', group: 'collect', name: 'จิตพิสัย', max: 10, weight: 20, indicators: [] },
    { id: 'c8', group: 'final', name: 'สอบปลายภาค', max: 20, weight: 20, indicators: [] },
  ];
}

function hoursAgo(h) { return Date.now() - h * 3600 * 1000; }

function buildSeed() {
  const rand = mulberry32(2569);
  const sections = [];
  const nm = (s) => `${s.prefix}${s.first} ${s.last}`;

  // รายชื่อนักเรียนรายห้อง — ห้องเดียวกันใช้ชุดเดียวกันทุกวิชา
  const rosters = {};
  const idBase = { 1: 17001, 2: 16401, 3: 15001 };
  ROOMS.forEach((room) => {
    const [g, r] = room.replace('ม.', '').split('/').map(Number);
    const count = g === 2 ? [36, 35, 34][r - 1] : 32 + Math.floor(rand() * 5);
    rosters[room] = makeStudents(rand, count, idBase[g] + (r - 1) * 40);
  });

  const add = (cfg) => {
    const base = rosters[cfg.roster || cfg.room];
    const shift = cfg.abilityShift || 0;
    const students = base.map((s) => ({ ...s, ability: Math.max(0.3, Math.min(0.99, s.ability + shift + (rand() - 0.5) * 0.15)) }));
    const structure = cfg.structure ? cfg.structure() : [];
    const sec = {
      id: cfg.id, term: cfg.term, code: cfg.code, name: cfg.name, type: cfg.type || 'พื้นฐาน',
      slot: cfg.slot || null, credit: cfg.credit, hours: cfg.hours, room: cfg.room,
      teacherId: cfg.teacherId, deadline: cfg.deadline,
      state: 'draft',                 // draft | pending | approved (ADR 0002)
      submittedAt: null,
      structure, students,
      scores: structure.length ? fillScores(rand, students, structure, cfg.fill ?? 0, cfg.opts) : {},
      attr: fillLevels(rand, students, ATTRIBUTES, cfg.attrFill ?? 0),
      rtw: fillLevels(rand, students, RTW, cfg.rtwFill ?? 0),
      attendance: makeAttendance(rand, students, cfg.lowAtt || []),
      remedial: {}, history: [], reviews: [], unlockRequest: null,
      updatedAt: cfg.updatedAt || null,
    };
    if (cfg.sameScore) {
      const c = structure.find((x) => x.id === cfg.sameScore);
      students.forEach((s) => { sec.scores[s.id][c.id] = String(c.max); });
    }
    sections.push(sec);
    return sec;
  };
  const ev = (sec, h, who, to) => sec.history.unshift({ t: hoursAgo(h), who: userById(who).name, student: '—', field: 'สถานะ', from: '', to, kind: 'event' });
  const submit = (sec, h) => {
    sec.state = 'pending';
    sec.submittedAt = hoursAgo(h);
    sec.reviews.push({ submittedAt: hoursAgo(h), reviewerId: null, decidedAt: null, decision: null, reason: '', notes: [] });
    ev(sec, h, sec.teacherId, 'ส่งผลการเรียนให้ฝ่ายวิชาการตรวจ');
  };
  const approve = (sec, reviewerId, hSubmit, hDecide) => {
    submit(sec, hSubmit);
    sec.state = 'approved';
    Object.assign(sec.reviews[sec.reviews.length - 1], { reviewerId, decidedAt: hoursAgo(hDecide), decision: 'approved' });
    ev(sec, hDecide, reviewerId, 'ฝ่ายวิชาการอนุมัติผลการเรียน');
  };
  const returned = (sec, reviewerId, hSubmit, hDecide, reason, notes = []) => {
    submit(sec, hSubmit);
    sec.state = 'draft';
    Object.assign(sec.reviews[sec.reviews.length - 1], { reviewerId, decidedAt: hoursAgo(hDecide), decision: 'returned', reason, notes });
    ev(sec, hDecide, reviewerId, `ฝ่ายวิชาการตีกลับให้แก้ไข${notes.length ? ` (${notes.length} หมุดข้อสังเกต)` : ''}: ${reason}`);
  };
  const full = { fill: 1, attrFill: 1, rtwFill: 1 };
  const T = '2569-1', DL = '2026-10-09';

  /* ---------- ห้องที่ครูสมศรี (ผู้ใช้ปัจจุบัน) สอน ---------- */
  const m21 = add({
    id: 'm21', term: T, code: 'ค22101', name: 'คณิตศาสตร์ 3', slot: 'ma', credit: 1.5, hours: 60,
    room: 'ม.2/1', teacherId: 'u1', structure: mathStructure, deadline: DL,
    fill: 0.75, attrFill: 0.6, rtwFill: 0.4, lowAtt: [7],
    opts: { special: [[4, 'c5', 'ร'], [19, 'c4', 'ข']], lowAbility: [11], blanks: [[25, 'c6'], [30, 'c6'], [2, 'c3']] },
    updatedAt: hoursAgo(20),
  });
  m21.history = [
    { t: hoursAgo(20), who: TEACHER.name, student: nm(m21.students[4]), field: 'โครงงานพีทาโกรัส', from: '', to: 'ร' },
    { t: hoursAgo(20.2), who: TEACHER.name, student: nm(m21.students[2]), field: 'ทดสอบย่อย 2', from: '12', to: '14' },
    { t: hoursAgo(26), who: TEACHER.name, student: '—', field: 'โครงสร้างคะแนน', from: '', to: 'บันทึกโครงสร้างคะแนน (8 องค์ประกอบ รวม 100%)', kind: 'event' },
  ];

  // ม.2/2 — ถูกตีกลับพร้อมหมุด (ADR 0006) ครูแก้แล้วส่งใหม่ได้
  const m22 = add({
    id: 'm22', term: T, code: 'ค22101', name: 'คณิตศาสตร์ 3', slot: 'ma', credit: 1.5, hours: 60,
    room: 'ม.2/2', teacherId: 'u1', structure: mathStructure, deadline: DL, ...full, lowAtt: [15],
    opts: { lowAbility: [3, 22], special: [[9, 'c8', 'ข']] }, updatedAt: hoursAgo(30),
  });
  returned(m22, 'u2', 30, 6, 'มีนักเรียนขาดสอบปลายภาคที่ยังไม่ระบุการสอบแก้ตัว และคะแนนเก็บของนักเรียนบางคนต่ำผิดปกติ กรุณาตรวจสอบก่อนส่งใหม่', [
    { id: 'n1', sid: m22.students[9].id, field: 'c8', text: 'ขาดสอบปลายภาค สอบย้อนหลังแล้วหรือยัง? ถ้ายัง ให้คง ข ไว้และแจ้งวันสอบ', resolved: false },
    { id: 'n2', sid: m22.students[3].id, field: null, text: 'คะแนนเก็บต่ำทุกชิ้น ตรวจสอบว่ากรอกครบ/ถูกคนหรือไม่', resolved: false },
    { id: 'n3', sid: m22.students[22].id, field: 'c6', text: 'จิตพิสัยต่ำมากเมื่อเทียบกับเพื่อน ยืนยันคะแนนอีกครั้ง', resolved: false },
  ]);

  // ม.2/3 — รอตรวจ ถ้าครูสมศรีตรวจเองจะเป็นการตรวจงานตนเอง (ADR 0007)
  submit(add({
    id: 'm23', term: T, code: 'ค22101', name: 'คณิตศาสตร์ 3', slot: 'ma', credit: 1.5, hours: 60,
    room: 'ม.2/3', teacherId: 'u1', structure: mathStructure, deadline: DL, ...full,
    opts: { lowAbility: [6] }, updatedAt: hoursAgo(50),
  }), 50);

  add({
    id: 'm24', term: T, code: 'ค22201', name: 'คณิตศาสตร์เพิ่มเติม 3', type: 'เพิ่มเติม', credit: 1.0, hours: 40,
    room: 'ม.2/1', teacherId: 'u1', structure: null, deadline: DL,
  });

  add({
    id: 't21', term: T, code: 'ว22103', name: 'เทคโนโลยี 3 (วิทยาการคำนวณ)', slot: 'te', credit: 0.5, hours: 20,
    room: 'ม.2/1', teacherId: 'u1', structure: techStructure, deadline: DL, fill: 0.5, updatedAt: hoursAgo(72),
  });

  /* ---------- ห้องอื่นทั้งโรงเรียน ---------- */
  const SPECIAL = {
    'th-1-1': { kind: 'pending', sameScore: 'c6' },                       // ข้อมูลผิดปกติให้ฝ่ายวิชาการตรวจพบเอง: จิตพิสัยเต็มทั้งห้อง
    'sc-3-2': { kind: 'pending', abilityShift: 0.3 },                     // ข้อมูลผิดปกติ: เกรด 4 เกือบทั้งห้อง
    'so-1-3': { kind: 'pending', abilityShift: -0.28 },                   // ข้อมูลผิดปกติ: ค่าเฉลี่ยต่ำกว่าห้องอื่นมาก
    'so-1-1': { kind: 'approved' }, 'so-1-2': { kind: 'approved' },       // ห้องเทียบของ ม.1/3
    'pe-3-1': { kind: 'pending', lowAtt: [2, 5, 9], opts: { special: [[1, 'c3', 'ร'], [12, 'c3', 'ร'], [20, 'c8', 'ข']] } }, // มี ร / มส หลายคน
    'ar-2-2': { kind: 'pending' }, 'wo-1-2': { kind: 'pending' }, 'hi-2-3': { kind: 'pending' }, 'th-3-3': { kind: 'pending' }, // รอตรวจปกติ
    'sc-1-2': { kind: 'approved', unlock: 'นักเรียน 2 คนมาสอบแก้ตัว ร แล้ว ต้องการกรอกคะแนนใหม่' },
    'wo-2-1': { kind: 'pending', unlock: 'กรอกคะแนนชิ้นงานสลับกับห้อง ม.2/2 ขอแก้ไขก่อนอนุมัติ' },
    'hi-1-1': { kind: 'returned' },
    'ar-3-1': { kind: 'nostructure' }, 'wo-3-3': { kind: 'nostructure' }, 'te-1-3': { kind: 'nostructure' },
  };
  GRADES.forEach((g) => [1, 2, 3].forEach((r) => SUBJECTS.forEach((subj) => {
    const room = `ม.${g}/${r}`;
    if (sections.some((s) => s.term === T && s.slot === subj.slot && s.room === room)) return; // ห้องที่สร้างไว้แล้วข้างบน
    const key = `${subj.slot}-${g}-${r}`;
    const sp = SPECIAL[key] || {};
    let kind = sp.kind;
    if (!kind) {
      const x = rand();
      kind = x < 0.42 ? 'approved' : x < 0.5 ? 'pending' : x < 0.95 ? 'draft' : 'nostructure';
    }
    const complete = kind !== 'draft' && kind !== 'nostructure';
    const fill = complete ? 1 : [0.2, 0.4, 0.6, 0.8, 1][Math.floor(rand() * 5)];
    const sec = add({
      id: key, term: T, slot: subj.slot,
      code: `${subj.prefix}2${g}${subj.num}`, name: `${subj.name} ${(g - 1) * 2 + 1}${subj.suffix || ''}`,
      credit: subj.credit, hours: subj.hours, room, teacherId: teacherFor(subj.slot, g, r), deadline: DL,
      structure: kind === 'nostructure' ? null : () => genericStructure(subj.variant),
      fill, attrFill: complete ? 1 : fill * rand(), rtwFill: complete ? 1 : fill * rand(),
      lowAtt: sp.lowAtt || (rand() < 0.3 ? [Math.floor(rand() * 30)] : []),
      abilityShift: sp.abilityShift, sameScore: sp.sameScore, opts: sp.opts,
      updatedAt: kind === 'nostructure' ? null : hoursAgo(2 + rand() * 200),
    });
    // ผู้ตรวจต้องไม่ใช่ครูผู้สอนคนเดียวกัน (ข้อมูลตัวอย่างไม่มีการตรวจงานตนเองที่อนุมัติไปแล้ว)
    let reviewer = rand() < 0.5 ? 'u1' : 'u2';
    if (reviewer === sec.teacherId) reviewer = reviewer === 'u1' ? 'u2' : 'u1';
    if (kind === 'approved') approve(sec, reviewer, 60 + rand() * 150, 10 + rand() * 40);
    else if (kind === 'pending') submit(sec, 4 + rand() * 90);
    else if (kind === 'returned') returned(sec, 'u1', 70, 20, 'สัดส่วนคะแนนเก็บ : สอบ ไม่ตรงกับที่กลุ่มสาระกำหนด (ต้องเป็น 70 : 30)');
    if (sp.unlock) {
      sec.unlockRequest = { at: hoursAgo(5), reason: sp.unlock, status: 'pending', decidedBy: null, decidedAt: null, rejectReason: '' };
      ev(sec, 5, sec.teacherId, `ยื่นคำขอปลดล็อก: ${sp.unlock}`);
    }
  })));

  /* ---------- ภาคเรียนที่แล้ว ---------- */
  approve(add({
    id: 'p11', term: '2568-2', code: 'ค21102', name: 'คณิตศาสตร์ 2', slot: 'ma', credit: 1.5, hours: 60,
    room: 'ม.1/1', roster: 'ม.2/1', teacherId: 'u1', structure: mathStructure, deadline: '2026-03-13', ...full,
  }), 'u2', 24 * 200, 24 * 198);
  approve(add({
    id: 'p12', term: '2568-2', code: 'ค21102', name: 'คณิตศาสตร์ 2', slot: 'ma', credit: 1.5, hours: 60,
    room: 'ม.1/2', roster: 'ม.2/2', teacherId: 'u1', structure: mathStructure, deadline: '2026-03-13', ...full,
    opts: { lowAbility: [4] },
  }), 'u2', 24 * 201, 24 * 198);

  sections.forEach((sec) => sec.students.forEach((s) => delete s.ability));
  const db = { version: 2, sections };
  seedAttendance(db); // การเช็คชื่อรายคาบ (attendance-core.js)
  return db;
}
