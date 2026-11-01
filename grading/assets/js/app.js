'use strict';

/* =========================================================
 *  State & storage
 * ========================================================= */
const STORE_KEY = 'gradebook-demo-v2';
const ROLE_KEY = 'gradebook-demo-role';
let dataVersion = 0;
let db = loadDb();

const ui = {
  term: (TERMS.find((t) => t.current) || TERMS[0]).key,
  draft: {},            // key "kind|sid|field" -> raw value (ยังไม่บันทึก)
  draftSection: null,
  structDraft: null,    // { sid, items }
  search: '',
  onlyIncomplete: false,
  resultFilter: 'all',
  followFilter: 'all',
  focusCol: null,
  role: 'teacher',       // มุมมองที่ใช้อยู่: teacher | academic (ADR 0003)
  aTab: 'matrix',
  aFilter: { grade: 'all', slot: 'all', status: 'all' },
  bulk: new Set(),
};

function loadDb() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.version === 2) {
        // ข้อมูลที่บันทึกไว้ก่อนมีระบบเช็คชื่อ: สร้างการเช็คชื่อจำลองเพิ่มโดยไม่ล้างคะแนนเดิม
        if (ensureAttendance(d)) localStorage.setItem(STORE_KEY, JSON.stringify(d));
        return d;
      }
    }
  } catch (e) { /* ใช้ seed แทน */ }
  return buildSeed();
}
function persist() {
  dataVersion++;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* เบราว์เซอร์ไม่อนุญาต */ }
}

/* =========================================================
 *  Helpers
 * ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const view = $('#view');

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const icon = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
const fullName = (s) => `${s.prefix}${s.first} ${s.last}`;
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const sectionById = (id) => db.sections.find((s) => s.id === id);
const termOf = (key) => TERMS.find((t) => t.key === key);

function thDate(d, withTime = false) {
  const date = new Date(d);
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('th-TH', opts);
}
function relTime(t) {
  if (!t) return '—';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return thDate(t);
}
function daysLeft(dateStr) {
  const end = new Date(dateStr + 'T23:59:59');
  return Math.ceil((end - Date.now()) / 86400000);
}
/* ---------- วงจรสถานะ (ADR 0002) & บทบาท (ADR 0003) ---------- */
const isLocked = (sec) => sec.state === 'pending' || sec.state === 'approved';
const lastReview = (sec) => (sec.reviews && sec.reviews.length ? sec.reviews[sec.reviews.length - 1] : null);
const isReturned = (sec) => sec.state === 'draft' && lastReview(sec)?.decision === 'returned';
const hasUnlockRequest = (sec) => sec.unlockRequest?.status === 'pending';
const isAcademic = () => ui.role === 'academic';
const isSelfReview = (sec) => sec.teacherId === CURRENT_USER_ID;
const teacherName = (sec) => userById(sec.teacherId)?.name || '—';
const mySections = (term) => db.sections.filter((s) => s.teacherId === CURRENT_USER_ID && (!term || s.term === term));
const secBase = (sec) => (isAcademic() ? `#/a/s/${sec.id}` : `#/s/${sec.id}`);
function logEvent(sec, to, extra = {}) {
  sec.history.unshift({ t: Date.now(), who: TEACHER.name, student: '—', field: 'สถานะ', from: '', to, kind: 'event', ...extra });
}

/* หมุดที่ต้องแสดงในตาราง: ฝ่ายวิชาการเห็นหมุดของรอบที่กำลังตรวจ ครูเห็นหมุดของรอบที่ถูกตีกลับ (ADR 0006) */
function visibleNotes(sec) {
  const r = lastReview(sec);
  if (!r) return [];
  if (isAcademic()) return sec.state === 'pending' && !r.decision ? r.notes : [];
  return isReturned(sec) ? r.notes : [];
}

function deadlineText(sec) {
  if (isLocked(sec)) return `ส่งแล้ว ${thDate(sec.submittedAt)}`;
  const d = daysLeft(sec.deadline);
  if (d < 0) return `<span style="color:var(--bad)">เลยกำหนดส่ง ${-d} วัน</span>`;
  if (d === 0) return `<span style="color:var(--bad)">ครบกำหนดส่งวันนี้</span>`;
  return `กำหนดส่ง ${thDate(sec.deadline)} <span class="${d <= 7 ? '' : 'faint'}" style="${d <= 7 ? 'color:var(--warn);font-weight:600' : ''}">(เหลือ ${d} วัน)</span>`;
}

const GROUPS = {
  collect: { label: 'คะแนนเก็บ', cls: 'collect', color: 'var(--collect)' },
  mid: { label: 'สอบกลางภาค', cls: 'mid', color: 'var(--mid)' },
  final: { label: 'สอบปลายภาค', cls: 'final', color: 'var(--final)' },
};
const GROUP_KEYS = ['collect', 'mid', 'final'];

const STATUS = {
  pass: { label: 'ผ่าน', chip: 'chip-ok' },
  'remedial-pass': { label: 'ผ่าน (สอบซ่อม)', chip: 'chip-ok' },
  fail: { label: 'มีสิทธิ์สอบซ่อม', chip: 'chip-bad' },
  r: { label: 'ร · รอการตัดสิน', chip: 'chip-warn' },
  ms: { label: 'มส · เวลาเรียนไม่ถึง', chip: 'chip-ms' },
  incomplete: { label: 'ยังกรอกไม่ครบ', chip: '' },
  invalid: { label: 'ข้อมูลไม่ถูกต้อง', chip: 'chip-bad' },
  nostruct: { label: 'ยังไม่มีโครงสร้าง', chip: '' },
};
const statusChip = (code) => `<span class="chip ${STATUS[code].chip}"><span class="dot"></span>${STATUS[code].label}</span>`;

/* =========================================================
 *  Parsing & calculation
 * ========================================================= */
function normalizeInput(v) {
  const t = String(v).trim();
  if (/^[rR]$/.test(t)) return 'ร';
  if (/^[xX]$/.test(t)) return 'ข';
  return v;
}
function parseScore(raw, max) {
  const t = String(raw ?? '').trim();
  if (t === '') return { type: 'empty' };
  if (SPECIAL_MARKS[t]) return { type: 'special', mark: t };
  if (/^-\d/.test(t)) return { type: 'invalid', msg: 'คะแนนต้องไม่ติดลบ' };
  if (!/^\d+(\.\d+)?$/.test(t)) return { type: 'invalid', msg: `กรอกได้เฉพาะตัวเลข 0–${max} หรือ ร / ข` };
  const n = parseFloat(t);
  if (n > max) return { type: 'invalid', msg: `คะแนนเกินคะแนนเต็ม (${max})` };
  return { type: 'num', n };
}
function parseLevel(raw) {
  const t = String(raw ?? '').trim();
  if (t === '') return { type: 'empty' };
  if (/^[0-3]$/.test(t)) return { type: 'num', n: +t };
  return { type: 'invalid', msg: 'กรอกระดับ 0–3 เท่านั้น' };
}
const STORE_OF = { score: 'scores', attr: 'attr', rtw: 'rtw' };
const dkey = (kind, sid, field) => `${kind}|${sid}|${field}`;

function savedRaw(sec, kind, sid, field) {
  const v = sec[STORE_OF[kind]]?.[sid]?.[field];
  return v == null ? '' : String(v);
}
function getRaw(sec, kind, sid, field) {
  if (ui.draftSection === sec.id) {
    const k = dkey(kind, sid, field);
    if (k in ui.draft) return ui.draft[k];
  }
  return savedRaw(sec, kind, sid, field);
}
function parseFor(sec, kind, field, raw) {
  if (kind === 'score') {
    const comp = sec.structure.find((c) => c.id === field);
    return parseScore(raw, comp ? comp.max : 0);
  }
  return parseLevel(raw);
}

function gradeFor(total) {
  const t = Math.round(total);
  return GRADE_SCALE.find((g) => t >= g.min).grade;
}

function computeStudent(sec, s) {
  const groups = { collect: 0, mid: 0, final: 0 };
  let missing = 0, invalid = 0;
  const special = [];
  sec.structure.forEach((c) => {
    const p = parseScore(getRaw(sec, 'score', s.id, c.id), c.max);
    if (p.type === 'num') groups[c.group] += (p.n / c.max) * c.weight;
    else if (p.type === 'empty') missing++;
    else if (p.type === 'special') special.push({ comp: c, mark: p.mark });
    else invalid++;
  });
  const total = groups.collect + groups.mid + groups.final;
  const att = attendancePercent(db, sec, s.id); // จากการเช็คชื่อรายคาบ (ADR 0011)
  let code, grade = '—';
  if (!sec.structure.length) code = 'nostruct';
  else if (att < MIN_ATTENDANCE) { code = 'ms'; grade = 'มส'; }
  else if (invalid) code = 'invalid';
  else if (special.length) { code = 'r'; grade = 'ร'; }
  else if (missing) code = 'incomplete';
  else {
    grade = gradeFor(total);
    if (grade === '0') {
      if (sec.remedial[s.id] != null && sec.remedial[s.id] >= 50) { grade = '1'; code = 'remedial-pass'; }
      else code = 'fail';
    } else code = 'pass';
  }
  return { groups, total, grade, code, missing, invalid, special, att };
}

function levelSummary(sec, kind, sid) {
  const items = kind === 'attr' ? ATTRIBUTES : RTW;
  let sum = 0, n = 0, bad = false;
  items.forEach((it) => {
    const p = parseLevel(getRaw(sec, kind, sid, it.id));
    if (p.type === 'num') { sum += p.n; n++; } else if (p.type === 'invalid') bad = true;
  });
  if (bad) return { done: false, bad: true };
  if (n < items.length) return { done: false, filled: n, total: items.length };
  const lv = Math.round(sum / n);
  return { done: true, level: lv, label: LEVELS.find((l) => l.v === lv).label, avg: sum / n };
}

function structureTotal(items) { return items.reduce((a, c) => a + (Number(c.weight) || 0), 0); }

function sectionProgress(sec) { return cached('prog', sec, () => sectionProgressRaw(sec)); }
function sectionProgressRaw(sec) {
  const n = sec.students.length;
  const structOk = sec.structure.length > 0 && structureTotal(sec.structure) === 100;
  let sf = 0, af = 0, rf = 0;
  sec.students.forEach((s) => {
    sec.structure.forEach((c) => { const p = parseScore(getRaw(sec, 'score', s.id, c.id), c.max); if (p.type === 'num' || p.type === 'special') sf++; });
    ATTRIBUTES.forEach((it) => { if (parseLevel(getRaw(sec, 'attr', s.id, it.id)).type === 'num') af++; });
    RTW.forEach((it) => { if (parseLevel(getRaw(sec, 'rtw', s.id, it.id)).type === 'num') rf++; });
  });
  const scores = sec.structure.length ? sf / (n * sec.structure.length) : 0;
  const attr = af / (n * ATTRIBUTES.length);
  const rtw = rf / (n * RTW.length);
  const overall = ((structOk ? 1 : 0) + scores + attr + rtw) / 4;
  return { structOk, scores, attr, rtw, overall, missingScores: sec.structure.length * n - sf };
}

/* แคชผลคำนวณรายห้อง (ภาพรวมฝ่ายวิชาการคำนวณทุกห้องพร้อมกัน) — ล้างเมื่อ persist() */
const calcCache = new Map();
function cached(kind, sec, fn) {
  if (ui.draftSection === sec.id && draftKeys().length) return fn();
  const k = `${kind}|${sec.id}`;
  const hit = calcCache.get(k);
  if (hit && hit.v === dataVersion) return hit.val;
  const val = fn();
  calcCache.set(k, { v: dataVersion, val });
  return val;
}
function sectionStats(sec) { return cached('stats', sec, () => sectionStatsRaw(sec)); }
function sectionStatsRaw(sec) {
  const rows = sec.students.map((s) => ({ s, r: computeStudent(sec, s) }));
  const done = rows.filter((x) => ['pass', 'fail', 'remedial-pass'].includes(x.r.code));
  const totals = done.map((x) => x.r.total);
  const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  const sd = totals.length ? Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length) : null;
  const count = (code) => rows.filter((x) => x.r.code === code).length;
  return {
    rows, mean, sd,
    max: totals.length ? Math.max(...totals) : null,
    min: totals.length ? Math.min(...totals) : null,
    pass: count('pass') + count('remedial-pass'),
    fail: count('fail'), r: count('r'), ms: count('ms'), incomplete: count('incomplete') + count('invalid'),
  };
}

function sectionState(sec) {
  if (sec.state === 'approved') return { key: 'approved', label: 'อนุมัติแล้ว', chip: 'chip-ok', icon: 'lock' };
  if (sec.state === 'pending') return { key: 'pending', label: 'รอฝ่ายวิชาการตรวจ', chip: 'chip-primary', icon: 'clock' };
  if (!sec.structure.length) return { key: 'nostructure', label: 'ยังไม่ตั้งโครงสร้างคะแนน', chip: 'chip-warn', icon: 'info' };
  if (isReturned(sec)) return { key: 'returned', label: 'ถูกตีกลับ · รอแก้ไข', chip: 'chip-bad', icon: 'alert' };
  const p = sectionProgress(sec);
  if (p.overall >= 0.999) return { key: 'ready', label: 'พร้อมส่งผลการเรียน', chip: 'chip-primary', icon: 'send' };
  return { key: 'draft', label: 'กำลังบันทึกคะแนน', chip: '', icon: 'clock' };
}

/* =========================================================
 *  Drafts (ข้อมูลที่แก้ไขแต่ยังไม่บันทึก)
 * ========================================================= */
function setDraft(sec, kind, sid, field, value) {
  if (ui.draftSection !== sec.id) { ui.draft = {}; ui.draftSection = sec.id; }
  const k = dkey(kind, sid, field);
  if (String(value).trim() === savedRaw(sec, kind, sid, field).trim()) delete ui.draft[k];
  else ui.draft[k] = String(value).trim();
}
function draftKeys(kind) {
  return Object.keys(ui.draft).filter((k) => !kind || k.startsWith(kind + '|'));
}
function structDirty() {
  if (!ui.structDraft) return false;
  const sec = sectionById(ui.structDraft.sid);
  return JSON.stringify(ui.structDraft.items) !== JSON.stringify(sec.structure);
}
function isDirty() { return draftKeys().length > 0 || structDirty(); }
function clearDrafts() { ui.draft = {}; ui.draftSection = null; ui.structDraft = null; }

function fieldLabel(sec, kind, field) {
  if (kind === 'score') return sec.structure.find((c) => c.id === field)?.name || field;
  const list = kind === 'attr' ? ATTRIBUTES : RTW;
  const prefix = kind === 'attr' ? 'คุณลักษณะฯ: ' : 'อ่านคิดวิเคราะห์ฯ: ';
  return prefix + (list.find((i) => i.id === field)?.name || field);
}

function saveDraft() {
  const sec = sectionById(ui.draftSection);
  if (!sec) return true;
  const keys = draftKeys();
  const bad = keys.filter((k) => { const [kind, , field] = k.split('|'); return parseFor(sec, kind, field, ui.draft[k]).type === 'invalid'; });
  if (bad.length) {
    toast(`ยังมี ${bad.length} ช่องที่ข้อมูลไม่ถูกต้อง กรุณาแก้ไขก่อนบันทึก`, 'bad');
    const [kind, sid, field] = bad[0].split('|');
    const el = $(`td[data-k="${kind}"][data-sid="${sid}"][data-f="${field}"] .cell`);
    if (el) el.focus();
    return false;
  }
  const now = Date.now();
  keys.forEach((k, i) => {
    const [kind, sid, field] = k.split('|');
    const store = sec[STORE_OF[kind]];
    const from = savedRaw(sec, kind, sid, field);
    store[sid] = store[sid] || {};
    if (ui.draft[k] === '') delete store[sid][field]; else store[sid][field] = ui.draft[k];
    const s = sec.students.find((x) => x.id === sid);
    sec.history.unshift({ t: now - i, who: TEACHER.name, student: fullName(s), field: fieldLabel(sec, kind, field), from, to: ui.draft[k] });
  });
  sec.updatedAt = now;
  ui.draft = {};
  persist();
  toast(`บันทึก ${keys.length} รายการเรียบร้อย · คำนวณผลการเรียนใหม่แล้ว`, 'ok');
  updateFollowBadge();
  return true;
}

/* =========================================================
 *  Toast / modal / popover
 * ========================================================= */
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'ok' ? 'check' : type === 'bad' ? 'alert' : 'info')}<span>${msg}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

function openModal({ title, body, actions = [], wide = false, onMount }) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="ปิด">${icon('x')}</button></div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-act="${i}" ${a.disabled ? 'disabled' : ''}>${a.icon ? icon(a.icon) : ''}${a.label}</button>`).join('')}</div>` : ''}
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
  return close;
}

function confirmModal({ title, message, okLabel = 'ยืนยัน', okCls = 'btn-primary', onOk }) {
  openModal({ title, body: `<p class="muted" style="margin:0">${message}</p>`, actions: [
    { label: 'ยกเลิก', cls: 'btn-ghost' },
    { label: okLabel, cls: okCls, onClick: onOk },
  ] });
}

let popEl = null;
function closePopover() { if (popEl) { popEl.remove(); popEl = null; } }
function openPopover(anchor, html, bind) {
  closePopover();
  popEl = document.createElement('div');
  popEl.className = 'popover';
  popEl.innerHTML = html;
  document.body.appendChild(popEl);
  const r = anchor.getBoundingClientRect();
  const w = popEl.offsetWidth;
  popEl.style.top = `${Math.min(r.bottom + 6, window.innerHeight - popEl.offsetHeight - 8)}px`;
  popEl.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
  bind(popEl);
}
document.addEventListener('mousedown', (e) => { if (popEl && !popEl.contains(e.target) && !e.target.closest('.ch-menu')) closePopover(); });
window.addEventListener('resize', closePopover);

/* =========================================================
 *  Router
 * ========================================================= */
let currentHash = location.hash || '#/';
let skipHash = false;

function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 's') return { page: 'section', id: parts[1], tab: parts[2] || 'scores' };
  if (parts[0] === 'a') {
    if (parts[1] === 's') return { page: 'asection', id: parts[2], tab: parts[3] || 'scores' };
    if (parts[1] === 'inbox') return { page: 'ainbox' };
    if (parts[1] === 'reports') return { page: 'areports' };
    return { page: 'aoverview' };
  }
  if (parts[0] === 'followup') return { page: 'followup' };
  if (parts[0] === 'criteria') return { page: 'criteria' };
  return { page: 'home' };
}
function leavesContext(from, to) {
  const a = parseRoute(from), b = parseRoute(to);
  if (structDirty() && !(a.page === 'section' && b.page === 'section' && a.id === b.id && b.tab === 'structure')) return true;
  if (draftKeys().length && !(b.page === 'section' && b.id === ui.draftSection)) return true;
  return false;
}
window.addEventListener('hashchange', () => {
  if (skipHash) { skipHash = false; return; }
  const next = location.hash || '#/';
  if (isDirty() && leavesContext(currentHash, next)) {
    skipHash = true;
    location.hash = currentHash;
    confirmLeave(next);
    return;
  }
  currentHash = next;
  route();
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
// หน้าเช็คชื่อ (attendance.html) เปิดอยู่อีกแท็บและบันทึกข้อมูล → โหลดใหม่ เพื่อไม่ให้เขียนทับกัน
window.addEventListener('storage', (e) => {
  if (e.key !== STORE_KEY || isDirty()) return;
  db = loadDb(); attTouch(); calcCache.clear(); dataVersion++; updateFollowBadge(); route();
});

function go(hash) {
  if (location.hash === hash) { route(); return; }
  location.hash = hash;
}

function confirmLeave(target) {
  const n = draftKeys().length;
  const what = structDirty() ? 'โครงสร้างคะแนนที่ยังไม่บันทึก' : `การแก้ไข ${n} ช่องที่ยังไม่บันทึก`;
  openModal({
    title: 'ยังไม่ได้บันทึก',
    body: `<p class="muted" style="margin:0">มี${what} ต้องการทำอย่างไร?</p>`,
    actions: [
      { label: 'อยู่หน้านี้ต่อ', cls: 'btn-ghost' },
      { label: 'ทิ้งการแก้ไข', cls: 'btn-danger', onClick: () => { clearDrafts(); go(target); } },
      { label: 'บันทึกแล้วไปต่อ', cls: 'btn-primary', icon: 'save', onClick: () => {
        const ok = structDirty() ? saveStructure(true) : saveDraft();
        if (!ok) return false;
        clearDrafts(); go(target);
      } },
    ],
  });
}

function route() {
  closePopover();
  const r = parseRoute(location.hash || '#/');
  // มุมมองมาจาก URL: #/a/... = ฝ่ายวิชาการ, หน้าเกณฑ์ใช้มุมมองเดิม
  if (r.page.startsWith('a')) {
    if (!TEACHER.roles.includes('academic')) { go('#/'); return; }
    setRole('academic');
  } else if (r.page !== 'criteria') setRole('teacher');
  const navKey = { section: 'home', asection: 'aoverview' }[r.page] || r.page;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
  $('#sidebar').classList.remove('open');
  $('#scrim').classList.remove('show');
  if (r.page !== 'section' || r.tab !== 'structure') ui.structDraft = null;
  if (r.page !== 'section' || r.id !== ui.draftSection) { if (!draftKeys().length) { ui.draft = {}; ui.draftSection = null; } }
  if (r.page === 'section' || r.page === 'asection') {
    const sec = sectionById(r.id);
    if (!sec) { go(isAcademic() ? '#/a' : '#/'); return; }
    // ครูผู้สอนเปิดได้เฉพาะห้องของตน ห้องอื่นให้ดูผ่านมุมมองฝ่ายวิชาการ
    if (r.page === 'section' && sec.teacherId !== CURRENT_USER_ID) { go(`#/a/s/${sec.id}/${r.tab}`); return; }
    if (ui.lastSection !== sec.id) { ui.search = ''; ui.onlyIncomplete = false; ui.resultFilter = 'all'; ui.focusCol = null; ui.lastSection = sec.id; ui.pinMode = false; }
    renderSection(sec, r.tab);
  } else if (r.page === 'followup') renderFollowup();
  else if (r.page === 'criteria') renderCriteria();
  else if (r.page === 'aoverview') renderAOverview();
  else if (r.page === 'ainbox') renderAInbox();
  else if (r.page === 'areports') renderAReports();
  else renderHome();
  window.scrollTo(0, 0);
}

/* ---------- ตัวสลับมุมมอง (ADR 0003) ---------- */
function setRole(role) {
  if (ui.role === role && $('#nav').dataset.role === role) return;
  ui.role = role;
  try { localStorage.setItem(ROLE_KEY, role); } catch (e) { /* ignore */ }
  $('#nav').dataset.role = role;
  $('#nav').innerHTML = role === 'academic' ? `
    <div class="nav-label">ฝ่ายวิชาการ</div>
    <a href="#/a" data-nav="aoverview"><svg><use href="#i-grid"/></svg>ภาพรวมทั้งโรงเรียน</a>
    <a href="#/a/inbox" data-nav="ainbox"><svg><use href="#i-inbox"/></svg>กล่องงาน<span class="nav-badge" id="followBadge"></span></a>
    <a href="#/a/reports" data-nav="areports"><svg><use href="#i-download"/></svg>รายงานภาพรวม</a>
    <a href="#/criteria" data-nav="criteria"><svg><use href="#i-scale"/></svg>เกณฑ์การตัดสินผล</a>` : `
    <div class="nav-label">ครูผู้สอน</div>
    <a href="#/" data-nav="home"><svg><use href="#i-home"/></svg>รายวิชาของฉัน</a>
    <a href="#/followup" data-nav="followup"><svg><use href="#i-alert"/></svg>นักเรียนที่ต้องติดตาม<span class="nav-badge" id="followBadge"></span></a>
    <a href="#/criteria" data-nav="criteria"><svg><use href="#i-scale"/></svg>เกณฑ์การตัดสินผล</a>
    <div class="nav-label">ระบบอื่น</div>
    <a href="attendance.html"><svg><use href="#i-check"/></svg>เช็คชื่อรายคาบ</a>`;
  $$('#roleSwitch button').forEach((b) => b.classList.toggle('on', b.dataset.role === role));
  document.body.classList.toggle('role-academic', role === 'academic');
  updateFollowBadge();
}

/* =========================================================
 *  Page: Home (รายวิชาของฉัน)
 * ========================================================= */
function renderHome() {
  $('#topbarTitle').textContent = 'รายวิชาของฉัน';
  const secs = mySections(ui.term);
  const submitted = secs.filter(isLocked).length;
  const follow = followupRows(ui.term).length;
  const pending = secs.filter((s) => !isLocked(s));
  const returnedN = secs.filter(isReturned).length;
  const nearest = pending.length ? Math.min(...pending.map((s) => daysLeft(s.deadline))) : null;
  const students = new Set(secs.flatMap((s) => s.students.map((x) => x.id + s.room))).size;

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>สวัสดี, ${esc(TEACHER.name)}</h1>
        <p>เลือกรายวิชาเพื่อตั้งโครงสร้างคะแนน กรอกคะแนน และส่งผลการเรียน</p>
      </div>
      <div class="filters">
        <select class="select" id="termSel" aria-label="ภาคเรียน">
          ${TERMS.map((t) => `<option value="${t.key}" ${t.key === ui.term ? 'selected' : ''}>${t.label}${t.current ? ' (ปัจจุบัน)' : ''}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="stat-row">
      <div class="card stat"><div class="stat-label">รายวิชา/ห้องที่สอน</div><div class="stat-value">${secs.length} <small>ห้อง · ${students} คน</small></div></div>
      <div class="card stat"><div class="stat-label">ส่งผลการเรียนแล้ว</div><div class="stat-value">${submitted}<small> / ${secs.length}</small></div>${returnedN ? `<div style="font-size:12.5px;color:var(--bad);font-weight:600">${returnedN} ห้องถูกตีกลับ รอแก้ไข</div>` : ''}</div>
      <div class="card stat"><div class="stat-label">นักเรียนที่ต้องติดตาม</div><div class="stat-value" style="color:${follow ? 'var(--bad)' : 'inherit'}">${follow} <small>คน</small></div></div>
      <div class="card stat"><div class="stat-label">ใกล้ครบกำหนดส่ง</div><div class="stat-value">${nearest == null ? '—' : nearest < 0 ? '<span style="color:var(--bad)">เลยกำหนด</span>' : `${nearest} <small>วัน</small>`}</div></div>
    </div>

    ${secs.length ? `<div class="section-grid">${secs.map(secCard).join('')}</div>` : `
      <div class="card empty">
        <div class="empty-icon">${icon('info')}</div>
        <h3>ยังไม่มีรายวิชาในภาคเรียนนี้</h3>
        <div>ฝ่ายวิชาการยังไม่ได้มอบหมายรายวิชาให้ท่านในภาคเรียนที่เลือก</div>
      </div>`}
  `;
  $('#termSel').addEventListener('change', (e) => { ui.term = e.target.value; renderHome(); updateFollowBadge(); });
}

function secCard(sec) {
  const p = sectionProgress(sec);
  const st = sectionState(sec);
  const stats = sec.structure.length ? sectionStats(sec) : null;
  const tab = isLocked(sec) ? 'results' : !sec.structure.length ? 'structure' : 'scores';
  const step = (label, v, done) => `<div class="sec-step ${done ? 'done' : ''}"><div class="bar"><span style="width:${Math.round(v * 100)}%"></span></div>${label}</div>`;
  const flagged = stats ? stats.fail + stats.r + stats.ms : 0;
  return `
    <a class="card sec-card" href="#/s/${sec.id}/${tab}">
      <div class="sec-top">
        <div style="min-width:0">
          <div class="sec-code">${sec.code} · ${sec.type}</div>
          <div class="sec-name">${esc(sec.name)}</div>
        </div>
        <div class="sec-room">${sec.room}</div>
      </div>
      <div class="sec-meta">
        <span>${icon('users')}${sec.students.length} คน</span>
        <span>${sec.credit} หน่วยกิต</span>
        <span>${icon('clock')}${deadlineText(sec)}</span>
      </div>
      <div class="sec-steps">
        ${step('โครงสร้าง', p.structOk ? 1 : 0, p.structOk)}
        ${step(`คะแนน ${Math.round(p.scores * 100)}%`, p.scores, p.scores >= 0.999)}
        ${step('คุณลักษณะ', p.attr, p.attr >= 0.999)}
        ${step('อ่านคิดฯ', p.rtw, p.rtw >= 0.999)}
      </div>
      <div class="sec-foot">
        <span class="row" style="gap:6px"><span class="chip ${st.chip}">${icon(st.icon)}${st.label}</span>${hasUnlockRequest(sec) ? `<span class="chip chip-warn">${icon('lock')}ขอปลดล็อก</span>` : ''}</span>
        <span class="muted">${flagged ? `<span style="color:var(--bad);font-weight:600">${flagged} คนต้องติดตาม</span>` : sec.updatedAt ? `แก้ไข ${relTime(sec.updatedAt)}` : ''}</span>
      </div>
    </a>`;
}

/* =========================================================
 *  Page: Section workspace
 * ========================================================= */
const TABS = [
  { id: 'structure', label: 'โครงสร้างคะแนน', n: 1 },
  { id: 'scores', label: 'กรอกคะแนน', n: 2 },
  { id: 'attr', label: 'คุณลักษณะอันพึงประสงค์', n: 3 },
  { id: 'rtw', label: 'อ่าน คิดวิเคราะห์ และเขียน', n: 4 },
  { id: 'results', label: 'ผลการเรียน & ส่งผล', n: 5 },
  { id: 'history', label: 'ประวัติการแก้ไข' },
];

function renderSection(sec, tab) {
  if (!TABS.find((t) => t.id === tab)) tab = 'scores';
  const aca = isAcademic();
  $('#topbarTitle').textContent = `${aca ? 'ภาพรวมทั้งโรงเรียน' : 'รายวิชาของฉัน'}  ›  ${sec.code} ${sec.name}  ›  ${sec.room}`;
  const p = sectionProgress(sec);
  const stats = sec.structure.length ? sectionStats(sec) : null;
  const st = sectionState(sec);
  const done = { structure: p.structOk, scores: p.scores >= 0.999, attr: p.attr >= 0.999, rtw: p.rtw >= 0.999, results: sec.state === 'approved' };
  const pct = Math.round(p.overall * 100);

  view.innerHTML = `
    <a class="back-link no-print" href="${aca ? '#/a' : '#/'}">${icon('back')}${aca ? 'ภาพรวมทั้งโรงเรียน' : 'รายวิชาของฉัน'}</a>
    <div class="card ws-head">
      <div class="ws-title">
        <div class="sec-room">${sec.room}</div>
        <div style="min-width:0">
          <div class="sec-code">${sec.code} · รายวิชา${sec.type}</div>
          <h1>${esc(sec.name)}</h1>
          <div class="ws-sub">
            <span>${termOf(sec.term).label}</span>
            <span>${sec.credit} หน่วยกิต · ${sec.hours} ชม.</span>
            ${aca ? `<span>${icon('users')} ${esc(teacherName(sec))}</span>` : ''}
            <span>${sec.students.length} คน</span>
            <span>${deadlineText(sec)}</span>
          </div>
          ${aca ? academicBadges(sec) : ''}
        </div>
      </div>
      <div class="ws-kpis">
        <div class="kpi"><div class="kpi-label">คะแนนเฉลี่ย</div><div class="kpi-value num">${stats && stats.mean != null ? fmt1(stats.mean) : '—'}</div></div>
        <div class="kpi"><div class="kpi-label">ต้องติดตาม</div><div class="kpi-value num" style="color:${stats && stats.fail + stats.r + stats.ms ? 'var(--bad)' : 'inherit'}">${stats ? stats.fail + stats.r + stats.ms : '—'}</div></div>
        <div class="kpi"><div class="kpi-label">สถานะ</div><div><span class="chip ${st.chip}">${st.label}</span></div></div>
        <div class="ring ${pct === 100 ? 'ok' : ''}" style="--p:${pct}" title="ความคืบหน้าโดยรวม"><span>${pct}%</span></div>
      </div>
    </div>
    ${aca ? '' : returnedBanner(sec)}
    <nav class="tabs no-print">
      ${TABS.map((t) => `<a class="tab ${t.id === tab ? 'active' : ''}" href="${secBase(sec)}/${t.id}">
        ${t.n ? `<span class="step ${done[t.id] && t.id !== tab ? 'done' : ''}">${done[t.id] && t.id !== tab ? icon('check') : t.n}</span>` : icon('clock')}${t.label}</a>`).join('')}
    </nav>
    <div id="tabBody"></div>
    ${aca ? '<div id="decisionBar" class="actionbar no-print"></div>' : ''}
  `;
  if (aca) renderDecisionBar(sec);
  else bindReturnedBanner(sec);
  const body = $('#tabBody');
  if (tab === 'structure') renderStructure(sec, body);
  else if (tab === 'scores') renderGridTab(sec, body, 'score');
  else if (tab === 'attr') renderGridTab(sec, body, 'attr');
  else if (tab === 'rtw') renderGridTab(sec, body, 'rtw');
  else if (tab === 'results') renderResults(sec, body);
  else renderHistory(sec, body);
}

function lockedCallout(sec) {
  if (isAcademic()) {
    const msg = sec.state === 'draft'
      ? '<b>มุมมองฝ่ายวิชาการ · ดูได้อย่างเดียว</b> — ห้องนี้ยังไม่ส่งผลการเรียน ข้อมูลที่เห็นคือข้อมูลที่ครูบันทึกแล้ว และอาจเปลี่ยนแปลงได้'
      : sec.state === 'pending'
        ? `<b>มุมมองฝ่ายวิชาการ · ดูได้อย่างเดียว</b> — ${ui.pinMode ? 'โหมดปักหมุดเปิดอยู่: คลิกช่องคะแนนหรือชื่อนักเรียนเพื่อเพิ่มข้อสังเกต' : 'เปิด “โหมดปักหมุด” ที่แถบด้านล่างเพื่อชี้จุดที่ต้องแก้ก่อนตีกลับ'}`
        : '<b>อนุมัติแล้ว</b> — ข้อมูลถูกล็อก';
    return `<div class="callout ${sec.state === 'draft' ? 'warn' : ''}" style="margin-bottom:12px">${icon(sec.state === 'draft' ? 'info' : 'lock')}<div>${msg}</div></div>`;
  }
  const what = sec.state === 'approved' ? `ฝ่ายวิชาการอนุมัติแล้วเมื่อ ${thDate(lastReview(sec)?.decidedAt, true)}` : `ส่งผลการเรียนแล้วเมื่อ ${thDate(sec.submittedAt, true)} · รอฝ่ายวิชาการตรวจ`;
  return `<div class="callout ok" style="margin-bottom:12px">${icon('lock')}<div><b>${what}</b> — ข้อมูลถูกล็อก ดูได้อย่างเดียว หากต้องการแก้ไขให้ยื่น “คำขอปลดล็อก” ในแท็บผลการเรียน</div></div>`;
}

/* ---------- แถบแจ้งการตีกลับ (มุมมองครูผู้สอน, ADR 0006) ---------- */
function returnedBanner(sec) {
  if (!isReturned(sec)) return '';
  const r = lastReview(sec);
  const notes = r.notes;
  const open = notes.filter((n) => !n.resolved).length;
  if (ui.bannerCollapsed === sec.id) {
    return `<div class="card returned-card no-print" id="returnedCard" style="padding:10px 16px"><div class="row" style="gap:10px">
      <span style="color:var(--bad)">${icon('alert')}</span><b>ถูกตีกลับให้แก้ไข</b><span class="muted" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.reason)}</span>
      ${notes.length ? `<span class="chip ${open ? 'chip-bad' : 'chip-ok'}">หมุดค้าง ${open}/${notes.length}</span>` : ''}
      <button class="btn btn-sm btn-ghost" data-banner="expand">แสดง</button></div></div>`;
  }
  return `<div class="card returned-card no-print" id="returnedCard">
    <div class="row" style="align-items:flex-start;gap:12px">
      <span class="cl-icon cl-bad" style="width:32px;height:32px">${icon('alert')}</span>
      <div style="flex:1;min-width:0">
        <div class="row wrap" style="gap:8px"><b style="font-size:15.5px">ฝ่ายวิชาการตีกลับให้แก้ไข</b><span class="faint" style="font-size:13px">โดย ${esc(userById(r.reviewerId)?.name)} · ${relTime(r.decidedAt)} · รอบที่ ${sec.reviews.length}</span><span class="spacer"></span><button class="btn btn-sm btn-ghost" data-banner="collapse">ย่อ</button></div>
        <div style="margin-top:4px">${esc(r.reason)}</div>
        ${notes.length ? `<div class="note-list">${notes.map((n) => {
          const st = sec.students.find((x) => x.id === n.sid);
          const where = n.field ? `${fullName(st)} · ${esc(fieldLabel(sec, fieldKind(sec, n.field), n.field))}` : `${fullName(st)} · ทั้งแถว`;
          return `<div class="note-item ${n.resolved ? 'resolved' : ''}">
            <span class="pin-dot"></span>
            <div style="flex:1;min-width:0"><div class="faint" style="font-size:12.5px">${where}</div><div>${esc(n.text)}</div></div>
            <button class="btn btn-sm btn-ghost" data-goto-note="${n.id}">ไปที่ช่อง ${icon('chev')}</button>
            <button class="btn btn-sm ${n.resolved ? '' : 'btn-ok'}" data-resolve="${n.id}">${n.resolved ? 'ยกเลิก' : `${icon('check')}แก้แล้ว`}</button>
          </div>`;
        }).join('')}</div>` : ''}
        <div class="faint" style="font-size:13px;margin-top:8px">${notes.length ? `แก้แล้ว ${notes.length - open}/${notes.length} หมุด · ` : ''}แก้ไขเสร็จแล้วให้ไปที่แท็บ “ผลการเรียน & ส่งผล” เพื่อส่งใหม่</div>
      </div>
    </div>
  </div>`;
}
function fieldKind(sec, field) {
  if (sec.structure.some((c) => c.id === field)) return 'score';
  if (ATTRIBUTES.some((a) => a.id === field)) return 'attr';
  return 'rtw';
}
function bindReturnedBanner(sec) {
  const card = $('#returnedCard');
  if (!card) return;
  card.addEventListener('click', (e) => {
    const bn = e.target.closest('[data-banner]');
    if (bn) { ui.bannerCollapsed = bn.dataset.banner === 'collapse' ? sec.id : null; renderSection(sec, parseRoute(location.hash).tab); return; }
    const res = e.target.closest('[data-resolve]');
    const gt = e.target.closest('[data-goto-note]');
    const notes = lastReview(sec).notes;
    if (res) {
      const n = notes.find((x) => x.id === res.dataset.resolve);
      n.resolved = !n.resolved;
      persist();
      const tab = parseRoute(location.hash).tab;
      renderSection(sec, tab);
    } else if (gt) {
      const n = notes.find((x) => x.id === gt.dataset.gotoNote);
      const kind = n.field ? fieldKind(sec, n.field) : 'score';
      ui.search = ''; ui.onlyIncomplete = false;
      ui.gotoCell = { sid: n.sid, field: n.field };
      go(`#/s/${sec.id}/${kind === 'score' ? 'scores' : kind}`);
    }
  });
}

/* ---------- Tab 1: โครงสร้างคะแนน ---------- */
function renderStructure(sec, body) {
  if (!ui.structDraft || ui.structDraft.sid !== sec.id) ui.structDraft = { sid: sec.id, items: JSON.parse(JSON.stringify(sec.structure)) };
  const items = ui.structDraft.items;
  const locked = isLocked(sec) || isAcademic();

  if (!items.length && (locked || isAcademic())) {
    body.innerHTML = `<div class="card empty"><div class="empty-icon">${icon('scale')}</div><h3>ครูผู้สอนยังไม่ได้ตั้งโครงสร้างคะแนน</h3><div>${esc(teacherName(sec))} ยังไม่ได้เริ่มบันทึกรายวิชานี้</div></div>`;
    return;
  }
  if (!items.length) {
    const siblings = db.sections.filter((s) => s.id !== sec.id && s.code === sec.code && s.structure.length);
    body.innerHTML = `
      <div class="card empty">
        <div class="empty-icon">${icon('scale')}</div>
        <h3>ยังไม่ได้ตั้งโครงสร้างคะแนนของรายวิชานี้</h3>
        <div>กำหนดองค์ประกอบคะแนน คะแนนเต็ม และสัดส่วน (รวม 100%) เพื่อใช้เป็นแม่แบบในการกรอกคะแนน</div>
        <div class="row wrap" style="justify-content:center;margin-top:18px">
          ${siblings.map((s) => `<button class="btn btn-primary" data-copy="${s.id}">${icon('users')}คัดลอกจาก ${s.code} ${s.room}</button>`).join('')}
          <button class="btn" data-tpl="602020">แม่แบบ เก็บ 60 : กลางภาค 20 : ปลายภาค 20</button>
          <button class="btn" data-tpl="7030">แม่แบบ เก็บ 70 : ปลายภาค 30</button>
          <button class="btn btn-ghost" data-tpl="blank">${icon('plus')}เริ่มจากว่าง</button>
        </div>
      </div>`;
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy],[data-tpl]');
      if (!b) return;
      if (b.dataset.copy) ui.structDraft.items = JSON.parse(JSON.stringify(sectionById(b.dataset.copy).structure)).map((c) => ({ ...c, indicators: c.indicators.filter((i) => (INDICATORS[sec.code] || []).some((x) => x.id === i)) }));
      else if (b.dataset.tpl === '602020') ui.structDraft.items = [
        newComp('collect', 'งานที่ 1', 10, 20), newComp('collect', 'งานที่ 2', 10, 20), newComp('collect', 'จิตพิสัย', 10, 20),
        newComp('mid', 'สอบกลางภาค', 20, 20), newComp('final', 'สอบปลายภาค', 20, 20)];
      else if (b.dataset.tpl === '7030') ui.structDraft.items = [
        newComp('collect', 'งานที่ 1', 20, 25), newComp('collect', 'งานที่ 2', 20, 25), newComp('collect', 'ทดสอบย่อย', 20, 20),
        newComp('final', 'สอบปลายภาค', 30, 30)];
      else ui.structDraft.items = [newComp('collect', '', 10, 10)];
      renderStructure(sec, freshBody(body));
    });
    return;
  }

  const indList = INDICATORS[sec.code] || [];
  const groupBlock = (g) => {
    const rows = items.filter((c) => c.group === g);
    const gw = rows.reduce((a, c) => a + (Number(c.weight) || 0), 0);
    return `
      <div class="group-block">
        <div class="group-title"><span class="gdot" style="background:${GROUPS[g].color}"></span><h3>${GROUPS[g].label}</h3><span class="chip" data-gw="${g}">${gw}%</span></div>
        ${rows.length ? `<table class="struct">
          <thead><tr><th style="width:36%">ชื่อองค์ประกอบ</th><th>คะแนนเต็ม</th><th>สัดส่วน (%)</th><th>ตัวชี้วัด</th><th></th></tr></thead>
          <tbody>${rows.map((c) => `
            <tr data-cid="${c.id}">
              <td><input class="input" data-sf="name" value="${esc(c.name)}" placeholder="เช่น ใบงานที่ 1" ${locked ? 'disabled' : ''}></td>
              <td><input class="input num w-num" data-sf="max" value="${esc(c.max)}" inputmode="numeric" ${locked ? 'disabled' : ''}></td>
              <td><input class="input num w-num" data-sf="weight" value="${esc(c.weight)}" inputmode="numeric" ${locked ? 'disabled' : ''}></td>
              <td><div class="ind-list">${c.indicators.map((i) => `<span class="ind-chip" title="${esc(indList.find((x) => x.id === i)?.text || '')}">${esc(i)}</span>`).join('')}
                ${locked ? '' : `<button class="ind-add" data-ind="${c.id}">${c.indicators.length ? 'แก้ไข' : '+ ตัวชี้วัด'}</button>`}</div></td>
              <td style="width:44px">${locked ? '' : `<button class="icon-btn" data-del="${c.id}" title="ลบองค์ประกอบ" style="border:0">${icon('trash')}</button>`}</td>
            </tr>`).join('')}</tbody>
        </table>` : `<div class="faint" style="font-size:14px;padding:4px 0 8px">ยังไม่มีองค์ประกอบในหมวดนี้</div>`}
        ${locked ? '' : `<button class="btn btn-ghost btn-sm" data-add="${g}" style="margin-top:6px">${icon('plus')}เพิ่มองค์ประกอบ${GROUPS[g].label}</button>`}
      </div>`;
  };

  body.innerHTML = `
    ${locked ? lockedCallout(sec) : ''}
    <div class="struct-layout">
      <div class="card card-pad">
        <div class="row"><h3 style="font-size:16px">องค์ประกอบคะแนน</h3><span class="spacer"></span><span class="faint" style="font-size:13px">คะแนนที่กรอกจะถูกแปลงตามสัดส่วนอัตโนมัติ เช่น ได้ 15/20 ในองค์ประกอบ 10% = 7.5 คะแนน</span></div>
        <div id="weightBar"></div>
        ${GROUP_KEYS.map(groupBlock).join('')}
      </div>
      <div class="card card-pad" style="position:sticky;top:76px">
        <div id="structSummary"></div>
      </div>
    </div>`;
  updateStructSummary(sec);

  body.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-sf]');
    if (!inp) return;
    const c = items.find((x) => x.id === inp.closest('tr').dataset.cid);
    c[inp.dataset.sf] = inp.dataset.sf === 'name' ? inp.value : (inp.value.trim() === '' ? '' : Number(inp.value));
    updateStructSummary(sec);
  });
  body.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const del = e.target.closest('[data-del]');
    const ind = e.target.closest('[data-ind]');
    if (add) {
      const g = add.dataset.add;
      const remain = Math.max(0, 100 - structureTotal(items));
      const idx = items.map((c) => c.group).lastIndexOf(g);
      const comp = newComp(g, '', 10, Math.min(remain, 10));
      if (idx >= 0) items.splice(idx + 1, 0, comp);
      else items.splice(g === 'collect' ? 0 : g === 'mid' ? items.filter((c) => c.group === 'collect').length : items.length, 0, comp);
      renderStructure(sec, freshBody(body));
      const newInput = $(`tr[data-cid="${comp.id}"] [data-sf="name"]`);
      if (newInput) newInput.focus();
    } else if (del) {
      const c = items.find((x) => x.id === del.dataset.del);
      const hasScores = sec.students.some((s) => savedRaw(sec, 'score', s.id, c.id) !== '');
      const doDel = () => { ui.structDraft.items = items.filter((x) => x.id !== c.id); renderStructure(sec, freshBody($('#tabBody'))); };
      if (hasScores) confirmModal({
        title: `ลบ “${esc(c.name || 'องค์ประกอบ')}” ?`,
        message: 'องค์ประกอบนี้มีคะแนนที่บันทึกไว้แล้ว หากลบและบันทึกโครงสร้าง คะแนนในองค์ประกอบนี้ของนักเรียนทุกคนจะถูกลบด้วย และระบบจะคำนวณคะแนนรวมใหม่',
        okLabel: 'ลบองค์ประกอบ', okCls: 'btn-danger', onOk: doDel,
      });
      else doDel();
    } else if (ind) {
      openIndicatorPicker(sec, items.find((x) => x.id === ind.dataset.ind));
    } else if (e.target.closest('#saveStruct')) saveStructure();
    else if (e.target.closest('#revertStruct')) { ui.structDraft = null; renderStructure(sec, freshBody(body)); }
  });
}

function freshBody(body) {
  // ล้าง event listener เดิมโดยสร้าง element ใหม่
  const nb = body.cloneNode(false);
  body.replaceWith(nb);
  return nb;
}

let compSeq = 0;
function newComp(group, name, max, weight) {
  compSeq++;
  return { id: `n${Date.now().toString(36)}${compSeq}`, group, name, max, weight, indicators: [] };
}

function structIssues(items) {
  const issues = [];
  items.forEach((c) => {
    if (!String(c.name).trim()) issues.push('มีองค์ประกอบที่ยังไม่ได้ตั้งชื่อ');
    if (!(Number(c.max) > 0)) issues.push(`“${c.name || 'ไม่มีชื่อ'}” คะแนนเต็มต้องมากกว่า 0`);
    if (!(Number(c.weight) > 0)) issues.push(`“${c.name || 'ไม่มีชื่อ'}” สัดส่วนต้องมากกว่า 0`);
  });
  return [...new Set(issues)];
}

function updateStructSummary(sec) {
  const items = ui.structDraft.items;
  const total = structureTotal(items);
  const gw = {};
  GROUP_KEYS.forEach((g) => { gw[g] = items.filter((c) => c.group === g).reduce((a, c) => a + (Number(c.weight) || 0), 0); });
  GROUP_KEYS.forEach((g) => { const el = $(`[data-gw="${g}"]`); if (el) el.textContent = `${gw[g]}%`; });
  const scale = Math.max(total, 100);
  $('#weightBar').innerHTML = `<div class="weight-bar">
    ${GROUP_KEYS.map((g) => gw[g] ? `<div class="wb-${g}" style="width:${(gw[g] / scale) * 100}%">${GROUPS[g].label} ${gw[g]}%</div>` : '').join('')}
    ${total > 100 ? '' : ''}
  </div>
  <div class="row" style="font-size:13px;justify-content:space-between"><span class="faint">0%</span><span style="font-weight:700;color:${total === 100 ? 'var(--ok)' : total > 100 ? 'var(--bad)' : 'var(--warn)'}">รวม ${total}%${total < 100 ? ` · ขาดอีก ${100 - total}%` : total > 100 ? ` · เกิน ${total - 100}%` : ' ✓'}</span><span class="faint">100%</span></div>`;

  const issues = structIssues(items);
  const dirty = structDirty();
  const locked = isLocked(sec) || isAcademic();
  const hasScores = Object.values(sec.scores).some((o) => Object.keys(o).length);
  $('#structSummary').innerHTML = `
    <h3 style="font-size:16px;margin-bottom:10px">สรุปโครงสร้าง</h3>
    <div class="row" style="justify-content:space-between;font-size:14px;margin:6px 0"><span class="muted">จำนวนองค์ประกอบ</span><b>${items.length}</b></div>
    ${GROUP_KEYS.map((g) => `<div class="row" style="justify-content:space-between;font-size:14px;margin:6px 0"><span class="row" style="gap:8px"><span class="gdot" style="width:10px;height:10px;border-radius:3px;background:${GROUPS[g].color}"></span>${GROUPS[g].label}</span><b class="num">${gw[g]}%</b></div>`).join('')}
    <div class="row" style="justify-content:space-between;font-size:15px;margin:10px 0 14px;padding-top:10px;border-top:1px solid var(--border)"><b>รวม</b><b class="num" style="color:${total === 100 ? 'var(--ok)' : 'var(--bad)'}">${total}%</b></div>
    <div class="muted" style="font-size:13px;margin-bottom:12px">อัตราส่วน เก็บ : กลางภาค : ปลายภาค = <b>${gw.collect} : ${gw.mid} : ${gw.final}</b></div>
    ${total !== 100 ? `<div class="callout bad" style="margin-bottom:10px">${icon('alert')}<div>สัดส่วนคะแนนรวมต้องเท่ากับ 100% จึงจะบันทึกได้</div></div>` : ''}
    ${issues.length ? `<div class="callout warn" style="margin-bottom:10px">${icon('alert')}<div>${issues.map(esc).join('<br>')}</div></div>` : ''}
    ${dirty && hasScores && !locked ? `<div class="callout" style="margin-bottom:10px">${icon('info')}<div>เมื่อบันทึก ระบบจะคำนวณคะแนนรวมของนักเรียนที่บันทึกไปแล้วใหม่ทั้งหมด</div></div>` : ''}
    ${locked ? '' : `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
      <button class="btn btn-primary" id="saveStruct" ${total !== 100 || issues.length || !dirty ? 'disabled' : ''}>${icon('save')}บันทึกโครงสร้างคะแนน</button>
      ${dirty ? `<button class="btn btn-ghost" id="revertStruct">ยกเลิกการแก้ไข</button>` : `<div class="faint" style="font-size:13px;text-align:center">${sec.structure.length ? 'บันทึกแล้ว ไม่มีการเปลี่ยนแปลง' : ''}</div>`}
      ${!dirty && sec.structure.length ? `<a class="btn" href="#/s/${sec.id}/scores">ไปกรอกคะแนน ${icon('chev')}</a>` : ''}
    </div>`}`;
}

function saveStructure(silent) {
  const sec = sectionById(ui.structDraft.sid);
  const items = ui.structDraft.items;
  if (structureTotal(items) !== 100 || structIssues(items).length) { toast('โครงสร้างคะแนนยังไม่ถูกต้อง', 'bad'); return false; }
  const clean = items.map((c) => ({ ...c, name: String(c.name).trim(), max: Number(c.max), weight: Number(c.weight) }));
  const ids = new Set(clean.map((c) => c.id));
  Object.values(sec.scores).forEach((o) => Object.keys(o).forEach((k) => { if (!ids.has(k)) delete o[k]; }));
  sec.students.forEach((s) => { sec.scores[s.id] = sec.scores[s.id] || {}; });
  const first = !sec.structure.length;
  sec.structure = clean;
  sec.updatedAt = Date.now();
  sec.history.unshift({ t: Date.now(), who: TEACHER.name, student: '—', field: 'โครงสร้างคะแนน', from: '', to: `บันทึกโครงสร้างคะแนน (${clean.length} องค์ประกอบ รวม 100%)`, kind: 'event' });
  ui.structDraft = { sid: sec.id, items: JSON.parse(JSON.stringify(clean)) };
  persist();
  toast(first ? 'บันทึกโครงสร้างคะแนนแล้ว · พร้อมกรอกคะแนน' : 'บันทึกโครงสร้างแล้ว · คำนวณคะแนนรวมใหม่ทั้งหมด', 'ok');
  if (!silent) renderSection(sec, 'structure');
  return true;
}

function openIndicatorPicker(sec, comp) {
  const list = INDICATORS[sec.code] || [];
  openModal({
    title: `ตัวชี้วัดของ “${esc(comp.name || 'องค์ประกอบ')}”`,
    body: `<p class="muted" style="margin:0 0 12px">เลือกตัวชี้วัด/ผลการเรียนรู้ที่องค์ประกอบนี้วัด</p>
      <div class="check-list">${list.length ? '' : '<div class="faint">ยังไม่มีข้อมูลตัวชี้วัดของรายวิชานี้ในระบบ (Demo มีเฉพาะ ค22101, ค22201, ว22103)</div>'}${list.map((i) => `
        <label class="check-item"><input type="checkbox" value="${esc(i.id)}" ${comp.indicators.includes(i.id) ? 'checked' : ''}><div><b>${esc(i.id)}</b>${esc(i.text)}</div></label>`).join('')}</div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ตกลง', cls: 'btn-primary', onClick: () => {
        comp.indicators = $$('#modalRoot input[type=checkbox]:checked').map((x) => x.value);
        const sec2 = sectionById(ui.structDraft.sid);
        renderStructure(sec2, freshBody($('#tabBody')));
      } },
    ],
  });
}

/* ---------- Tab 2-4: ตารางกรอกข้อมูล (grid) ---------- */
function gridConfig(sec, kind) {
  if (kind === 'score') {
    const cols = sec.structure.map((c) => ({ field: c.id, label: c.name, meta: `เต็ม ${c.max} · ${c.weight}%`, group: c.group, max: c.max, title: c.indicators.join(', ') }));
    const groups = GROUP_KEYS.map((g) => ({ label: `${GROUPS[g].label} ${structureTotal(sec.structure.filter((c) => c.group === g))}%`, cls: `grp-${g}`, span: cols.filter((c) => c.group === g).length })).filter((g) => g.span);
    return {
      cols, groups,
      sumGroup: { label: 'สรุปผล (คำนวณอัตโนมัติ)', cls: 'grp-sum' },
      sumHeads: [...GROUP_KEYS.filter((g) => groups.some((x) => x.cls === `grp-${g}`)).map((g) => `${GROUPS[g].label.replace('คะแนน', '').replace('สอบ', '')}<div class="ch-meta">${structureTotal(sec.structure.filter((c) => c.group === g))}</div>`), 'รวม<div class="ch-meta">100</div>', 'เกรด', 'เวลาเรียน', 'สถานะ'],
      sumCells: (s) => {
        const r = computeStudent(sec, s);
        const cells = GROUP_KEYS.filter((g) => groups.some((x) => x.cls === `grp-${g}`)).map((g) => ['calc', fmt1(r.groups[g])]);
        cells.push(['calc total', r.code === 'incomplete' || r.code === 'invalid' ? `<span class="faint">${fmt1(r.total)}</span>` : fmt1(r.total)]);
        cells.push([`calc grade g-${r.grade}`, r.grade]);
        cells.push([`calc ${r.att < MIN_ATTENDANCE ? 'att-low' : ''}`, `${r.att}%`]);
        const extra = r.code === 'r' ? `<div class="faint" style="font-size:11.5px">${r.special.map((x) => `${x.mark === 'ข' ? 'ขาดสอบ' : 'รอส่ง'}: ${esc(x.comp.name)}`).join(', ')}</div>`
          : r.code === 'incomplete' ? `<div class="faint" style="font-size:11.5px">ขาด ${r.missing} ช่อง</div>` : '';
        cells.push(['status-cell', `<span class="chip ${STATUS[r.code].chip}" style="font-size:11.5px">${STATUS[r.code].label}</span>${extra}`]);
        return cells;
      },
      placeholder: '',
      legend: `<span><span class="sw" style="background:#fffbea;border-color:#e0a100"></span>แก้ไขแล้ว ยังไม่บันทึก</span>
        <span><span class="sw" style="background:#fdecec;border-color:#f4c7c7"></span>ข้อมูลไม่ถูกต้อง</span>
        <span><b style="color:var(--warn)">ร</b> รอส่งงาน · <b style="color:var(--warn)">ข</b> ขาดสอบ (พิมพ์ r / x ได้)</span>`,
    };
  }
  const items = kind === 'attr' ? ATTRIBUTES : RTW;
  return {
    cols: items.map((it, i) => ({ field: it.id, label: `${i + 1}. ${it.name}`, meta: 'ระดับ 0–3', group: kind, max: 3 })),
    groups: [{ label: kind === 'attr' ? 'คุณลักษณะอันพึงประสงค์ 8 ประการ' : 'การอ่าน คิดวิเคราะห์ และเขียน 5 ด้าน', cls: kind === 'attr' ? 'grp-attr' : 'grp-rtw', span: items.length }],
    sumGroup: { label: 'สรุป', cls: 'grp-sum' },
    sumHeads: ['ค่าเฉลี่ย', 'ผลการประเมิน'],
    sumCells: (s) => {
      const r = levelSummary(sec, kind, s.id);
      if (r.bad) return [['calc', '—'], ['status-cell', `<span class="chip chip-bad" style="font-size:11.5px">ข้อมูลไม่ถูกต้อง</span>`]];
      if (!r.done) return [['calc', '—'], ['status-cell', `<span class="chip" style="font-size:11.5px">ประเมินแล้ว ${r.filled}/${r.total}</span>`]];
      const chip = r.level === 3 ? 'chip-ok' : r.level === 0 ? 'chip-bad' : r.level === 1 ? 'chip-warn' : 'chip-primary';
      return [['calc total', r.avg.toFixed(2)], ['status-cell', `<span class="chip ${chip}" style="font-size:11.5px">${r.level} · ${r.label}</span>`]];
    },
    placeholder: '–',
    legend: `<span>ระดับ <b>3</b> ดีเยี่ยม · <b>2</b> ดี · <b>1</b> ผ่าน · <b>0</b> ไม่ผ่าน</span>
      <span><span class="sw" style="background:#fffbea;border-color:#e0a100"></span>แก้ไขแล้ว ยังไม่บันทึก</span>
      <span>สรุปผลจากค่าเฉลี่ยทุกข้อ (ปัดเศษ)</span>`,
  };
}

function rowIncomplete(sec, kind, s, cfg) {
  return cfg.cols.some((c) => { const p = parseFor(sec, kind, c.field, getRaw(sec, kind, s.id, c.field)); return p.type !== 'num' && p.type !== 'special'; });
}

function renderGridTab(sec, body, kind) {
  if (!sec.structure.length && kind === 'score' && isAcademic()) {
    body.innerHTML = `<div class="card empty"><div class="empty-icon">${icon('scale')}</div><h3>ยังไม่มีข้อมูลคะแนน</h3><div>ครูผู้สอนยังไม่ได้ตั้งโครงสร้างคะแนน</div></div>`;
    return;
  }
  if (!sec.structure.length && kind === 'score') {
    body.innerHTML = `<div class="card empty"><div class="empty-icon">${icon('scale')}</div><h3>ต้องตั้งโครงสร้างคะแนนก่อน</h3><div>ตารางกรอกคะแนนจะสร้างขึ้นตามองค์ประกอบที่กำหนดในโครงสร้างคะแนน</div>
      <a class="btn btn-primary" style="margin-top:16px" href="#/s/${sec.id}/structure">ไปตั้งโครงสร้างคะแนน ${icon('chev')}</a></div>`;
    return;
  }
  const locked = isLocked(sec) || isAcademic();
  const cfg = gridConfig(sec, kind);
  const q = ui.search.trim().toLowerCase();
  const students = sec.students.filter((s) => {
    if (q && !(`${s.no} ${s.id} ${fullName(s)}`.toLowerCase().includes(q))) return false;
    if (ui.onlyIncomplete && !rowIncomplete(sec, kind, s, cfg)) return false;
    return true;
  });

  const head1 = `<tr class="h1">
      <th class="sticky c-no" rowspan="2">เลขที่</th>
      <th class="sticky c-id" rowspan="2">รหัส</th>
      <th class="sticky c-name" rowspan="2">ชื่อ - สกุล</th>
      ${cfg.groups.map((g) => `<th class="grp ${g.cls}" colspan="${g.span}">${g.label}</th>`).join('')}
      <th class="grp ${cfg.sumGroup.cls}" colspan="${cfg.sumHeads.length}">${cfg.sumGroup.label}</th>
    </tr>`;
  const head2 = `<tr class="h2">
      ${cfg.cols.map((c, ci) => `<th class="col-head ${ui.focusCol === c.field ? 'focus-col' : ''}" data-col="${ci}" title="${esc(c.title || c.label)}">
        <div class="ch-name">${esc(c.label)}</div><div class="ch-meta">${c.meta}</div>
        ${locked ? '' : `<button class="ch-menu" data-colmenu="${ci}" aria-label="ตัวเลือกคอลัมน์">${icon('dots')}</button>`}</th>`).join('')}
      ${cfg.sumHeads.map((h) => `<th class="col-head" style="min-width:64px">${h}</th>`).join('')}
    </tr>`;

  const rowsHtml = students.map((s, ri) => `
    <tr data-sid="${s.id}">
      <td class="sticky c-no num">${s.no}</td>
      <td class="sticky c-id num">${s.id}</td>
      ${nameTd(sec, s)}
      ${cfg.cols.map((c, ci) => cellTd(sec, kind, s, c, ri, ci, locked, cfg.placeholder)).join('')}
      ${cfg.sumCells(s).map(([cls, html]) => `<td class="sum ${cls}">${html}</td>`).join('')}
    </tr>`).join('');

  body.innerHTML = `
    ${locked ? lockedCallout(sec) : ''}
    <div class="toolbar">
      <div class="search">${icon('search')}<input class="input" id="gridSearch" placeholder="ค้นหาชื่อ / รหัส / เลขที่" value="${esc(ui.search)}"></div>
      <label class="row" style="gap:6px;font-size:14px;cursor:pointer"><input type="checkbox" id="onlyInc" ${ui.onlyIncomplete ? 'checked' : ''} style="accent-color:var(--primary)">เฉพาะคนที่ยังไม่ครบ</label>
      <span class="spacer"></span>
      ${kind === 'score' && !locked ? `<button class="btn" id="importBtn">${icon('upload')}นำเข้าจาก Excel / CSV</button>` : ''}
      <button class="btn btn-ghost" id="kbdBtn" title="คีย์ลัด">${icon('keyboard')}คีย์ลัด</button>
    </div>
    <div class="grid-wrap" id="gridWrap">
      <table class="grid ${locked ? 'locked' : ''}" id="grid">
        <thead>${head1}${head2}</thead>
        <tbody>${rowsHtml || `<tr><td colspan="${3 + cfg.cols.length + cfg.sumHeads.length}" style="text-align:left;padding:24px;color:var(--text-2)">ไม่พบนักเรียนตามเงื่อนไขที่เลือก</td></tr>`}</tbody>
      </table>
    </div>
    <div class="row wrap legend" style="margin-top:10px">${cfg.legend}${visibleNotes(sec).length ? '<span><span class="pin-dot" style="position:static;display:inline-block"></span>หมุดข้อสังเกตจากฝ่ายวิชาการ (ชี้เมาส์เพื่ออ่าน)</span>' : ''}${isAcademic() ? '' : '<span class="faint">ข้อมูลที่บันทึกแล้ว ฝ่ายวิชาการมองเห็นได้</span>'}</div>
    ${locked ? '' : `<div class="actionbar" id="actionbar"></div>`}
  `;
  if (!locked) updateActionbar(sec, kind);
  body.classList.toggle('pinmode', isAcademic() && !!ui.pinMode && sec.state === 'pending');
  bindGrid(sec, kind, body, cfg);
}

function noteFor(sec, sid, field) {
  return visibleNotes(sec).find((n) => n.sid === sid && (n.field || null) === (field || null));
}
function nameTd(sec, s) {
  const n = noteFor(sec, s.id, null);
  return `<td class="sticky c-name ${n ? `has-note ${n.resolved ? 'note-resolved' : ''}` : ''}" data-namecell="${s.id}" ${n ? `title="${esc(n.text)}"` : ''}>${esc(fullName(s))}${n ? '<span class="pin-dot"></span>' : ''}</td>`;
}
function cellTd(sec, kind, s, c, ri, ci, locked, placeholder) {
  const raw = getRaw(sec, kind, s.id, c.field);
  const p = parseFor(sec, kind, c.field, raw);
  const dirty = ui.draftSection === sec.id && dkey(kind, s.id, c.field) in ui.draft;
  const note = noteFor(sec, s.id, c.field);
  const title = note ? `📌 ${note.text}` : p.type === 'invalid' ? p.msg : p.type === 'special' ? SPECIAL_MARKS[p.mark] : '';
  return `<td class="${tdClass(p, dirty)} ${ui.focusCol === c.field ? 'focus-col' : ''} ${note ? `has-note ${note.resolved ? 'note-resolved' : ''}` : ''}" data-k="${kind}" data-sid="${s.id}" data-f="${c.field}">
    <input class="cell" size="3" data-r="${ri}" data-c="${ci}" value="${esc(raw)}" placeholder="${placeholder}" ${locked ? 'readonly tabindex="-1"' : ''}
      autocomplete="off" aria-label="${esc(fullName(s))} ${esc(c.label)}" title="${esc(title)}"></td>`;
}
function tdClass(p, dirty) {
  return [p.type === 'invalid' ? 'is-invalid' : '', p.type === 'special' ? 'is-special' : '', p.type === 'empty' ? 'is-empty' : '', dirty ? 'is-dirty' : ''].join(' ').trim();
}

function refreshCell(sec, input) {
  const td = input.closest('td');
  const { k, sid, f } = td.dataset;
  const p = parseFor(sec, k, f, input.value);
  const dirty = dkey(k, sid, f) in ui.draft;
  const note = noteFor(sec, sid, f);
  td.className = `${tdClass(p, dirty)} ${ui.focusCol === f ? 'focus-col' : ''} ${note ? `has-note ${note.resolved ? 'note-resolved' : ''}` : ''}`;
  input.title = note ? `📌 ${note.text}` : p.type === 'invalid' ? p.msg : p.type === 'special' ? SPECIAL_MARKS[p.mark] : '';
}
function refreshRow(sec, kind, sid, cfg) {
  const tr = $(`#grid tr[data-sid="${sid}"]`);
  if (!tr) return;
  const s = sec.students.find((x) => x.id === sid);
  const tds = $$('td.sum', tr);
  cfg.sumCells(s).forEach(([cls, html], i) => { tds[i].className = `sum ${cls}`; tds[i].innerHTML = html; });
}

function updateActionbar(sec, kind) {
  const bar = $('#actionbar');
  if (!bar) return;
  const keys = ui.draftSection === sec.id ? draftKeys() : [];
  const invalid = keys.filter((k) => { const [kd, , f] = k.split('|'); return parseFor(sec, kd, f, ui.draft[k]).type === 'invalid'; }).length;
  const here = keys.filter((k) => k.startsWith(kind + '|')).length;
  const other = keys.length - here;
  const p = sectionProgress(sec);
  const prog = kind === 'score' ? p.scores : kind === 'attr' ? p.attr : p.rtw;
  bar.innerHTML = `
    <div class="ab-status">
      <div style="width:120px"><div class="progress ${prog >= 0.999 ? 'ok' : ''}"><span style="width:${Math.round(prog * 100)}%"></span></div></div>
      <span>กรอกแล้ว <strong>${Math.round(prog * 100)}%</strong></span>
    </div>
    <span class="faint">|</span>
    <div class="ab-status">${keys.length
      ? `<span class="dot" style="color:#e0a100"></span><span>แก้ไข <strong>${keys.length}</strong> ช่อง ยังไม่บันทึก${other ? ` <span class="faint">(${other} ช่องอยู่ในแท็บอื่น)</span>` : ''}</span>`
      : `<span style="color:var(--ok)">${icon('check')}</span><span>บันทึกแล้วทั้งหมด${sec.updatedAt ? ` · ${relTime(sec.updatedAt)}` : ''}</span>`}
      ${invalid ? `<button class="btn btn-sm btn-danger" id="gotoInvalid">${icon('alert')}ข้อมูลไม่ถูกต้อง ${invalid} ช่อง</button>` : ''}
    </div>
    <span class="spacer"></span>
    <button class="btn btn-ghost" id="discardBtn" ${keys.length ? '' : 'disabled'}>ยกเลิกการแก้ไข</button>
    <button class="btn btn-primary" id="saveBtn" ${keys.length && !invalid ? '' : 'disabled'} title="Ctrl + S">${icon('save')}${kind === 'score' ? 'บันทึกคะแนน' : 'บันทึกผลประเมิน'} <span class="kbd" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)">Ctrl+S</span></button>
  `;
}

function bindGrid(sec, kind, body, cfg) {
  const locked = isLocked(sec) || isAcademic();
  const grid = $('#grid');
  const rerender = () => {
    const wrap = $('#gridWrap');
    const top = wrap ? wrap.scrollTop : 0, left = wrap ? wrap.scrollLeft : 0;
    renderGridTab(sec, freshBody($('#tabBody')), kind);
    const w2 = $('#gridWrap');
    if (w2) { w2.scrollTop = top; w2.scrollLeft = left; }
  };
  const focusCell = (r, c) => {
    const el = grid.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (el) { el.focus(); return true; }
    return false;
  };
  const applyValue = (input, value) => {
    input.value = value;
    const td = input.closest('td');
    setDraft(sec, td.dataset.k, td.dataset.sid, td.dataset.f, value);
    refreshCell(sec, input);
    refreshRow(sec, kind, td.dataset.sid, cfg);
  };

  $('#gridSearch').addEventListener('input', (e) => {
    ui.search = e.target.value;
    rerender();
    const s = $('#gridSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
  });
  $('#onlyInc').addEventListener('change', (e) => { ui.onlyIncomplete = e.target.checked; rerender(); });
  $('#kbdBtn').addEventListener('click', showShortcuts);
  const imp = $('#importBtn');
  if (imp) imp.addEventListener('click', () => openImport(sec, rerender));

  if (ui.gotoCell) {
    const { sid, field } = ui.gotoCell;
    ui.gotoCell = null;
    const target = field ? $(`#grid td[data-sid="${sid}"][data-f="${field}"]`) : $(`#grid td[data-namecell="${sid}"]`);
    if (target) setTimeout(() => { target.scrollIntoView({ block: 'center', inline: 'center' }); const inp = target.querySelector('.cell'); if (inp && !locked) inp.focus(); target.classList.add('flash'); }, 30);
  }
  if (isAcademic()) {
    grid.addEventListener('click', (e) => {
      if (!ui.pinMode || sec.state !== 'pending') return;
      const td = e.target.closest('td[data-f], td[data-namecell]');
      if (!td) return;
      openNoteEditor(sec, td.dataset.sid || td.dataset.namecell, td.dataset.f || null, td, rerender);
    });
    return;
  }
  if (locked) return;

  grid.addEventListener('input', (e) => {
    const input = e.target.closest('.cell');
    if (!input) return;
    const norm = normalizeInput(input.value);
    if (norm !== input.value) input.value = norm;
    applyValue(input, input.value);
    updateActionbar(sec, kind);
  });
  grid.addEventListener('focusin', (e) => {
    const input = e.target.closest('.cell');
    if (!input) return;
    $$('#grid tr.row-focus').forEach((tr) => tr.classList.remove('row-focus'));
    input.closest('tr').classList.add('row-focus');
    setTimeout(() => input.select(), 0);
  });
  grid.addEventListener('keydown', (e) => {
    const input = e.target.closest('.cell');
    if (!input) return;
    const r = +input.dataset.r, c = +input.dataset.c;
    const rows = grid.querySelectorAll('tbody tr[data-sid]').length;
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nr = e.shiftKey && e.key === 'Enter' ? r - 1 : r + 1;
      if (!focusCell(nr, c) && e.key === 'Enter' && !e.shiftKey) focusCell(0, c + 1);
    } else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, c); }
    else if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) { e.preventDefault(); focusCell(r, c + 1); }
    else if (e.key === 'ArrowLeft' && input.selectionStart === 0) { e.preventDefault(); focusCell(r, c - 1); }
    else if (e.key === 'Escape') {
      const td = input.closest('td');
      applyValue(input, savedRaw(sec, td.dataset.k, td.dataset.sid, td.dataset.f));
      updateActionbar(sec, kind);
      input.select();
    }
    void rows;
  });
  grid.addEventListener('paste', (e) => {
    const input = e.target.closest('.cell');
    if (!input) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
    const r0 = +input.dataset.r, c0 = +input.dataset.c;
    let n = 0;
    lines.forEach((line, i) => line.split('\t').forEach((v, j) => {
      const el = grid.querySelector(`.cell[data-r="${r0 + i}"][data-c="${c0 + j}"]`);
      if (el) { applyValue(el, normalizeInput(v.trim())); n++; }
    }));
    updateActionbar(sec, kind);
    toast(`วางข้อมูลจาก Excel ${n} ช่อง · ตรวจสอบแล้วกดบันทึก`, 'ok');
  });
  grid.addEventListener('click', (e) => {
    const m = e.target.closest('[data-colmenu]');
    if (!m) return;
    const col = cfg.cols[+m.dataset.colmenu];
    openColumnMenu(m, sec, kind, col, cfg, rerender);
  });

  body.addEventListener('click', (e) => {
    if (e.target.closest('#saveBtn')) { if (saveDraft()) rerender(); }
    else if (e.target.closest('#discardBtn')) {
      confirmModal({ title: 'ยกเลิกการแก้ไข?', message: `การแก้ไข ${draftKeys().length} ช่องที่ยังไม่บันทึกจะหายไป และกลับไปใช้ค่าที่บันทึกล่าสุด`, okLabel: 'ยกเลิกการแก้ไข', okCls: 'btn-danger', onOk: () => { ui.draft = {}; rerender(); toast('ยกเลิกการแก้ไขแล้ว', 'info'); } });
    } else if (e.target.closest('#gotoInvalid')) {
      const bad = $('#grid td.is-invalid .cell');
      if (bad) bad.focus();
      else {
        const k = draftKeys().find((key) => { const [kd, , f] = key.split('|'); return parseFor(sec, kd, f, ui.draft[key]).type === 'invalid'; });
        if (k) go(`#/s/${sec.id}/${k.split('|')[0] === 'score' ? 'scores' : k.split('|')[0]}`);
      }
    }
  });
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    const saveBtn = $('#saveBtn') || $('#saveStruct');
    if (saveBtn) { e.preventDefault(); if (!saveBtn.disabled) saveBtn.click(); else if (!isDirty()) toast('ไม่มีการแก้ไขที่ต้องบันทึก', 'info'); else toast('ยังมีข้อมูลที่ไม่ถูกต้อง', 'bad'); }
  }
});

function openColumnMenu(anchor, sec, kind, col, cfg, rerender) {
  const students = sec.students;
  const setAll = (fn) => {
    let n = 0;
    students.forEach((s) => {
      const cur = getRaw(sec, kind, s.id, col.field);
      const v = fn(cur, s);
      if (v != null && v !== cur) { setDraft(sec, kind, s.id, col.field, v); n++; }
    });
    closePopover();
    rerender();
    toast(n ? `อัปเดต ${n} ช่องในคอลัมน์ “${col.label}” · ยังไม่บันทึก` : 'ไม่มีช่องที่ต้องเปลี่ยน', n ? 'ok' : 'info');
  };
  const isScore = kind === 'score';
  openPopover(anchor, `
    <div class="pop-title">${esc(col.label)}</div>
    <button data-a="focus">${icon('search')}${ui.focusCol === col.field ? 'เลิกไฮไลต์คอลัมน์' : 'ไฮไลต์คอลัมน์นี้ (กรอกทีละคอลัมน์)'}</button>
    <hr>
    ${isScore ? `
      <button data-a="full">${icon('check')}เติมคะแนนเต็ม (${col.max}) ให้ช่องว่าง</button>
      <button data-a="r">${icon('clock')}ใส่ “ร” ให้ช่องว่างทั้งหมด</button>` : `
      <button data-a="l3">${icon('check')}ตั้งทุกคนเป็นระดับ 3 (ดีเยี่ยม)</button>
      <button data-a="l2">${icon('check')}ตั้งช่องว่างเป็นระดับ 2 (ดี)</button>`}
    <hr>
    <button data-a="clear" style="color:var(--bad)">${icon('trash')}ล้างทั้งคอลัมน์</button>`, (pop) => {
    pop.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      if (a === 'focus') { ui.focusCol = ui.focusCol === col.field ? null : col.field; closePopover(); rerender(); if (ui.focusCol) setTimeout(() => $(`.cell[data-r="0"][data-c="${cfg.cols.indexOf(col)}"]`)?.focus(), 0); }
      else if (a === 'full') setAll((cur) => (cur === '' ? String(col.max) : null));
      else if (a === 'r') setAll((cur) => (cur === '' ? 'ร' : null));
      else if (a === 'l3') setAll(() => '3');
      else if (a === 'l2') setAll((cur) => (cur === '' ? '2' : null));
      else if (a === 'clear') setAll(() => '');
    });
  });
}

function showShortcuts() {
  const row = (k, d) => `<tr><td style="padding:6px 0;width:190px">${k}</td><td class="muted">${d}</td></tr>`;
  openModal({
    title: 'คีย์ลัดในตารางกรอกคะแนน',
    body: `<table style="width:100%;font-size:14px">
      ${row('<span class="kbd">Enter</span> / <span class="kbd">↓</span>', 'ไปคนถัดไป (คนสุดท้าย → คอลัมน์ถัดไป)')}
      ${row('<span class="kbd">Shift</span> + <span class="kbd">Enter</span> / <span class="kbd">↑</span>', 'ย้อนขึ้นคนก่อนหน้า')}
      ${row('<span class="kbd">Tab</span> / <span class="kbd">←</span> <span class="kbd">→</span>', 'ไปคอลัมน์ข้าง ๆ')}
      ${row('<span class="kbd">Esc</span>', 'คืนค่าช่องนี้เป็นค่าที่บันทึกล่าสุด')}
      ${row('<span class="kbd">Ctrl</span> + <span class="kbd">S</span>', 'บันทึกคะแนน')}
      ${row('<span class="kbd">Ctrl</span> + <span class="kbd">V</span>', 'วางคะแนนหลายช่องที่คัดลอกมาจาก Excel')}
      ${row('พิมพ์ <b>r</b> หรือ <b>ร</b>', 'รอส่งงาน (ร)')}
      ${row('พิมพ์ <b>x</b> หรือ <b>ข</b>', 'ขาดสอบ')}
    </table>`,
    actions: [{ label: 'เข้าใจแล้ว', cls: 'btn-primary' }],
  });
}

/* ---------- นำเข้า CSV ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function downloadFile(name, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileSafe = (s) => s.replace(/[\\/:*?"<>| ]+/g, '-');

function openImport(sec, rerender) {
  openModal({
    title: 'นำเข้าคะแนนจาก Excel / CSV',
    wide: true,
    body: `
      <ol class="steps-mini">
        <li><span>ดาวน์โหลดแม่แบบ ซึ่งมีรายชื่อนักเรียนและคอลัมน์ตามโครงสร้างคะแนนของรายวิชานี้ <button class="btn btn-sm" id="dlTpl" style="margin-left:6px">${icon('download')}ดาวน์โหลดแม่แบบ (.csv)</button></span></li>
        <li>เปิดด้วย Excel กรอกคะแนน แล้วบันทึกเป็น CSV (UTF-8)</li>
        <li>อัปโหลดไฟล์ ระบบจะจับคู่ตามรหัสนักเรียนและชื่อคอลัมน์ แล้วแสดงในตารางเป็น “ยังไม่บันทึก” ให้ตรวจสอบก่อน</li>
      </ol>
      <label class="dropzone" id="drop">${icon('upload')}<div><b>ลากไฟล์มาวาง</b> หรือคลิกเพื่อเลือกไฟล์ .csv</div><input type="file" accept=".csv,text/csv" id="fileIn" hidden></label>
      <div id="impResult" style="margin-top:12px"></div>
      <div class="callout" style="margin-top:12px">${icon('info')}<div><b>ทางลัด:</b> คัดลอกช่วงคะแนนจาก Excel แล้วคลิกช่องแรกในตาราง กด <span class="kbd">Ctrl</span>+<span class="kbd">V</span> ได้ทันทีโดยไม่ต้องนำเข้าไฟล์</div></div>`,
    actions: [{ label: 'ปิด', cls: 'btn-ghost' }],
    onMount: (m, close) => {
      $('#dlTpl', m).addEventListener('click', () => {
        const head = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', ...sec.structure.map((c) => `${c.name} (${c.max})`)];
        const lines = [head, ...sec.students.map((s) => [s.no, s.id, fullName(s), ...sec.structure.map((c) => getRaw(sec, 'score', s.id, c.id))])];
        downloadFile(`แม่แบบคะแนน_${sec.code}_${fileSafe(sec.room)}.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
      });
      const drop = $('#drop', m), fileIn = $('#fileIn', m);
      const handle = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const rows = parseCSV(String(reader.result).replace(/^﻿/, '')).filter((r) => r.some((c) => c.trim()));
          if (rows.length < 2) { $('#impResult', m).innerHTML = `<div class="callout bad">${icon('alert')}<div>ไฟล์ไม่มีข้อมูล</div></div>`; return; }
          const head = rows[0].map((h) => h.trim());
          const idCol = head.findIndex((h) => /รหัส/.test(h));
          const colMap = head.map((h) => sec.structure.find((c) => h === c.name || h.replace(/\s*\(\d+(\.\d+)?\)$/, '') === c.name));
          if (idCol < 0) { $('#impResult', m).innerHTML = `<div class="callout bad">${icon('alert')}<div>ไม่พบคอลัมน์ “รหัสนักเรียน” ในไฟล์</div></div>`; return; }
          let cells = 0, invalid = 0; const unknown = [];
          rows.slice(1).forEach((r) => {
            const s = sec.students.find((x) => x.id === String(r[idCol]).trim());
            if (!s) { unknown.push(r[idCol]); return; }
            colMap.forEach((comp, i) => {
              if (!comp || r[i] == null) return;
              const v = normalizeInput(String(r[i]).trim());
              if (v === getRaw(sec, 'score', s.id, comp.id)) return;
              setDraft(sec, 'score', s.id, comp.id, v); cells++;
              if (parseScore(v, comp.max).type === 'invalid') invalid++;
            });
          });
          const matched = colMap.filter(Boolean).length;
          close();
          rerender();
          toast(`นำเข้า ${cells} ช่อง จาก ${matched} คอลัมน์${unknown.length ? ` · ข้าม ${unknown.length} แถว (ไม่พบรหัส)` : ''}${invalid ? ` · ${invalid} ช่องข้อมูลไม่ถูกต้อง` : ''}`, invalid ? 'bad' : 'ok');
        };
        reader.readAsText(file, 'utf-8');
      };
      fileIn.addEventListener('change', () => handle(fileIn.files[0]));
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); handle(e.dataTransfer.files[0]); });
    },
  });
}

/* ---------- Tab 5: ผลการเรียน & ส่งผล ---------- */
function renderResults(sec, body) {
  if (!sec.structure.length) {
    body.innerHTML = `<div class="card empty"><div class="empty-icon">${icon('scale')}</div><h3>ยังไม่มีผลการเรียน</h3><div>ต้องตั้งโครงสร้างคะแนนและกรอกคะแนนก่อน</div>
      <a class="btn btn-primary" style="margin-top:16px" href="#/s/${sec.id}/structure">ไปตั้งโครงสร้างคะแนน ${icon('chev')}</a></div>`;
    return;
  }
  const st = sectionStats(sec);
  const locked = isLocked(sec) || isAcademic();
  const dirtyN = ui.draftSection === sec.id ? draftKeys().length : 0;
  const cats = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'];
  const dist = Object.fromEntries(cats.map((g) => [g, st.rows.filter((x) => x.r.grade === g).length]));
  const maxD = Math.max(1, ...Object.values(dist));
  const n = sec.students.length;

  const FILTERS = [
    ['all', 'ทั้งหมด', n], ['pass', 'ผ่าน', st.pass], ['fail', 'สอบซ่อม', st.fail], ['r', 'ร', st.r], ['ms', 'มส', st.ms], ['incomplete', 'ยังไม่ครบ', st.incomplete],
  ];
  const match = (code) => ui.resultFilter === 'all' || (ui.resultFilter === 'pass' ? ['pass', 'remedial-pass'].includes(code) : ui.resultFilter === 'incomplete' ? ['incomplete', 'invalid'].includes(code) : code === ui.resultFilter);
  const rows = st.rows.filter((x) => match(x.r.code));

  body.innerHTML = `
    ${dirtyN ? `<div class="callout warn" style="margin-bottom:12px">${icon('alert')}<div>ผลด้านล่างรวมการแก้ไข <b>${dirtyN} ช่อง</b> ที่ยังไม่บันทึก <a href="#/s/${sec.id}/scores">กลับไปบันทึก</a></div></div>` : ''}
    ${isAcademic() ? lockedCallout(sec) : isLocked(sec) ? teacherLockCallout(sec) : ''}
    <div class="print-only" style="margin-bottom:12px"><h2>รายงานผลการเรียน ${sec.code} ${esc(sec.name)} ชั้น ${sec.room}</h2><div>${termOf(sec.term).label} · ครูผู้สอน ${esc(teacherName(sec))}</div></div>
    <div class="results-top">
      <div class="card stat"><div class="stat-label">คะแนนเฉลี่ย</div><div class="stat-value num">${st.mean != null ? fmt1(st.mean) : '—'}</div><div class="faint" style="font-size:12.5px">SD ${st.sd != null ? fmt2(st.sd) : '—'}</div></div>
      <div class="card stat"><div class="stat-label">สูงสุด / ต่ำสุด</div><div class="stat-value num">${st.max != null ? `${fmt1(st.max)}<small> / ${fmt1(st.min)}</small>` : '—'}</div></div>
      <div class="card stat"><div class="stat-label">ผ่านเกณฑ์</div><div class="stat-value num" style="color:var(--ok)">${st.pass}<small> / ${n} คน</small></div><div class="faint" style="font-size:12.5px">${Math.round((st.pass / n) * 100)}%</div></div>
      <div class="card stat"><div class="stat-label">ต้องติดตาม (0 / ร / มส)</div><div class="stat-value num" style="color:${st.fail + st.r + st.ms ? 'var(--bad)' : 'inherit'}">${st.fail + st.r + st.ms}<small> คน</small></div><div class="faint" style="font-size:12.5px">ซ่อม ${st.fail} · ร ${st.r} · มส ${st.ms}</div></div>
      <div class="card dist"><div class="stat-label">การกระจายของระดับผลการเรียน</div>
        <div class="dist-bars">${cats.map((g) => `<div class="dist-bar ${g === '0' ? 'g0' : g === 'ร' || g === 'มส' ? 'gs' : ''}"><span class="n">${dist[g] || ''}</span><div class="b" style="height:${(dist[g] / maxD) * 64}px"></div><span class="l">${g}</span></div>`).join('')}</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="seg" id="resFilter">${FILTERS.map(([k, l, c]) => `<button data-f="${k}" class="${ui.resultFilter === k ? 'on' : ''}">${l}<span class="cnt">${c}</span></button>`).join('')}</div>
      <span class="spacer"></span>
      <button class="btn" id="csvBtn">${icon('download')}ส่งออก Excel (CSV)</button>
      <button class="btn" id="printBtn">${icon('print')}พิมพ์ / PDF</button>
      ${locked ? '' : `<button class="btn btn-ok" id="submitBtn">${icon('send')}ส่งผลการเรียน</button>`}
    </div>

    <div class="card list-wrap">
      <table class="list">
        <thead><tr>
          <th class="c">เลขที่</th><th>รหัส</th><th>ชื่อ - สกุล</th>
          ${GROUP_KEYS.filter((g) => sec.structure.some((c) => c.group === g)).map((g) => `<th class="r">${GROUPS[g].label.replace('คะแนน', '')}<div class="faint" style="font-weight:500">${structureTotal(sec.structure.filter((c) => c.group === g))}</div></th>`).join('')}
          <th class="r">รวม<div class="faint" style="font-weight:500">100</div></th><th class="c">เกรด</th><th class="c">คุณลักษณะฯ</th><th class="c">อ่านคิดฯ</th><th>สถานะ</th><th class="no-print"></th>
        </tr></thead>
        <tbody>${rows.map(({ s, r }) => {
          const a = levelSummary(sec, 'attr', s.id), w = levelSummary(sec, 'rtw', s.id);
          const complete = !['incomplete', 'invalid'].includes(r.code);
          let action = '';
          if (r.code === 'fail' && !locked) action = `<button class="btn btn-sm" data-rem="${s.id}">บันทึกผลสอบซ่อม</button>`;
          else if (r.code === 'remedial-pass') action = `<span class="faint" style="font-size:12.5px">ซ่อมได้ ${sec.remedial[s.id]}%</span>`;
          else if ((r.code === 'r' || r.code === 'incomplete' || r.code === 'invalid') && !locked) action = `<a class="btn btn-sm btn-ghost" data-goto="${s.id}">แก้ไขคะแนน ${icon('chev')}</a>`;
          return `<tr>
            <td class="c num faint">${s.no}</td><td class="num muted">${s.id}</td><td>${esc(fullName(s))}${r.code === 'r' ? `<div class="faint" style="font-size:12px">${r.special.map((x) => `${x.mark === 'ข' ? 'ขาดสอบ' : 'รอส่งงาน'}: ${esc(x.comp.name)}`).join(', ')}</div>` : ''}${r.code === 'ms' ? `<div class="faint" style="font-size:12px">เวลาเรียน ${r.att}% (เกณฑ์ ${MIN_ATTENDANCE}%)</div>` : ''}</td>
            ${GROUP_KEYS.filter((g) => sec.structure.some((c) => c.group === g)).map((g) => `<td class="r num">${fmt1(r.groups[g])}</td>`).join('')}
            <td class="r num" style="font-weight:700">${complete ? fmt1(r.total) : `<span class="faint">${fmt1(r.total)}</span>`}</td>
            <td class="c num" style="font-weight:800;font-size:15px;color:${r.grade === '0' ? 'var(--bad)' : r.grade === 'ร' ? 'var(--warn)' : r.grade === 'มส' ? 'var(--ms)' : 'inherit'}">${r.grade}</td>
            <td class="c">${a.done ? `${a.level}` : '<span class="faint">—</span>'}</td>
            <td class="c">${w.done ? `${w.level}` : '<span class="faint">—</span>'}</td>
            <td>${statusChip(r.code)}</td>
            <td class="no-print r">${action}</td>
          </tr>`;
        }).join('') || `<tr><td colspan="12" style="padding:28px;text-align:center;color:var(--text-2)">ไม่มีนักเรียนในกลุ่มนี้</td></tr>`}</tbody>
      </table>
    </div>`;

  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { ui.resultFilter = f.dataset.f; renderResults(sec, freshBody(body)); return; }
    const rem = e.target.closest('[data-rem]');
    if (rem) { openRemedial(sec, sec.students.find((s) => s.id === rem.dataset.rem)); return; }
    const g = e.target.closest('[data-goto]');
    if (g) { const s = sec.students.find((x) => x.id === g.dataset.goto); ui.search = s.id; ui.onlyIncomplete = false; go(`#/s/${sec.id}/scores`); return; }
    if (e.target.closest('#csvBtn')) exportResultsCSV(sec);
    else if (e.target.closest('#printBtn')) window.print();
    else if (e.target.closest('#submitBtn')) openSubmit(sec);
    else if (e.target.closest('#unlockBtn')) openUnlockRequest(sec);
  });
}

/* ---------- คำขอปลดล็อก (มุมมองครูผู้สอน, ADR 0005) ---------- */
function teacherLockCallout(sec) {
  const u = sec.unlockRequest;
  const head = sec.state === 'approved'
    ? `<b>ฝ่ายวิชาการอนุมัติแล้ว</b> เมื่อ ${thDate(lastReview(sec)?.decidedAt, true)} โดย ${esc(userById(lastReview(sec)?.reviewerId)?.name || '—')}`
    : `<b>ส่งผลการเรียนแล้ว · รอฝ่ายวิชาการตรวจ</b> ส่งเมื่อ ${thDate(sec.submittedAt, true)}`;
  let action;
  if (u && u.status === 'pending') action = `<span class="chip chip-warn">${icon('clock')}ยื่นคำขอปลดล็อกแล้ว · รอพิจารณา</span>`;
  else action = `<button class="btn btn-sm" id="unlockBtn">${icon('lock')}ขอปลดล็อกเพื่อแก้ไข</button>`;
  const rejected = u && u.status === 'rejected'
    ? `<div style="margin-top:6px;color:var(--bad);font-size:13.5px">คำขอปลดล็อกครั้งล่าสุดถูกปฏิเสธ: ${esc(u.rejectReason)}</div>` : '';
  return `<div class="callout ${sec.state === 'approved' ? 'ok' : ''}" style="margin-bottom:12px">${icon('lock')}<div style="flex:1">${head} · ข้อมูลถูกล็อก${rejected}</div>${action}</div>`;
}
function openUnlockRequest(sec) {
  openModal({
    title: 'ยื่นคำขอปลดล็อก',
    body: `<p class="muted" style="margin:0 0 10px">คำขอจะส่งไปที่ฝ่ายวิชาการ เมื่ออนุมัติแล้ว สถานะจะกลับเป็น “กำลังบันทึก” และต้องส่งผลการเรียนใหม่อีกครั้ง</p>
      <label style="font-size:14px;font-weight:600">เหตุผลที่ต้องการแก้ไข <span style="color:var(--bad)">*</span></label>
      <textarea class="input textarea" id="unlockReason" rows="3" placeholder="เช่น นักเรียนมาสอบแก้ตัว ร แล้ว ต้องการกรอกคะแนนใหม่"></textarea>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ยื่นคำขอ', cls: 'btn-primary', icon: 'send', onClick: () => {
        const reason = $('#unlockReason').value.trim();
        if (!reason) { toast('กรุณาระบุเหตุผล', 'bad'); return false; }
        sec.unlockRequest = { at: Date.now(), reason, status: 'pending', decidedBy: null, decidedAt: null, rejectReason: '' };
        logEvent(sec, `ยื่นคำขอปลดล็อก: ${reason}`);
        persist(); renderSection(sec, 'results');
        toast('ยื่นคำขอปลดล็อกแล้ว · รอฝ่ายวิชาการพิจารณา', 'ok');
      } },
    ],
    onMount: (m) => $('#unlockReason', m).focus(),
  });
}

function openRemedial(sec, s) {
  openModal({
    title: 'บันทึกผลสอบซ่อม',
    body: `<p style="margin:0 0 12px"><b>${esc(fullName(s))}</b> <span class="muted">· ${sec.code} ${esc(sec.name)}</span></p>
      <label style="font-size:14px;font-weight:600">คะแนนสอบซ่อม (ร้อยละ)</label>
      <input class="input" id="remIn" inputmode="numeric" placeholder="0–100" style="width:100%;margin-top:6px" value="${sec.remedial[s.id] ?? ''}">
      <div class="callout" style="margin-top:12px">${icon('info')}<div>ถ้าผ่านเกณฑ์ (50% ขึ้นไป) ระดับผลการเรียนจะถูกปรับเป็น <b>1</b> ตามระเบียบการวัดผล</div></div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'บันทึก', cls: 'btn-primary', onClick: () => {
        const v = $('#remIn').value.trim();
        if (!/^\d+(\.\d+)?$/.test(v) || +v > 100) { toast('กรอกคะแนน 0–100', 'bad'); return false; }
        sec.remedial[s.id] = +v;
        sec.history.unshift({ t: Date.now(), who: TEACHER.name, student: fullName(s), field: 'ผลสอบซ่อม', from: '', to: `${v}% ${+v >= 50 ? '→ ผ่าน (1)' : '→ ไม่ผ่าน'}` });
        persist(); updateFollowBadge();
        renderSection(sec, 'results');
        toast(+v >= 50 ? 'สอบซ่อมผ่าน · ปรับผลการเรียนเป็น 1' : 'บันทึกผลสอบซ่อมแล้ว (ยังไม่ผ่าน)', 'ok');
      } },
    ],
    onMount: (m) => $('#remIn', m).focus(),
  });
}

function exportResultsCSV(sec) {
  const groups = GROUP_KEYS.filter((g) => sec.structure.some((c) => c.group === g));
  const head = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', ...sec.structure.map((c) => `${c.name} (${c.max})`), ...groups.map((g) => GROUPS[g].label), 'รวม', 'เกรด', 'เวลาเรียน(%)', 'คุณลักษณะฯ', 'อ่านคิดวิเคราะห์ฯ', 'สถานะ'];
  const lines = [head, ...sec.students.map((s) => {
    const r = computeStudent(sec, s);
    const a = levelSummary(sec, 'attr', s.id), w = levelSummary(sec, 'rtw', s.id);
    return [s.no, s.id, fullName(s), ...sec.structure.map((c) => getRaw(sec, 'score', s.id, c.id)), ...groups.map((g) => fmt2(r.groups[g])), fmt2(r.total), r.grade, r.att, a.done ? a.level : '', w.done ? w.level : '', STATUS[r.code].label];
  })];
  downloadFile(`ผลการเรียน_${sec.code}_${fileSafe(sec.room)}_${sec.term}.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
  toast('ส่งออกไฟล์ CSV แล้ว (เปิดด้วย Excel ได้)', 'ok');
}

function openSubmit(sec) {
  const p = sectionProgress(sec);
  const st = sectionStats(sec);
  const dirtyN = ui.draftSection === sec.id ? draftKeys().length : 0;
  const n = sec.students.length;
  const attrMissing = sec.students.filter((s) => !levelSummary(sec, 'attr', s.id).done).length;
  const rtwMissing = sec.students.filter((s) => !levelSummary(sec, 'rtw', s.id).done).length;
  const checks = [
    { ok: p.structOk, label: 'โครงสร้างคะแนนรวม 100%', tab: 'structure' },
    { ok: dirtyN === 0, label: dirtyN ? `มีการแก้ไข ${dirtyN} ช่องที่ยังไม่บันทึก` : 'บันทึกข้อมูลทั้งหมดแล้ว', tab: 'scores' },
    { ok: st.incomplete === 0, label: st.incomplete ? `คะแนนยังไม่ครบ ${st.incomplete} คน (${p.missingScores} ช่อง)` : `กรอกคะแนนครบทั้ง ${n} คน`, tab: 'scores' },
    { ok: attrMissing === 0, label: attrMissing ? `คุณลักษณะอันพึงประสงค์ยังไม่ครบ ${attrMissing} คน` : 'ประเมินคุณลักษณะอันพึงประสงค์ครบ', tab: 'attr' },
    { ok: rtwMissing === 0, label: rtwMissing ? `อ่าน คิดวิเคราะห์ และเขียนยังไม่ครบ ${rtwMissing} คน` : 'ประเมินการอ่าน คิดวิเคราะห์ และเขียนครบ', tab: 'rtw' },
  ];
  const warns = [
    st.fail && `${st.fail} คนได้ระดับ 0 (มีสิทธิ์สอบซ่อม)`,
    st.r && `${st.r} คนได้ “ร” (รอส่งงาน/ขาดสอบ)`,
    st.ms && `${st.ms} คนได้ “มส” (เวลาเรียนไม่ถึง ${MIN_ATTENDANCE}%)`,
    isReturned(sec) && lastReview(sec).notes.some((n) => !n.resolved) && `ยังมี ${lastReview(sec).notes.filter((n) => !n.resolved).length} หมุดข้อสังเกตจากการตีกลับที่ยังไม่ได้กด “แก้แล้ว”`,
  ].filter(Boolean);
  // คาบที่ยังไม่เช็คไม่นับในเวลาเรียน ส่งได้แต่ต้องเตือน (ADR 0011)
  const unchecked = sectionAttendance(db, sec).unchecked.length;
  if (unchecked) warns.unshift(`ยังมี <a href="attendance.html#/s/${sec.id}">${unchecked} คาบที่ยังไม่ได้เช็คชื่อ</a>`);
  const blocked = checks.some((c) => !c.ok);
  openModal({
    title: 'ตรวจสอบก่อนส่งผลการเรียน',
    body: `
      <p class="muted" style="margin:0 0 8px">${sec.code} ${esc(sec.name)} · ${sec.room} · ${n} คน</p>
      <div class="checklist">${checks.map((c) => `<div class="cl-item"><span class="cl-icon ${c.ok ? 'cl-ok' : 'cl-bad'}">${icon(c.ok ? 'check' : 'x')}</span><span style="flex:1">${c.label}</span>${c.ok ? '' : `<a href="#/s/${sec.id}/${c.tab}" data-close-go>ไปแก้ไข</a>`}</div>`).join('')}
      ${warns.map((w) => `<div class="cl-item"><span class="cl-icon cl-warn">${icon('alert')}</span><span>${w}</span></div>`).join('')}</div>
      ${blocked ? `<div class="callout bad" style="margin-top:12px">${icon('alert')}<div>ยังส่งผลการเรียนไม่ได้ กรุณาแก้ไขรายการที่มีเครื่องหมาย ✕ ก่อน</div></div>`
        : `<div class="callout" style="margin-top:12px">${icon('info')}<div>เมื่อส่งแล้ว สถานะจะเป็น <b>รอตรวจ</b> ข้อมูลจะถูก<b>ล็อกไม่ให้แก้ไข</b> จนกว่าฝ่ายวิชาการจะอนุมัติหรือตีกลับ ${warns.length ? 'นักเรียนที่ได้ 0 / ร / มส จะอยู่ในรายชื่อที่ต้องติดตาม' : ''}</div></div>`}`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ยืนยันส่งผลการเรียน', cls: 'btn-ok', icon: 'send', disabled: blocked, onClick: () => {
        sec.state = 'pending'; sec.submittedAt = Date.now(); sec.updatedAt = Date.now();
        sec.reviews = sec.reviews || [];
        sec.reviews.push({ submittedAt: Date.now(), reviewerId: null, decidedAt: null, decision: null, reason: '', notes: [] });
        if (sec.unlockRequest?.status !== 'pending') sec.unlockRequest = null;
        logEvent(sec, `ส่งผลการเรียนให้ฝ่ายวิชาการตรวจ (รอบที่ ${sec.reviews.length})`);
        persist(); updateFollowBadge();
        renderSection(sec, 'results');
        toast('ส่งผลการเรียนแล้ว · รอฝ่ายวิชาการตรวจ', 'ok');
      } },
    ],
    onMount: (m, close) => $$('[data-close-go]', m).forEach((a) => a.addEventListener('click', close)),
  });
}

/* ---------- Tab: ประวัติการแก้ไข ---------- */
function renderHistory(sec, body) {
  const list = [...sec.history].sort((a, b) => b.t - a.t);
  const rounds = (sec.reviews || []).map((r, i) => {
    const d = r.decision === 'approved' ? ['chip-ok', 'อนุมัติ'] : r.decision === 'returned' ? ['chip-bad', 'ตีกลับ'] : r.decision === 'unlocked' ? ['chip-warn', 'ปลดล็อกตามคำขอ'] : ['chip-primary', 'รอตรวจ'];
    return `<tr><td class="c num">${i + 1}</td><td>${thDate(r.submittedAt, true)}</td><td><span class="chip ${d[0]}">${d[1]}</span>${r.reviewerId && r.reviewerId === sec.teacherId ? ' <span class="chip chip-ms">ตรวจงานตนเอง</span>' : ''}</td>
      <td>${r.reviewerId ? esc(userById(r.reviewerId)?.name) : '—'}</td><td>${r.decidedAt ? thDate(r.decidedAt, true) : '—'}</td><td class="muted">${esc(r.reason || '')}${r.notes.length ? ` <span class="faint">(${r.notes.length} หมุด)</span>` : ''}</td></tr>`;
  }).join('');
  body.innerHTML = (rounds ? `<div class="card list-wrap" style="margin-bottom:16px"><div class="card-pad" style="padding-bottom:6px"><h3 style="font-size:16px">รอบการตรวจ</h3></div>
    <table class="list"><thead><tr><th class="c">รอบ</th><th>ส่งเมื่อ</th><th>ผล</th><th>ผู้ตรวจ</th><th>ตัดสินเมื่อ</th><th>เหตุผล</th></tr></thead><tbody>${rounds}</tbody></table></div>` : '') + (list.length ? `
    <div class="card card-pad">
      <div class="row" style="margin-bottom:6px"><h3 style="font-size:16px">ประวัติการแก้ไข</h3><span class="chip">${list.length} รายการ</span></div>
      <div class="timeline">${list.map((h) => `
        <div class="tl-item">
          <div class="tl-time" title="${thDate(h.t, true)}">${relTime(h.t)}<div class="faint" style="font-size:12px">${thDate(h.t, true)}</div></div>
          <div>${h.kind === 'event'
            ? `<b>${esc(h.to)}</b><div class="faint" style="font-size:13px">โดย ${esc(h.who)}</div>`
            : `<div><b>${esc(h.student)}</b> <span class="muted">· ${esc(h.field)}</span></div>
               <div class="tl-diff">${h.from !== '' ? `<span class="tl-from">${esc(h.from)}</span>${icon('chev')}` : '<span class="faint">(ว่าง)</span>' + icon('chev')}<span class="tl-to">${h.to === '' ? '(ลบ)' : esc(h.to)}</span><span class="faint" style="font-size:13px;margin-left:8px">โดย ${esc(h.who)}</span></div>`}
          </div>
        </div>`).join('')}</div>
    </div>` : `<div class="card empty"><div class="empty-icon">${icon('clock')}</div><h3>ยังไม่มีประวัติการแก้ไข</h3><div>ทุกครั้งที่บันทึกคะแนน ระบบจะเก็บค่าเดิม ค่าใหม่ ผู้แก้ไข และเวลาไว้ที่นี่</div></div>`);
}

/* =========================================================
 *  Page: นักเรียนที่ต้องติดตาม
 * ========================================================= */
function followupRows(term, all = false) {
  const out = [];
  db.sections.filter((s) => s.term === term && s.structure.length && (all || s.teacherId === CURRENT_USER_ID)).forEach((sec) => {
    sec.students.forEach((s) => {
      const r = computeStudent(sec, s);
      if (['fail', 'r', 'ms'].includes(r.code)) {
        let detail = '';
        if (r.code === 'fail') detail = `คะแนนรวม ${fmt1(r.total)} (ต่ำกว่า 50)`;
        if (r.code === 'r') detail = r.special.map((x) => `${x.mark === 'ข' ? 'ขาดสอบ' : 'รอส่งงาน'}: ${x.comp.name}`).join(', ');
        if (r.code === 'ms') detail = `เวลาเรียน ${r.att}% (เกณฑ์ ${MIN_ATTENDANCE}%)`;
        out.push({ sec, s, r, detail });
      }
    });
  });
  return out;
}
function updateFollowBadge() {
  const el = $('#followBadge');
  if (!el) return;
  const n = isAcademic() ? inboxItems(ui.term).length : followupRows(ui.term).length;
  el.textContent = n ? String(n) : '';
}

function renderFollowup() {
  $('#topbarTitle').textContent = 'นักเรียนที่ต้องติดตาม';
  const all = followupRows(ui.term);
  const count = (c) => all.filter((x) => x.r.code === c).length;
  const rows = all.filter((x) => ui.followFilter === 'all' || x.r.code === ui.followFilter);
  view.innerHTML = `
    <div class="page-head">
      <div><h1>นักเรียนที่ต้องติดตาม</h1><p>รวมนักเรียนที่ได้ระดับ 0 (มีสิทธิ์สอบซ่อม), ร และ มส จากทุกรายวิชาที่ท่านสอน</p></div>
      <select class="select" id="termSel2">${TERMS.map((t) => `<option value="${t.key}" ${t.key === ui.term ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
    </div>
    <div id="fuBody">
    <div class="toolbar">
      <div class="seg" id="fFilter">
        ${[['all', 'ทั้งหมด', all.length], ['fail', 'สอบซ่อม (0)', count('fail')], ['r', 'ร', count('r')], ['ms', 'มส', count('ms')]].map(([k, l, c]) => `<button data-f="${k}" class="${ui.followFilter === k ? 'on' : ''}">${l}<span class="cnt">${c}</span></button>`).join('')}
      </div>
    </div>
    ${rows.length ? `<div class="card list-wrap"><table class="list">
      <thead><tr><th>นักเรียน</th><th>รายวิชา</th><th class="c">ห้อง</th><th>สถานะ</th><th>รายละเอียด</th><th></th></tr></thead>
      <tbody>${rows.map(({ sec, s, r, detail }) => `
        <tr>
          <td><b>${esc(fullName(s))}</b><div class="faint" style="font-size:12.5px">รหัส ${s.id} · เลขที่ ${s.no}</div></td>
          <td>${sec.code} ${esc(sec.name)}</td>
          <td class="c">${sec.room}</td>
          <td>${statusChip(r.code)}</td>
          <td class="muted">${esc(detail)}</td>
          <td class="r"><a class="btn btn-sm" href="#/s/${sec.id}/results" data-sec="${sec.id}" data-code="${r.code}">ดูในรายวิชา ${icon('chev')}</a></td>
        </tr>`).join('')}</tbody></table></div>`
    : `<div class="card empty"><div class="empty-icon">${icon('check')}</div><h3>ไม่มีนักเรียนที่ต้องติดตาม</h3><div>นักเรียนทุกคนในภาคเรียนนี้ผ่านเกณฑ์ หรือยังไม่มีผลการเรียน</div></div>`}
    </div>`;
  $('#termSel2').addEventListener('change', (e) => { ui.term = e.target.value; updateFollowBadge(); renderFollowup(); });
  $('#fuBody').addEventListener('click', (e) => {
    const f = e.target.closest('#fFilter [data-f]');
    if (f) { ui.followFilter = f.dataset.f; renderFollowup(); return; }
    const a = e.target.closest('[data-sec]');
    if (a) { ui.lastSection = a.dataset.sec; ui.resultFilter = a.dataset.code; ui.search = ''; }
  });
}

/* =========================================================
 *  Page: เกณฑ์การตัดสินผล
 * ========================================================= */
function renderCriteria() {
  $('#topbarTitle').textContent = 'เกณฑ์การตัดสินผล';
  view.innerHTML = `
    <div class="page-head"><div><h1>เกณฑ์การตัดสินผลการเรียน</h1><p>กำหนดโดยฝ่ายวิชาการตามระเบียบการวัดและประเมินผลของสถานศึกษา — ครูผู้สอนดูได้อย่างเดียว</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start">
      <div class="card list-wrap">
        <table class="list"><thead><tr><th>ช่วงคะแนน</th><th class="c">ระดับผลการเรียน</th><th>ความหมาย</th></tr></thead>
        <tbody>${GRADE_SCALE.map((g, i) => `<tr><td class="num">${i === 0 ? `${g.min} – 100` : `${g.min} – ${GRADE_SCALE[i - 1].min - 1}`}</td><td class="c" style="font-weight:800;font-size:16px;color:${g.grade === '0' ? 'var(--bad)' : 'inherit'}">${g.grade}</td><td class="muted">${g.meaning}</td></tr>`).join('')}</tbody></table>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card card-pad">
          <h3 style="font-size:16px;margin-bottom:10px">ผลการเรียนพิเศษ</h3>
          <div class="checklist">
            <div class="cl-item"><span class="chip chip-warn">ร</span><span>รอการตัดสิน — นักเรียนยังส่งงานไม่ครบ หรือขาดสอบ (กรอก <b>ร</b> หรือ <b>ข</b> แทนคะแนน)</span></div>
            <div class="cl-item"><span class="chip chip-ms">มส</span><span>ไม่มีสิทธิ์เข้ารับการวัดผลปลายภาค — เวลาเรียนไม่ถึงร้อยละ ${MIN_ATTENDANCE} ของเวลาเรียนทั้งหมด</span></div>
            <div class="cl-item"><span class="chip chip-bad">0</span><span>ต่ำกว่าเกณฑ์ — มีสิทธิ์สอบซ่อม หากผ่านจะได้ระดับผลการเรียนไม่เกิน 1</span></div>
          </div>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:16px;margin-bottom:10px">คุณลักษณะอันพึงประสงค์ / อ่าน คิดวิเคราะห์ และเขียน</h3>
          <div class="row wrap">${LEVELS.map((l) => `<span class="chip ${l.v === 3 ? 'chip-ok' : l.v === 0 ? 'chip-bad' : l.v === 1 ? 'chip-warn' : 'chip-primary'}">${l.v} = ${l.label}</span>`).join('')}</div>
          <p class="muted" style="font-size:14px;margin:10px 0 0">ประเมินรายข้อ แล้วสรุปผลจากค่าเฉลี่ยของทุกข้อ (ปัดเศษเป็นจำนวนเต็ม)</p>
        </div>
      </div>
    </div>`;
}

/* =========================================================
 *  Boot
 * ========================================================= */
function boot() {
  $('#schoolName').textContent = TEACHER.school;
  $('#userName').textContent = TEACHER.name;
  $('#userRole').textContent = `${TEACHER.position} · ${TEACHER.dept}`;
  $('#avatar').textContent = TEACHER.name.replace('ครู', '').trim().charAt(0);
  if (TEACHER.roles.length > 1) {
    $('#roleSwitch').classList.remove('hidden');
    $('#roleSwitch').addEventListener('click', (e) => {
      const b = e.target.closest('[data-role]');
      if (!b || b.dataset.role === ui.role) return;
      go(b.dataset.role === 'academic' ? '#/a' : '#/');
    });
  }
  let saved = null;
  try { saved = localStorage.getItem(ROLE_KEY); } catch (e) { /* ignore */ }
  if (saved === 'academic' && TEACHER.roles.includes('academic') && parseRoute(location.hash || '#/').page === 'home' && !location.hash.startsWith('#/s')) {
    if (!location.hash || location.hash === '#/' || location.hash === '#') { history.replaceState(null, '', '#/a'); currentHash = '#/a'; }
  }
  $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); });
  $('#scrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); });
  $('#resetDemo').addEventListener('click', () => confirmModal({
    title: 'รีเซ็ตข้อมูล Demo?',
    message: 'ข้อมูลทั้งหมดที่แก้ไขไว้ในเบราว์เซอร์นี้จะถูกล้าง และกลับไปเป็นข้อมูลตัวอย่างเริ่มต้น',
    okLabel: 'รีเซ็ต', okCls: 'btn-danger',
    onOk: () => { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } db = buildSeed(); calcCache.clear(); dataVersion++; clearDrafts(); updateFollowBadge(); route(); toast('รีเซ็ตข้อมูลแล้ว', 'ok'); },
  }));
  updateFollowBadge();
  route();
}
