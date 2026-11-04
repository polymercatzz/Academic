'use strict';
/* =========================================================
 *  ชุมนุมและผลกิจกรรม (UC-27)
 *  ฝ่ายวิชาการเปิดชุมนุมและกำหนดครูที่ปรึกษา · ครูที่ปรึกษาจัดสมาชิก กรอกเวลาเข้าร่วม ให้ ผ / มผ แล้วส่งผล
 *  ชุมนุมไม่เช็คชื่อรายคาบ ครูกรอกเวลาเข้าร่วมเอง (docs/database/04-attendance.md)
 *
 *  db.clubs = [{ id, term, name, type, advisorId, capacity, members: [sid],
 *               results: { sid: { att, result: 'pass' | 'fail' | null, remark } },
 *               state: draft | pending | approved, submittedAt, decidedAt, decidedBy, returnReason, updatedAt }]
 * ========================================================= */

const CLUB_STATE = {
  draft: { label: 'กำลังบันทึก', chip: '' },
  returned: { label: 'ตีกลับให้แก้ไข', chip: 'chip-bad' },
  ready: { label: 'พร้อมส่งผล', chip: 'chip-primary' },
  pending: { label: 'รอตรวจ', chip: 'chip-primary' },
  approved: { label: 'อนุมัติแล้ว', chip: 'chip-ok' },
};

const clubById = (id) => db.clubs.find((c) => c.id === id);
const termClubs = (term) => db.clubs.filter((c) => c.term === term);
const myClubs = (term) => termClubs(term).filter((c) => c.advisorId === CURRENT_USER_ID);
const clubLocked = (c) => c.state === 'pending' || c.state === 'approved';
const clubResult = (c, sid) => c.results[sid] || { att: null, result: null, remark: '' };

/* นักเรียนทุกคนของภาคเรียน (ไม่ซ้ำ) พร้อมห้อง — ใช้เลือกสมาชิกชุมนุม */
function studentPool(term) {
  const seen = new Map();
  db.sections.filter((s) => s.term === term).forEach((sec) => sec.students.forEach((s) => {
    if (!seen.has(s.id)) seen.set(s.id, { ...s, room: sec.room });
  }));
  return seen;
}

function clubStats(c) {
  const done = c.members.filter((sid) => clubResult(c, sid).result).length;
  const pass = c.members.filter((sid) => clubResult(c, sid).result === 'pass').length;
  return { n: c.members.length, done, pass, fail: done - pass };
}
function clubState(c) {
  if (c.state !== 'draft') return c.state;
  if (c.returnReason) return 'returned';
  const st = clubStats(c);
  return st.n && st.done === st.n ? 'ready' : 'draft';
}
const clubChip = (c) => `<span class="chip ${CLUB_STATE[clubState(c)].chip}"><span class="dot"></span>${CLUB_STATE[clubState(c)].label}</span>`;

/* มผ ต้องมีเหตุผลเมื่อเวลาเข้าร่วมถึงเกณฑ์ (activity_result.remark) */
function clubIssues(c) {
  const out = [];
  c.members.forEach((sid) => {
    const r = clubResult(c, sid);
    if (!r.result) out.push({ sid, why: 'ยังไม่ได้ประเมิน' });
    else if (r.att == null) out.push({ sid, why: 'ยังไม่ได้กรอกเวลาเข้าร่วม' });
    else if (r.result === 'fail' && r.att >= MIN_ATTENDANCE && !r.remark) out.push({ sid, why: 'ให้ มผ ทั้งที่เวลาเข้าร่วมถึงเกณฑ์ ต้องระบุเหตุผล' });
  });
  return out;
}

/* ---------- ครูที่ปรึกษา: ชุมนุมของฉัน ---------- */
function renderClubs() {
  $('#topbarTitle').textContent = 'ชุมนุมของฉัน';
  const list = myClubs(ui.term);
  view.innerHTML = `
    <div class="page-head">
      <div><h1>ชุมนุมของฉัน</h1><p>ชุมนุมและกิจกรรมพัฒนาผู้เรียนที่ท่านเป็นครูที่ปรึกษา กรอกเวลาเข้าร่วมและผลการประเมิน ผ / มผ แล้วส่งให้ฝ่ายวิชาการ</p></div>
      <select class="select" id="clTerm">${TERMS.map((t) => `<option value="${t.key}" ${t.key === ui.term ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
    </div>
    ${list.length ? `<div class="section-grid">${list.map((c) => {
      const st = clubStats(c);
      const pct = st.n ? Math.round((st.done / st.n) * 100) : 0;
      return `<a class="card sec-card" href="#/clubs/${c.id}">
        <div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px">
          <div><div class="faint" style="font-size:12.5px">${CLUB_TYPES[c.type]}</div><h3 style="font-size:17px;margin:2px 0 0">${esc(c.name)}</h3></div>${clubChip(c)}
        </div>
        <div class="muted" style="font-size:13.5px">${icon('users')} สมาชิก ${st.n} / ${c.capacity} คน</div>
        <div class="progress ${pct === 100 ? 'ok' : ''}"><span style="width:${pct}%"></span></div>
        <div class="faint" style="font-size:12.5px;margin-top:-8px">ประเมินแล้ว ${st.done} / ${st.n} คน · ผ ${st.pass} · มผ ${st.fail}</div>
      </a>`;
    }).join('')}</div>`
    : `<div class="card empty"><div class="empty-icon">${icon('users')}</div><h3>ภาคเรียนนี้ท่านไม่ได้เป็นครูที่ปรึกษาชุมนุม</h3><div>ฝ่ายวิชาการเป็นผู้เปิดชุมนุมและกำหนดครูที่ปรึกษา</div></div>`}`;
  $('#clTerm').addEventListener('change', (e) => { ui.term = e.target.value; renderClubs(); });
}

function renderClub(id) {
  const c = clubById(id);
  if (!c || c.advisorId !== CURRENT_USER_ID) { toast('เปิดได้เฉพาะชุมนุมที่ท่านเป็นครูที่ปรึกษา', 'bad'); go('#/clubs'); return; }
  $('#topbarTitle').textContent = c.name;
  const pool = studentPool(c.term);
  const st = clubStats(c);
  const locked = clubLocked(c);
  const members = c.members.map((sid) => pool.get(sid)).filter(Boolean)
    .sort((a, b) => (a.room === b.room ? a.no - b.no : a.room < b.room ? -1 : 1));
  const issues = clubIssues(c);

  view.innerHTML = `
    <a class="back-link" href="#/clubs">${icon('back')}ชุมนุมของฉัน</a>
    <div class="page-head">
      <div><div class="faint" style="font-size:13px">${CLUB_TYPES[c.type]} · ${termOf(c.term).label}</div><h1>${esc(c.name)}</h1>
        <div class="row wrap" style="gap:6px;margin-top:6px">${clubChip(c)}</div></div>
    </div>
    ${c.state === 'pending' ? `<div class="callout" style="margin-bottom:12px">${icon('lock')}<div><b>ส่งผลแล้ว · รอฝ่ายวิชาการตรวจ</b> ส่งเมื่อ ${thDate(c.submittedAt, true)} · ข้อมูลถูกล็อก</div></div>` : ''}
    ${c.state === 'approved' ? `<div class="callout ok" style="margin-bottom:12px">${icon('lock')}<div><b>ฝ่ายวิชาการอนุมัติแล้ว</b> เมื่อ ${thDate(c.decidedAt, true)} โดย ${esc(userById(c.decidedBy)?.name || '—')}</div></div>` : ''}
    ${c.state === 'draft' && c.returnReason ? `<div class="callout warn" style="margin-bottom:12px">${icon('alert')}<div><b>ฝ่ายวิชาการตีกลับให้แก้ไข</b> ${c.decidedAt ? `เมื่อ ${relTime(c.decidedAt)}` : ''}: ${esc(c.returnReason)}</div></div>` : ''}
    <div class="stat-row">
      <div class="card stat"><div class="stat-label">สมาชิก</div><div class="stat-value">${st.n}<small> / ${c.capacity} คน</small></div></div>
      <div class="card stat"><div class="stat-label">ประเมินแล้ว</div><div class="stat-value">${st.done}<small> / ${st.n} คน</small></div></div>
      <div class="card stat"><div class="stat-label">ผ่าน (ผ)</div><div class="stat-value" style="color:var(--ok)">${st.pass}<small> คน</small></div></div>
      <div class="card stat"><div class="stat-label">ไม่ผ่าน (มผ)</div><div class="stat-value" style="color:${st.fail ? 'var(--bad)' : 'inherit'}">${st.fail}<small> คน</small></div></div>
    </div>
    <div class="toolbar">
      ${locked ? '' : `<button class="btn" id="addMember" ${st.n >= c.capacity ? 'disabled title="ชุมนุมเต็มแล้ว"' : ''}>${icon('plus')}เพิ่มสมาชิก</button>
      <button class="btn btn-ghost" id="autoPass" ${st.n ? '' : 'disabled'}>ให้ ผ / มผ ตามเวลาเข้าร่วม</button>`}
      <span class="spacer"></span>
      <span class="faint" style="font-size:13px">เกณฑ์: เวลาเข้าร่วม ${MIN_ATTENDANCE}% ขึ้นไป และผ่านการประเมินกิจกรรม · ${locked ? 'ดูได้อย่างเดียว' : 'บันทึกอัตโนมัติเมื่อแก้ไข'}</span>
      ${locked ? '' : `<button class="btn btn-ok" id="clubSubmit">${icon('send')}ส่งผลชุมนุม</button>`}
    </div>
    ${members.length ? `<div class="card list-wrap"><table class="list" id="clubTable">
      <thead><tr><th class="c">#</th><th>รหัส</th><th>ชื่อ - สกุล</th><th class="c">ห้อง</th><th class="c" style="width:130px">เวลาเข้าร่วม (%)</th><th class="c" style="width:150px">ผลการประเมิน</th><th>หมายเหตุ</th>${locked ? '' : '<th></th>'}</tr></thead>
      <tbody>${members.map((s, i) => {
        const r = clubResult(c, s.id);
        const warn = issues.find((x) => x.sid === s.id && r.result);
        return `<tr data-sid="${s.id}">
          <td class="c num faint">${i + 1}</td><td class="num muted">${s.id}</td><td>${esc(fullName(s))}</td><td class="c">${s.room}</td>
          <td class="c">${locked ? (r.att ?? '—') : `<input class="input num" data-att inputmode="decimal" value="${r.att ?? ''}" style="width:80px;text-align:center">`}</td>
          <td class="c">${locked ? (r.result ? `<span class="chip ${r.result === 'pass' ? 'chip-ok' : 'chip-bad'}">${r.result === 'pass' ? 'ผ' : 'มผ'}</span>` : '—')
            : `<div class="seg" data-res>${[['pass', 'ผ'], ['fail', 'มผ']].map(([k, l]) => `<button type="button" data-v="${k}" class="${r.result === k ? 'on' : ''}">${l}</button>`).join('')}</div>`}</td>
          <td>${locked ? `<span class="muted">${esc(r.remark || '')}</span>` : `<input class="input" data-remark value="${esc(r.remark || '')}" placeholder="${r.result === 'fail' ? 'ระบุเหตุผลที่ไม่ผ่าน' : ''}" style="width:100%;${warn ? 'border-color:var(--bad)' : ''}">`}</td>
          ${locked ? '' : `<td class="r"><button class="icon-btn" data-remove title="นำออกจากชุมนุม">${icon('trash')}</button></td>`}
        </tr>`;
      }).join('')}</tbody></table></div>`
    : `<div class="card empty"><div class="empty-icon">${icon('users')}</div><h3>ยังไม่มีสมาชิก</h3><div>กด “เพิ่มสมาชิก” เพื่อเลือกนักเรียนเข้าชุมนุม</div></div>`}`;

  const save = (msg) => { c.updatedAt = Date.now(); persist(); if (msg) toast(msg, 'ok'); };
  if (locked) return;

  const table = $('#clubTable');
  table?.addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr) return;
    const sid = tr.dataset.sid;
    const r = { ...clubResult(c, sid) };
    if (e.target.matches('[data-att]')) {
      const v = e.target.value.trim();
      if (v && (!/^\d+(\.\d+)?$/.test(v) || +v > 100)) { toast('กรอกเวลาเข้าร่วม 0–100', 'bad'); e.target.value = r.att ?? ''; return; }
      r.att = v === '' ? null : +v;
      // ยังไม่เคยประเมิน: เสนอผลตามเวลาเข้าร่วม ครูเปลี่ยนเองได้
      if (r.result == null && r.att != null) r.result = r.att >= MIN_ATTENDANCE ? 'pass' : 'fail';
    }
    if (e.target.matches('[data-remark]')) r.remark = e.target.value.trim();
    c.results[sid] = r;
    save();
    renderClub(c.id);
  });
  table?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr) return;
    const sid = tr.dataset.sid;
    const b = e.target.closest('[data-res] [data-v]');
    if (b) { c.results[sid] = { ...clubResult(c, sid), result: b.dataset.v }; save(); renderClub(c.id); return; }
    if (e.target.closest('[data-remove]')) {
      const s = pool.get(sid);
      confirmModal({
        title: 'นำนักเรียนออกจากชุมนุม',
        message: `นำ <b>${esc(fullName(s))}</b> (${s.room}) ออกจาก${esc(c.name)} ผลที่กรอกไว้จะถูกลบ`,
        okLabel: 'นำออก', okCls: 'btn-danger',
        onOk: () => { c.members = c.members.filter((x) => x !== sid); delete c.results[sid]; save('นำออกจากชุมนุมแล้ว'); renderClub(c.id); },
      });
    }
  });
  $('#addMember')?.addEventListener('click', () => openAddMembers(c, pool));
  $('#autoPass')?.addEventListener('click', () => {
    let n = 0;
    c.members.forEach((sid) => {
      const r = clubResult(c, sid);
      if (r.att != null && !r.result) { c.results[sid] = { ...r, result: r.att >= MIN_ATTENDANCE ? 'pass' : 'fail' }; n++; }
    });
    if (!n) { toast('ไม่มีนักเรียนที่กรอกเวลาเข้าร่วมแล้วแต่ยังไม่ได้ประเมิน', 'bad'); return; }
    save(`ให้ผลตามเวลาเข้าร่วมแล้ว ${n} คน`); renderClub(c.id);
  });
  $('#clubSubmit').addEventListener('click', () => openClubSubmit(c, pool));
}

function openAddMembers(c, pool) {
  // หนึ่งคนอยู่ได้หนึ่งกลุ่มต่อประเภทต่อภาคเรียน
  const taken = new Map();
  termClubs(c.term).filter((x) => x.type === c.type).forEach((x) => x.members.forEach((sid) => taken.set(sid, x)));
  const rooms = [...new Set([...pool.values()].map((s) => s.room))].sort();
  const left = c.capacity - c.members.length;
  const picked = new Set();
  const draw = (m) => {
    const room = $('#amRoom', m).value;
    const q = $('#amSearch', m).value.trim();
    const list = [...pool.values()].filter((s) => (room === 'all' || s.room === room) && (!q || fullName(s).includes(q) || s.id.includes(q)));
    $('#amList', m).innerHTML = list.map((s) => {
      const other = taken.get(s.id);
      const dis = !!other;
      return `<label class="row" style="gap:10px;padding:7px 4px;border-bottom:1px solid var(--border);${dis ? 'opacity:.55' : ''}">
        <input type="checkbox" data-pick="${s.id}" ${picked.has(s.id) ? 'checked' : ''} ${dis ? 'disabled' : ''}>
        <span style="flex:1">${esc(fullName(s))} <span class="faint" style="font-size:12.5px">${s.id}</span></span>
        <span class="muted" style="font-size:13px">${s.room}</span>
        ${dis ? `<span class="faint" style="font-size:12px">${other.id === c.id ? 'เป็นสมาชิกแล้ว' : `อยู่${esc(other.name)}`}</span>` : ''}
      </label>`;
    }).join('') || '<p class="muted c" style="padding:16px">ไม่พบนักเรียน</p>';
    $('#amCount', m).textContent = `เลือก ${picked.size} คน · รับได้อีก ${left} คน`;
  };
  openModal({
    title: `เพิ่มสมาชิก · ${esc(c.name)}`,
    wide: true,
    body: `<div class="row wrap" style="gap:8px;margin-bottom:10px">
        <select class="select" id="amRoom"><option value="all">ทุกห้อง</option>${rooms.map((r) => `<option>${r}</option>`).join('')}</select>
        <input class="input" id="amSearch" placeholder="ค้นหาชื่อหรือรหัสนักเรียน" style="flex:1;min-width:180px">
      </div>
      <div class="faint" id="amCount" style="font-size:13px;margin-bottom:6px"></div>
      <div id="amList" style="max-height:360px;overflow:auto"></div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'เพิ่มเข้าชุมนุม', cls: 'btn-primary', icon: 'plus', onClick: () => {
        if (!picked.size) { toast('ยังไม่ได้เลือกนักเรียน', 'bad'); return false; }
        if (picked.size > left) { toast(`ชุมนุมรับได้อีก ${left} คน`, 'bad'); return false; }
        c.members.push(...picked);
        c.updatedAt = Date.now(); persist(); renderClub(c.id);
        toast(`เพิ่มสมาชิก ${picked.size} คนแล้ว`, 'ok');
      } },
    ],
    onMount: (m) => {
      draw(m);
      $('#amRoom', m).addEventListener('change', () => draw(m));
      $('#amSearch', m).addEventListener('input', () => draw(m));
      $('#amList', m).addEventListener('change', (e) => {
        const cb = e.target.closest('[data-pick]');
        if (!cb) return;
        if (cb.checked) picked.add(cb.dataset.pick); else picked.delete(cb.dataset.pick);
        $('#amCount', m).textContent = `เลือก ${picked.size} คน · รับได้อีก ${left} คน`;
      });
    },
  });
}

function openClubSubmit(c, pool) {
  const issues = clubIssues(c);
  const checks = [
    { ok: c.members.length > 0, label: 'มีสมาชิกในชุมนุม' },
    { ok: !issues.some((x) => x.why !== 'ให้ มผ ทั้งที่เวลาเข้าร่วมถึงเกณฑ์ ต้องระบุเหตุผล'), label: 'ประเมินและกรอกเวลาเข้าร่วมครบทุกคน' },
    { ok: !issues.some((x) => x.why.startsWith('ให้ มผ')), label: 'นักเรียนที่ได้ มผ ทั้งที่เวลาเข้าร่วมถึงเกณฑ์ มีเหตุผลกำกับ' },
  ];
  const ok = checks.every((x) => x.ok);
  openModal({
    title: 'ส่งผลชุมนุม',
    body: `<div class="checklist">${checks.map((x) => `<div class="cl-item"><span class="cl-icon ${x.ok ? 'cl-ok' : 'cl-bad'}">${icon(x.ok ? 'check' : 'x')}</span><span style="flex:1">${x.label}</span></div>`).join('')}</div>
      ${issues.length ? `<div class="muted" style="font-size:13px;margin-top:10px;max-height:150px;overflow:auto">${issues.slice(0, 12).map((x) => `• ${esc(fullName(pool.get(x.sid)))}: ${x.why}`).join('<br>')}${issues.length > 12 ? `<br>และอีก ${issues.length - 12} คน` : ''}</div>` : ''}
      <p class="muted" style="margin:12px 0 0">${ok ? 'เมื่อส่งแล้วข้อมูลจะถูกล็อกจนกว่าฝ่ายวิชาการจะตรวจ' : 'แก้รายการที่ยังไม่ผ่านก่อนส่ง'}</p>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ส่งให้ฝ่ายวิชาการ', cls: 'btn-ok', icon: 'send', disabled: !ok, onClick: () => {
        Object.assign(c, { state: 'pending', submittedAt: Date.now(), decidedAt: null, decidedBy: null, returnReason: '' });
        persist(); renderClub(c.id);
        toast('ส่งผลชุมนุมแล้ว · รอฝ่ายวิชาการตรวจ', 'ok');
      } },
    ],
  });
}

/* ---------- ฝ่ายวิชาการ: จัดการชุมนุม ---------- */
function renderAClubs() {
  $('#topbarTitle').textContent = 'ชุมนุมและกิจกรรม';
  const list = termClubs(ui.term);
  const f = ui.clubFilter || 'all';
  const count = (k) => list.filter((c) => (k === 'draft' ? ['draft', 'ready', 'returned'].includes(clubState(c)) : clubState(c) === k)).length;
  const rows = list.filter((c) => f === 'all' || (f === 'draft' ? ['draft', 'ready', 'returned'].includes(clubState(c)) : clubState(c) === f));
  const members = list.reduce((a, c) => a + c.members.length, 0);
  view.innerHTML = `
    <div class="page-head">
      <div><h1>ชุมนุมและกิจกรรม</h1><p>เปิดชุมนุม กำหนดครูที่ปรึกษาและจำนวนรับ และตรวจผล ผ / มผ ที่ครูที่ปรึกษาส่ง</p></div>
      <div class="filters">${termSelect('acTerm')}<button class="btn btn-primary" id="newClub">${icon('plus')}เปิดชุมนุมใหม่</button></div>
    </div>
    <div class="stat-row">
      <div class="card stat"><div class="stat-label">ชุมนุมที่เปิด</div><div class="stat-value">${list.length}<small> กลุ่ม</small></div></div>
      <div class="card stat"><div class="stat-label">นักเรียนที่เป็นสมาชิก</div><div class="stat-value">${members}<small> คน</small></div></div>
      <div class="card stat"><div class="stat-label">รอตรวจ</div><div class="stat-value" style="color:${count('pending') ? 'var(--primary)' : 'inherit'}">${count('pending')}<small> กลุ่ม</small></div></div>
      <div class="card stat"><div class="stat-label">อนุมัติแล้ว</div><div class="stat-value" style="color:var(--ok)">${count('approved')}<small> / ${list.length} กลุ่ม</small></div></div>
    </div>
    <div id="acBody">
      <div class="toolbar"><div class="seg" id="acFilter">${[['all', 'ทั้งหมด', list.length], ['draft', 'ยังไม่ส่ง', count('draft')], ['pending', 'รอตรวจ', count('pending')], ['approved', 'อนุมัติแล้ว', count('approved')]]
        .map(([k, l, c]) => `<button data-f="${k}" class="${f === k ? 'on' : ''}">${l}<span class="cnt">${c}</span></button>`).join('')}</div></div>
      ${rows.length ? `<div class="card list-wrap"><table class="list">
        <thead><tr><th>ชุมนุม</th><th>ประเภท</th><th>ครูที่ปรึกษา</th><th class="c">สมาชิก</th><th class="c">ประเมินแล้ว</th><th class="c">ผ / มผ</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${rows.map((c) => {
          const st = clubStats(c);
          return `<tr>
            <td><b>${esc(c.name)}</b></td><td class="muted">${CLUB_TYPES[c.type]}</td>
            <td>${esc(userById(c.advisorId)?.name || '—')}${c.advisorId === CURRENT_USER_ID ? ' <span class="chip chip-ms" style="font-size:11px">ตนเอง</span>' : ''}</td>
            <td class="c num">${st.n} / ${c.capacity}</td><td class="c num">${st.done} / ${st.n}</td>
            <td class="c num"><span style="color:var(--ok)">${st.pass}</span> / <span style="color:${st.fail ? 'var(--bad)' : 'inherit'}">${st.fail}</span></td>
            <td>${clubChip(c)}</td>
            <td class="r" style="white-space:nowrap">
              <button class="btn btn-sm ${c.state === 'pending' ? 'btn-primary' : ''}" data-view="${c.id}">${c.state === 'pending' ? 'ตรวจผล' : 'ดูผล'}</button>
              ${clubLocked(c) ? '' : `<button class="icon-btn" data-edit="${c.id}" title="แก้ไขชุมนุม">${icon('dots')}</button>`}
            </td>
          </tr>`;
        }).join('')}</tbody></table></div>`
      : `<div class="card empty"><div class="empty-icon">${icon('users')}</div><h3>ไม่มีชุมนุมในกลุ่มนี้</h3></div>`}
    </div>`;
  $('#acTerm').addEventListener('change', (e) => { ui.term = e.target.value; renderAClubs(); });
  $('#newClub').addEventListener('click', () => openClubForm(null));
  $('#acBody').addEventListener('click', (e) => {
    const fb = e.target.closest('#acFilter [data-f]');
    if (fb) { ui.clubFilter = fb.dataset.f; renderAClubs(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { openClubReview(clubById(v.dataset.view)); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) openClubForm(clubById(ed.dataset.edit));
  });
}

function openClubForm(c) {
  const teachers = USERS.filter((u) => u.roles.includes('teacher'));
  openModal({
    title: c ? 'แก้ไขชุมนุม' : 'เปิดชุมนุมใหม่',
    body: `<label style="display:block;font-size:14px;font-weight:600">ชื่อชุมนุม <span style="color:var(--bad)">*</span>
        <input class="input" id="cfName" style="width:100%;margin-top:6px" value="${esc(c?.name || '')}" placeholder="เช่น ชุมนุมดาราศาสตร์"></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <label style="font-size:14px;font-weight:600">ประเภท<select class="select" id="cfType" style="width:100%;margin-top:6px">${Object.entries(CLUB_TYPES).map(([k, l]) => `<option value="${k}" ${c?.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label style="font-size:14px;font-weight:600">จำนวนรับ (คน)<input class="input num" id="cfCap" inputmode="numeric" style="width:100%;margin-top:6px" value="${c?.capacity ?? 30}"></label>
      </div>
      <label style="display:block;margin-top:10px;font-size:14px;font-weight:600">ครูที่ปรึกษา
        <select class="select" id="cfAdvisor" style="width:100%;margin-top:6px">${teachers.map((u) => `<option value="${u.id}" ${c?.advisorId === u.id ? 'selected' : ''}>${esc(u.name)} · ${esc(u.dept.replace('กลุ่มสาระการเรียนรู้', ''))}</option>`).join('')}</select></label>
      ${c ? `<p class="faint" style="font-size:13px;margin:10px 0 0">มีสมาชิก ${c.members.length} คน ${c.members.length ? '· ลบชุมนุมได้เมื่อไม่มีสมาชิก' : ''}</p>` : ''}`,
    actions: [
      ...(c ? [{ label: 'ลบชุมนุม', cls: 'btn-danger', disabled: c.members.length > 0, onClick: () => {
        db.clubs = db.clubs.filter((x) => x.id !== c.id); persist(); renderAClubs(); toast('ลบชุมนุมแล้ว', 'ok');
      } }] : []),
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'บันทึก', cls: 'btn-primary', icon: 'save', onClick: () => {
        const name = $('#cfName').value.trim();
        const cap = Number($('#cfCap').value);
        if (!name) { toast('กรุณาระบุชื่อชุมนุม', 'bad'); return false; }
        if (!Number.isInteger(cap) || cap <= 0) { toast('จำนวนรับต้องเป็นจำนวนเต็มมากกว่า 0', 'bad'); return false; }
        if (c && cap < c.members.length) { toast(`มีสมาชิกแล้ว ${c.members.length} คน จำนวนรับต้องไม่น้อยกว่านี้`, 'bad'); return false; }
        if (termClubs(ui.term).some((x) => x !== c && x.name === name)) { toast('มีชุมนุมชื่อนี้ในภาคเรียนนี้แล้ว', 'bad'); return false; }
        const data = { name, type: $('#cfType').value, capacity: cap, advisorId: $('#cfAdvisor').value, updatedAt: Date.now() };
        if (c) Object.assign(c, data);
        else db.clubs.push({ id: `k${Date.now().toString(36)}`, term: ui.term, members: [], results: {}, state: 'draft', submittedAt: null, decidedAt: null, decidedBy: null, returnReason: '', ...data });
        persist(); renderAClubs();
        toast(c ? 'บันทึกการแก้ไขแล้ว' : 'เปิดชุมนุมแล้ว', 'ok');
      } },
    ],
    onMount: (m) => $('#cfName', m).focus(),
  });
}

/* ดูผลชุมนุม อ่านอย่างเดียว · อนุมัติ หรือตีกลับพร้อมเหตุผล (เหมือนผลการเรียนรายวิชา ADR 0001) */
function openClubReview(c) {
  const pool = studentPool(c.term);
  const st = clubStats(c);
  const self = c.advisorId === CURRENT_USER_ID;
  const members = c.members.map((sid) => pool.get(sid)).filter(Boolean).sort((a, b) => (a.room === b.room ? a.no - b.no : a.room < b.room ? -1 : 1));
  const decide = (state, reason = '') => {
    Object.assign(c, { state, decidedAt: Date.now(), decidedBy: CURRENT_USER_ID, returnReason: reason });
    persist(); renderAClubs();
    toast(state === 'approved' ? 'อนุมัติผลชุมนุมแล้ว' : 'ตีกลับให้ครูที่ปรึกษาแก้ไขแล้ว', 'ok');
  };
  openModal({
    title: esc(c.name),
    wide: true,
    body: `<div class="row wrap" style="gap:8px;margin-bottom:10px">${clubChip(c)}<span class="muted" style="font-size:13.5px">${CLUB_TYPES[c.type]} · ครูที่ปรึกษา ${esc(userById(c.advisorId)?.name || '—')} · ผ ${st.pass} · มผ ${st.fail} · ยังไม่ประเมิน ${st.n - st.done}</span>${self ? `<span class="chip chip-ms">${icon('eye')}ตรวจงานตนเอง</span>` : ''}</div>
      ${c.state === 'pending' ? `<label style="display:block;font-size:14px;font-weight:600;margin-bottom:10px">เหตุผล (ถ้าตีกลับ)<input class="input" id="crReason" style="width:100%;margin-top:6px" placeholder="เช่น มีนักเรียนได้ มผ แต่ไม่ได้ระบุเหตุผล"></label>` : ''}
      <div style="max-height:380px;overflow:auto"><table class="list">
        <thead><tr><th class="c">#</th><th>ชื่อ - สกุล</th><th class="c">ห้อง</th><th class="c">เวลาเข้าร่วม</th><th class="c">ผล</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${members.map((s, i) => { const r = clubResult(c, s.id); return `<tr><td class="c num faint">${i + 1}</td><td>${esc(fullName(s))}</td><td class="c">${s.room}</td>
          <td class="c num">${r.att != null ? `${r.att}%` : '—'}</td>
          <td class="c">${r.result ? `<span class="chip ${r.result === 'pass' ? 'chip-ok' : 'chip-bad'}">${r.result === 'pass' ? 'ผ' : 'มผ'}</span>` : '<span class="faint">—</span>'}</td>
          <td class="muted">${esc(r.remark || '')}</td></tr>`; }).join('') || '<tr><td colspan="6" class="c muted" style="padding:20px">ยังไม่มีสมาชิก</td></tr>'}</tbody>
      </table></div>`,
    actions: c.state === 'pending' ? [
      { label: 'ปิด', cls: 'btn-ghost' },
      { label: 'ตีกลับให้แก้ไข', cls: 'btn-danger', icon: 'back', onClick: () => {
        const reason = $('#crReason').value.trim();
        if (!reason) { toast('กรุณาระบุเหตุผลที่ตีกลับ', 'bad'); return false; }
        decide('draft', reason);
      } },
      { label: 'อนุมัติผลชุมนุม', cls: 'btn-ok', icon: 'check', onClick: () => decide('approved') },
    ] : [{ label: 'ปิด', cls: 'btn-ghost' }],
  });
}
