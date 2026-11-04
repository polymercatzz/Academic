/* การเช็คชื่อรายคาบ — ข้อมูลและการคำนวณที่ใช้ร่วมกันระหว่าง index.html กับ attendance.html
 * เวลาเรียน (%) คำนวณจากการเช็คชื่อรายคาบเท่านั้น และใช้ตัดสิน มส (ADR 0011)
 *
 * db.att = {
 *   start:     วันจันทร์ของสัปดาห์แรกในภาคเรียน 'YYYY-MM-DD'
 *   timetable: [{ sec, day (1=จันทร์..5=ศุกร์), period }]       ตารางสอนรายสัปดาห์ของภาคเรียนปัจจุบัน
 *   records:   { 'secId|date|period': { t, ex: { sid: mark } } } คาบที่เช็คแล้ว (เก็บเฉพาะคนที่ไม่ใช่ “มา”)
 *   holidays:  [{ date, name, by, at }]                       วันหยุดของโรงเรียน ฝ่ายวิชาการกำหนด (UC-25)
 * }
 */

const PERIODS = [
  { no: 1, start: '08:30', end: '09:20' },
  { no: 2, start: '09:20', end: '10:10' },
  { no: 3, start: '10:10', end: '11:00' },
  { no: 4, start: '11:00', end: '11:50' },
  { no: 5, start: '12:50', end: '13:40' },
  { no: 6, start: '13:40', end: '14:30' },
  { no: 7, start: '14:30', end: '15:20' },
  { no: 8, start: '15:20', end: '16:10' },
];
const LUNCH_AFTER = 4;
const TERM_WEEKS = 20;

/* ครูประจำชั้น: ห้อง -> ผู้ใช้ */
const HOMEROOM = {
  'ม.1/1': 'u4', 'ม.1/2': 'u5', 'ม.1/3': 'u8',
  'ม.2/1': 'u1', 'ม.2/2': 'u3', 'ม.2/3': 'u10',
  'ม.3/1': 'u6', 'ม.3/2': 'u9', 'ม.3/3': 'u12',
};

/* สถานะการเข้าเรียน: มา และ สาย นับเป็นเวลาเรียน */
const ATT = {
  present: { label: 'มา', counts: true },
  late:    { label: 'สาย', counts: true },
  leave:   { label: 'ลา', counts: false },
  absent:  { label: 'ขาด', counts: false },
};
const ATT_KEYS = ['present', 'late', 'leave', 'absent'];

/* ---------- วันที่ (ใช้เวลาท้องถิ่น) ---------- */
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); }
function todayISO() { return isoDate(new Date()); }
function weekdayOf(s) { return parseISO(s).getDay(); }
const isSchoolDay = (s) => weekdayOf(s) >= 1 && weekdayOf(s) <= 5;
function shiftSchoolDay(s, dir) {
  let d = addDays(s, dir);
  while (!isSchoolDay(d)) d = addDays(d, dir);
  return d;
}
const termEnd = (db) => addDays(db.att.start, TERM_WEEKS * 7 - 3); // ศุกร์ของสัปดาห์สุดท้าย
const inTerm = (db, date) => date >= db.att.start && date <= termEnd(db);
const periodOf = (no) => PERIODS.find((p) => p.no === no);
/* วันหยุดของโรงเรียนในวันนั้น (ไม่รวมเสาร์–อาทิตย์) — คาบในวันหยุดไม่ต้องเช็คและไม่นับเวลาเรียน */
const holidayOn = (db, date) => (db.att.holidays || []).find((h) => h.date === date) || null;

/* ---------- กฎ ---------- */
const sessionKey = (secId, date, period) => `${secId}|${date}|${period}`;
const secLocked = (sec) => sec.state === 'pending' || sec.state === 'approved';
const currentTermKey = () => (TERMS.find((t) => t.current) || TERMS[0]).key;
const homeroomsOf = (uid) => Object.keys(HOMEROOM).filter((r) => HOMEROOM[r] === uid);
/* จำนวนคาบที่ขาดหรือลาได้ทั้งภาค ก่อนจะได้ มส คิดจากชั่วโมงตามหลักสูตร */
const allowedMiss = (sec) => Math.floor((sec.hours * (100 - MIN_ATTENDANCE)) / 100);

/* ---------- แคช: ล้างทุกครั้งที่ข้อมูลการเช็คชื่อเปลี่ยน ---------- */
let attStamp = 0;
const attCache = new Map();
function attTouch() { attStamp++; attCache.clear(); }
function attCached(key, fn) {
  const k = `${key}|${todayISO()}`;
  const hit = attCache.get(k);
  if (hit && hit.v === attStamp) return hit.val;
  const val = fn();
  attCache.set(k, { v: attStamp, val });
  return val;
}

/* สถานะของนักเรียนในคาบที่เช็คแล้ว (บันทึกเฉพาะคนที่ไม่ใช่ “มา”) */
const markOf = (rec, sid) => rec.ex[sid] || 'present';

function slotsOf(db, secId) {
  return attCached(`slots|${secId}`, () => db.att.timetable.filter((t) => t.sec === secId));
}

/* คาบตามตารางสอนของห้องเรียนที่สอน ตั้งแต่ต้นภาคถึงวันที่ until (รวม) เรียงจากเก่าไปใหม่ */
function plannedSessions(db, sec, until) {
  const slots = slotsOf(db, sec.id);
  const end = until && until < termEnd(db) ? until : termEnd(db);
  const out = [];
  for (let w = 0; w < TERM_WEEKS; w++) {
    slots.forEach((t) => {
      const date = addDays(db.att.start, w * 7 + t.day - 1);
      if (date <= end && !holidayOn(db, date)) out.push({ sec, date, period: t.period, key: sessionKey(sec.id, date, t.period) });
    });
  }
  return out.sort((a, b) => (a.date === b.date ? a.period - b.period : a.date < b.date ? -1 : 1));
}

/* สรุปการเข้าเรียนของห้องเรียนที่สอน นับเฉพาะคาบที่เช็คแล้ว */
function sectionAttendance(db, sec) {
  return attCached(`sec|${sec.id}`, () => {
    const today = todayISO();
    const by = {};
    sec.students.forEach((s) => { by[s.id] = { present: 0, late: 0, leave: 0, absent: 0 }; });
    const sessions = plannedSessions(db, sec, today);
    let checked = 0;
    const unchecked = [];
    sessions.forEach((x) => {
      const rec = db.att.records[x.key];
      if (!rec) { if (x.date < today) unchecked.push(x); return; }
      checked++;
      sec.students.forEach((s) => { by[s.id][markOf(rec, s.id)]++; });
    });
    return { hasTimetable: slotsOf(db, sec.id).length > 0, sessions, checked, unchecked, by };
  });
}

/* เวลาเรียน (%) = (มา + สาย) ÷ คาบที่เช็คแล้ว
 * ภาคเรียนที่ไม่มีตารางสอนในระบบ (เช่น ภาคเรียนที่แล้ว) ใช้ค่าที่นำเข้าไว้ */
function attendancePercent(db, sec, sid) {
  const a = sectionAttendance(db, sec);
  if (!a.hasTimetable) return sec.attendance?.[sid] ?? 100;
  const c = a.by[sid];
  if (!a.checked || !c) return 100;
  return Math.round(((c.present + c.late) / a.checked) * 1000) / 10;
}

/* สถานะของนักเรียนหนึ่งคนในห้องเรียนที่สอน: ok | risk (ขาดได้อีก ≤ 2) | ms */
function studentAttendance(db, sec, sid) {
  const a = sectionAttendance(db, sec);
  const c = a.by[sid] || { present: 0, late: 0, leave: 0, absent: 0 };
  const pct = attendancePercent(db, sec, sid);
  const left = allowedMiss(sec) - (c.leave + c.absent);
  const level = pct < MIN_ATTENDANCE || left < 0 ? 'ms' : left <= 2 ? 'risk' : 'ok';
  return { ...c, pct, left, level };
}

/* ---------- ข้อมูลจำลอง ---------- */
function ensureAttendance(db) {
  if (db.att) {
    if (db.att.holidays) return false;
    db.att.holidays = []; // บันทึกไว้ก่อนมีวันหยุด: ไม่เติมวันหยุดตัวอย่าง เพราะจะเปลี่ยนเวลาเรียนที่ตรวจไปแล้ว
    return true;
  }
  seedAttendance(db);
  return true;
}

/* วันหยุดนักขัตฤกษ์ (เดือน-วัน) ที่ใช้สร้างวันหยุดตัวอย่าง */
const PUBLIC_HOLIDAYS = [
  ['01-01', 'วันขึ้นปีใหม่'], ['04-06', 'วันจักรี'], ['04-13', 'วันสงกรานต์'], ['04-14', 'วันสงกรานต์'], ['04-15', 'วันสงกรานต์'],
  ['05-01', 'วันแรงงานแห่งชาติ'], ['05-04', 'วันฉัตรมงคล'], ['06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'],
  ['07-28', 'วันเฉลิมพระชนมพรรษา ร.10'], ['08-12', 'วันแม่แห่งชาติ'], ['10-13', 'วันนวมินทรมหาราช'],
  ['10-23', 'วันปิยมหาราช'], ['12-05', 'วันพ่อแห่งชาติ'], ['12-10', 'วันรัฐธรรมนูญ'], ['12-31', 'วันสิ้นปี'],
];
function seedHolidays(db) {
  const out = [];
  for (let d = db.att.start; d <= termEnd(db); d = addDays(d, 1)) {
    const hit = PUBLIC_HOLIDAYS.find(([md]) => d.slice(5) === md);
    if (hit && isSchoolDay(d)) out.push({ date: d, name: hit[1], by: null, at: null });
  }
  // กิจกรรมของโรงเรียน: กีฬาสีในสัปดาห์ที่ 18 (หลังวันนี้ ครูยังไม่ได้เช็คชื่อ)
  const sport = addDays(db.att.start, 17 * 7 + 3);
  if (!out.some((h) => h.date === sport)) out.push({ date: sport, name: 'กีฬาสีภายในโรงเรียน', by: 'u2', at: parseISO(db.att.start).getTime() - 7 * 86400000 });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function seedAttendance(db) {
  attTouch();
  const rand = mulberry32(1311);
  const term = currentTermKey();
  const secs = db.sections.filter((s) => s.term === term);

  // ให้วันนี้อยู่ในสัปดาห์ที่ 16 ของภาคเรียน เปิด Demo วันไหนก็มีคาบให้เช็ค
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 15 * 7);
  db.att = { start: isoDate(monday), timetable: [], records: {}, holidays: [] };
  const att = db.att;
  att.holidays = seedHolidays(db);

  /* ตารางสอน: ชั่วโมงตามหลักสูตร ÷ 20 สัปดาห์ = คาบต่อสัปดาห์ ห้องและครูต้องไม่ชนกัน */
  const busy = new Set();
  const free = (sec, d, p) => !busy.has(`r|${sec.room}|${d}|${p}`) && !busy.has(`t|${sec.teacherId}|${d}|${p}`);
  const take = (sec, d, p) => {
    busy.add(`r|${sec.room}|${d}|${p}`); busy.add(`t|${sec.teacherId}|${d}|${p}`);
    att.timetable.push({ sec: sec.id, day: d, period: p });
  };
  const shuffled = (arr) => arr.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  [...secs].sort((a, b) => b.hours - a.hours).forEach((sec, i) => {
    const need = Math.max(1, Math.round(sec.hours / TERM_WEEKS));
    const days = [1, 2, 3, 4, 5].map((_, k) => ((i + k * 2) % 5) + 1);
    let placed = 0;
    for (const d of days) {
      if (placed >= need) break;
      const p = shuffled([1, 2, 3, 4, 5, 6, 7, 8]).find((x) => free(sec, d, x));
      if (p) { take(sec, d, p); placed++; }
    }
    for (const d of days) for (const p of [1, 2, 3, 4, 5, 6, 7, 8]) {
      if (placed < need && free(sec, d, p)) { take(sec, d, p); placed++; }
    }
  });

  /* คาบที่ผ่านมาแล้ว: เช็คชื่อตามเวลาเรียนเป้าหมายของนักเรียนแต่ละคน */
  const today = todayISO();
  const at = (date, period) => {
    const [h, m] = periodOf(period).end.split(':').map(Number);
    return parseISO(date).getTime() + (h * 60 + m + 5) * 60000;
  };
  secs.forEach((sec) => {
    plannedSessions(db, sec, addDays(today, -1)).forEach((x) => {
      if (!secLocked(sec) && sec.teacherId !== CURRENT_USER_ID && rand() < 0.02) return; // ลืมเช็ค
      const ex = {};
      sec.students.forEach((s) => {
        // นักเรียนที่ตั้งใจให้ได้ มส ขาดตามเป้าหมาย คนอื่นขาดประปราย
        const target = sec.attendance?.[s.id] ?? 96;
        const pMiss = target < MIN_ATTENDANCE ? (100 - target) / 100 : 0.004 + (100 - target) / 500;
        const r = rand();
        if (r < pMiss) ex[s.id] = rand() < 0.3 ? 'leave' : 'absent';
        else if (r < pMiss + 0.025) ex[s.id] = 'late';
      });
      att.records[x.key] = { t: at(x.date, x.period), ex };
    });
  });

  /* ครูสมศรี: ลืมเช็ค 3 คาบล่าสุด (ค22101 ม.2/2 สองคาบ, ว22103 ม.2/1 หนึ่งคาบ) */
  [['m22', 2], ['t21', 1]].forEach(([id, n]) => {
    const sec = db.sections.find((s) => s.id === id);
    plannedSessions(db, sec, addDays(today, -1)).slice(-n).forEach((x) => { delete att.records[x.key]; });
  });

  /* ห้อง ม.2/1 (ครูสมศรีเป็นครูประจำชั้น): ตัวอย่างนักเรียนขาดทั้งวัน */
  const room = 'ม.2/1';
  const roster = secs.find((s) => s.room === room).students;
  const roomSecs = secs.filter((s) => s.room === room);
  const absentAllDay = (sid, date) => roomSecs.forEach((sec) => {
    slotsOf(db, sec.id).filter((t) => t.day === weekdayOf(date)).forEach((t) => {
      const rec = att.records[sessionKey(sec.id, date, t.period)];
      if (rec) rec.ex[sid] = 'absent';
    });
  });
  // ขาดทั้งวันในวันเรียนล่าสุด → ครูประจำชั้นเห็นในแท็บรายวันและสรุปทั้งภาค
  absentAllDay(roster[3].id, shiftSchoolDay(today, -1));
  absentAllDay(roster[10].id, shiftSchoolDay(addDays(today, -13), -1));

  attTouch();
}
