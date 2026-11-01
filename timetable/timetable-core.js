/*
 * timetable-core.js — shared engine + store for the timetable pages
 * (timetable.html, timetable-approvals.html, my-timetable.html, teacher-profile.html).
 * Vocabulary follows GLOSSARY.md. Load order: tailwind → timetable-core.js → timetable-data.js → page script.
 *
 * Data lives in localStorage (key STORE_KEY) so the four pages share one mock database;
 * TT.load() seeds it from window.TT_SEED() when empty. Every mutation must end with TT.save().
 *
 * Key shapes
 *   slot      'd-p'  (d = 0..6 Mon..Sun, p = period number within the class's time structure)
 *   entry     { code, teachers:[tid], room, locked?, src:'manual'|'auto'|'import'|'copy'|'request' }
 *   version   { id, term, name, status:'draft'|'published'|'old', basedOn, createdAt, createdBy,
 *               publishedAt, publishedBy, timeStructures:[TS], activities:[Activity],
 *               conditions:{ defaults, teacher:{tid:{maxPerDay,maxConsecutive,maxPerWeek}},
 *                            subject:{code:{roomType,maxPerDay,double,maxConsecutive,prefer,forbidden:[slot],priority}},
 *                            room:{rid:{unavailable:[{day,start,end,note}]}} },
 *               entries:{ cid:{ slot: entry } }, appliedRequests:[reqId] }
 *   TS        { id, name, levels:[1,2,3], days:[0..4], start:'08:30', periodMin:50, periods:8,
 *               breaks:[{after:4, min:50, name}], homeroom:{min:30, name} }
 *   Activity  { id, name, scope:'school'|'stage'|'level', stageId?, level?, day, periods:[7],
 *               staff:'advisor'|'all'|'teachers'|'none', teacherIds:[], lockClasses:true }
 */
(function () {
  const STORE_KEY = 'tt-store-v1';
  const ROLE_KEY = 'tt-role';
  const SCHEMA = 3;

  /* ------------------------------------------------------------------ constants */
  const DAYS = [
    { name: 'จันทร์', short: 'จ.', dot: 'bg-yellow-400' },
    { name: 'อังคาร', short: 'อ.', dot: 'bg-pink-400' },
    { name: 'พุธ', short: 'พ.', dot: 'bg-green-500' },
    { name: 'พฤหัสบดี', short: 'พฤ.', dot: 'bg-orange-400' },
    { name: 'ศุกร์', short: 'ศ.', dot: 'bg-sky-500' },
    { name: 'เสาร์', short: 'ส.', dot: 'bg-violet-400' },
    { name: 'อาทิตย์', short: 'อา.', dot: 'bg-rose-400' }
  ];
  const GROUPS = {
    'ท': { name: 'ภาษาไทย', card: 'border-amber-200 bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    'ค': { name: 'คณิตศาสตร์', card: 'border-blue-200 bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'ว': { name: 'วิทยาศาสตร์และเทคโนโลยี', card: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'ส': { name: 'สังคมศึกษา ศาสนา และวัฒนธรรม', card: 'border-orange-200 bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
    'พ': { name: 'สุขศึกษาและพลศึกษา', card: 'border-teal-200 bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
    'ศ': { name: 'ศิลปะ', card: 'border-pink-200 bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-400' },
    'ง': { name: 'การงานอาชีพ', card: 'border-lime-200 bg-lime-50', text: 'text-lime-700', dot: 'bg-lime-500' },
    'อ': { name: 'ภาษาต่างประเทศ', card: 'border-violet-200 bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    'ก': { name: 'กิจกรรมพัฒนาผู้เรียน', card: 'border-slate-200 bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  };
  const ROOM_TYPES = { regular: 'ห้องเรียนปกติ', lab: 'ห้องปฏิบัติการวิทยาศาสตร์', com: 'ห้องคอมพิวเตอร์', gym: 'โรงยิม / สนาม', art: 'ห้องศิลปะ', music: 'ห้องดนตรี' };
  const UNAVAIL_REASONS = ['ประชุม', 'งานบริหาร / งานฝ่าย', 'คุมกิจกรรม / นักกีฬา', 'อื่น ๆ ในโรงเรียน'];
  const REQUEST_TYPES = { move: 'ย้ายคาบ', swap: 'สลับคาบของตนเอง', room: 'เปลี่ยนห้องเรียน' };
  const REQUEST_STATUS = {
    pending: { label: 'รออนุมัติ', cls: 'bg-amber-50 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', cls: 'bg-emerald-50 text-emerald-700' },
    modified: { label: 'อนุมัติพร้อมแก้ไข', cls: 'bg-blue-50 text-blue-700' },
    rejected: { label: 'ไม่อนุมัติ', cls: 'bg-rose-50 text-rose-700' }
  };
  const VERSION_STATUS = {
    draft: { label: 'ฉบับร่าง', cls: 'bg-amber-50 text-amber-700' },
    published: { label: 'ฉบับเผยแพร่', cls: 'bg-emerald-50 text-emerald-700' },
    old: { label: 'ฉบับเก่า', cls: 'bg-slate-100 text-slate-500' }
  };
  const PERSONAS = {
    admin: { role: 'admin', teacherId: 't17', name: 'อ.สุนิสา ปัญญาดี', title: 'งานวิชาการ (admin)', initials: 'SP' },
    teacher: { role: 'teacher', teacherId: 't05', name: 'อ.อนุชา แสงทอง', title: 'ครู · คณิตศาสตร์', initials: 'AS' }
  };
  const ISSUE_LABEL = {
    'teacher-clash': 'ครูสอนซ้อน', 'teacher-activity': 'ครูติดกิจกรรมล็อกเวลา', 'room-clash': 'ห้องใช้ซ้อน', 'teacher-unavailable': 'ตรงเวลาไม่ว่างของครู',
    'no-teacher': 'ไม่มีครูผู้สอน', 'outside': 'นอกโครงสร้างเวลา', 'class-activity': 'ทับกิจกรรมล็อกเวลา', 'subject-day-std': 'วิชาเดียวกันเกิน 2 คาบ/วัน',
    'over-ppw': 'เกินคาบต่อสัปดาห์', 'not-in-plan': 'ไม่อยู่ในแผนการเรียน',
    'teacher-day': 'ครูสอนเกินต่อวัน', 'teacher-consecutive': 'ครูสอนติดกันเกินกำหนด', 'room-type': 'ห้องไม่ตรงประเภท', 'room-unavailable': 'ห้องไม่พร้อมใช้งาน',
    'subject-day': 'วิชาเกินคาบต่อวันตามเงื่อนไข', 'forbidden': 'วิชาอยู่ในเวลาที่ห้าม', 'subject-consecutive': 'วิชาติดกันเกินกำหนด'
  };

  /* ------------------------------------------------------------------ store */
  let db = null;
  const listeners = new Set();
  function load(force = false) {
    if (db && !force) return db;
    db = null;
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed.schema === SCHEMA) db = parsed; } } catch (e) { /* storage unavailable */ }
    if (!db) { db = window.TT_SEED((o) => { db = o; }); save(true); }
    return db;
  }
  function save(silent = false) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable: keep in memory */ }
    if (!silent) listeners.forEach((fn) => fn());
  }
  function reset() { db = window.TT_SEED((o) => { db = o; }); save(); }
  function onChange(fn) { listeners.add(fn); }
  window.addEventListener('tt-store-external', () => { load(true); listeners.forEach((fn) => fn()); });
  window.addEventListener('storage', (e) => { if (e.key === STORE_KEY) { load(true); listeners.forEach((fn) => fn()); } if (e.key === ROLE_KEY) listeners.forEach((fn) => fn()); });

  function role() { try { return localStorage.getItem(ROLE_KEY) === 'teacher' ? 'teacher' : 'admin'; } catch (e) { return 'admin'; } }
  function setRole(r) { try { localStorage.setItem(ROLE_KEY, r); } catch (e) { /* ignore */ } }
  function me() { return PERSONAS[role()]; }

  let idSeq = 0;
  function newId(prefix) { idSeq += 1; return `${prefix}-${Date.now().toString(36)}${idSeq}`; }
  const nowIso = () => new Date().toISOString();
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ------------------------------------------------------------------ lookups */
  const teacher = (id) => db.external.teachers.find((t) => t.id === id);
  const cls = (id) => db.external.classes.find((c) => c.id === id);
  const room = (id) => db.external.rooms.find((r) => r.id === id);
  const subject = (code) => db.curriculum.subjects.find((s) => s.code === code);
  const version = (id) => db.versions.find((v) => v.id === id);
  const versionsOf = (term) => db.versions.filter((v) => v.term === term);
  const publishedOf = (term) => db.versions.find((v) => v.term === term && v.status === 'published');
  const termInfo = (term) => db.terms[term];
  const termLabel = (term) => { const [y, t] = term.split('-'); return `ภาคเรียนที่ ${t}/${y}`; };
  const termNo = (term) => Number(term.split('-')[1]);
  const className = (cid) => cls(cid)?.name || cid;
  const teacherName = (tid) => teacher(tid)?.name || 'ไม่ระบุครู';
  const teacherShort = (tid) => { const t = teacher(tid); return t ? t.name.split(' ')[0] : 'ไม่ระบุครู'; };
  const teachersLabel = (ids) => (ids && ids.length ? ids.map(teacherShort).join(' + ') : 'ไม่ระบุครู');
  const roomShort = (rid) => room(rid)?.short || room(rid)?.name || '-';
  const groupOf = (code) => GROUPS[subject(code)?.group || 'ก'] || GROUPS['ก'];
  const planOfClass = (cid) => db.curriculum.plans.find((p) => p.classIds.includes(cid));
  const classesOfLevel = (level) => db.external.classes.filter((c) => c.level === Number(level));
  const stageOfLevel = (v, level) => v.timeStructures.find((ts) => ts.levels.includes(Number(level)));
  const tsOfClass = (v, cid) => stageOfLevel(v, cls(cid).level);
  function curriculumLink(cid) {
    const plan = planOfClass(cid);
    return plan ? `../curriculum/curriculum-management.html#${plan.curriculumId}/${plan.id}` : '../curriculum/curriculum-management.html';
  }

  /* ------------------------------------------------------------------ time */
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const parseSlot = (slot) => slot.split('-').map(Number);
  function periodTimes(ts) {
    const out = [];
    let t = toMin(ts.start);
    for (let p = 1; p <= ts.periods; p++) {
      out.push({ no: p, start: t, end: t + ts.periodMin });
      t += ts.periodMin;
      ts.breaks.filter((b) => b.after === p).forEach((b) => { t += b.min; });
    }
    return out;
  }
  function breakTimes(ts) {
    const pts = periodTimes(ts);
    return ts.breaks.filter((b) => b.after < ts.periods).map((b) => { const end = pts[b.after - 1].end; return { ...b, start: end, end: end + b.min }; });
  }
  function dayEnd(ts) { const pts = periodTimes(ts); return pts[pts.length - 1].end; }
  function slotInterval(v, cid, slot) {
    const ts = tsOfClass(v, cid);
    const [d, p] = parseSlot(slot);
    const pt = periodTimes(ts)[p - 1];
    return pt ? { day: d, start: pt.start, end: pt.end } : null;
  }
  function slotLabel(slot) { const [d, p] = parseSlot(slot); return `${DAYS[d].name} คาบ ${p}`; }
  function slotTimeLabel(v, cid, slot) { const iv = slotInterval(v, cid, slot); return iv ? `${fmt(iv.start)}–${fmt(iv.end)}` : ''; }
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;
  function classSlots(v, cid) {
    const ts = tsOfClass(v, cid);
    return ts.days.flatMap((d) => periodTimes(ts).map((p) => `${d}-${p.no}`));
  }

  /* ------------------------------------------------------------------ curriculum-derived load */
  function assignmentsOf(term) { return db.assignments[term] || []; }
  function subjectsOfClass(term, cid) {
    const plan = planOfClass(cid);
    if (!plan) return [];
    return (plan.subjects[termNo(term)] || []).map(subject).filter(Boolean);
  }
  // คาบที่ต้องจัดของห้อง (ไม่รวมรายวิชาประเภทกิจกรรม ซึ่งจัดด้วยกิจกรรมล็อกเวลา)
  function loadOfClass(term, cid) {
    return subjectsOfClass(term, cid).filter((s) => s.type !== 'กิจกรรม').map((s) => {
      const a = assignmentsOf(term).find((x) => x.classId === cid && x.code === s.code);
      return { code: s.code, subject: s, ppw: s.hours, teachers: a ? a.teachers : [] };
    });
  }
  function loadOfTeacher(term, tid) {
    return assignmentsOf(term).filter((a) => a.teachers.includes(tid)).map((a) => ({ classId: a.classId, code: a.code, subject: subject(a.code), ppw: subject(a.code).hours, teachers: a.teachers }));
  }
  const countCode = (entries, code) => Object.values(entries || {}).filter((e) => e.code === code).length;
  function classProgress(v, cid) {
    const entries = v.entries[cid] || {};
    let required = 0, placed = 0;
    const remaining = [];
    loadOfClass(v.term, cid).forEach((l) => {
      const n = countCode(entries, l.code);
      required += l.ppw; placed += Math.min(n, l.ppw);
      if (n < l.ppw) remaining.push({ ...l, classId: cid, remain: l.ppw - n });
    });
    return { required, placed, remaining, pct: required ? Math.round(placed / required * 100) : 100 };
  }
  function teacherProgress(v, tid) {
    let required = 0, placed = 0;
    const remaining = [];
    loadOfTeacher(v.term, tid).forEach((l) => {
      const n = countCode(v.entries[l.classId], l.code);
      required += l.ppw; placed += Math.min(n, l.ppw);
      if (n < l.ppw) remaining.push({ ...l, remain: l.ppw - n });
    });
    return { required, placed, remaining, pct: required ? Math.round(placed / required * 100) : 100 };
  }
  function versionProgress(v, classIds = null) {
    let required = 0, placed = 0;
    (classIds || db.external.classes.map((c) => c.id)).forEach((cid) => { const p = classProgress(v, cid); required += p.required; placed += p.placed; });
    return { required, placed, pct: required ? Math.round(placed / required * 100) : 100 };
  }

  /* ------------------------------------------------------------------ conditions */
  const DEFAULTS = { teacherMaxPerDay: 5, teacherMaxConsecutive: 3, teacherMaxPerWeek: 24, subjectStdMaxPerDay: 2 };
  function teacherCond(v, tid) { const d = v.conditions.defaults || {}; return { maxPerDay: d.teacherMaxPerDay ?? DEFAULTS.teacherMaxPerDay, maxConsecutive: d.teacherMaxConsecutive ?? DEFAULTS.teacherMaxConsecutive, maxPerWeek: d.teacherMaxPerWeek ?? DEFAULTS.teacherMaxPerWeek, ...(v.conditions.teacher[tid] || {}) }; }
  function subjectCond(v, code) { return { roomType: subject(code)?.roomType || null, maxPerDay: 2, double: false, maxConsecutive: 2, prefer: null, forbidden: [], priority: 2, ...(v.conditions.subject[code] || {}) }; }
  function roomCond(v, rid) { return { unavailable: [], ...(v.conditions.room[rid] || {}) }; }
  function approvedUnavailability(term, tid = null) { return db.unavailability.filter((u) => u.term === term && u.status === 'approved' && (!tid || u.teacherId === tid)).map((u) => ({ ...u, s: toMin(u.start), e: toMin(u.end) })); }

  /* ------------------------------------------------------------------ activities */
  function activityClasses(v, a) {
    return db.external.classes.filter((c) => {
      if (a.scope === 'school') return true;
      if (a.scope === 'stage') return stageOfLevel(v, c.level)?.id === a.stageId;
      return c.level === Number(a.level);
    });
  }
  function classActivityAt(v, cid, slot) {
    const [d, p] = parseSlot(slot);
    return v.activities.find((a) => a.lockClasses !== false && a.day === d && a.periods.includes(p) && activityClasses(v, a).some((c) => c.id === cid)) || null;
  }
  // ช่วงเวลาที่กิจกรรมล็อกเวลาทำให้ครูไม่ว่าง: [{tid, day, start, end, label}]
  function activityTeacherBusy(v) {
    const out = [];
    v.activities.forEach((a) => {
      const classes = activityClasses(v, a);
      const intervals = new Map();
      classes.forEach((c) => a.periods.forEach((p) => {
        const iv = slotInterval(v, c.id, `${a.day}-${p}`);
        if (!iv) return;
        if (a.staff === 'advisor') { if (c.advisor) out.push({ tid: c.advisor, day: a.day, start: iv.start, end: iv.end, label: `${a.name} (${c.name})` }); }
        else intervals.set(`${iv.start}-${iv.end}`, iv);
      }));
      if (a.staff === 'all' || a.staff === 'teachers') {
        const tids = a.staff === 'all' ? db.external.teachers.map((t) => t.id) : (a.teacherIds || []);
        tids.forEach((tid) => intervals.forEach((iv) => out.push({ tid, day: a.day, start: iv.start, end: iv.end, label: a.name })));
      }
    });
    return out;
  }

  /* ------------------------------------------------------------------ index & evaluation */
  function buildIndex(v, ignore = null) {
    const tIdx = new Map(); const rIdx = new Map();
    const push = (map, key, item) => { if (!map.has(key)) map.set(key, []); map.get(key).push(item); };
    Object.entries(v.entries).forEach(([cid, slots]) => Object.entries(slots).forEach(([slot, e]) => {
      if (ignore && ignore.has(`${cid}|${slot}`)) return;
      const iv = slotInterval(v, cid, slot);
      if (!iv) return;
      const item = { kind: 'entry', cid, slot, s: iv.start, e: iv.end, code: e.code };
      (e.teachers || []).forEach((tid) => push(tIdx, `${tid}|${iv.day}`, item));
      if (e.room) push(rIdx, `${e.room}|${iv.day}`, item);
    }));
    activityTeacherBusy(v).forEach((b) => push(tIdx, `${b.tid}|${b.day}`, { kind: 'activity', s: b.start, e: b.end, label: b.label }));
    const unavail = new Map();
    approvedUnavailability(v.term).forEach((u) => push(unavail, `${u.teacherId}|${u.day}`, u));
    return { tIdx, rIdx, unavail, push };
  }
  function indexAdd(v, idx, cid, slot, e) {
    const iv = slotInterval(v, cid, slot);
    const item = { kind: 'entry', cid, slot, s: iv.start, e: iv.end, code: e.code };
    (e.teachers || []).forEach((tid) => idx.push(idx.tIdx, `${tid}|${iv.day}`, item));
    if (e.room) idx.push(idx.rIdx, `${e.room}|${iv.day}`, item);
  }
  function chainLength(intervals, target) {
    const list = [...intervals].sort((a, b) => a.s - b.s);
    let best = 0; let run = []; let prev = null;
    list.forEach((x) => { if (prev && x.s - prev.e <= 10) run.push(x); else run = [x]; prev = x; if (run.includes(target)) best = Math.max(best, run.length); });
    return best;
  }
  /*
   * Issues for placing `cand` at (cid, slot). Each issue: { type, sev:'error'|'warn', msg }.
   * error = Conflict (standard rules + approved unavailability); warn = admin-defined conditions.
   * `selfKey` ('cid|slot') is skipped when scanning the index (the entry being evaluated / moved).
   */
  function evaluate(v, idx, cid, slot, cand, selfKey = null, skipSlots = null) {
    const issues = [];
    const add = (type, sev, msg) => issues.push({ type, sev, msg });
    const ts = tsOfClass(v, cid);
    const [d, p] = parseSlot(slot);
    if (!ts.days.includes(d) || p > ts.periods) { add('outside', 'error', 'อยู่นอกโครงสร้างเวลาของช่วงชั้น'); return issues; }
    const act = classActivityAt(v, cid, slot);
    if (act) add('class-activity', 'error', `ทับกิจกรรมล็อกเวลา "${act.name}"`);
    const iv = slotInterval(v, cid, slot);
    const me = { s: iv.start, e: iv.end };
    const teachers = cand.teachers || [];
    if (!teachers.length) add('no-teacher', 'error', 'ยังไม่มีครูผู้สอน');
    const skip = (x) => x.kind === 'entry' && ((selfKey && `${x.cid}|${x.slot}` === selfKey) || (skipSlots && x.cid === cid && skipSlots.has(x.slot)));
    teachers.forEach((tid) => {
      const t = teacher(tid);
      const list = (idx.tIdx.get(`${tid}|${d}`) || []).filter((x) => !skip(x));
      list.filter((x) => x.s < me.e && me.s < x.e).forEach((x) => {
        if (x.kind === 'activity') add('teacher-activity', 'error', `${t?.name} ติด "${x.label}" ${fmt(x.s)}–${fmt(x.e)}`);
        else add('teacher-clash', 'error', `${t?.name} สอน ${className(x.cid)} (${x.code}) ${fmt(x.s)}–${fmt(x.e)}`);
      });
      (idx.unavail.get(`${tid}|${d}`) || []).filter((u) => u.s < me.e && me.s < u.e).forEach((u) => add('teacher-unavailable', 'error', `${t?.name} ไม่ว่าง ${u.start}–${u.end} (${u.reason}${u.note ? `: ${u.note}` : ''})`));
      const tc = teacherCond(v, tid);
      const teaching = list.filter((x) => x.kind === 'entry');
      if (teaching.length + 1 > tc.maxPerDay) add('teacher-day', 'warn', `${t?.name} สอน ${teaching.length + 1} คาบในวัน${DAYS[d].name} (กำหนด ${tc.maxPerDay})`);
      const run = chainLength([...teaching, me], me);
      if (run > tc.maxConsecutive) add('teacher-consecutive', 'warn', `${t?.name} สอนติดกัน ${run} คาบ (กำหนด ${tc.maxConsecutive})`);
    });
    if (cand.room) {
      const r = room(cand.room);
      const others = (idx.rIdx.get(`${cand.room}|${d}`) || []).filter((x) => !skip(x) && x.s < me.e && me.s < x.e);
      // max number of other classes using the room at the same moment within my interval
      const peak = others.reduce((best, x) => Math.max(best, others.filter((y) => y.s < Math.min(x.e, me.e) && Math.max(x.s, me.s) < y.e && y.s <= Math.max(x.s, me.s)).length), 0);
      if (others.length && peak >= (r?.maxClasses || 1)) add('room-clash', 'error', `${r?.name} ถูกใช้โดย ${others.map((x) => className(x.cid)).join(', ')}`);
      roomCond(v, cand.room).unavailable.filter((u) => u.day === d && toMin(u.start) < me.e && me.s < toMin(u.end)).forEach((u) => add('room-unavailable', 'warn', `${r?.name} ไม่พร้อมใช้ ${u.start}–${u.end}${u.note ? ` (${u.note})` : ''}`));
      const sc = subjectCond(v, cand.code);
      if (sc.roomType && r && r.type !== sc.roomType) add('room-type', 'warn', `วิชานี้ควรใช้${ROOM_TYPES[sc.roomType]} (ปัจจุบัน ${r.short || r.name})`);
    }
    const entries = v.entries[cid] || {};
    const sameDay = Object.entries(entries).filter(([k, e]) => e.code === cand.code && k !== slot && !(skipSlots && skipSlots.has(k)) && parseSlot(k)[0] === d);
    const sc = subjectCond(v, cand.code);
    if (sameDay.length + 1 > DEFAULTS.subjectStdMaxPerDay) add('subject-day-std', 'error', `${subject(cand.code)?.name} มี ${sameDay.length + 1} คาบในวัน${DAYS[d].name} (มาตรฐานไม่เกิน 2)`);
    else if (sameDay.length + 1 > sc.maxPerDay) add('subject-day', 'warn', `${subject(cand.code)?.name} มี ${sameDay.length + 1} คาบในวัน${DAYS[d].name} (กำหนด ${sc.maxPerDay})`);
    if (sc.forbidden.includes(slot)) add('forbidden', 'warn', `${subject(cand.code)?.name} ไม่ควรอยู่ใน${slotLabel(slot)}`);
    if (!subjectsOfClass(v.term, cid).some((s) => s.code === cand.code)) add('not-in-plan', 'error', `${cand.code} ไม่อยู่ในแผนการเรียนของ ${className(cid)}`);
    return issues;
  }
  function checkPlacement(v, cid, slot, cand, { ignore = [] } = {}) {
    const ign = new Set(ignore);
    const idx = buildIndex(v, ign);
    return evaluate(v, idx, cid, slot, cand, null, new Set(ignore.filter((k) => k.startsWith(`${cid}|`)).map((k) => k.split('|')[1])));
  }
  const worstSev = (iss) => (iss.some((i) => i.sev === 'error') ? 'error' : iss.length ? 'warn' : null);

  const issueCache = new WeakMap();
  function computeIssues(v) {
    const sig = JSON.stringify(v.entries).length + ':' + db.unavailability.length + ':' + JSON.stringify(v.conditions).length + ':' + JSON.stringify(v.activities).length + JSON.stringify(v.timeStructures).length;
    const cached = issueCache.get(v);
    if (cached && cached.sig === sig && cached.json === JSON.stringify(v.entries)) return cached.result;
    const idx = buildIndex(v);
    const byCell = new Map(); const list = [];
    Object.entries(v.entries).forEach(([cid, slots]) => {
      const counts = {};
      Object.values(slots).forEach((e) => { counts[e.code] = (counts[e.code] || 0) + 1; });
      const ppw = Object.fromEntries(loadOfClass(v.term, cid).map((l) => [l.code, l.ppw]));
      Object.entries(slots).forEach(([slot, e]) => {
        const iss = evaluate(v, idx, cid, slot, e, `${cid}|${slot}`);
        if (ppw[e.code] !== undefined && counts[e.code] > ppw[e.code]) iss.push({ type: 'over-ppw', sev: 'error', msg: `${subject(e.code)?.name} จัด ${counts[e.code]} คาบ เกินหลักสูตร (${ppw[e.code]} คาบ/สัปดาห์)` });
        if (iss.length) { byCell.set(`${cid}|${slot}`, iss); iss.forEach((i) => list.push({ ...i, cid, slot, code: e.code, teachers: e.teachers })); }
      });
    });
    const teacherWarnings = db.external.teachers.map((t) => {
      const n = Object.values(v.entries).reduce((a, slots) => a + Object.values(slots).filter((e) => e.teachers.includes(t.id)).length, 0);
      const max = teacherCond(v, t.id).maxPerWeek;
      return n > max ? { tid: t.id, msg: `${t.name} สอน ${n} คาบ/สัปดาห์ เกินภาระ (${max})` } : null;
    }).filter(Boolean);
    const result = { byCell, list, teacherWarnings, errorCells: new Set(list.filter((i) => i.sev === 'error').map((i) => `${i.cid}|${i.slot}`)).size, warnCells: new Set(list.filter((i) => i.sev === 'warn').map((i) => `${i.cid}|${i.slot}`)).size };
    issueCache.set(v, { sig, json: JSON.stringify(v.entries), result });
    return result;
  }

  /* ------------------------------------------------------------------ auto scheduler */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const STD_BLOCK = new Set(['teacher-clash', 'teacher-activity', 'room-clash', 'subject-day-std', 'outside', 'class-activity', 'no-teacher', 'not-in-plan']);
  const SMART_BLOCK = new Set([...STD_BLOCK, 'teacher-unavailable', 'teacher-day', 'teacher-consecutive', 'room-type', 'room-unavailable', 'subject-day', 'forbidden']);
  const REASON = {
    'teacher-clash': 'ครูผู้สอนติดสอนห้องอื่นในทุกช่องที่เหลือ', 'teacher-activity': 'ครูติดกิจกรรมล็อกเวลาในช่องที่เหลือ', 'room-clash': 'ห้องเรียนที่ใช้ได้ไม่ว่างในช่องที่เหลือ',
    'subject-day-std': 'วิชานี้ครบ 2 คาบต่อวันในทุกวันที่เหลือ', 'teacher-unavailable': 'ช่องที่เหลือตรงกับเวลาไม่ว่างของครู', 'teacher-day': 'ครูสอนครบจำนวนคาบสูงสุดต่อวันในวันที่เหลือ',
    'teacher-consecutive': 'ช่องที่เหลือทำให้ครูสอนติดกันเกินกำหนด', 'room-type': 'ห้องเฉพาะทางไม่ว่างในช่องที่เหลือ', 'room-unavailable': 'ห้องเฉพาะทางไม่พร้อมใช้ในช่องที่เหลือ',
    'subject-day': 'วิชานี้ครบคาบต่อวันตามเงื่อนไขในทุกวันที่เหลือ', 'forbidden': 'ช่องที่เหลือเป็นเวลาที่ห้ามจัดวิชานี้', 'full': 'ห้องเรียนไม่มีช่องว่างเหลือ', 'no-teacher': 'ยังไม่มีครูผู้สอน'
  };
  /*
   * mode: 'smart' (จัดอัตโนมัติตามเงื่อนไข) | 'standard' (จัดอัตโนมัติมาตรฐาน)
   * teacherIds: null = ครูทุกคน; keep=false clears in-scope, unlocked entries first.
   * Returns { entries, placed, unplaced:[{classId, code, count, reason}] } without mutating v.
   */
  function autoSchedule(v, { teacherIds = null, classIds = null, mode = 'smart', keep = true, seed = 1 } = {}) {
    const smart = mode === 'smart';
    const block = smart ? SMART_BLOCK : STD_BLOCK;
    const rng = mulberry32(seed);
    const work = { ...v, entries: clone(v.entries) };
    const inScopeTeacher = (ids) => !teacherIds || ids.some((t) => teacherIds.includes(t));
    const cids = classIds || db.external.classes.map((c) => c.id);
    cids.forEach((cid) => { work.entries[cid] = work.entries[cid] || {}; });
    if (!keep) cids.forEach((cid) => Object.keys(work.entries[cid]).forEach((k) => { const e = work.entries[cid][k]; if (!e.locked && inScopeTeacher(e.teachers)) delete work.entries[cid][k]; }));
    const idx = buildIndex(work);
    const unplaced = {};
    const addUnplaced = (cid, code, n, reason) => { const key = `${cid}|${code}`; unplaced[key] = unplaced[key] || { classId: cid, code, count: 0, reason }; unplaced[key].count += n; };
    const tasks = [];
    cids.forEach((cid) => loadOfClass(v.term, cid).forEach((l) => {
      if (l.teachers.length && !inScopeTeacher(l.teachers)) return;
      if (!l.teachers.length && teacherIds) return;
      let remain = l.ppw - countCode(work.entries[cid], l.code);
      if (remain <= 0) return;
      if (!l.teachers.length) { addUnplaced(cid, l.code, remain, REASON['no-teacher']); return; }
      const sc = subjectCond(v, l.code);
      if (smart && sc.double && remain >= 2) { tasks.push({ cid, l, len: 2 }); remain -= 2; }
      for (; remain > 0; remain--) tasks.push({ cid, l, len: 1 });
    }));
    const difficulty = (t) => t.len * 10 + (subjectCond(v, t.l.code).roomType ? 6 : 0) + t.l.teachers.length * 4 + (smart ? (4 - subjectCond(v, t.l.code).priority) * 2 : 0);
    tasks.forEach((t) => { t.r = rng(); });
    tasks.sort((a, b) => difficulty(b) - difficulty(a) || a.r - b.r);
    let placed = 0;
    const queue = [...tasks];
    while (queue.length) {
      const task = queue.shift();
      const res = placeTask(work, idx, task, smart, block, rng);
      if (res.ok) placed += task.len;
      else if (task.len === 2) queue.unshift({ ...task, len: 1 }, { ...task, len: 1 });
      else addUnplaced(task.cid, task.l.code, 1, res.reason);
    }
    return { entries: work.entries, placed, unplaced: Object.values(unplaced) };
  }
  function roomCandidates(v, cid, code, smart) {
    const sc = subjectCond(v, code);
    if (smart && sc.roomType) return db.external.rooms.filter((r) => r.type === sc.roomType).map((r) => r.id);
    return [cls(cid).homeroom];
  }
  function placeTask(work, idx, task, smart, block, rng) {
    const { cid, l, len } = task;
    const ts = tsOfClass(work, cid);
    const pts = periodTimes(ts);
    const entries = work.entries[cid];
    const sc = subjectCond(work, l.code);
    const blockers = {};
    const cands = [];
    ts.days.forEach((d) => pts.forEach((pt, i) => {
      const slots = [`${d}-${pt.no}`];
      if (len === 2) { const nx = pts[i + 1]; if (!nx || nx.start !== pt.end) return; slots.push(`${d}-${nx.no}`); }
      if (slots.some((k) => entries[k] || classActivityAt(work, cid, k))) { blockers.full = (blockers.full || 0) + 1; return; }
      const rooms = roomCandidates(work, cid, l.code, smart);
      let chosen = null; let firstBad = null;
      for (const rid of rooms) {
        const cand = { code: l.code, teachers: l.teachers, room: rid };
        const bad = [];
        slots.forEach((k, j) => {
          const iss = evaluate(work, idx, cid, k, cand);
          if (j === 1) { /* second half of a double: the first half is not yet in the index */ }
          iss.filter((x) => block.has(x.type)).forEach((x) => bad.push(x.type));
        });
        if (len === 2) { const sameDay = Object.entries(entries).filter(([k, e]) => e.code === l.code && parseSlot(k)[0] === d).length; if (sameDay + 2 > (smart ? Math.max(sc.maxPerDay, 2) : 2)) bad.push(smart ? 'subject-day' : 'subject-day-std'); }
        if (!bad.length) { chosen = rid; break; }
        if (!firstBad) firstBad = bad;
      }
      if (!chosen) { (firstBad || []).forEach((t) => { blockers[t] = (blockers[t] || 0) + 1; }); return; }
      let score = rng() * 2;
      const sameDay = Object.entries(entries).filter(([k, e]) => e.code === l.code && parseSlot(k)[0] === d).length;
      if (smart) {
        if (sc.prefer === 'morning') score += pt.start < 720 ? 4 : -2;
        if (sc.prefer === 'afternoon') score += pt.start >= 720 ? 4 : -2;
        if (sc.priority === 1 && pt.start < 720) score += 2;
        score -= sameDay * 4;
        score -= Object.keys(entries).filter((k) => parseSlot(k)[0] === d).length * 0.4;
      } else {
        score -= sameDay * 1.5;
      }
      cands.push({ slots, room: chosen, score });
    }));
    if (!cands.length) {
      const top = Object.entries(blockers).filter(([k]) => k !== 'full').sort((a, b) => b[1] - a[1])[0];
      return { ok: false, reason: REASON[top ? top[0] : 'full'] || REASON.full };
    }
    cands.sort((a, b) => b.score - a.score);
    const best = cands[0];
    best.slots.forEach((k) => { const e = { code: l.code, teachers: [...l.teachers], room: best.room, src: 'auto' }; entries[k] = e; indexAdd(work, idx, cid, k, e); });
    return { ok: true };
  }

  /* ------------------------------------------------------------------ readiness (การตรวจความพร้อม) */
  function readiness(v) {
    const term = v.term;
    const items = [];
    const classes = db.external.classes;
    const noPlan = classes.filter((c) => !planOfClass(c.id) || !subjectsOfClass(term, c.id).length);
    items.push({ id: 'plan', status: noPlan.length ? 'fail' : 'pass', source: 'curriculum', title: 'ทุกห้องมีแผนการเรียนและรายวิชา', detail: noPlan.length ? `${noPlan.length} ห้องยังไม่มีรายวิชาในภาคเรียนนี้` : `${classes.length} ห้องมีรายวิชาครบ`, rows: noPlan.map((c) => ({ text: `${c.name} ยังไม่มีแผนการเรียน`, link: curriculumLink(c.id) })) });
    const noAssign = []; const noQualified = [];
    classes.forEach((c) => loadOfClass(term, c.id).forEach((l) => {
      if (l.teachers.length) return;
      const qualified = db.external.teachers.filter((t) => t.canTeach.includes(l.code));
      (qualified.length ? noAssign : noQualified).push({ c, l, qualified });
    }));
    items.push({ id: 'assign', status: noAssign.length ? 'fail' : 'pass', source: 'curriculum', title: 'ทุกรายวิชามีครูผู้สอน (การมอบหมายสอน)', detail: noAssign.length ? `${noAssign.length} รายการยังไม่ได้มอบหมายครู — แก้ได้ที่หน้าจัดการหลักสูตร` : 'มอบหมายครูครบทุกรายวิชา', rows: noAssign.map(({ c, l, qualified }) => ({ text: `${c.name} · ${l.code} ${l.subject.name} — มีครูที่สอนได้ ${qualified.length} คน`, link: curriculumLink(c.id) })) });
    items.push({ id: 'qualified', status: noQualified.length ? 'fail' : 'pass', source: 'external', title: 'มีครูที่สอนวิชาได้ (ข้อมูลจากระบบงานบุคคล)', detail: noQualified.length ? `${noQualified.length} รายการไม่มีครูคนใดสอนวิชานั้นได้ — ต้องแก้ที่ระบบต้นทาง` : 'ทุกวิชามีครูที่สอนได้', rows: noQualified.map(({ c, l }) => ({ text: `${c.name} · ${l.code} ${l.subject.name} — ไม่มีครูที่สอนวิชานี้ได้`, external: true })) });
    const capRows = [];
    classes.forEach((c) => {
      const ts = tsOfClass(v, c.id);
      const avail = classSlots(v, c.id).filter((k) => !classActivityAt(v, c.id, k)).length;
      const req = loadOfClass(term, c.id).reduce((a, l) => a + l.ppw, 0);
      if (req > avail) capRows.push({ text: `${c.name} ต้องการ ${req} คาบ แต่มี ${avail} ช่อง (${ts.name})` });
    });
    items.push({ id: 'capacity', status: capRows.length ? 'fail' : 'pass', source: 'timetable', title: 'จำนวนคาบไม่เกินช่องเวลา', detail: capRows.length ? `${capRows.length} ห้องมีคาบมากกว่าช่องเวลาที่มี — ปรับโครงสร้างเวลาหรือกิจกรรมล็อกเวลา` : 'ทุกห้องมีช่องเวลาพอ', rows: capRows });
    const loadRows = db.external.teachers.map((t) => ({ t, n: loadOfTeacher(term, t.id).reduce((a, l) => a + l.ppw, 0) })).filter((x) => x.n > teacherCond(v, x.t.id).maxPerWeek).map((x) => ({ text: `${x.t.name} ได้รับ ${x.n} คาบ เกินภาระ ${teacherCond(v, x.t.id).maxPerWeek}`, link: curriculumLink(assignmentsOf(term).find((a) => a.teachers.includes(x.t.id))?.classId) }));
    items.push({ id: 'load', status: loadRows.length ? 'warn' : 'pass', source: 'curriculum', title: 'ครูได้รับคาบไม่เกินภาระ', detail: loadRows.length ? `${loadRows.length} คนได้รับมอบหมายเกินภาระต่อสัปดาห์` : 'ภาระสอนอยู่ในเกณฑ์', rows: loadRows });
    const demand = {};
    classes.forEach((c) => loadOfClass(term, c.id).forEach((l) => { const rt = subjectCond(v, l.code).roomType; if (rt) demand[rt] = (demand[rt] || 0) + l.ppw; }));
    const roomRows = Object.entries(demand).map(([type, n]) => {
      const supply = db.external.rooms.filter((r) => r.type === type).reduce((a, r) => a + (r.maxClasses || 1) * 35, 0);
      return { type, n, supply };
    }).filter((x) => x.n > x.supply * 0.85).map((x) => ({ text: `${ROOM_TYPES[x.type]} ต้องใช้ ${x.n} คาบ รองรับได้ประมาณ ${x.supply} คาบ`, external: true }));
    items.push({ id: 'rooms', status: roomRows.length ? 'warn' : 'pass', source: 'external', title: 'ห้องเฉพาะทางเพียงพอ', detail: roomRows.length ? 'ห้องเฉพาะทางบางประเภทใกล้เต็ม การจัดอัตโนมัติอาจวางบางวิชาไม่ได้' : Object.entries(demand).map(([t, n]) => `${ROOM_TYPES[t]} ${n} คาบ`).join(' · '), rows: roomRows });
    const noAdvisor = classes.filter((c) => !c.advisor);
    items.push({ id: 'advisor', status: noAdvisor.length ? 'warn' : 'pass', source: 'external', title: 'ทุกห้องมีครูประจำชั้น', detail: noAdvisor.length ? `${noAdvisor.map((c) => c.name).join(', ')} ยังไม่มีครูประจำชั้น — กิจกรรมที่ใช้ครูประจำชั้นจะไม่มีผู้ดูแล` : 'ครบทุกห้อง', rows: noAdvisor.map((c) => ({ text: `${c.name} ยังไม่มีครูประจำชั้น`, external: true })) });
    const pendingUn = db.unavailability.filter((u) => u.term === term && u.status === 'pending');
    const deadline = termInfo(term)?.unavailDeadline;
    const open = deadline && new Date(`${deadline}T23:59:59`) >= new Date();
    items.push({ id: 'unavail', status: pendingUn.length || open ? 'warn' : 'pass', source: 'timetable', title: 'เวลาไม่ว่างของครูพร้อมใช้งาน', detail: [pendingUn.length ? `รออนุมัติ ${pendingUn.length} รายการ` : '', open ? `ยังไม่ถึงวันปิดรับ (${formatDate(deadline)}) อาจมีเพิ่มอีก` : `ปิดรับแล้วเมื่อ ${formatDate(deadline)}`].filter(Boolean).join(' · '), rows: pendingUn.map((u) => ({ text: `${teacherName(u.teacherId)} · ${DAYS[u.day].name} ${u.start}–${u.end} (${u.reason})`, link: 'timetable-approvals.html#unavailability' })) });
    const fails = items.filter((i) => i.status === 'fail').length;
    return { items, fails, warns: items.filter((i) => i.status === 'warn').length, canAuto: fails === 0 };
  }

  /* ------------------------------------------------------------------ versions */
  function logHistory(term, versionId, action, detail, user = me().name) {
    db.history.unshift({ id: newId('h'), term, versionId, at: nowIso(), user, action, detail });
  }
  function notify(to, title, text, link = '') {
    db.notifications.unshift({ id: newId('n'), to, title, text, link, at: nowIso(), read: false });
  }
  function mapCode(code, toTerm) {
    const s = subject(code);
    if (!s) return null;
    return db.curriculum.subjects.find((x) => x.level === s.level && x.bp === s.bp && x.term === termNo(toTerm))?.code || null;
  }
  // การคัดลอกตารางสอน: settings + entries from `src` into a new draft for `term`. Returns { version, dropped:[{text}] }.
  function copyVersion(src, { term, name, withEntries = true, by = me().name }) {
    const dropped = [];
    const entries = {};
    db.external.classes.forEach((c) => { entries[c.id] = {}; });
    if (withEntries) Object.entries(src.entries).forEach(([cid, slots]) => Object.entries(slots).forEach(([slot, e]) => {
      const code = src.term === term ? e.code : mapCode(e.code, term);
      if (!cls(cid)) { dropped.push({ text: `${cid} ไม่มีในภาคเรียนปลายทาง` }); return; }
      if (!code || !subjectsOfClass(term, cid).some((s) => s.code === code)) { dropped.push({ text: `${className(cid)} ${slotLabel(slot)} · ${e.code} ไม่อยู่ในแผนการเรียนของภาคเรียนปลายทาง` }); return; }
      const a = assignmentsOf(term).find((x) => x.classId === cid && x.code === code);
      const keepTeachers = a ? e.teachers.filter((t) => a.teachers.includes(t)) : [];
      if (!keepTeachers.length) { dropped.push({ text: `${className(cid)} ${slotLabel(slot)} · ${code} — ${teachersLabel(e.teachers)} ไม่ได้สอนวิชานี้ให้ห้องนี้แล้ว` }); return; }
      entries[cid][slot] = { code, teachers: a.teachers, room: e.room, src: 'copy', ...(e.locked ? { locked: true } : {}) };
    }));
    const v = {
      id: newId('V'), term, name, status: 'draft', basedOn: src.id, createdAt: nowIso(), createdBy: by, publishedAt: null, publishedBy: null,
      timeStructures: clone(src.timeStructures), activities: clone(src.activities), conditions: clone(src.conditions), entries,
      appliedRequests: src.term === term ? [...(src.appliedRequests || [])] : []
    };
    db.versions.push(v);
    logHistory(term, v.id, 'สร้างฉบับร่าง', `คัดลอกจาก "${src.name}" (${termLabel(src.term)})${dropped.length ? ` · ตัดทิ้ง ${dropped.length} คาบ` : ''}`, by);
    return { version: v, dropped };
  }
  function createBlankVersion({ term, name, timeStructures, activities, conditions, by = me().name }) {
    const entries = {};
    db.external.classes.forEach((c) => { entries[c.id] = {}; });
    const v = { id: newId('V'), term, name, status: 'draft', basedOn: null, createdAt: nowIso(), createdBy: by, publishedAt: null, publishedBy: null, timeStructures, activities, conditions, entries, appliedRequests: [] };
    db.versions.push(v);
    logHistory(term, v.id, 'สร้างฉบับร่าง', `สร้างใหม่ทั้งหมด "${name}"`, by);
    return v;
  }
  function publish(v, by = me().name, notifyAll = true) {
    const prev = publishedOf(v.term);
    if (prev && prev.id !== v.id) prev.status = 'old';
    v.status = 'published'; v.publishedAt = nowIso(); v.publishedBy = by;
    logHistory(v.term, v.id, 'เผยแพร่ตาราง', `เผยแพร่ "${v.name}"${prev ? ` แทน "${prev.name}"` : ''}`, by);
    if (notifyAll) db.external.teachers.forEach((t) => { if (loadOfTeacher(v.term, t.id).length) notify(t.id, 'ตารางสอนฉบับใหม่', `${termLabel(v.term)} เผยแพร่ "${v.name}" แล้ว`, 'my-timetable.html'); });
  }
  // การเปลี่ยนแปลงในฉบับเผยแพร่หลังจากที่ฉบับร่างคัดลอกมา (ADR-0001)
  function divergence(draft) {
    const pub = publishedOf(draft.term);
    if (!pub || draft.status !== 'draft' || !draft.basedOn || pub.id === draft.basedOn) return [];
    const base = version(draft.basedOn);
    if (!base || base.term !== draft.term) return [];
    const done = new Set(draft.appliedRequests || []);
    return (pub.appliedRequests || []).filter((id) => !done.has(id)).map((id) => db.requests.find((r) => r.id === id)).filter(Boolean);
  }

  /* ------------------------------------------------------------------ requests (คำร้องขอเปลี่ยนการจัด) */
  // req: { type, classId, slot, target:{slot} | {swapSlot} | {room} }
  function applyChange(v, req, final) {
    const t = final || req.target;
    const entries = v.entries[req.classId];
    const e = entries[req.slot];
    if (!e) return { ok: false, msg: 'ไม่พบคาบต้นทางในฉบับนี้' };
    if (req.type === 'room') { entries[req.slot] = { ...e, room: t.room, src: 'request' }; return { ok: true }; }
    if (req.type === 'swap') {
      const [cid2, slot2] = t.swap.split('|');
      const e2 = v.entries[cid2]?.[slot2];
      if (!e2) return { ok: false, msg: 'ไม่พบคาบที่ต้องการสลับ' };
      if (cid2 === req.classId) { entries[req.slot] = { ...e2, src: 'request' }; entries[slot2] = { ...e, src: 'request' }; return { ok: true }; }
      // สลับคาบของครูคนเดียวกันต่างห้อง: ย้ายแต่ละคาบไปเวลาของอีกคาบ ภายในห้องของตนเอง
      if (entries[slot2] || v.entries[cid2][req.slot]) return { ok: false, msg: 'ห้องปลายทางไม่ว่างในเวลาที่จะสลับ' };
      delete entries[req.slot]; delete v.entries[cid2][slot2];
      entries[slot2] = { ...e, src: 'request' }; v.entries[cid2][req.slot] = { ...e2, src: 'request' };
      return { ok: true };
    }
    if (entries[t.slot]) return { ok: false, msg: 'ช่องปลายทางมีคาบอยู่แล้ว' };
    delete entries[req.slot];
    entries[t.slot] = { ...e, ...(t.room ? { room: t.room } : {}), src: 'request' };
    return { ok: true };
  }
  function previewRequest(req, final) {
    const pub = version(req.versionId) || publishedOf(req.term);
    const v = { ...pub, entries: clone(publishedOf(req.term).entries) };
    const res = applyChange(v, req, final);
    if (!res.ok) return { ok: false, msg: res.msg, issues: [] };
    const t = final || req.target;
    const keys = req.type === 'swap' ? [`${req.classId}|${t.swap.split('|')[1]}`, `${t.swap.split('|')[0]}|${req.slot}`] : req.type === 'room' ? [`${req.classId}|${req.slot}`] : [`${req.classId}|${t.slot}`];
    const all = computeIssues(v);
    const issues = keys.flatMap((k) => all.byCell.get(k) || []);
    return { ok: true, v, issues, conflict: issues.some((i) => i.sev === 'error') };
  }
  // ช่องที่ย้ายไปได้โดยไม่เกิด Conflict (ใช้ทั้งครูตอนยื่นคำร้องและ admin ตอนอนุมัติพร้อมแก้ไข)
  function suggestMoves(v, cid, slot, limit = 12) {
    const e = v.entries[cid][slot];
    if (!e) return [];
    const idx = buildIndex(v, new Set([`${cid}|${slot}`]));
    return classSlots(v, cid).filter((k) => k !== slot && !v.entries[cid][k] && !classActivityAt(v, cid, k))
      .map((k) => ({ slot: k, issues: evaluate(v, idx, cid, k, e, null, new Set([slot])) }))
      .filter((x) => !x.issues.some((i) => i.sev === 'error'))
      .sort((a, b) => a.issues.length - b.issues.length).slice(0, limit);
  }
  function submitRequest({ term, teacherId, type, classId, slot, target, reason, note }) {
    const pub = publishedOf(term);
    const r = { id: newId('RQ'), term, versionId: pub.id, teacherId, type, classId, slot, target, reason, note, status: 'pending', createdAt: nowIso(), decidedAt: null, decidedBy: null, adminNote: '', final: null };
    db.requests.unshift(r);
    notify('admin', 'คำร้องขอเปลี่ยนการจัดใหม่', `${teacherName(teacherId)} · ${REQUEST_TYPES[type]} ${className(classId)} ${slotLabel(slot)}`, 'timetable-approvals.html');
    logHistory(term, pub.id, 'ยื่นคำร้อง', `${teacherName(teacherId)} ${REQUEST_TYPES[type]} ${className(classId)} ${slotLabel(slot)}`, teacherName(teacherId));
    save();
    return r;
  }
  // อนุมัติ = สร้างฉบับเผยแพร่ใหม่ (ADR-0001). final ≠ null → อนุมัติพร้อมแก้ไข
  function decideRequest(reqId, { approve, final = null, adminNote = '', by = me().name }) {
    const r = db.requests.find((x) => x.id === reqId);
    if (!r || r.status !== 'pending') return { ok: false, msg: 'คำร้องนี้ถูกพิจารณาแล้ว' };
    r.decidedAt = nowIso(); r.decidedBy = by; r.adminNote = adminNote;
    if (!approve) {
      r.status = 'rejected';
      notify(r.teacherId, 'คำร้องไม่ได้รับอนุมัติ', `${REQUEST_TYPES[r.type]} ${className(r.classId)} ${slotLabel(r.slot)}${adminNote ? ` — ${adminNote}` : ''}`, 'my-timetable.html#requests');
      logHistory(r.term, r.versionId, 'ไม่อนุมัติคำร้อง', `${teacherName(r.teacherId)} · ${REQUEST_TYPES[r.type]} ${className(r.classId)}${adminNote ? ` · ${adminNote}` : ''}`, by);
      save();
      return { ok: true };
    }
    const pv = previewRequest(r, final);
    if (!pv.ok) return { ok: false, msg: pv.msg };
    if (pv.conflict) return { ok: false, msg: 'ยังมี Conflict ต้องเลือกช่องอื่นก่อนอนุมัติ' };
    const pub = publishedOf(r.term);
    const nv = { ...clone(pub), id: newId('V'), name: `${pub.name.replace(/ \(rev \d+\)$/, '')} (rev ${(pub.appliedRequests || []).length + 1})`, status: 'draft', basedOn: pub.id, createdAt: nowIso(), createdBy: by, entries: pv.v.entries, appliedRequests: [...(pub.appliedRequests || []), r.id] };
    db.versions.push(nv);
    r.status = final ? 'modified' : 'approved'; r.final = final; r.resultVersionId = nv.id;
    publish(nv, by, false);
    notify(r.teacherId, final ? 'คำร้องได้รับอนุมัติพร้อมแก้ไข' : 'คำร้องได้รับอนุมัติ', `${REQUEST_TYPES[r.type]} ${className(r.classId)} ${slotLabel(r.slot)}${final?.slot ? ` → ${slotLabel(final.slot)}` : final?.room ? ` → ${roomShort(final.room)}` : final?.swap ? ` → สลับกับ${slotLabel(final.swap.split('|')[1])}` : ''}${adminNote ? ` — ${adminNote}` : ''}`, 'my-timetable.html#requests');
    logHistory(r.term, nv.id, final ? 'อนุมัติคำร้องพร้อมแก้ไข' : 'อนุมัติคำร้อง', `${teacherName(r.teacherId)} · ${REQUEST_TYPES[r.type]} ${className(r.classId)} ${slotLabel(r.slot)} → สร้าง "${nv.name}"`, by);
    save();
    return { ok: true, version: nv };
  }
  function mergeDivergence(draft) {
    const merged = []; const skipped = [];
    divergence(draft).forEach((r) => {
      const res = applyChange(draft, r, r.final);
      if (res.ok) { merged.push(r); draft.appliedRequests = [...(draft.appliedRequests || []), r.id]; }
      else { skipped.push({ r, msg: res.msg }); draft.appliedRequests = [...(draft.appliedRequests || []), r.id]; }
    });
    logHistory(draft.term, draft.id, 'นำการเปลี่ยนแปลงมารวม', `รวม ${merged.length} คำร้อง${skipped.length ? ` · ข้าม ${skipped.length}` : ''}`);
    return { merged, skipped };
  }

  /* ------------------------------------------------------------------ unavailability (เวลาไม่ว่างของครู) */
  function unavailabilityOpen(term) { const d = termInfo(term)?.unavailDeadline; return !!d && new Date(`${d}T23:59:59`) >= new Date(); }
  function daysLeft(dateStr) { const today = new Date(); today.setHours(0, 0, 0, 0); return Math.round((new Date(`${dateStr}T00:00:00`) - today) / 86400000); }
  function formatDate(dateStr) { if (!dateStr) return '-'; return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${dateStr}T00:00:00`)); }
  function formatDateTime(iso) { return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); }

  /* ------------------------------------------------------------------ import (Excel) */
  const IMPORT_HEADERS = ['ห้อง', 'วัน', 'คาบ', 'รหัสวิชา', 'รหัสครู', 'ห้องเรียน'];
  function parseDay(val) {
    const s = String(val ?? '').trim().replace('วัน', '');
    const i = DAYS.findIndex((d) => d.name === s || d.short === s || d.short.replace('.', '') === s);
    if (i >= 0) return i;
    const n = Number(s); return n >= 1 && n <= 7 ? n - 1 : -1;
  }
  /*
   * rows: [[ห้อง, วัน, คาบ, รหัสวิชา, รหัสครู(คั่นด้วย ,), ห้องเรียน]]
   * Follows the จัดเอง rules: rule violations import as Conflict; class already occupied or locked activity → skip.
   * Returns rows with { status:'ok'|'warn'|'error', msgs, teacherKey, cid, slot, entry }.
   */
  function validateImport(v, rows, { mode = 'replace', teacherIds = null } = {}) {
    const work = { ...v, entries: clone(v.entries) };
    const teacherKeys = new Set();
    const parsed = rows.map((r, i) => {
      const [cName, dayV, perV, codeV, tV, roomV] = r.map((x) => String(x ?? '').trim());
      const row = { n: i + 1, raw: r, status: 'ok', msgs: [] };
      const c = db.external.classes.find((x) => x.name === cName || x.id === cName);
      const d = parseDay(dayV); const p = Number(perV);
      if (!c) { row.status = 'error'; row.msgs.push(`ไม่พบห้อง "${cName}"`); return row; }
      const ts = tsOfClass(v, c.id);
      if (d < 0 || !ts.days.includes(d)) { row.status = 'error'; row.msgs.push(`วัน "${dayV}" ไม่ใช่วันเรียน`); return row; }
      if (!(p >= 1 && p <= ts.periods)) { row.status = 'error'; row.msgs.push(`คาบ "${perV}" ไม่มีในโครงสร้างเวลา ${ts.name} (1–${ts.periods})`); return row; }
      const l = loadOfClass(v.term, c.id).find((x) => x.code === codeV);
      if (!l) { row.status = 'error'; row.msgs.push(`${codeV || '(ว่าง)'} ไม่อยู่ในแผนการเรียนของ ${c.name}`); return row; }
      let teachers = l.teachers;
      if (tV) {
        const ids = tV.split(/[,+]/).map((x) => x.trim()).filter(Boolean).map((x) => db.external.teachers.find((t) => t.id === x || t.name === x)?.id || null);
        if (ids.includes(null)) { row.status = 'error'; row.msgs.push(`ไม่พบรหัสครู "${tV}"`); return row; }
        teachers = ids;
      }
      if (!teachers.length) { row.status = 'error'; row.msgs.push('วิชานี้ยังไม่มีครูผู้สอน'); return row; }
      Object.assign(row, { cid: c.id, slot: `${d}-${p}`, teachers, l, roomV });
      row.teacherKey = teachers.join('+');
      teacherKeys.add(row.teacherKey);
      return row;
    });
    const selected = (row) => !teacherIds || row.teachers?.some((t) => teacherIds.includes(t));
    if (mode === 'replace') {
      const ids = new Set(parsed.filter((r) => r.cid && selected(r)).flatMap((r) => r.teachers));
      Object.keys(work.entries).forEach((cid) => Object.keys(work.entries[cid]).forEach((k) => { const e = work.entries[cid][k]; if (!e.locked && e.teachers.some((t) => ids.has(t))) delete work.entries[cid][k]; }));
    }
    const seen = new Set();
    parsed.forEach((row) => {
      if (row.status === 'error' || !selected(row)) { if (!selected(row) && row.status !== 'error') row.status = 'skip'; return; }
      const { cid, slot, l } = row;
      if (classActivityAt(work, cid, slot)) { row.status = 'error'; row.msgs.push(`ทับกิจกรรมล็อกเวลา "${classActivityAt(work, cid, slot).name}"`); return; }
      if (seen.has(`${cid}|${slot}`)) { row.status = 'error'; row.msgs.push('ช่องเวลาซ้ำกับแถวก่อนหน้าในไฟล์'); return; }
      if (work.entries[cid][slot]) { row.status = 'error'; row.msgs.push(`${className(cid)} มี ${work.entries[cid][slot].code} อยู่แล้วในเวลานี้`); return; }
      const sc = subjectCond(v, l.code);
      let rid = row.roomV ? db.external.rooms.find((x) => x.id === row.roomV || x.name === row.roomV || x.short === row.roomV)?.id : null;
      if (row.roomV && !rid) { row.status = 'error'; row.msgs.push(`ไม่พบห้อง "${row.roomV}"`); return; }
      if (!rid) rid = sc.roomType ? (db.external.rooms.find((x) => x.type === sc.roomType)?.id || cls(cid).homeroom) : cls(cid).homeroom;
      const entry = { code: l.code, teachers: row.teachers, room: rid, src: 'import' };
      const iss = checkPlacement(work, cid, slot, entry);
      if (iss.length) { row.status = iss.some((x) => x.sev === 'error') ? 'conflict' : 'warn'; row.msgs.push(...iss.map((x) => x.msg)); }
      work.entries[cid][slot] = entry;
      seen.add(`${cid}|${slot}`);
      row.entry = entry;
    });
    return { rows: parsed, work, teacherKeys: [...teacherKeys] };
  }

  /* ------------------------------------------------------------------ UI helpers (shared markup) */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    lock: '<path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6-9h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9V6Z"/>',
    warn: '<path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>',
    check: '<path d="m9 16.17-3.88-3.88-1.41 1.42L9 19 21 7l-1.41-1.41L9 16.17Z"/>',
    info: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>',
    x: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59Z"/>',
    close: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>',
    plus: '<path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2Z"/>',
    grip: '<path d="M9 4h2v2H9V4Zm4 0h2v2h-2V4ZM9 9h2v2H9V9Zm4 0h2v2h-2V9Zm-4 5h2v2H9v-2Zm4 0h2v2h-2v-2Zm-4 5h2v2H9v-2Zm4 0h2v2h-2v-2Z"/>',
    arrow: '<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8Z"/>',
    external: '<path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7ZM19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z"/>',
    copy: '<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/>',
    send: '<path d="M2 21 23 12 2 3v7l15 2-15 2v7Z"/>',
    clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7Z"/>',
    download: '<path d="M5 20h14v-2H5v2Zm7-18v10.17l-3.59-3.58L7 10l5 5 5-5-1.41-1.41L13 12.17V2h-2Z"/>',
    upload: '<path d="M12 3 7 8h3v5h4V8h3l-5-5Zm-7 9h2v7h10v-7h2v9H5v-9Z"/>',
    swap: '<path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3ZM21 9l-3.99-4v3H10v2h7.01v3L21 9Z"/>',
    room: '<path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z"/>',
    user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5Z"/>'
  };
  const icon = (name, cls = 'h-4 w-4') => `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[name]}</svg>`;

  function ensureUiRoot() {
    if (document.getElementById('ttToast')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="ttToast" class="pointer-events-none fixed bottom-5 right-5 z-[90] hidden max-w-sm rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl"><div class="flex items-start gap-3"><div id="ttToastIcon" class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"></div><div><p id="ttToastTitle" class="text-sm font-semibold text-slate-900"></p><p id="ttToastMsg" class="mt-0.5 text-xs text-slate-500"></p></div></div></div>
      <div id="ttConfirm" class="fixed inset-0 z-[85] hidden items-center justify-center p-4" style="background:rgba(15,23,42,.46);backdrop-filter:blur(5px)" role="dialog" aria-modal="true">
        <div class="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"><div class="px-6 py-6"><div class="flex gap-4"><span id="ttConfirmIcon" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"></span><div class="min-w-0 flex-1"><h2 id="ttConfirmTitle" class="text-lg font-semibold text-slate-950"></h2><div id="ttConfirmMsg" class="mt-1 text-sm leading-6 text-slate-500"></div><div id="ttConfirmInputWrap" class="mt-3 hidden"><input id="ttConfirmInput" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"></div></div></div></div>
        <div class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button id="ttConfirmCancel" type="button" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">ยกเลิก</button><button id="ttConfirmOk" type="button" class="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"></button></div></div>
      </div>`;
    document.body.appendChild(wrap);
  }
  let toastTimer;
  function toast(title, msg = '', tone = 'success') {
    ensureUiRoot();
    const tones = { success: ['bg-emerald-100 text-emerald-600', 'check'], error: ['bg-rose-100 text-rose-600', 'warn'], warn: ['bg-amber-100 text-amber-600', 'warn'], info: ['bg-blue-100 text-blue-600', 'info'] };
    const el = document.getElementById('ttToast');
    document.getElementById('ttToastTitle').textContent = title;
    document.getElementById('ttToastMsg').textContent = msg;
    const ic = document.getElementById('ttToastIcon');
    ic.className = `mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tones[tone][0]}`;
    ic.innerHTML = icon(tones[tone][1]);
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 4000);
  }
  // confirm({ title, message(html), okText, tone:'danger'|'primary'|'success', requireText }) → Promise<boolean>
  function confirm({ title, message = '', okText = 'ยืนยัน', tone = 'danger', requireText = '' }) {
    ensureUiRoot();
    return new Promise((resolve) => {
      const root = document.getElementById('ttConfirm');
      const ok = document.getElementById('ttConfirmOk');
      const input = document.getElementById('ttConfirmInput');
      const toneCls = { danger: ['bg-rose-600 hover:bg-rose-700', 'bg-rose-50 text-rose-600', 'warn'], primary: ['bg-blue-600 hover:bg-blue-700', 'bg-blue-50 text-blue-600', 'info'], success: ['bg-emerald-600 hover:bg-emerald-700', 'bg-emerald-50 text-emerald-600', 'check'] }[tone];
      document.getElementById('ttConfirmTitle').textContent = title;
      document.getElementById('ttConfirmMsg').innerHTML = message;
      const ic = document.getElementById('ttConfirmIcon');
      ic.className = `flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneCls[1]}`; ic.innerHTML = icon(toneCls[2], 'h-5 w-5');
      ok.className = `rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${toneCls[0]}`; ok.textContent = okText;
      document.getElementById('ttConfirmInputWrap').classList.toggle('hidden', !requireText);
      input.value = ''; input.placeholder = requireText ? `พิมพ์ "${requireText}" เพื่อยืนยัน` : '';
      ok.disabled = !!requireText;
      input.oninput = () => { ok.disabled = input.value.trim() !== requireText; };
      root.classList.remove('hidden'); root.classList.add('flex');
      const done = (val) => { root.classList.add('hidden'); root.classList.remove('flex'); resolve(val); };
      ok.onclick = () => done(true);
      document.getElementById('ttConfirmCancel').onclick = () => done(false);
    });
  }

  /*
   * entryCard: the standard period card.
   * opts: { code, title, line1, line2, issues, locked, draggable, dragAttrs, extraClass, hatch }
   */
  function entryCard({ code, title, line1 = '', line2 = '', issues = [], locked = false, draggable = false, dragAttrs = '', extraClass = '', hatch = false, name = null }) {
    const g = groupOf(code);
    const sev = worstSev(issues);
    const ring = sev === 'error' ? 'ring-2 ring-rose-400' : sev === 'warn' ? 'ring-2 ring-amber-300' : '';
    const badge = sev ? `<span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${sev === 'error' ? 'bg-rose-500' : 'bg-amber-400'} text-white" title="${esc(issues.map((i) => i.msg).join('\n'))}">${icon('warn', 'h-2.5 w-2.5')}</span>` : '';
    const lock = locked ? `<span class="text-slate-500" title="ล็อกคาบนี้">${icon('lock', 'h-3 w-3')}</span>` : '';
    return `<div class="tt-cell relative flex h-full min-h-[84px] flex-col rounded-xl border ${g.card} ${ring} px-2 py-1.5 text-left transition hover:shadow-md ${hatch ? 'tt-hatch' : ''} ${extraClass}" ${draggable ? `draggable="true" ${dragAttrs}` : ''}>
      <div class="flex items-center justify-between gap-1"><span class="truncate text-[11px] font-bold ${g.text}">${esc(title ?? code)}</span><span class="flex items-center gap-1">${lock}${badge}</span></div>
      <p class="mt-0.5 line-clamp-2 text-[11.5px] font-semibold leading-4 text-slate-800">${esc(name ?? subject(code)?.name ?? code)}</p>
      <p class="mt-auto truncate pt-1 text-[11px] text-slate-600">${esc(line1)}</p>
      ${line2 ? `<p class="truncate text-[11px] text-slate-400">${esc(line2)}</p>` : ''}
    </div>`;
  }
  const UI_CSS = `
    .tt-hatch { background-image: repeating-linear-gradient(135deg, rgba(148,163,184,.16) 0 6px, transparent 6px 12px); }
    .tt-vtext { writing-mode: vertical-rl; text-orientation: mixed; }
    .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .tt-scroll::-webkit-scrollbar { height: 8px; width: 8px; } .tt-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:999px; }
    .tt-table { border-collapse: separate; border-spacing: 0; }
    .tt-tl-row { position: relative; height: 96px; }
    .tt-tl-block { position: absolute; top: 4px; bottom: 4px; padding: 0 2px; }
    .tt-drop-ok { background: rgba(16,185,129,.14); box-shadow: inset 0 0 0 2px #34d399; }
    .tt-drop-warn { background: rgba(245,158,11,.14); box-shadow: inset 0 0 0 2px #fbbf24; }
    .tt-drop-bad { background: rgba(244,63,94,.12); box-shadow: inset 0 0 0 2px #fb7185; }
    .tt-drop-blocked { background: rgba(148,163,184,.12); box-shadow: inset 0 0 0 1px #cbd5e1; cursor: not-allowed; }
    .tt-drop-hover { box-shadow: inset 0 0 0 3px #2563eb !important; }
    .is-dragging { opacity: .35; }
  `;
  function injectCss() { if (document.getElementById('ttCoreCss')) return; const s = document.createElement('style'); s.id = 'ttCoreCss'; s.textContent = UI_CSS; document.head.appendChild(s); }

  /*
   * classGrid: timetable of one class by period numbers of its time structure (ตารางเรียนรายห้อง).
   * cellFn(slot, entry, activity) → inner HTML for the <td> (default: read-only entryCard). tdAttrs(slot, entry) → extra attrs.
   */
  function classGrid(v, cid, { cellFn = null, tdAttrs = () => '', id = 'classGrid' } = {}) {
    injectCss();
    const ts = tsOfClass(v, cid);
    const pts = periodTimes(ts);
    const brk = breakTimes(ts);
    const issues = computeIssues(v);
    const th = 'border-b border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-xs font-semibold text-slate-500';
    const breakAfter = (p) => brk.find((b) => b.after === p);
    const head = `<tr><th class="${th} sticky left-0 z-10 w-24 text-left">วัน / คาบ</th>${ts.homeroom ? `<th class="${th} w-9"><span class="block text-[10px] font-medium text-slate-400">${fmt(toMin(ts.start) - ts.homeroom.min)}</span></th>` : ''}${pts.map((p) => `<th class="${th} min-w-[104px]"><span class="block text-slate-700">คาบ ${p.no}</span><span class="block text-[10px] font-medium text-slate-400">${fmt(p.start)}–${fmt(p.end)}</span></th>${breakAfter(p.no) ? `<th class="${th} w-9"><span class="block text-[10px] font-medium text-slate-400">${fmt(breakAfter(p.no).start)}</span></th>` : ''}`).join('')}</tr>`;
    const def = (slot, e, act) => {
      if (act) return `<div class="tt-cell tt-hatch flex h-full min-h-[84px] flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-center"><span class="text-[11px] font-semibold text-slate-600">${esc(act.name)}</span><span class="text-[10px] text-slate-400">กิจกรรมล็อกเวลา</span></div>`;
      if (!e) return `<div class="tt-cell flex h-full min-h-[84px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-300">ว่าง</div>`;
      return entryCard({ code: e.code, line1: e.teachers.map(teacherName).join(', ') || 'ไม่ระบุครู', line2: roomShort(e.room), issues: issues.byCell.get(`${cid}|${slot}`) || [], locked: e.locked });
    };
    const fn = cellFn || def;
    const rows = ts.days.map((d, di) => `<tr><th class="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2 text-left"><span class="flex items-center gap-2 text-sm font-semibold text-slate-800"><span class="h-2.5 w-2.5 rounded-full ${DAYS[d].dot}"></span>${DAYS[d].name}</span></th>
      ${ts.homeroom && di === 0 ? `<td rowspan="${ts.days.length}" class="tt-hatch border-b border-slate-100 bg-slate-50 px-1 text-center"><span class="tt-vtext mx-auto text-xs font-semibold text-slate-400">${esc(ts.homeroom.name)}</span></td>` : ''}
      ${pts.map((p) => { const slot = `${d}-${p.no}`; const e = v.entries[cid]?.[slot]; const act = classActivityAt(v, cid, slot); const b = breakAfter(p.no); return `<td class="border-b border-slate-100 p-1 align-top" data-slot="${slot}" ${tdAttrs(slot, e, act)}>${fn(slot, e, act)}</td>${b && di === 0 ? `<td rowspan="${ts.days.length}" class="tt-hatch border-b border-slate-100 bg-slate-50 px-1 text-center"><span class="tt-vtext mx-auto text-xs font-semibold text-slate-400">${esc(b.name)}</span></td>` : ''}`; }).join('')}</tr>`).join('');
    return `<table id="${id}" class="tt-table w-full min-w-[960px] overflow-hidden rounded-2xl border border-slate-200 text-sm"><thead>${head}</thead><tbody>${rows}</tbody></table>
      <p class="mt-2 text-xs text-slate-400">${esc(ts.name)} · เริ่ม ${ts.start} · คาบละ ${ts.periodMin} นาที · ${ts.periods} คาบ/วัน · เลิก ${fmt(dayEnd(ts))}</p>`;
  }

  /*
   * timeline: clock-time view (ตารางสอนครู / ตารางการใช้ห้อง) — ADR-0002.
   * blocks: [{ day, start, end, html, attrs }]   bands: [{ day, start, end, label, cls }]   zones: [{ day, start, end, attrs, cls, label }]
   */
  function timeline({ days = [0, 1, 2, 3, 4], blocks = [], bands = [], zones = [], range = null, id = 'timeline', emptyClickAttr = '' }) {
    injectCss();
    const all = [...blocks, ...bands, ...zones];
    const lo = range ? range[0] : Math.min(480, ...all.map((b) => b.start));
    const hi = range ? range[1] : Math.max(990, ...all.map((b) => b.end));
    const span = hi - lo;
    const pct = (m) => ((m - lo) / span * 100).toFixed(3);
    const w = (a, b) => ((b - a) / span * 100).toFixed(3);
    const ticks = [];
    for (let m = Math.ceil(lo / 60) * 60; m <= hi; m += 60) ticks.push(m);
    const lanes = (list) => {
      const sorted = [...list].sort((a, b) => a.start - b.start);
      const ends = [];
      sorted.forEach((b) => { let lane = ends.findIndex((e) => e <= b.start); if (lane < 0) { lane = ends.length; ends.push(0); } ends[lane] = b.end; b._lane = lane; });
      return Math.max(1, ends.length);
    };
    const rows = days.map((d) => {
      const dayBlocks = blocks.filter((b) => b.day === d);
      const n = lanes(dayBlocks);
      const h = Math.max(96, n * 84 + 8);
      return `<div class="flex border-b border-slate-100">
        <div class="sticky left-0 z-10 flex w-24 shrink-0 items-center gap-2 bg-white px-3 text-sm font-semibold text-slate-800"><span class="h-2.5 w-2.5 rounded-full ${DAYS[d].dot}"></span>${DAYS[d].name}</div>
        <div class="tt-tl-row flex-1" style="height:${h}px" data-day="${d}" ${emptyClickAttr}>
          ${ticks.map((m) => `<div class="pointer-events-none absolute inset-y-0 border-l border-dashed border-slate-100" style="left:${pct(m)}%"></div>`).join('')}
          ${bands.filter((b) => b.day === d).map((b) => `<div class="pointer-events-none absolute inset-y-0 flex items-end justify-center overflow-hidden ${b.cls || 'tt-hatch bg-slate-50'}" style="left:${pct(b.start)}%;width:${w(b.start, b.end)}%"><span class="mb-1 truncate px-1 text-[10px] font-semibold">${esc(b.label || '')}</span></div>`).join('')}
          ${zones.filter((z) => z.day === d).map((z) => `<div class="absolute inset-y-1 rounded-xl ${z.cls || ''}" style="left:${pct(z.start)}%;width:${w(z.start, z.end)}%" ${z.attrs || ''}>${z.label ? `<span class="absolute bottom-1 left-1 right-1 truncate text-center text-[10px] font-semibold text-slate-500">${esc(z.label)}</span>` : ''}</div>`).join('')}
          ${dayBlocks.map((b) => `<div class="absolute px-0.5 ${b.cls || ''}" style="left:${pct(b.start)}%;width:${w(b.start, b.end)}%;top:${4 + b._lane * 84}px;height:80px" ${b.attrs || ''}>${b.html}</div>`).join('')}
        </div></div>`;
    }).join('');
    return `<div id="${id}" class="min-w-[1000px] overflow-hidden rounded-2xl border border-slate-200">
      <div class="flex border-b border-slate-200 bg-slate-50"><div class="sticky left-0 z-10 w-24 shrink-0 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">วัน / เวลา</div><div class="relative h-8 flex-1">${ticks.map((m) => `<span class="absolute top-2 -translate-x-1/2 text-[11px] font-semibold text-slate-500" style="left:${pct(m)}%">${fmt(m)}</span>`).join('')}</div></div>
      ${rows}</div>`;
  }
  // Blocks for one teacher's timetable from a version: [{day,start,end,cid,slot,entry}]
  function teacherBlocks(v, tid) {
    const out = [];
    Object.entries(v.entries).forEach(([cid, slots]) => Object.entries(slots).forEach(([slot, e]) => {
      if (!e.teachers.includes(tid)) return;
      const iv = slotInterval(v, cid, slot);
      if (iv) out.push({ day: iv.day, start: iv.start, end: iv.end, cid, slot, entry: e });
    }));
    return out;
  }
  function roomBlocks(v, rid) {
    const out = [];
    Object.entries(v.entries).forEach(([cid, slots]) => Object.entries(slots).forEach(([slot, e]) => {
      if (e.room !== rid) return;
      const iv = slotInterval(v, cid, slot);
      if (iv) out.push({ day: iv.day, start: iv.start, end: iv.end, cid, slot, entry: e });
    }));
    return out;
  }
  // Bands: approved/pending unavailability + activity busy for a teacher
  function teacherBands(v, tid, { includePending = true } = {}) {
    const bands = [];
    db.unavailability.filter((u) => u.term === v.term && u.teacherId === tid && (u.status === 'approved' || (includePending && u.status === 'pending')))
      .forEach((u) => bands.push({ day: u.day, start: toMin(u.start), end: toMin(u.end), label: `${u.status === 'pending' ? 'รออนุมัติ · ' : 'ไม่ว่าง · '}${u.reason}`, cls: u.status === 'pending' ? 'tt-hatch bg-amber-50/70 text-amber-700' : 'tt-hatch bg-rose-50/80 text-rose-600' }));
    activityTeacherBusy(v).filter((b) => b.tid === tid).forEach((b) => bands.push({ day: b.day, start: b.start, end: b.end, label: b.label, cls: 'tt-hatch bg-slate-100 text-slate-500' }));
    return bands;
  }
  function versionDays(v) { return [...new Set(v.timeStructures.flatMap((ts) => ts.days))].sort(); }
  function versionRange(v) { return [Math.min(...v.timeStructures.map((ts) => toMin(ts.start) - (ts.homeroom?.min || 0))), Math.max(...v.timeStructures.map(dayEnd))]; }

  /* ------------------------------------------------------------------ export helpers (Excel / PDF) */
  // sheets: [{ name, title, sub, header:[...], rows:[[...]] }]
  function exportXlsx(fileName, sheets, { watermark = '' } = {}) {
    if (!window.XLSX) { toast('ไม่พบไลบรารี Excel', 'โหลด SheetJS ไม่สำเร็จ', 'error'); return; }
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => {
      const aoa = [[db.school.name], [s.title + (watermark ? ` [${watermark}]` : '')], [s.sub || ''], [], s.header, ...s.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = s.header.map((_, i) => ({ wch: i === 0 ? 12 : 24 }));
      XLSX.utils.book_append_sheet(wb, ws, String(s.name).replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
    });
    XLSX.writeFile(wb, fileName);
  }
  function printSheets(sheets, { watermark = '' } = {}) {
    let area = document.getElementById('ttPrintArea');
    if (!area) {
      area = document.createElement('div'); area.id = 'ttPrintArea'; document.body.appendChild(area);
      const st = document.createElement('style');
      st.textContent = `#ttPrintArea{display:none}@media print{@page{size:A4 landscape;margin:10mm}body>*:not(#ttPrintArea){display:none!important}body{background:#fff!important}#ttPrintArea{display:block;color:#000;font-size:10px}.tt-pp{page-break-after:always;position:relative}.tt-pp:last-child{page-break-after:auto}.tt-pt{width:100%;border-collapse:collapse}.tt-pt th,.tt-pt td{border:1px solid #333;padding:3px;text-align:center;vertical-align:middle}.tt-pt th{background:#eee!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.tt-wm{position:absolute;top:40%;left:0;right:0;text-align:center;font-size:72px;color:rgba(0,0,0,.08);transform:rotate(-20deg)}}`;
      document.head.appendChild(st);
    }
    area.innerHTML = sheets.map((s) => `<section class="tt-pp">${watermark ? `<div class="tt-wm">${esc(watermark)}</div>` : ''}<div style="text-align:center;margin-bottom:6px"><div style="font-size:15px;font-weight:700">${esc(db.school.name)}</div><div style="font-size:13px;font-weight:600">${esc(s.title)}</div><div>${esc(s.sub || '')}</div></div>
      <table class="tt-pt"><thead><tr>${s.header.map((h) => `<th>${esc(h).replace(/\n/g, '<br>')}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th>${esc(c)}</th>` : `<td style="height:48px">${esc(c).replace(/\n/g, '<br>')}</td>`)).join('')}</tr>`).join('')}</tbody></table>
      <div style="display:flex;justify-content:space-around;margin-top:18px"><div style="text-align:center">ลงชื่อ ................................................<br>หัวหน้างานวิชาการ</div><div style="text-align:center">ลงชื่อ ................................................<br>ผู้อำนวยการโรงเรียน</div></div></section>`).join('');
    setTimeout(() => window.print(), 150);
  }
  // Sheet spec helpers: class timetable (by period) and teacher/room timetable (by class period rows)
  function classSheet(v, cid) {
    const ts = tsOfClass(v, cid);
    const pts = periodTimes(ts);
    const c = cls(cid);
    return {
      name: c.name, title: `ตารางเรียน ${c.name} · ${termLabel(v.term)}`, sub: `ครูประจำชั้น ${teacherName(c.advisor)} · ${roomShort(c.homeroom)} · ${v.name}`,
      header: ['วัน', ...pts.map((p) => `คาบ ${p.no}\n${fmt(p.start)}-${fmt(p.end)}`)],
      rows: ts.days.map((d) => [DAYS[d].name, ...pts.map((p) => { const slot = `${d}-${p.no}`; const e = v.entries[cid]?.[slot]; const act = classActivityAt(v, cid, slot); return act ? act.name : e ? `${e.code} ${subject(e.code)?.name}\n${teachersLabel(e.teachers)}\n${roomShort(e.room)}` : ''; })])
    };
  }
  function listSheet(v, blocks, { name, title, sub, line }) {
    const days = versionDays(v);
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    const maxN = Math.max(1, ...days.map((d) => sorted.filter((b) => b.day === d).length));
    return { name, title, sub, header: ['วัน', ...Array.from({ length: maxN }, (_, i) => `ลำดับ ${i + 1}`)], rows: days.map((d) => { const list = sorted.filter((b) => b.day === d); return [DAYS[d].name, ...Array.from({ length: maxN }, (_, i) => (list[i] ? `${fmt(list[i].start)}-${fmt(list[i].end)}\n${line(list[i])}` : ''))]; }) };
  }
  function teacherSheet(v, tid) {
    return listSheet(v, teacherBlocks(v, tid), { name: teacherName(tid), title: `ตารางสอน ${teacherName(tid)} · ${termLabel(v.term)}`, sub: `${GROUPS[teacher(tid).group]?.name || ''} · ${v.name}`, line: (b) => `${className(b.cid)} ${b.entry.code}\n${roomShort(b.entry.room)}` });
  }
  function roomSheet(v, rid) {
    return listSheet(v, roomBlocks(v, rid), { name: roomShort(rid), title: `ตารางการใช้ห้อง ${room(rid).name} · ${termLabel(v.term)}`, sub: `${ROOM_TYPES[room(rid).type]} · ${v.name}`, line: (b) => `${className(b.cid)} ${b.entry.code}\n${teachersLabel(b.entry.teachers)}` });
  }

  window.TT = {
    // constants
    DAYS, GROUPS, ROOM_TYPES, UNAVAIL_REASONS, REQUEST_TYPES, REQUEST_STATUS, VERSION_STATUS, PERSONAS, ISSUE_LABEL, IMPORT_HEADERS, DEFAULTS,
    // store
    load, save, reset, onChange, role, setRole, me, newId, nowIso, clone, get db() { return db; },
    // lookups
    teacher, cls, room, subject, version, versionsOf, publishedOf, termInfo, termLabel, termNo, className, teacherName, teacherShort, teachersLabel, roomShort,
    groupOf, planOfClass, classesOfLevel, stageOfLevel, tsOfClass, curriculumLink,
    // time
    toMin, fmt, parseSlot, periodTimes, breakTimes, dayEnd, slotInterval, slotLabel, slotTimeLabel, overlaps, classSlots, versionDays, versionRange,
    // load & progress
    assignmentsOf, subjectsOfClass, loadOfClass, loadOfTeacher, countCode, classProgress, teacherProgress, versionProgress,
    // conditions & activities
    teacherCond, subjectCond, roomCond, approvedUnavailability, activityClasses, classActivityAt, activityTeacherBusy,
    // engine
    buildIndex, evaluate, checkPlacement, computeIssues, worstSev, autoSchedule, readiness,
    // versions & requests
    logHistory, notify, mapCode, copyVersion, createBlankVersion, publish, divergence, mergeDivergence,
    applyChange, previewRequest, suggestMoves, submitRequest, decideRequest,
    // unavailability & dates
    unavailabilityOpen, daysLeft, formatDate, formatDateTime,
    // import
    parseDay, validateImport,
    // ui
    esc, icon, ICON, toast, confirm, entryCard, classGrid, timeline, teacherBlocks, roomBlocks, teacherBands, injectCss,
    // export
    exportXlsx, printSheets, classSheet, teacherSheet, roomSheet
  };
}());
