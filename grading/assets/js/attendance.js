'use strict';

/* หน้าเช็คชื่อรายคาบ (attendance.html)
 * ครูผู้สอนเห็นเฉพาะคาบของห้องเรียนที่ตนสอน · ครูประจำชั้นเห็นทุกคาบของห้องตน (ดูอย่างเดียว)
 * ใช้ข้อมูลชุดเดียวกับระบบบันทึกคะแนน (localStorage) — กฎทั้งหมดอยู่ใน ADR 0011
 * Demo นี้จำลองช่วงกลางภาคเรียน จึงไม่แสดงการล็อกการเช็คชื่อเมื่อส่งผลการเรียน */

const STORE_KEY = 'gradebook-demo-v2';
const ME = CURRENT_USER_ID;
let db = loadDb();

const ui = {
  date: todayISO(),
  draft: null,          // { key, marks: { sid: mark } } การเช็คชื่อที่ยังไม่บันทึก
  secFilter: 'all',
};

function loadDb() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.version === 2) {
        if (ensureAttendance(d)) localStorage.setItem(STORE_KEY, JSON.stringify(d));
        return d;
      }
    }
  } catch (e) { /* ใช้ seed แทน */ }
  const d = buildSeed();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  return d;
}
function persist() {
  attTouch();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { toast('บันทึกลงเบราว์เซอร์ไม่สำเร็จ', 'bad'); }
}

/* =========================================================
 *  Helpers
 * ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
let view = $('#view');
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const icon = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
const fullName = (s) => `${s.prefix}${s.first} ${s.last}`;
const sectionById = (id) => db.sections.find((s) => s.id === id);
const myName = () => userById(ME).name;
const term = currentTermKey();
const mySections = () => db.sections.filter((s) => s.term === term && s.teacherId === ME);
const myRooms = () => homeroomsOf(ME);
const roomSections = (room) => db.sections.filter((s) => s.term === term && s.room === room);

/* วันที่แสดงเป็น วัน/เดือน/ปี พ.ศ. ทุกจุด เช่น 14/10/2569 */
const pad2 = (n) => String(n).padStart(2, '0');
function dmy(date) { const d = parseISO(date); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear() + 543}`; }
const weekdayName = (date, style = 'long') => parseISO(date).toLocaleDateString('th-TH', { weekday: style });
const thDay = (date) => `${weekdayName(date)} ${dmy(date)}`;
const thShort = (date) => `${weekdayName(date, 'short')} ${dmy(date)}`;
function thTime(t) { const d = new Date(t); return `${dmy(isoDate(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
const periodLabel = (no) => `คาบ ${no} · ${periodOf(no).start}–${periodOf(no).end}`;
function nowPeriod() {
  const d = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return PERIODS.find((p) => hm >= p.start && hm < p.end)?.no || null;
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'ok' ? 'check' : type === 'bad' ? 'alert' : 'info')}<span>${msg}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}
function openModal({ title, body, actions = [], onMount }) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="ปิด">${icon('x')}</button></div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-act="${i}">${a.icon ? icon(a.icon) : ''}${a.label}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.querySelector('.modal-backdrop').addEventListener('mousedown', (e) => { if (e.target.classList.contains('modal-backdrop')) close(); });
  root.querySelector('[data-close]').addEventListener('click', close);
  $$('[data-act]', root).forEach((b) => b.addEventListener('click', () => {
    const a = actions[+b.dataset.act];
    if (!a.onClick || a.onClick(close) !== false) close();
  }));
  if (onMount) onMount(root.querySelector('.modal'), close);
}
function confirmModal({ title, message, okLabel = 'ยืนยัน', okCls = 'btn-primary', onOk }) {
  openModal({ title, body: `<p class="muted" style="margin:0">${message}</p>`, actions: [
    { label: 'ยกเลิก', cls: 'btn-ghost' },
    { label: okLabel, cls: okCls, onClick: onOk },
  ] });
}

const markChip = (m) => `<span class="att-chip att-${m}">${ATT[m].label}</span>`;
function levelChip(a) {
  if (a.level === 'ms') return `<span class="chip chip-ms">มส</span>`;
  if (a.level === 'risk') return `<span class="chip chip-warn">ขาดได้อีก ${a.left}</span>`;
  return `<span class="faint">ขาดได้อีก ${a.left}</span>`;
}
function countsOf(db, sec, x, rec) {
  const c = { present: 0, late: 0, leave: 0, absent: 0 };
  sec.students.forEach((s) => { c[markOf(rec, s.id)]++; });
  return c;
}
const countsText = (c) => ['absent', 'leave', 'late'].filter((k) => c[k]).map((k) => `${ATT[k].label} ${c[k]}`).join(' · ') || 'มาครบ';

/* =========================================================
 *  ปฏิทินรายเดือน (จันทร์–ศุกร์) พร้อมจุดสีสถานะคาบ
 *  ใช้เป็นตัวเลือกวัน และใช้หาคาบในหน้าสรุปรายห้อง
 *  dots(date) -> ['ok' | 'absent' | 'todo' | 'future', ...]
 * ========================================================= */
const CAL_LEGEND = '<div class="cal-legend"><span><i class="d-ok"></i>เช็คแล้ว</span><span><i class="d-todo"></i>ยังไม่เช็ค</span><span><i class="d-absent"></i>มีคนขาด</span></div>';
const monthOf = (date) => date.slice(0, 7);
function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  return isoDate(new Date(y, m - 1 + n, 1)).slice(0, 7);
}
function calendarHTML(month, selected, dots, legend = CAL_LEGEND) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const today = todayISO();
  let monday = isoDate(new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7)));
  const cells = [];
  while (monthOf(monday) <= month) {
    for (let i = 0; i < 5; i++) {
      const date = addDays(monday, i);
      if (monthOf(date) !== month) { cells.push('<span class="cal-day blank"></span>'); continue; }
      const ok = inTerm(db, date);
      cells.push(`<button type="button" class="cal-day ${date === selected ? 'sel' : ''} ${date === today ? 'today' : ''}" data-cal-date="${date}" ${ok ? '' : 'disabled'}>
        <span class="cal-n">${parseISO(date).getDate()}</span><span class="cal-dots">${ok ? dots(date).map((c) => `<i class="d-${c}"></i>`).join('') : ''}</span></button>`);
    }
    monday = addDays(monday, 7);
  }
  const canPrev = month > monthOf(db.att.start), canNext = month < monthOf(termEnd(db));
  return `
    <div class="cal">
      <div class="cal-head">
        <button type="button" class="icon-btn" data-cal-month="${shiftMonth(month, -1)}" ${canPrev ? '' : 'disabled'} aria-label="เดือนก่อนหน้า">${icon('back')}</button>
        <b>${first.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</b>
        <button type="button" class="icon-btn" data-cal-month="${shiftMonth(month, 1)}" ${canNext ? '' : 'disabled'} aria-label="เดือนถัดไป">${icon('chev')}</button>
      </div>
      <div class="cal-grid">${['จ', 'อ', 'พ', 'พฤ', 'ศ'].map((d) => `<span class="cal-wd">${d}</span>`).join('')}${cells.join('')}</div>
      ${legend}
    </div>`;
}
/* วางปฏิทินในกล่อง el: เลื่อนเดือนได้เอง กดวันแล้วเรียก onPick(date) */
function mountCalendar(el, selected, dots, onPick, legend) {
  let month = monthOf(selected);
  const draw = () => { el.innerHTML = calendarHTML(month, selected, dots, legend); };
  el.addEventListener('click', (e) => {
    const mb = e.target.closest('[data-cal-month]');
    if (mb) { month = mb.dataset.calMonth; draw(); return; }
    const day = e.target.closest('[data-cal-date]');
    if (day) { selected = day.dataset.calDate; draw(); onPick(selected); }
  });
  draw();
}

/* สีจุดของหนึ่งคาบ */
function sessionDot(sec, x) {
  const rec = db.att.records[x.key];
  if (!rec) return x.date > todayISO() ? 'future' : 'todo';
  return countsOf(db, sec, x, rec).absent ? 'absent' : 'ok';
}
function dotsBySessions(list) {
  const map = new Map();
  list.forEach(({ sec, x }) => {
    if (!map.has(x.date)) map.set(x.date, []);
    map.get(x.date).push(sessionDot(sec, x));
  });
  return (date) => map.get(date) || [];
}
const sessionsOf = (secs) => secs.flatMap((sec) => plannedSessions(db, sec).map((x) => ({ sec, x })));
/* ครูผู้สอน: หนึ่งจุดต่อหนึ่งคาบที่ตนสอน */
const myDots = () => dotsBySessions(sessionsOf(mySections()));
/* ห้องประจำชั้น: หนึ่งจุดต่อวัน แดง = มีคนขาด, ส้ม = มีคาบที่ยังไม่เช็ค */
function roomDots(room) {
  const per = dotsBySessions(sessionsOf(roomSections(room)));
  return (date) => {
    const d = per(date);
    if (!d.length) return [];
    return [d.includes('absent') ? 'absent' : d.includes('todo') ? 'todo' : d.every((x) => x === 'future') ? 'future' : 'ok'];
  };
}

/* แถบเลือกวัน (หน้าคาบวันนี้และห้องประจำชั้น) กดวันที่แล้วเปิดปฏิทิน */
function dayNav(date) {
  const today = todayISO();
  return `
    <div class="day-nav">
      <button class="icon-btn" data-day="${shiftSchoolDay(date, -1)}" aria-label="วันก่อนหน้า">${icon('back')}</button>
      <button class="btn date-btn" id="dayBtn">${icon('calendar')}${dmy(date)}</button>
      <button class="icon-btn" data-day="${shiftSchoolDay(date, 1)}" aria-label="วันถัดไป">${icon('chev')}</button>
      ${date !== today ? `<button class="btn btn-sm" data-day="${today}">วันนี้</button>` : ''}
    </div>`;
}
/* ปฏิทินแบบลอยใต้ปุ่ม anchor */
function openCalendarPop(anchor, date, dots, onPick) {
  closeCalendarPop();
  const pop = document.createElement('div');
  pop.className = 'cal-pop';
  document.body.appendChild(pop);
  mountCalendar(pop, date, dots, (d) => { closeCalendarPop(); onPick(d); });
  // วางใต้ปุ่ม ถ้าที่ด้านล่างไม่พอให้เปิดขึ้นด้านบน
  const r = anchor.getBoundingClientRect();
  const h = pop.offsetHeight;
  const below = r.bottom + 6 + h <= window.innerHeight - 8;
  pop.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 308))}px`;
}
function closeCalendarPop() { $('.cal-pop')?.remove(); }
document.addEventListener('mousedown', (e) => { if (!e.target.closest('.cal-pop, #dayBtn')) closeCalendarPop(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCalendarPop(); });

function bindDayNav(base, date, dots) {
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (b) { go(`${base}/${b.dataset.day}`); return; }
    const btn = e.target.closest('#dayBtn');
    if (btn) {
      if ($('.cal-pop')) closeCalendarPop();
      else openCalendarPop(btn, date, dots(), (d) => go(`${base}/${d}`));
    }
  });
}

/* =========================================================
 *  Router
 * ========================================================= */
let currentHash = location.hash || '#/';
let skipHash = false;

function parseRoute(hash) {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (p[0] === 'd' && p[1]) return { page: 'today', date: p[1] };
  if (p[0] === 'c') return { page: 'check', id: p[1], date: p[2], period: Number(p[3]) };
  if (p[0] === 'sections') return { page: 'sections', focus: p[1] || null };
  if (p[0] === 's') return { page: 'section', id: p[1], filter: p[2] || 'all' };
  if (p[0] === 'h') return p[1] === 'sum' ? { page: 'hsum', focus: p[2] || null } : { page: 'hday', date: p[1] };
  return { page: 'today' };
}
const isDirty = () => !!ui.draft && Object.keys(ui.draft.marks).length > 0;

window.addEventListener('hashchange', () => {
  if (skipHash) { skipHash = false; return; }
  const next = location.hash || '#/';
  if (isDirty()) {
    skipHash = true;
    location.hash = currentHash;
    openModal({
      title: 'ยังไม่ได้บันทึกการเช็คชื่อ',
      body: '<p class="muted" style="margin:0">คาบนี้มีการเปลี่ยนสถานะที่ยังไม่บันทึก ต้องการทำอย่างไร?</p>',
      actions: [
        { label: 'อยู่หน้านี้ต่อ', cls: 'btn-ghost' },
        { label: 'ทิ้งการเปลี่ยนแปลง', cls: 'btn-danger', onClick: () => { ui.draft = null; go(next); } },
        { label: 'บันทึกแล้วไปต่อ', cls: 'btn-primary', icon: 'save', onClick: () => { saveCheck(); go(next); } },
      ],
    });
    return;
  }
  currentHash = next;
  route();
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
// ระบบบันทึกคะแนนเปิดอยู่อีกแท็บและบันทึกข้อมูล → โหลดใหม่ เพื่อไม่ให้เขียนทับกัน
window.addEventListener('storage', (e) => {
  if (e.key !== STORE_KEY || isDirty()) return;
  db = loadDb(); attTouch(); route();
});

function go(hash) {
  if (location.hash === hash) { route(); return; }
  location.hash = hash;
}

function route() {
  const r = parseRoute(location.hash || '#/');
  const navKey = { check: 'today', section: 'sections', hsum: 'hday' }[r.page] || r.page;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('show');
  if (r.page !== 'check') ui.draft = null;
  closeCalendarPop();
  closeStudent();
  window.scrollTo(0, 0); // ก่อน render เพื่อให้หน้าที่ไฮไลต์เลื่อนไปยังจุดที่ต้องการได้
  const fresh = view.cloneNode(false); // ล้าง event listener ของหน้าก่อน
  view.replaceWith(fresh);
  view = fresh;
  if (r.page === 'check') renderCheck(r.id, r.date, r.period);
  else if (r.page === 'sections') renderSections(r.focus);
  else if (r.page === 'section') { ui.secFilter = r.filter; renderSection(r.id); }
  else if (r.page === 'hday' || r.page === 'hsum') renderHomeroom(r);
  else renderToday(r.date);
  const n = backlogOf().length;
  $('#backlogBadge').textContent = n ? String(n) : '';
}

/* =========================================================
 *  Page: คาบวันนี้ (ครูผู้สอน)
 * ========================================================= */
function backlogOf() {
  return mySections().flatMap((s) => sectionAttendance(db, s).unchecked)
    .sort((a, b) => (a.date === b.date ? b.period - a.period : a.date < b.date ? 1 : -1));
}

function renderToday(date) {
  if (date) ui.date = date;
  date = ui.date;
  const today = todayISO();
  $('#topbarTitle').textContent = 'คาบวันนี้';
  const mine = new Map(mySections().map((s) => [s.id, s]));
  const holiday = holidayOn(db, date);
  const slots = inTerm(db, date) && !holiday ? db.att.timetable.filter((t) => t.day === weekdayOf(date) && mine.has(t.sec)).sort((a, b) => a.period - b.period) : [];
  const backlog = backlogOf();
  const doneN = slots.filter((t) => db.att.records[sessionKey(t.sec, date, t.period)]).length;
  let risk = 0, ms = 0;
  mine.forEach((sec) => sec.students.forEach((s) => {
    const a = studentAttendance(db, sec, s.id);
    if (a.level === 'risk') risk++; else if (a.level === 'ms') ms++;
  }));
  const np = date === today ? nowPeriod() : null;

  const row = (t) => {
    const sec = mine.get(t.sec);
    const rec = db.att.records[sessionKey(sec.id, date, t.period)];
    const future = date > today;
    let status, btn;
    if (rec) status = `<span class="chip chip-ok">${icon('check')}เช็คแล้ว</span><span class="muted">${countsText(countsOf(db, sec, { date }, rec))}</span>`;
    else if (future) status = '<span class="faint">ยังไม่ถึงวันสอน</span>';
    else status = `<span class="chip chip-warn">${icon('clock')}ยังไม่เช็ค</span>`;
    if (future) btn = `<a class="btn btn-sm btn-ghost" href="#/c/${sec.id}/${date}/${t.period}">${icon('eye')}ดู</a>`;
    else if (rec) btn = `<a class="btn btn-sm" href="#/c/${sec.id}/${date}/${t.period}">แก้ไข</a>`;
    else btn = `<a class="btn btn-sm btn-primary" href="#/c/${sec.id}/${date}/${t.period}">${icon('check')}เช็คชื่อ</a>`;
    return `
      <div class="period-row ${np === t.period ? 'now' : ''}">
        <div class="period-no"><b>${t.period}</b><span>${periodOf(t.period).start}</span></div>
        <div class="period-main">
          <div class="period-title">${sec.code} ${esc(sec.name)} <span class="sec-room">${sec.room}</span>${np === t.period ? '<span class="chip chip-primary">กำลังสอน</span>' : ''}</div>
          <div class="period-sub">${periodOf(t.period).start}–${periodOf(t.period).end} · ${sec.students.length} คน · ${status}</div>
        </div>
        <div>${btn}</div>
      </div>`;
  };

  view.innerHTML = `
    <div class="page-head">
      <div><h1>${thDay(date)}</h1><p>${date === today ? 'คาบที่ท่านสอนวันนี้ตามตารางสอน กดเช็คชื่อได้ทันที' : 'คาบที่ท่านสอนในวันที่เลือก'}</p></div>
      ${dayNav(date)}
    </div>

    <div class="stat-row">
      <div class="card stat"><div class="stat-label">คาบในวันนี้</div><div class="stat-value">${doneN}<small> / ${slots.length} เช็คแล้ว</small></div></div>
      <a class="card stat stat-link" href="#backlog"><div class="stat-label">คาบที่ยังไม่เช็ค (ย้อนหลัง)</div><div class="stat-value" style="color:${backlog.length ? 'var(--warn)' : 'inherit'}">${backlog.length} <small>คาบ</small></div></a>
      <a class="card stat stat-link" href="#/sections/risk"><div class="stat-label">นักเรียนใกล้ มส</div><div class="stat-value" style="color:${risk ? 'var(--warn)' : 'inherit'}">${risk} <small>คน-วิชา</small></div></a>
      <a class="card stat stat-link" href="#/sections/ms"><div class="stat-label">เวลาเรียนไม่ถึง ${MIN_ATTENDANCE}% (มส)</div><div class="stat-value" style="color:${ms ? 'var(--ms)' : 'inherit'}">${ms} <small>คน-วิชา</small></div></a>
    </div>

    ${!inTerm(db, date) ? `<div class="card empty"><div class="empty-icon">${icon('calendar')}</div><h3>อยู่นอกภาคเรียน</h3><div>ภาคเรียนนี้เริ่ม ${thDay(db.att.start)} ถึง ${thDay(termEnd(db))}</div></div>`
      : holiday ? `<div class="card empty"><div class="empty-icon">${icon('calendar')}</div><h3>วันหยุดของโรงเรียน: ${esc(holiday.name)}</h3><div class="muted">ไม่มีคาบเรียน ไม่ต้องเช็คชื่อ และไม่นับเป็นเวลาเรียน</div><div style="margin-top:12px"><button class="btn btn-sm" data-day="${shiftSchoolDay(date, 1)}">ไปวันเรียนถัดไป</button></div></div>`
      : !isSchoolDay(date) ? `<div class="card empty"><div class="empty-icon">${icon('calendar')}</div><h3>วันหยุด ไม่มีคาบสอน</h3><div><button class="btn btn-sm" data-day="${shiftSchoolDay(date, 1)}">ไปวันเรียนถัดไป</button></div></div>`
      : slots.length ? `<div class="card period-list">${slots.map((t, i) => `${i && slots[i - 1].period <= LUNCH_AFTER && t.period > LUNCH_AFTER ? '<div class="lunch">พักกลางวัน</div>' : ''}${row(t)}`).join('')}</div>`
      : `<div class="card empty"><div class="empty-icon">${icon('check')}</div><h3>วันนี้ท่านไม่มีคาบสอน</h3></div>`}

    <h2 class="sub-head" id="backlog">คาบที่ยังไม่เช็ค <span class="faint">(${backlog.length})</span></h2>
    ${backlog.length ? `
      <div class="card list-wrap"><table class="list">
        <thead><tr><th>วันที่</th><th>คาบ</th><th>รายวิชา</th><th class="c">ห้อง</th><th></th></tr></thead>
        <tbody>${backlog.map((x) => `<tr>
          <td>${thShort(x.date)}</td><td>${periodLabel(x.period)}</td><td>${x.sec.code} ${esc(x.sec.name)}</td><td class="c">${x.sec.room}</td>
          <td class="r"><a class="btn btn-sm btn-primary" href="#/c/${x.sec.id}/${x.date}/${x.period}">${icon('check')}เช็คชื่อย้อนหลัง</a></td></tr>`).join('')}</tbody>
      </table></div>`
    : `<div class="card empty" style="padding:22px"><div>${icon('check')} เช็คชื่อครบทุกคาบที่ผ่านมาแล้ว</div></div>`}
  `;
  bindDayNav('#/d', date, myDots);
  view.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#backlog"]');
    if (a) { e.preventDefault(); $('#backlog').scrollIntoView({ behavior: 'smooth' }); }
  });
}

/* =========================================================
 *  Page: เช็คชื่อหนึ่งคาบ
 * ========================================================= */
function renderCheck(secId, date, period) {
  const sec = sectionById(secId);
  if (!sec || sec.teacherId !== ME) { toast('เปิดได้เฉพาะคาบของห้องเรียนที่ท่านสอน', 'bad'); go('#/'); return; }
  const slot = inTerm(db, date) && !holidayOn(db, date) && db.att.timetable.find((t) => t.sec === secId && t.day === weekdayOf(date) && t.period === period);
  if (!slot) { toast('ไม่พบคาบนี้ในตารางสอน', 'bad'); go('#/'); return; }
  const key = sessionKey(secId, date, period);
  const rec = db.att.records[key];
  const readonly = date > todayISO();
  if (ui.draft?.key !== key) ui.draft = { key, marks: {} };
  const base = (sid) => (rec ? markOf(rec, sid) : 'present');
  const cur = (sid) => ui.draft.marks[sid] ?? base(sid);
  $('#topbarTitle').textContent = 'เช็คชื่อ';

  view.innerHTML = `
    <a class="back-link" href="#/d/${date}">${icon('back')}คาบวันที่ ${thShort(date)}</a>
    <div class="card ws-head">
      <div class="ws-title">
        <div>
          <h1>${sec.code} ${esc(sec.name)} · ${sec.room}</h1>
          <div class="ws-sub"><span>${icon('calendar')} ${thDay(date)}</span><span>${icon('clock')} ${periodLabel(period)}</span><span>${icon('users')} ${sec.students.length} คน</span>
          ${rec ? `<span>เช็คล่าสุด ${thTime(rec.t)}</span>` : ''}</div>
        </div>
      </div>
      <div class="ws-kpis" id="kpis"></div>
    </div>
    ${readonly ? `<div class="callout" style="margin-bottom:12px">${icon('info')}<div>ยังไม่ถึงวันสอน เช็คชื่อล่วงหน้าไม่ได้</div></div>` : ''}

    <div class="toolbar">
      <div class="key-hint"><span class="faint">คีย์ลัดเมื่อเลือกแถว</span>${ATT_KEYS.map((k, i) => `<span class="key-pill att-${k}"><b>${i + 1}</b>${ATT[k].label}</span>`).join('')}<span class="faint">แล้วเลื่อนไปคนถัดไป</span></div>
      <span class="spacer"></span>
      ${readonly ? '' : '<button class="btn btn-sm" id="allPresent">ทุกคนมา</button>'}
    </div>

    <div class="card list-wrap"><table class="list att-table">
      <thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th><th>สถานะคาบนี้</th><th class="r">เวลาเรียน</th><th class="c">ก่อน มส</th></tr></thead>
      <tbody>${sec.students.map((s) => {
        const a = studentAttendance(db, sec, s.id);
        return `<tr data-sid="${s.id}" tabindex="${readonly ? -1 : 0}">
          <td class="c num faint">${s.no}</td>
          <td>${esc(fullName(s))}</td>
          <td><div class="att-seg">${ATT_KEYS.map((k) => `<button data-m="${k}" class="m-${k}" ${readonly ? 'disabled' : ''}>${ATT[k].label}</button>`).join('')}</div></td>
          <td class="r num ${a.pct < MIN_ATTENDANCE ? 'txt-bad' : ''}">${a.pct}%</td>
          <td class="c">${levelChip(a)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="faint" style="font-size:12.5px">เวลาเรียนและจำนวนคาบที่ขาดได้อีก คิดจากคาบที่บันทึกแล้ว (${sectionAttendance(db, sec).checked} คาบ) · ขาดหรือลาได้ทั้งภาคไม่เกิน ${allowedMiss(sec)} คาบจาก ${sec.hours} ชั่วโมงตามหลักสูตร</p>
    ${readonly ? '' : '<div class="actionbar" id="actionbar"></div>'}
  `;

  const refresh = () => {
    const c = { present: 0, late: 0, leave: 0, absent: 0 };
    sec.students.forEach((s) => {
      const m = cur(s.id);
      c[m]++;
      const tr = $(`tr[data-sid="${s.id}"]`, view);
      $$('.att-seg button', tr).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
      tr.classList.toggle('row-changed', s.id in ui.draft.marks);
    });
    $('#kpis').innerHTML = ATT_KEYS.map((k) => `<div class="kpi"><div class="kpi-label">${ATT[k].label}</div><div class="kpi-value att-text-${k}">${c[k]}</div></div>`).join('');
    const bar = $('#actionbar');
    if (!bar) return;
    const n = Object.keys(ui.draft.marks).length;
    bar.innerHTML = `
      <div class="ab-status">${rec
        ? (n ? `<span class="dot" style="color:#e0a100"></span><span>แก้ไข <strong>${n}</strong> คน ยังไม่บันทึก</span>` : `<span style="color:var(--ok)">${icon('check')}</span><span>บันทึกแล้ว · ${thTime(rec.t)}</span>`)
        : `<span class="dot" style="color:#e0a100"></span><span>คาบนี้<strong>ยังไม่ได้บันทึก</strong> · มา ${c.present + c.late} / ${sec.students.length} คน</span>`}</div>
      <span class="spacer"></span>
      <button class="btn btn-ghost" id="discardBtn" ${n ? '' : 'disabled'}>ยกเลิกการแก้ไข</button>
      <button class="btn btn-primary" id="saveBtn" ${rec && !n ? 'disabled' : ''}>${icon('save')}บันทึกการเช็คชื่อ</button>`;
  };
  const setMark = (sid, m) => {
    if (m === base(sid)) delete ui.draft.marks[sid]; else ui.draft.marks[sid] = m;
    refresh();
  };
  refresh();
  if (readonly) return;

  view.addEventListener('click', (e) => {
    const b = e.target.closest('.att-seg button');
    if (b) { setMark(b.closest('tr').dataset.sid, b.dataset.m); return; }
    if (e.target.closest('#allPresent')) { sec.students.forEach((s) => { const m = 'present'; if (m === base(s.id)) delete ui.draft.marks[s.id]; else ui.draft.marks[s.id] = m; }); refresh(); return; }
    if (e.target.closest('#discardBtn')) { ui.draft.marks = {}; refresh(); return; }
    if (e.target.closest('#saveBtn')) { saveCheck(); route(); }
  });
  view.addEventListener('keydown', (e) => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr) return;
    const idx = { 1: 0, 2: 1, 3: 2, 4: 3 }[e.key];
    if (idx != null) {
      e.preventDefault();
      setMark(tr.dataset.sid, ATT_KEYS[idx]);
      (tr.nextElementSibling || tr).focus();
    } else if (e.key === 'ArrowDown') { e.preventDefault(); tr.nextElementSibling?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); tr.previousElementSibling?.focus(); }
  });
}

/* บันทึกคาบที่กำลังเช็ค: เก็บเฉพาะคนที่ไม่ใช่ “มา” การแก้คาบที่เคยบันทึกแล้วจะลงประวัติการแก้ไขของห้องเรียนที่สอน */
function saveCheck() {
  if (!ui.draft) return;
  const [secId, date, period] = ui.draft.key.split('|');
  const sec = sectionById(secId);
  const rec = db.att.records[ui.draft.key];
  const ex = {};
  const changes = [];
  sec.students.forEach((s) => {
    const before = rec ? markOf(rec, s.id) : 'present';
    const m = ui.draft.marks[s.id] ?? before;
    if (m !== 'present') ex[s.id] = m;
    if (rec && m !== before) changes.push({ s, before, m });
  });
  const t = Date.now();
  changes.forEach(({ s, before, m }) => sec.history.unshift({
    t, who: myName(), student: fullName(s), field: `เช็คชื่อ ${thShort(date)} คาบ ${period}`, from: ATT[before].label, to: ATT[m].label,
  }));
  db.att.records[ui.draft.key] = { t, ex };
  ui.draft = null;
  persist();
  toast(rec ? `บันทึกการแก้ไขแล้ว${changes.length ? ` (${changes.length} คน)` : ''}` : 'บันทึกการเช็คชื่อแล้ว', 'ok');
}

/* =========================================================
 *  Page: ห้องที่ฉันสอน + สรุปรายห้อง
 * ========================================================= */
/* focus = 'risk' | 'ms': มาจากการ์ดสรุปในหน้าคาบวันนี้ ไฮไลต์ห้องที่มีนักเรียนตามเงื่อนไขนั้น */
const FOCUS = { risk: { label: 'นักเรียนใกล้ มส', cls: 'hl-risk' }, ms: { label: 'นักเรียนที่เวลาเรียนไม่ถึง ' + MIN_ATTENDANCE + '% (มส)', cls: 'hl-ms' } };
function renderSections(focus) {
  $('#topbarTitle').textContent = 'ห้องที่ฉันสอน';
  if (!FOCUS[focus]) focus = null;
  const cards = mySections().map((sec) => {
    let risk = 0, ms = 0;
    sec.students.forEach((s) => { const x = studentAttendance(db, sec, s.id); if (x.level === 'risk') risk++; if (x.level === 'ms') ms++; });
    return { sec, risk, ms, hit: focus ? (focus === 'risk' ? risk : ms) > 0 : false };
  });
  const hits = cards.filter((c) => c.hit);
  view.innerHTML = `
    <div class="page-head"><div><h1>ห้องที่ฉันสอน</h1><p>สรุปเวลาเรียนรายห้อง ${esc(TERMS.find((t) => t.key === term).label)} · เห็นเฉพาะห้องเรียนที่ท่านเป็นครูผู้สอน</p></div></div>
    ${focus ? `<div class="focus-bar ${FOCUS[focus].cls}">${icon(focus === 'ms' ? 'alert' : 'info')}<div>${hits.length
      ? `มี <b>${hits.length} ห้อง</b> ที่มี${FOCUS[focus].label} (ไฮไลต์ไว้) กดที่ห้องเพื่อดูรายชื่อ`
      : `ไม่มีห้องที่มี${FOCUS[focus].label}`}</div><a class="btn btn-sm btn-ghost" href="#/sections">แสดงทุกห้องตามปกติ</a></div>` : ''}
    <div class="section-grid">${cards.map(({ sec, risk, ms, hit }) => {
      const a = sectionAttendance(db, sec);
      const prog = Math.min(1, a.checked / sec.hours);
      return `
        <a class="card sec-card ${focus ? (hit ? `hl ${FOCUS[focus].cls}` : 'dim') : ''}" href="#/s/${sec.id}${hit ? `/${focus}` : ''}">
          <div class="sec-top"><div style="min-width:0"><div class="sec-code">${sec.code} · ${sec.type}</div><div class="sec-name">${esc(sec.name)}</div></div><div class="sec-room">${sec.room}</div></div>
          <div class="sec-meta"><span>${icon('users')}${sec.students.length} คน</span><span>${icon('calendar')}${slotsOf(db, sec.id).length} คาบ/สัปดาห์</span></div>
          <div><div class="progress"><span style="width:${Math.round(prog * 100)}%"></span></div>
            <div class="faint" style="font-size:12.5px;margin-top:4px">เช็คแล้ว ${a.checked} คาบ จาก ${sec.hours} ชั่วโมงตามหลักสูตร</div></div>
          <div class="sec-foot">
            <span class="row" style="gap:6px;flex-wrap:wrap">
              ${a.unchecked.length ? `<span class="chip chip-warn">ยังไม่เช็ค ${a.unchecked.length} คาบ</span>` : `<span class="chip chip-ok">${icon('check')}เช็คครบ</span>`}
              ${risk ? `<span class="chip chip-warn ${focus === 'risk' ? 'chip-strong' : ''}">ใกล้ มส ${risk}</span>` : ''}${ms ? `<span class="chip chip-ms ${focus === 'ms' ? 'chip-strong' : ''}">มส ${ms}</span>` : ''}
            </span>
          </div>
        </a>`;
    }).join('')}</div>`;
  $('.sec-card.hl', view)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function renderSection(secId) {
  const sec = sectionById(secId);
  if (!sec || sec.teacherId !== ME || sec.term !== term) { toast('เปิดได้เฉพาะห้องเรียนที่ท่านสอน', 'bad'); go('#/sections'); return; }
  $('#topbarTitle').textContent = 'สรุปเวลาเรียน';
  const a = sectionAttendance(db, sec);
  const rows = sec.students.map((s) => ({ s, a: studentAttendance(db, sec, s.id) }));
  const count = (lv) => rows.filter((x) => x.a.level === lv).length;
  const shown = rows.filter((x) => ui.secFilter === 'all' || x.a.level === ui.secFilter);
  view.innerHTML = `
    <a class="back-link" href="#/sections">${icon('back')}ห้องที่ฉันสอน</a>
    <div class="card ws-head">
      <div class="ws-title"><div>
        <h1>${sec.code} ${esc(sec.name)} · ${sec.room}</h1>
        <div class="ws-sub"><span>${icon('users')} ${sec.students.length} คน</span><span>${sec.hours} ชั่วโมง/ภาค · ขาดหรือลาได้ไม่เกิน ${allowedMiss(sec)} คาบ</span>
          <a href="scores.html#/s/${sec.id}/results">${icon('book')} ดูผลการเรียนในระบบบันทึกคะแนน</a></div>
      </div></div>
      <div class="ws-kpis">
        <div class="kpi"><div class="kpi-label">เช็คแล้ว</div><div class="kpi-value">${a.checked} <small class="faint">คาบ</small></div></div>
        <div class="kpi"><div class="kpi-label">ยังไม่เช็ค</div><div class="kpi-value" style="color:${a.unchecked.length ? 'var(--warn)' : 'inherit'}">${a.unchecked.length}</div></div>
        <div class="kpi"><div class="kpi-label">ใกล้ มส</div><div class="kpi-value" style="color:${count('risk') ? 'var(--warn)' : 'inherit'}">${count('risk')}</div></div>
        <div class="kpi"><div class="kpi-label">มส</div><div class="kpi-value" style="color:${count('ms') ? 'var(--ms)' : 'inherit'}">${count('ms')}</div></div>
      </div>
    </div>

    <div class="toolbar">
      <div class="seg" id="lvFilter">${[['all', 'ทั้งหมด', rows.length], ['risk', 'ใกล้ มส', count('risk')], ['ms', 'มส', count('ms')]].map(([k, l, c]) => `<button data-f="${k}" class="${ui.secFilter === k ? 'on' : ''}">${l}<span class="cnt">${c}</span></button>`).join('')}</div>
    </div>
    <div class="card list-wrap"><table class="list">
      <thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th><th class="c">มา</th><th class="c">สาย</th><th class="c">ลา</th><th class="c">ขาด</th><th class="r">เวลาเรียน</th><th class="c">ก่อน มส</th></tr></thead>
      <tbody>${shown.map(({ s, a: x }) => `<tr>
        <td class="c num faint">${s.no}</td><td>${esc(fullName(s))}</td>
        <td class="c num">${x.present}</td><td class="c num">${x.late || '<span class="faint">0</span>'}</td><td class="c num">${x.leave || '<span class="faint">0</span>'}</td><td class="c num ${x.absent ? 'txt-bad' : ''}">${x.absent || '<span class="faint">0</span>'}</td>
        <td class="r num ${x.pct < MIN_ATTENDANCE ? 'txt-bad' : ''}"><b>${x.pct}%</b></td><td class="c">${levelChip(x)}</td></tr>`).join('') || '<tr><td colspan="8" class="c faint" style="padding:24px">ไม่มีนักเรียนในกลุ่มนี้</td></tr>'}</tbody>
    </table></div>

    <h2 class="sub-head">คาบที่ผ่านมา <span class="faint">(${a.sessions.length} คาบ · เลือกวันบนปฏิทิน)</span></h2>
    <div class="cal-layout">
      <div class="card cal-card" id="secCal"></div>
      <div class="card day-detail" id="dayDetail"></div>
    </div>`;
  $('#lvFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (b) go(`#/s/${secId}/${b.dataset.f}`);
  });

  // ปฏิทินคาบของห้องนี้: เปิดมาเลือกวันสอนล่าสุดที่ผ่านมาไว้ก่อน
  const all = plannedSessions(db, sec);
  if (ui.calSec?.id !== sec.id) ui.calSec = { id: sec.id, date: a.sessions.length ? a.sessions[a.sessions.length - 1].date : todayISO() };
  const studentsWith = (rec, x, m) => sec.students.filter((s) => markOf(rec, s.id) === m);
  /* หนึ่งคาบ: ซ้าย = คาบ/เวลา/สถานะ · กลาง = จำนวน + รายชื่อ · ขวา = ปุ่ม */
  const periodCard = (x) => {
    const rec = db.att.records[x.key];
    const future = x.date > todayISO();
    const p = periodOf(x.period);
    const status = rec ? `<span class="chip chip-ok">${icon('check')}เช็คแล้ว</span>`
      : future ? '<span class="chip">ยังไม่ถึงวันสอน</span>' : `<span class="chip chip-warn">${icon('clock')}ยังไม่เช็ค</span>`;
    let body;
    if (rec) {
      const c = countsOf(db, sec, x, rec);
      const groups = ['absent', 'leave', 'late'].map((m) => {
        const list = studentsWith(rec, x, m);
        return list.length ? `<div class="dd-group"><span class="dd-label att-text-${m}">${ATT[m].label}</span>
          <div class="dd-names">${list.map((s) => `<span class="name-chip att-${m}"><b>${s.no}</b>${esc(s.first)} ${esc(s.last)}</span>`).join('')}</div></div>` : '';
      }).join('');
      body = `
        <div class="dd-counts">${ATT_KEYS.map((k) => `<div class="dd-count ${c[k] ? '' : 'zero'}"><span class="att-text-${k}">${c[k]}</span>${ATT[k].label}</div>`).join('')}</div>
        ${groups || `<div class="dd-all">${icon('check')}มาครบทุกคน</div>`}`;
    } else {
      body = `<div class="dd-empty">${future ? 'ยังไม่ถึงวันสอน เช็คชื่อได้ในวันที่สอน' : `ยังไม่ได้เช็คชื่อคาบนี้ · ${sec.students.length} คน`}</div>`;
    }
    return `
      <div class="dd-card">
        <div class="dd-period"><div class="dd-no">คาบ <b>${x.period}</b></div><div class="dd-time">${p.start}–${p.end}</div>${status}</div>
        <div class="dd-body">${body}</div>
        <div class="dd-action">
          ${future ? '' : `<a class="btn btn-sm ${rec ? '' : 'btn-primary'}" href="#/c/${sec.id}/${x.date}/${x.period}">${rec ? 'เปิด / แก้ไข' : `${icon('check')}เช็คชื่อ`}</a>`}
          ${rec ? `<div class="faint dd-at">เช็คเมื่อ ${thTime(rec.t)}</div>` : ''}
        </div>
      </div>`;
  };
  const showDay = (date) => {
    const list = all.filter((x) => x.date === date);
    $('#dayDetail').innerHTML = `
      <div class="dd-head"><h3>${thDay(date)}</h3><span class="faint">${list.length ? `${list.length} คาบ` : ''}</span></div>
      ${list.map(periodCard).join('') || `<div class="dd-none">${icon('calendar')}<div>วันนี้ไม่มีคาบของห้องนี้</div></div>`}`;
  };
  mountCalendar($('#secCal'), ui.calSec.date, dotsBySessions(all.map((x) => ({ sec, x }))), (d) => { ui.calSec.date = d; showDay(d); });
  showDay(ui.calSec.date);
}

/* =========================================================
 *  Page: ห้องประจำชั้นของฉัน (ครูประจำชั้น)
 * ========================================================= */
// วันล่าสุด (ไม่เกิน limit) ที่มีคาบของห้องเหล่านี้ถูกเช็คแล้ว — null ถ้า limit เองมีการเช็คแล้ว หรือไม่มีเลย
function latestCheckedDate(secs, limit) {
  const ids = new Set(secs.map((s) => s.id));
  let latest = null;
  Object.keys(db.att.records).forEach((key) => {
    const [sec, date] = key.split('|');
    if (ids.has(sec) && date <= limit && (!latest || date > latest)) latest = date;
  });
  return latest === limit ? null : latest;
}

function renderHomeroom(r) {
  const room = myRooms()[0];
  $('#topbarTitle').textContent = 'ห้องประจำชั้นของฉัน';
  if (!room) {
    view.innerHTML = `<div class="card empty"><div class="empty-icon">${icon('door')}</div><h3>ท่านไม่ได้เป็นครูประจำชั้น</h3></div>`;
    return;
  }
  const secs = roomSections(room);
  const roster = secs[0].students;
  // เปิดหน้ารายวันโดยไม่ระบุวัน และวันนี้ยังไม่มีคาบไหนถูกเช็ค → แสดงวันเรียนล่าสุดที่มีการเช็คแทน (ไม่เปลี่ยน ui.date ที่หน้าคาบวันนี้ใช้)
  const shownDate = r.date || latestCheckedDate(secs, ui.date) || ui.date;
  const tabs = `<div class="tabs">
    <a class="tab ${r.page === 'hday' ? 'active' : ''}" href="#/h/${shownDate}">${icon('calendar')}รายวัน</a>
    <a class="tab ${r.page === 'hsum' ? 'active' : ''}" href="#/h/sum">${icon('grid')}สรุปทั้งภาค</a></div>`;
  const head = `<div class="page-head"><div><h1>ห้องประจำชั้น ${room}</h1><p>เห็นการเข้าเรียนของนักเรียนในห้องทุกวิชา (ดูอย่างเดียว)</p></div>${r.page === 'hday' ? dayNav(shownDate) : ''}</div>`;
  if (r.page === 'hsum') return renderHomeroomSum(room, secs, roster, head, tabs, r.focus);

  if (r.date) ui.date = r.date;
  const date = shownDate;
  const today = todayISO();
  const ids = new Set(secs.map((s) => s.id));
  const holiday = holidayOn(db, date);
  const slots = inTerm(db, date) && !holiday ? db.att.timetable.filter((t) => ids.has(t.sec) && t.day === weekdayOf(date)) : [];
  const byPeriod = new Map(slots.map((t) => [t.period, sectionById(t.sec)]));
  const cell = (s, p) => {
    const sec = byPeriod.get(p);
    if (!sec) return '<td class="hr-cell none"></td>';
    const rec = db.att.records[sessionKey(sec.id, date, p)];
    if (!rec) return `<td class="hr-cell unchecked" title="${esc(sec.code)} ยังไม่เช็ค">${date > today ? '' : '?'}</td>`;
    const m = markOf(rec, s.id);
    return `<td class="hr-cell" title="${esc(sec.code)} · ${ATT[m].label}">${m === 'present' ? '<span class="hr-dot"></span>' : markChip(m)}</td>`;
  };
  // ขาดอย่างน้อยหนึ่งคาบในวันนี้ → ครูประจำชั้นควรติดตาม
  const absentToday = roster.filter((s) => slots.some((t) => db.att.records[sessionKey(t.sec, date, t.period)]?.ex[s.id] === 'absent'));

  view.innerHTML = `${head}${tabs}
    ${!slots.length ? `<div class="card empty"><div class="empty-icon">${icon('calendar')}</div><h3>${!inTerm(db, date) ? 'อยู่นอกภาคเรียน' : holiday ? `วันหยุดของโรงเรียน: ${esc(holiday.name)}` : 'ไม่มีคาบเรียนในวันนี้'}</h3></div>` : `
    ${absentToday.length ? `<div class="callout warn" style="margin-bottom:12px">${icon('alert')}<div>มีนักเรียน <b>${absentToday.length} คน</b> ขาดเรียนในวันนี้: ${absentToday.map((s) => esc(fullName(s))).join(', ')}</div></div>` : ''}
    <div class="toolbar"><div class="legend">
      <span><span class="hr-dot"></span>มา</span>${['late', 'leave', 'absent'].map((k) => `<span>${markChip(k)}</span>`).join('')}<span><span class="hr-q">?</span>ครูผู้สอนยังไม่เช็ค</span>
    </div></div>
    <div class="card list-wrap hr-wrap"><table class="list hr-table hr-day">
      <thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th>${PERIODS.map((p) => {
        const sec = byPeriod.get(p.no);
        return `<th class="c ${p.no === LUNCH_AFTER + 1 ? 'hr-lunch' : ''}">คาบ ${p.no}<div class="hr-subj">${sec ? `${sec.code}<br>${esc(userById(sec.teacherId).name.replace('ครู', ''))}` : '—'}</div></th>`;
      }).join('')}</tr></thead>
      <tbody>${roster.map((s) => {
        return `<tr><td class="c num faint">${s.no}</td><td>${esc(fullName(s))}</td>${PERIODS.map((p) => cell(s, p.no)).join('')}</tr>`;
      }).join('')}</tbody>
    </table></div>`}
  `;
  bindDayNav('#/h', date, () => roomDots(room));
}

/* ---------- สรุปทั้งภาคของห้องประจำชั้น ---------- */
const subjName = (sec) => SUBJECTS.find((x) => x.slot === sec.slot)?.short || sec.name;
const weekOf = (date) => Math.floor((parseISO(date) - parseISO(db.att.start)) / (7 * 86400000));
const mondayOf = (date) => addDays(date, -((weekdayOf(date) + 6) % 7));

/* คำนวณทุกอย่างของหน้าสรุปทั้งภาคในรอบเดียว */
function roomSummary(secs, roster) {
  const today = todayISO();
  const weekStart = mondayOf(today);
  const weeks = [];                 // index = สัปดาห์ที่ (0 = สัปดาห์แรก)
  const absentDays = new Map();     // sid -> Set(date) วันที่ขาดเรียนในสัปดาห์นี้
  const subj = secs.map((sec) => ({ sec, att: 0, total: 0, ms: 0, risk: 0 }));
  secs.forEach((sec, i) => sectionAttendance(db, sec).sessions.forEach((x) => {
    const rec = db.att.records[x.key];
    if (!rec) return;
    const w = weekOf(x.date);
    weeks[w] = weeks[w] || { att: 0, total: 0, absent: 0 };
    sec.students.forEach((s) => {
      const m = markOf(rec, s.id);
      weeks[w].total++; subj[i].total++;
      if (ATT[m].counts) { weeks[w].att++; subj[i].att++; }
      if (m === 'absent') {
        weeks[w].absent++;
        if (x.date >= weekStart) {
          if (!absentDays.has(s.id)) absentDays.set(s.id, new Set());
          absentDays.get(s.id).add(x.date);
        }
      }
    });
  }));
  const students = roster.map((s) => {
    const cols = secs.map((sec) => ({ sec, ...studentAttendance(db, sec, s.id) }));
    const level = cols.some((c) => c.level === 'ms') ? 'ms' : cols.some((c) => c.level === 'risk') ? 'risk' : 'ok';
    cols.forEach((c, i) => { if (c.level === 'ms') subj[i].ms++; else if (c.level === 'risk') subj[i].risk++; });
    return {
      s, cols, level,
      absent: cols.reduce((a, c) => a + c.absent, 0),
      leave: cols.reduce((a, c) => a + c.leave, 0),
      weekDays: [...(absentDays.get(s.id) || [])].sort(),
      worstPct: Math.min(...cols.map((c) => c.pct)),
      minLeft: Math.min(...cols.filter((c) => c.level !== 'ms').map((c) => c.left)),
    };
  });
  const tot = weeks.reduce((a, w) => (w ? { att: a.att + w.att, total: a.total + w.total } : a), { att: 0, total: 0 });
  return {
    students, weeks, curWeek: weekOf(today),
    avg: tot.total ? (tot.att / tot.total) * 100 : 100,
    subjects: subj.map((x) => ({ ...x, pct: x.total ? (x.att / x.total) * 100 : 100 })),
  };
}
const fmtPct = (n) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

/* กราฟเส้น: เวลาเรียนของห้องรายสัปดาห์ + เส้นเกณฑ์ (สัปดาห์ปัจจุบันยังไม่ครบ = เส้นประ) */
function trendChart(weeks, curWeek) {
  const pts = weeks.map((w, i) => (w ? { i, pct: (w.att / w.total) * 100, absent: w.absent } : null)).filter(Boolean);
  if (!pts.length) return '<div class="faint">ยังไม่มีข้อมูล</div>';
  const W = 560, H = 220, L = 40, R = 14, T = 14, B = 30;
  const lo = Math.max(0, Math.floor((Math.min(MIN_ATTENDANCE, ...pts.map((p) => p.pct)) - 5) / 5) * 5);
  const n = Math.max(curWeek, pts[pts.length - 1].i) + 1;
  const x = (i) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v) => T + ((100 - v) / (100 - lo)) * (H - T - B);
  const ticks = [];
  for (let v = lo; v <= 100; v += lo <= 60 ? 10 : 5) ticks.push(v);
  const done = pts.filter((p) => p.i < curWeek);
  const last = pts.filter((p) => p.i >= curWeek - 1).slice(-2);
  const path = (list) => list.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const step = Math.ceil(n / 10);
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="เวลาเรียนของห้องรายสัปดาห์">
      ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
      ${Array.from({ length: n }, (_, i) => (i % step === 0 || i === n - 1 ? `<text class="tick" x="${x(i)}" y="${H - 10}" text-anchor="middle">${i + 1}</text>` : '')).join('')}
      <line class="threshold" x1="${L}" x2="${W - R}" y1="${y(MIN_ATTENDANCE)}" y2="${y(MIN_ATTENDANCE)}"/>
      <text class="threshold-label" x="${W - R}" y="${y(MIN_ATTENDANCE) - 5}" text-anchor="end">เกณฑ์ ${MIN_ATTENDANCE}%</text>
      <path class="line" d="${path(done)}"/>
      ${last.length === 2 && last[1].i === curWeek ? `<path class="line partial" d="${path(last)}"/>` : ''}
      <line class="xhair" x1="0" x2="0" y1="${T}" y2="${H - B}"/>
      ${pts.map((p) => `<circle class="pt ${p.i === curWeek ? 'partial' : ''}" cx="${x(p.i)}" cy="${y(p.pct)}" r="4"/>`).join('')}
      ${pts.map((p) => `<rect class="hit" x="${x(p.i) - (W - L - R) / n / 2}" y="${T}" width="${(W - L - R) / n}" height="${H - T - B}" data-x="${x(p.i)}"
        data-tip="<b>สัปดาห์ที่ ${p.i + 1}</b>${p.i === curWeek ? ' (ยังไม่ครบสัปดาห์)' : ''}<br>เวลาเรียน ${fmtPct(p.pct)}<br>ขาด ${p.absent} คาบ-คน"/>`).join('')}
    </svg>
    <div class="chart-foot faint">แกนนอน = สัปดาห์ที่ของภาคเรียน · แกนตั้งเริ่มที่ ${lo}%</div>`;
}

/* กราฟจุด: เวลาเรียนเฉลี่ยแยกตามวิชา ต่ำสุดอยู่บน (ใช้จุดแทนแท่ง เพราะแกนไม่เริ่มที่ 0) */
function subjectChart(subjects) {
  const list = [...subjects].sort((a, b) => a.pct - b.pct);
  const lo = Math.max(0, Math.floor((Math.min(MIN_ATTENDANCE, ...list.map((x) => x.pct)) - 5) / 5) * 5);
  const pos = (v) => `${((v - lo) / (100 - lo)) * 100}%`;
  return `
    <div class="dotplot" style="--th:${pos(MIN_ATTENDANCE)}">
      ${list.map((x) => `
        <div class="dp-row" data-tip="<b>${esc(x.sec.code)} ${esc(x.sec.name)}</b><br>${esc(userById(x.sec.teacherId).name)}<br>เวลาเรียนเฉลี่ย ${fmtPct(x.pct)}<br>มส ${x.ms} คน · ใกล้ มส ${x.risk} คน">
          <div class="dp-label"><b>${esc(subjName(x.sec))}</b><span>${esc(userById(x.sec.teacherId).name.replace('ครู', ''))}</span></div>
          <div class="dp-track"><span class="dp-th"></span><span class="dp-dot ${x.pct < MIN_ATTENDANCE ? 'low' : ''}" style="left:${pos(x.pct)}"></span></div>
          <div class="dp-val"><b>${fmtPct(x.pct)}</b>${x.ms || x.risk ? `<span>${[x.ms && `มส ${x.ms}`, x.risk && `ใกล้ มส ${x.risk}`].filter(Boolean).join(' · ')}</span>` : ''}</div>
        </div>`).join('')}
      <div class="dp-axis"><span></span><div><span style="left:0">${lo}%</span><span class="th" style="left:${pos(MIN_ATTENDANCE)}">${MIN_ATTENDANCE}%</span><span style="left:100%">100%</span></div><span></span></div>
    </div>`;
}

/* tooltip ร่วมของกราฟ: element ไหนมี data-tip ก็แสดงเมื่อชี้ */
function bindChartTips(root) {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  root.appendChild(tip);
  root.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-tip]');
    const svg = e.target.closest('svg.chart');
    $$('svg.chart .xhair', root).forEach((l) => l.classList.toggle('on', !!(t && svg && l.closest('svg') === svg)));
    if (t && svg && t.dataset.x) { const l = $('.xhair', svg); l.setAttribute('x1', t.dataset.x); l.setAttribute('x2', t.dataset.x); }
    if (!t) { tip.style.display = 'none'; return; }
    tip.innerHTML = t.dataset.tip;
    tip.style.display = 'block';
    const r = root.getBoundingClientRect();
    let left = e.clientX - r.left + 14;
    if (left + tip.offsetWidth > r.width) left = e.clientX - r.left - tip.offsetWidth - 14;
    tip.style.left = `${left}px`;
    tip.style.top = `${e.clientY - r.top + 12}px`;
  });
  root.addEventListener('mouseleave', () => { tip.style.display = 'none'; $$('svg.chart .xhair', root).forEach((l) => l.classList.remove('on')); });
}

const HR_FOCUS = {
  ms: { label: 'มส', test: (x) => x.level === 'ms' },
  risk: { label: 'กลุ่มเสี่ยง', test: (x) => x.level === 'risk' },
  week: { label: 'ขาดเรียนสัปดาห์นี้', test: (x) => x.weekDays.length > 0 },
};

function renderHomeroomSum(room, secs, roster, head, tabs, focus) {
  if (!HR_FOCUS[focus]) focus = null;
  const sum = roomSummary(secs, roster);
  const per = sum.students;
  const msList = per.filter((x) => x.level === 'ms').sort((a, b) => a.worstPct - b.worstPct);
  const riskList = per.filter((x) => x.level === 'risk').sort((a, b) => a.minLeft - b.minLeft);
  const weekN = per.filter(HR_FOCUS.week.test).length;
  const box = (key, label, value, unit, cls) => {
    const on = focus === key;
    return `<a class="card stat stat-link ${on ? 'stat-on' : ''}" href="${on ? '#/h/sum' : `#/h/sum/${key}`}"><div class="stat-label">${label}</div>
      <div class="stat-value" style="color:${value ? cls : 'inherit'}">${value} <small>คน</small></div><div class="stat-hint">${on ? 'กำลังไฮไลต์ในตาราง · กดอีกครั้งเพื่อยกเลิก' : 'กดเพื่อไฮไลต์ในตาราง'}</div></a>`;
  };
  const subjChips = (x, which) => x.cols.filter((c) => which.includes(c.level)).map((c) => c.level === 'ms'
    ? `<span class="chip chip-ms">${esc(subjName(c.sec))} ${c.pct}%</span>`
    : `<span class="chip chip-warn">${esc(subjName(c.sec))} ขาดได้อีก ${c.left}</span>`).join('');
  const stuCard = (x, which) => `
    <button class="stu-card" data-stu="${x.s.id}">
      <span class="stu-no">${x.s.no}</span>
      <span class="stu-main"><b>${esc(fullName(x.s))}</b><span class="stu-chips">${subjChips(x, which)}</span></span>
      ${icon('chev')}
    </button>`;

  view.innerHTML = `${head}${tabs}
    <div class="stat-row">
      <div class="card stat"><div class="stat-label">เวลาเรียนเฉลี่ยของห้อง</div><div class="stat-value">${fmtPct(sum.avg)}</div><div class="stat-hint">ทุกวิชา ทุกคาบที่เช็คแล้ว</div></div>
      ${box('ms', 'นักเรียน มส', msList.length, 'var(--ms)')}
      ${box('risk', 'นักเรียนกลุ่มเสี่ยงด้านเวลาเรียน', riskList.length, 'var(--warn)')}
      ${box('week', 'ขาดเรียน สัปดาห์นี้', weekN, 'var(--bad)')}
    </div>

    <div class="hr-lists">
      <section class="card hr-list ms">
        <div class="hr-list-head"><h2>มส</h2><span class="faint">เวลาเรียนต่ำกว่า ${MIN_ATTENDANCE}% อย่างน้อย 1 วิชา</span></div>
        ${msList.length ? msList.map((x) => stuCard(x, ['ms', 'risk'])).join('') : `<div class="hr-list-empty">${icon('check')}ไม่มีนักเรียน มส</div>`}
      </section>
      <section class="card hr-list risk">
        <div class="hr-list-head"><h2>นักเรียนกลุ่มเสี่ยงด้านเวลาเรียน</h2><span class="faint">ขาดได้อีกไม่เกิน 2 คาบ</span></div>
        ${riskList.length ? riskList.map((x) => stuCard(x, ['risk'])).join('') : `<div class="hr-list-empty">${icon('check')}ไม่มีนักเรียนกลุ่มเสี่ยง</div>`}
      </section>
    </div>

    <div class="hr-charts">
      <section class="card chart-card"><h2>แนวโน้มเวลาเรียนรายสัปดาห์</h2>${trendChart(sum.weeks, sum.curWeek)}</section>
      <section class="card chart-card"><h2>เวลาเรียนเฉลี่ยแยกตามวิชา</h2>${subjectChart(sum.subjects)}</section>
    </div>

    <h2 class="sub-head" id="hrTable">เวลาเรียนรายวิชา ${focus ? `<span class="chip chip-primary">ไฮไลต์: ${HR_FOCUS[focus].label} <a href="#/h/sum">${icon('x')}</a></span>` : ''}</h2>
    <div class="card list-wrap hr-wrap"><table class="list hr-table">
      <thead><tr><th class="c">เลขที่</th><th>ชื่อ-สกุล</th>${secs.map((sec) => `<th class="c">${sec.code}<div class="hr-subj">${esc(sec.name)}</div></th>`).join('')}<th class="c">ขาดรวม</th><th class="c">ลารวม</th><th class="c">ขาดเรียน<div class="hr-subj">สัปดาห์นี้</div></th></tr></thead>
      <tbody>${per.map((x) => `<tr class="${focus && HR_FOCUS[focus].test(x) ? `row-hl hl-${focus}` : ''}"><td class="c num faint">${x.s.no}</td><td><a class="stu-link" data-stu="${x.s.id}">${esc(fullName(x.s))}</a></td>
        ${x.cols.map((a) => `<td class="c num ${a.level === 'ms' ? 'pct-ms' : a.level === 'risk' ? 'pct-risk' : ''}" title="มา ${a.present} · สาย ${a.late} · ลา ${a.leave} · ขาด ${a.absent} · ขาดได้อีก ${a.left}">${a.pct}%</td>`).join('')}
        <td class="c num ${x.absent ? 'txt-bad' : 'faint'}">${x.absent}</td><td class="c num faint">${x.leave}</td>
        <td class="c num ${x.weekDays.length ? 'txt-bad' : 'faint'}" title="${x.weekDays.map(dmy).join(', ')}">${x.weekDays.length ? `${x.weekDays.length} วัน` : '—'}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="legend" style="margin:8px 0 20px"><span><span class="sw pct-risk"></span>ใกล้ มส (ขาดได้อีก ≤ 2 คาบ)</span><span><span class="sw pct-ms"></span>มส (เวลาเรียนต่ำกว่า ${MIN_ATTENDANCE}%)</span><span>กดชื่อนักเรียนเพื่อดูรายละเอียด</span></div>
`;
  bindChartTips($('.hr-charts', view));
  view.addEventListener('click', (e) => {
    const st = e.target.closest('[data-stu]');
    if (st) openStudent(room, secs, roster.find((s) => s.id === st.dataset.stu));
  });
  if (focus) $('#hrTable').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* =========================================================
 *  แผงรายละเอียดนักเรียน (ครูประจำชั้น)
 * ========================================================= */
const STU_LEGEND = '<div class="cal-legend"><span><i class="d-absent"></i>ขาด</span><span><i class="d-leave"></i>ลา</span><span><i class="d-late"></i>สาย</span></div>';
function closeStudent() { $('.drawer-root')?.remove(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('.modal-backdrop') && !$('.cal-pop')) closeStudent(); });

function openStudent(room, secs, s) {
  closeStudent();
  const cols = secs.map((sec) => ({ sec, ...studentAttendance(db, sec, s.id) }));
  const level = cols.some((c) => c.level === 'ms') ? 'ms' : cols.some((c) => c.level === 'risk') ? 'risk' : 'ok';
  // สถานะของนักเรียนคนนี้ในทุกคาบที่เช็คแล้ว จัดตามวัน
  const byDate = new Map();
  secs.forEach((sec) => plannedSessions(db, sec, todayISO()).forEach((x) => {
    const rec = db.att.records[x.key];
    if (!rec) return;
    if (!byDate.has(x.date)) byDate.set(x.date, []);
    byDate.get(x.date).push({ sec, period: x.period, m: markOf(rec, s.id) });
  }));
  byDate.forEach((list) => list.sort((a, b) => a.period - b.period));
  const dots = (date) => {
    const ms = (byDate.get(date) || []).map((x) => x.m);
    return ['absent', 'leave', 'late'].filter((m) => ms.includes(m));
  };
  const missed = [...byDate.keys()].filter((d) => dots(d).length).sort();
  let selected = missed.length ? missed[missed.length - 1] : todayISO();
  const badge = level === 'ms' ? '<span class="chip chip-ms">มส</span>' : level === 'risk' ? '<span class="chip chip-warn">กลุ่มเสี่ยงด้านเวลาเรียน</span>' : '<span class="chip chip-ok">ปกติ</span>';

  const root = document.createElement('div');
  root.className = 'drawer-root';
  root.innerHTML = `
    <div class="drawer-backdrop"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="รายละเอียดนักเรียน">
      <div class="drawer-head">
        <div class="stu-no big">${s.no}</div>
        <div style="flex:1;min-width:0"><h2>${esc(fullName(s))}</h2><div class="faint">รหัส ${s.id} · ${room} เลขที่ ${s.no}</div></div>
        <button class="icon-btn" data-close-drawer aria-label="ปิด">${icon('x')}</button>
      </div>
      <div class="drawer-body">
        <div>${badge}</div>

        <h3>เวลาเรียนรายวิชา</h3>
        <div class="dr-subjects">${cols.map((c) => `
          <div class="dr-subj">
            <div class="dr-subj-name"><b>${esc(subjName(c.sec))}</b><span class="faint">${c.sec.code}</span></div>
            <div class="dr-bar"><span class="${c.level}" style="width:${Math.max(0, Math.min(100, c.pct))}%"></span><i style="left:${MIN_ATTENDANCE}%"></i></div>
            <div class="dr-subj-val"><b class="${c.level === 'ms' ? 'txt-ms' : ''}">${c.pct}%</b>${levelChip(c)}</div>
          </div>`).join('')}</div>

        <h3>ปฏิทินการเข้าเรียน</h3>
        <div class="dr-cal" id="drCal"></div>
        <div class="dr-day" id="drDay"></div>

      </div>
    </aside>`;
  document.body.appendChild(root);
  void root.offsetWidth; // ให้เบราว์เซอร์วางตำแหน่งปิดก่อน แล้วค่อยเลื่อนเปิด
  root.classList.add('open');

  const showDay = (date) => {
    const list = byDate.get(date) || [];
    $('#drDay', root).innerHTML = `<div class="dr-day-head">${thDay(date)}</div>
      ${list.length ? list.map((x) => `<div class="dr-period"><span class="faint">คาบ ${x.period}</span><span style="flex:1">${esc(subjName(x.sec))}</span>${markChip(x.m)}</div>`).join('') : '<div class="faint">ไม่มีคาบที่เช็คแล้วในวันนี้</div>'}`;
  };
  mountCalendar($('#drCal', root), selected, dots, (d) => { selected = d; showDay(d); }, STU_LEGEND);
  showDay(selected);
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-drawer]') || e.target.classList.contains('drawer-backdrop')) closeStudent();
  });
}

/* =========================================================
 *  Boot
 * ========================================================= */
function boot() {
  const me = userById(ME);
  const rooms = myRooms();
  $('#schoolName').textContent = SCHOOL;
  $('#userName').textContent = me.name;
  $('#userRole').textContent = `ครูผู้สอน${rooms.length ? ` · ครูประจำชั้น ${rooms.join(', ')}` : ''}`;
  $('#avatar').textContent = me.name.replace('ครู', '').trim().charAt(0);
  // เมนูเดียว: ครูทุกคนเห็นส่วนครูผู้สอน ถ้าเป็นครูประจำชั้นจะมีเมนูห้องประจำชั้นเพิ่ม
  $('#nav').innerHTML = `
    <div class="nav-label">ครูผู้สอน</div>
    <a href="#/" data-nav="today"><svg><use href="#i-calendar"/></svg>คาบวันนี้<span class="nav-badge" id="backlogBadge"></span></a>
    <a href="#/sections" data-nav="sections"><svg><use href="#i-users"/></svg>ห้องที่ฉันสอน</a>
    ${rooms.length ? `<div class="nav-label">ครูประจำชั้น</div>
    <a href="#/h" data-nav="hday"><svg><use href="#i-door"/></svg>ห้องประจำชั้น ${rooms[0]}</a>` : ''}
    <div class="nav-label">ระบบอื่น</div>
    <a href="scores.html"><svg><use href="#i-book"/></svg>ระบบบันทึกคะแนน</a>`;
  $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); });
  $('#scrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); });
  $('#resetDemo').addEventListener('click', () => confirmModal({
    title: 'รีเซ็ตข้อมูล Demo?',
    message: 'ข้อมูลทั้งหมด ทั้งคะแนนและการเช็คชื่อ จะกลับเป็นข้อมูลตัวอย่างเริ่มต้น',
    okLabel: 'รีเซ็ต', okCls: 'btn-danger',
    onOk: () => { ui.draft = null; db = buildSeed(); persist(); route(); toast('รีเซ็ตข้อมูลแล้ว', 'ok'); },
  }));
  route();
}
boot();
