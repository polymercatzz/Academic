'use strict';
/* =========================================================
 *  มุมมองครูฝ่ายวิชาการ — docs/spec-academic-role.md
 *  ดูได้อย่างเดียว + อนุมัติ / ตีกลับ (ADR 0001, 0002)
 * ========================================================= */

const basicSections = (term) => db.sections.filter((s) => s.term === term && s.type === 'พื้นฐาน');
const termSections = (term) => db.sections.filter((s) => s.term === term);
const shortName = (id) => (userById(id)?.name || '').replace(/^ครู/, '').split(' ')[0];

function bulkEligibility(sec) {
  if (sec.state !== 'pending') return { ok: false, why: 'ยังไม่อยู่ในสถานะรอตรวจ' };
  if (isSelfReview(sec)) return { ok: false, why: 'ตรวจงานตนเอง ต้องอนุมัติทีละห้อง' };
  if (hasUnlockRequest(sec)) return { ok: false, why: 'มีคำขอปลดล็อกค้างอยู่' };
  return { ok: true };
}

function inboxItems(term) {
  const secs = termSections(term);
  return [
    ...secs.filter((s) => s.state === 'pending').map((sec) => ({ type: 'review', sec })),
    ...secs.filter(hasUnlockRequest).map((sec) => ({ type: 'unlock', sec })),
  ];
}

/* ---------- ส่วนประกอบในหน้าตรวจห้อง ---------- */
function academicBadges(sec) {
  const b = [];
  if (sec.state === 'draft') b.push(`<span class="chip chip-warn">${icon('info')}ยังไม่ส่ง · ข้อมูลอาจเปลี่ยนแปลง</span>`);
  if (sec.state === 'pending') b.push(`<span class="chip chip-primary">${icon('clock')}รอตรวจ · รอบที่ ${sec.reviews.length}</span>`);
  if (isReturned(sec)) b.push(`<span class="chip chip-bad">${icon('alert')}ตีกลับแล้ว · รอครูแก้ไข</span>`);
  if (isSelfReview(sec) && isLocked(sec)) b.push(`<span class="chip chip-ms">${icon('eye')}ตรวจงานตนเอง</span>`);
  if (hasUnlockRequest(sec)) b.push(`<span class="chip chip-warn">${icon('lock')}มีคำขอปลดล็อก</span>`);
  return b.length ? `<div class="row wrap" style="gap:6px;margin-top:8px">${b.join('')}</div>` : '';
}

function renderDecisionBar(sec) {
  const bar = $('#decisionBar');
  const tab = parseRoute(location.hash).tab;
  const r = lastReview(sec);
  const u = sec.unlockRequest;
  let left, right = '';
  if (sec.state === 'pending') {
    const pins = r.notes.length;
    left = `<button class="btn btn-sm ${ui.pinMode ? 'btn-primary' : ''}" id="pinToggle">${icon('pin')}โหมดปักหมุด: ${ui.pinMode ? 'เปิด' : 'ปิด'}</button>
      <span class="ab-status">หมุด <strong>${pins}</strong> รายการ</span>
      ${isSelfReview(sec) ? `<span class="chip chip-ms">${icon('eye')}ตรวจงานตนเอง</span>` : ''}`;
    right = `<button class="btn btn-danger" id="returnBtn">${icon('back')}ตีกลับให้แก้ไข</button>
      <button class="btn btn-ok" id="approveBtn">${icon('check')}อนุมัติผลการเรียน</button>`;
  } else if (sec.state === 'approved') {
    left = `<span class="ab-status"><span style="color:var(--ok)">${icon('lock')}</span>อนุมัติแล้วเมื่อ <strong>${thDate(r?.decidedAt, true)}</strong> โดย ${esc(userById(r?.reviewerId)?.name || '—')}</span>`;
  } else {
    const p = sectionProgress(sec);
    left = `<span class="ab-status">${icon('eye')}ดูได้อย่างเดียว · ${isReturned(sec) ? `ตีกลับเมื่อ ${relTime(r.decidedAt)} รอครูแก้ไขและส่งใหม่` : sec.structure.length ? `ยังไม่ส่งผลการเรียน · ความคืบหน้า <strong>${Math.round(p.overall * 100)}%</strong>` : 'ครูยังไม่เริ่มบันทึก'}</span>`;
  }
  if (u && u.status === 'pending') {
    left += `<span class="unlock-req">${icon('lock')}<span><b>คำขอปลดล็อก</b> · ${esc(u.reason)}</span></span>`;
    right = `<button class="btn btn-sm" id="unlockReject">ปฏิเสธคำขอ</button><button class="btn btn-sm btn-primary" id="unlockApprove">อนุมัติคำขอปลดล็อก</button>` + right;
  }
  bar.innerHTML = `${left}<span class="spacer"></span>${right}`;

  bar.onclick = (e) => {
    if (e.target.closest('#pinToggle')) {
      ui.pinMode = !ui.pinMode;
      if (ui.pinMode && !['scores', 'attr', 'rtw'].includes(tab)) { go(`#/a/s/${sec.id}/scores`); return; }
      renderSection(sec, tab);
      if (ui.pinMode) toast('คลิกช่องคะแนนหรือชื่อนักเรียนเพื่อปักหมุด', 'info');
    } else if (e.target.closest('#approveBtn')) openApprove(sec);
    else if (e.target.closest('#returnBtn')) openReturn(sec);
    else if (e.target.closest('#unlockApprove')) openUnlockDecision(sec, true);
    else if (e.target.closest('#unlockReject')) openUnlockDecision(sec, false);
  };
}

/* ---------- หมุดข้อสังเกต (ADR 0006) ---------- */
function openNoteEditor(sec, sid, field, anchor, rerender) {
  const r = lastReview(sec);
  const existing = r.notes.find((n) => n.sid === sid && (n.field || null) === (field || null));
  const s = sec.students.find((x) => x.id === sid);
  const where = field ? `${fullName(s)} · ${fieldLabel(sec, fieldKind(sec, field), field)}` : `${fullName(s)} · ทั้งแถว`;
  const value = field ? getRaw(sec, fieldKind(sec, field), sid, field) : '';
  openPopover(anchor, `
    <div class="pop-title">${icon('pin')} ${esc(where)}${field ? ` · ค่าปัจจุบัน <b>${esc(value || '(ว่าง)')}</b>` : ''}</div>
    <div style="padding:4px 8px 8px;width:300px">
      <textarea class="input textarea" id="noteText" rows="3" placeholder="เช่น คะแนนนี้สูงกว่าคะแนนเต็มของชิ้นงานจริง">${esc(existing?.text || '')}</textarea>
      <div class="row" style="margin-top:8px">
        ${existing ? `<button class="btn btn-sm btn-danger" id="noteDel" style="width:auto">${icon('trash')}ลบหมุด</button>` : ''}
        <span class="spacer"></span>
        <button class="btn btn-sm btn-primary" id="noteSave" style="width:auto">${icon('pin')}${existing ? 'บันทึก' : 'ปักหมุด'}</button>
      </div>
    </div>`, (pop) => {
    const ta = $('#noteText', pop);
    setTimeout(() => ta.focus(), 0);
    const save = () => {
      const text = ta.value.trim();
      if (!text) { toast('กรุณาพิมพ์ข้อสังเกต', 'bad'); return; }
      if (existing) existing.text = text;
      else r.notes.push({ id: `n${Date.now().toString(36)}`, sid, field: field || null, text, resolved: false });
      persist(); closePopover(); rerender(); renderDecisionBar(sec);
    };
    $('#noteSave', pop).addEventListener('click', save);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(); if (e.key === 'Escape') closePopover(); });
    const del = $('#noteDel', pop);
    if (del) del.addEventListener('click', () => { r.notes = r.notes.filter((n) => n !== existing); persist(); closePopover(); rerender(); renderDecisionBar(sec); });
  });
}

/* ---------- อนุมัติ / ตีกลับ / คำขอปลดล็อก ---------- */
function decide(sec, decision, reason = '') {
  const r = lastReview(sec);
  Object.assign(r, { reviewerId: CURRENT_USER_ID, decidedAt: Date.now(), decision, reason });
  if (decision === 'approved') {
    sec.state = 'approved';
    logEvent(sec, `ฝ่ายวิชาการอนุมัติผลการเรียน${isSelfReview(sec) ? ' (ตรวจงานตนเอง)' : ''}`);
  } else {
    sec.state = 'draft';
    logEvent(sec, `ฝ่ายวิชาการตีกลับให้แก้ไข${r.notes.length ? ` (${r.notes.length} หมุดข้อสังเกต)` : ''}: ${reason}`);
  }
  persist();
}

function sectionTitle(sec) { return `${sec.code} ${esc(sec.name)} · ${sec.room}`; }

function openApprove(sec) {
  const pins = lastReview(sec).notes.length;
  const st = sectionStats(sec);
  openModal({
    title: 'อนุมัติผลการเรียน',
    body: `<p style="margin:0 0 6px"><b>${sectionTitle(sec)}</b></p>
      <p class="muted" style="margin:0 0 12px">ครูผู้สอน ${esc(teacherName(sec))} · ${sec.students.length} คน · คะแนนเฉลี่ย ${st.mean != null ? fmt1(st.mean) : '—'} · ผ่าน ${st.pass} คน</p>
      <div class="checklist">
        ${isSelfReview(sec) ? `<div class="cl-item"><span class="cl-icon cl-warn">${icon('eye')}</span><span>ท่านเป็นครูผู้สอนของห้องนี้ การอนุมัตินี้จะถูกบันทึกเป็น <b>“ตรวจงานตนเอง”</b></span></div>` : ''}
        ${pins ? `<div class="cl-item"><span class="cl-icon cl-bad">${icon('pin')}</span><span>ท่านปักหมุดไว้ ${pins} รายการ หากต้องการให้ครูแก้ไข ควรกด “ตีกลับ” แทน</span></div>` : ''}
      </div>
      <div class="callout" style="margin-top:12px">${icon('lock')}<div>เมื่ออนุมัติแล้ว ข้อมูลจะถูกล็อก ถ้าครูต้องการแก้ไขภายหลัง ต้องยื่นคำขอปลดล็อก</div></div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ยืนยันอนุมัติ', cls: 'btn-ok', icon: 'check', onClick: () => {
        decide(sec, 'approved');
        updateFollowBadge(); renderSection(sec, parseRoute(location.hash).tab);
        toast(`อนุมัติ ${sec.code} ${sec.room} แล้ว`, 'ok');
      } },
    ],
  });
}

const QUICK_REASONS = ['คะแนนบางช่องผิดปกติ กรุณาตรวจสอบ', 'ยังมีนักเรียนติด ร ที่ไม่ได้ระบุการติดตาม', 'สัดส่วนคะแนนไม่ตรงกับที่กลุ่มสาระกำหนด', 'ผลประเมินคุณลักษณะฯ ไม่สอดคล้องกับคะแนน'];

function openReturn(sec) {
  const r = lastReview(sec);
  const noteRow = (n) => {
    const s = sec.students.find((x) => x.id === n.sid);
    return `<div class="note-item"><span class="pin-dot"></span><div style="flex:1;min-width:0"><div class="faint" style="font-size:12.5px">${esc(fullName(s))} · ${n.field ? esc(fieldLabel(sec, fieldKind(sec, n.field), n.field)) : 'ทั้งแถว'}</div><div>${esc(n.text)}</div></div><button class="icon-btn" data-rmnote="${n.id}" style="border:0" title="ลบหมุด">${icon('x')}</button></div>`;
  };
  openModal({
    title: 'ตีกลับให้ครูแก้ไข',
    wide: true,
    body: `<p style="margin:0 0 10px"><b>${sectionTitle(sec)}</b> <span class="muted">· ${esc(teacherName(sec))}</span></p>
      <label style="font-size:14px;font-weight:600">เหตุผลรวม <span style="color:var(--bad)">*</span></label>
      <div class="row wrap" style="gap:6px;margin:6px 0">${QUICK_REASONS.map((q) => `<button class="chip quick-reason" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <textarea class="input textarea" id="returnReason" rows="3" placeholder="อธิบายสิ่งที่ต้องแก้ไข"></textarea>
      <div style="margin-top:14px"><b style="font-size:14px">หมุดข้อสังเกต (${r.notes.length})</b>
        <div class="note-list" id="retNotes">${r.notes.length ? r.notes.map(noteRow).join('') : `<div class="faint" style="font-size:13.5px">ยังไม่มีหมุด — ปิดหน้าต่างนี้แล้วเปิด “โหมดปักหมุด” เพื่อชี้ช่องที่ต้องแก้ (ไม่บังคับ)</div>`}</div>
      </div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ยืนยันตีกลับ', cls: 'btn-danger', icon: 'back', onClick: () => {
        const reason = $('#returnReason').value.trim();
        if (!reason) { toast('ต้องระบุเหตุผลในการตีกลับ', 'bad'); $('#returnReason').focus(); return false; }
        const n = r.notes.length;
        decide(sec, 'returned', reason);
        ui.pinMode = false;
        updateFollowBadge(); renderSection(sec, parseRoute(location.hash).tab);
        toast(`ตีกลับ ${sec.code} ${sec.room} แล้ว${n ? ` พร้อม ${n} หมุด` : ''}`, 'ok');
      } },
    ],
    onMount: (m) => {
      m.addEventListener('click', (e) => {
        const q = e.target.closest('[data-q]');
        if (q) { const ta = $('#returnReason', m); ta.value = ta.value ? `${ta.value}\n${q.dataset.q}` : q.dataset.q; ta.focus(); }
        const rm = e.target.closest('[data-rmnote]');
        if (rm) { r.notes = r.notes.filter((n) => n.id !== rm.dataset.rmnote); persist(); rm.closest('.note-item').remove(); }
      });
      $('#returnReason', m).focus();
    },
  });
}

function openUnlockDecision(sec, approve, after) {
  const u = sec.unlockRequest;
  const done = () => { updateFollowBadge(); if (after) after(); else renderSection(sec, parseRoute(location.hash).tab); };
  if (approve) {
    confirmModal({
      title: 'อนุมัติคำขอปลดล็อก?',
      message: `${sectionTitle(sec)} · ${esc(teacherName(sec))}<br>เหตุผล: “${esc(u.reason)}”<br><br>สถานะจะกลับเป็น “กำลังบันทึก” ครูแก้ไขได้ และต้องส่งผลการเรียนใหม่`,
      okLabel: 'อนุมัติคำขอ',
      onOk: () => {
        Object.assign(u, { status: 'approved', decidedBy: CURRENT_USER_ID, decidedAt: Date.now() });
        const r = lastReview(sec);
        if (sec.state === 'pending' && r && !r.decision) Object.assign(r, { decision: 'unlocked', reviewerId: CURRENT_USER_ID, decidedAt: Date.now(), reason: `ปลดล็อกตามคำขอ: ${u.reason}` });
        sec.state = 'draft';
        logEvent(sec, `ฝ่ายวิชาการอนุมัติคำขอปลดล็อก — กลับเป็นกำลังบันทึก`);
        persist(); done();
        toast(`ปลดล็อก ${sec.code} ${sec.room} แล้ว`, 'ok');
      },
    });
    return;
  }
  openModal({
    title: 'ปฏิเสธคำขอปลดล็อก',
    body: `<p style="margin:0 0 8px">${sectionTitle(sec)} · ${esc(teacherName(sec))}</p><p class="muted" style="margin:0 0 10px">เหตุผลของครู: “${esc(u.reason)}”</p>
      <label style="font-size:14px;font-weight:600">เหตุผลที่ปฏิเสธ <span style="color:var(--bad)">*</span></label>
      <textarea class="input textarea" id="rejReason" rows="3" placeholder="เช่น เลยกำหนดแก้ไขผลการเรียนแล้ว ให้ดำเนินการผ่านคำร้องแก้ผลการเรียน"></textarea>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: 'ปฏิเสธคำขอ', cls: 'btn-danger', onClick: () => {
        const why = $('#rejReason').value.trim();
        if (!why) { toast('กรุณาระบุเหตุผล', 'bad'); return false; }
        Object.assign(u, { status: 'rejected', decidedBy: CURRENT_USER_ID, decidedAt: Date.now(), rejectReason: why });
        logEvent(sec, `ฝ่ายวิชาการปฏิเสธคำขอปลดล็อก: ${why}`);
        persist(); done();
        toast('ปฏิเสธคำขอแล้ว', 'ok');
      } },
    ],
    onMount: (m) => $('#rejReason', m).focus(),
  });
}

/* =========================================================
 *  หน้า: ภาพรวมทั้งโรงเรียน
 * ========================================================= */
const MX_STATUS = {
  approved: { label: 'อนุมัติแล้ว', short: 'อนุมัติ' },
  pending: { label: 'รอตรวจ', short: 'รอตรวจ' },
  returned: { label: 'ตีกลับ', short: 'ตีกลับ' },
  ready: { label: 'กรอกครบ ยังไม่ส่ง', short: '100%' },
  draft: { label: 'กำลังบันทึก', short: '' },
  nostructure: { label: 'ยังไม่เริ่ม', short: 'ยังไม่เริ่ม' },
};

function termSelect(id) {
  return `<select class="select" id="${id}" aria-label="ภาคเรียน">${TERMS.map((t) => `<option value="${t.key}" ${t.key === ui.term ? 'selected' : ''}>${t.label}${t.current ? ' (ปัจจุบัน)' : ''}</option>`).join('')}</select>`;
}

function matchesFilter(sec) {
  const f = ui.aFilter;
  const g = sec.room.match(/ม\.(\d)/)[1];
  if (f.grade !== 'all' && f.grade !== g) return false;
  if (f.slot !== 'all' && f.slot !== sec.slot) return false;
  if (f.status !== 'all') {
    const k = sectionState(sec).key;
    if (f.status === 'unlock' ? !hasUnlockRequest(sec) : f.status === 'draft' ? !['draft', 'ready'].includes(k) : k !== f.status) return false;
  }
  return true;
}

function renderAOverview() {
  $('#topbarTitle').textContent = 'ภาพรวมทั้งโรงเรียน';
  const all = basicSections(ui.term);
  const secsAll = termSections(ui.term);
  const cnt = (fn) => secsAll.filter(fn).length;
  const submitted = cnt(isLocked);
  const pendingN = cnt((s) => s.state === 'pending');
  const approvedN = cnt((s) => s.state === 'approved');
  const unlockN = cnt(hasUnlockRequest);
  const notStarted = cnt((s) => !s.structure.length);
  const dl = secsAll.length ? Math.min(...secsAll.map((s) => daysLeft(s.deadline))) : null;
  const f = ui.aFilter;

  const matrix = () => {
    if (!all.length) return `<div class="card empty"><div class="empty-icon">${icon('grid')}</div><h3>ยังไม่มีข้อมูลในภาคเรียนนี้</h3><div>ยังไม่มีการมอบหมายรายวิชาในภาคเรียนที่เลือก</div></div>`;
    const rooms = ROOMS.filter((r) => all.some((s) => s.room === r));
    const cell = (sec) => {
      if (!sec) return `<td class="mx-cell mx-none">—</td>`;
      const st = sectionState(sec);
      const p = sectionProgress(sec);
      const pct = Math.round(p.overall * 100);
      const label = st.key === 'draft' ? `${pct}%` : MX_STATUS[st.key].short;
      return `<td class="mx-cell mx-${st.key} ${matchesFilter(sec) ? '' : 'mx-dim'}">
        <a href="#/a/s/${sec.id}/${sec.state === 'pending' ? 'scores' : sec.structure.length ? 'scores' : 'structure'}" title="${esc(`${sec.code} ${sec.name} ${sec.room} · ${teacherName(sec)} · ${MX_STATUS[st.key].label}`)}">
          <span class="mx-top">${st.key === 'approved' ? icon('check') : st.key === 'returned' ? icon('back') : st.key === 'pending' ? icon('clock') : ''}<b>${label}</b>
            ${hasUnlockRequest(sec) ? `<span class="mx-lock">${icon('lock')}</span>` : ''}</span>
          ${st.key === 'draft' ? `<span class="mx-bar"><span style="width:${pct}%"></span></span>` : ''}
          <span class="mx-teacher">${esc(shortName(sec.teacherId))}${isSelfReview(sec) ? ' · ฉัน' : ''}</span>
        </a></td>`;
    };
    return `<div class="card mx-wrap"><table class="mx">
      <thead><tr><th class="mx-room">ห้อง</th>${SUBJECTS.map((s) => `<th class="${f.slot !== 'all' && f.slot !== s.slot ? 'mx-dim' : ''}">${s.short}</th>`).join('')}<th>ส่งแล้ว</th></tr></thead>
      <tbody>${rooms.map((room, i) => {
        const secs = all.filter((s) => s.room === room);
        const done = secs.filter(isLocked).length;
        const newGrade = i > 0 && rooms[i - 1].slice(0, 3) !== room.slice(0, 3);
        return `${newGrade ? `<tr class="mx-spacer"><td colspan="${SUBJECTS.length + 2}"></td></tr>` : ''}<tr><th class="mx-room">${room}</th>${SUBJECTS.map((subj) => cell(secs.find((s) => s.slot === subj.slot))).join('')}
          <td class="mx-sum"><b>${done}</b>/${secs.length}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="legend row wrap" style="margin-top:10px">
      ${['approved', 'pending', 'returned', 'ready', 'draft', 'nostructure'].map((k) => `<span><span class="sw mx-${k}"></span>${MX_STATUS[k].label}</span>`).join('')}
      <span>${icon('lock')}มีคำขอปลดล็อก</span>
    </div>
    ${secsAll.filter((s) => s.type !== 'พื้นฐาน').length ? `<div class="card card-pad" style="margin-top:16px"><h3 style="font-size:15px;margin-bottom:8px">รายวิชาเพิ่มเติม</h3>
      <div class="row wrap">${secsAll.filter((s) => s.type !== 'พื้นฐาน').map((s) => `<a class="chip ${sectionState(s).chip}" href="#/a/s/${s.id}/scores">${s.code} ${esc(s.name)} · ${s.room} · ${esc(shortName(s.teacherId))} · ${sectionState(s).label}</a>`).join('')}</div></div>` : ''}`;
  };

  const byTeacher = () => {
    const rows = USERS.map((u) => ({ u, secs: secsAll.filter((s) => s.teacherId === u.id) })).filter((x) => x.secs.length);
    return `<div class="card list-wrap"><table class="list">
      <thead><tr><th>ครูผู้สอน</th><th class="c">ห้องที่สอน</th><th class="c">อนุมัติ</th><th class="c">รอตรวจ</th><th class="c">กำลังบันทึก</th><th class="c">ยังไม่เริ่ม</th><th style="width:160px">ส่งแล้ว</th><th>ห้องเรียนที่สอน</th></tr></thead>
      <tbody>${rows.map(({ u, secs }) => {
        const c = (fn) => secs.filter(fn).length;
        const sent = c(isLocked);
        return `<tr>
          <td><b>${esc(u.name)}</b>${u.id === CURRENT_USER_ID ? ' <span class="chip chip-primary" style="font-size:11px">ฉัน</span>' : ''}<div class="faint" style="font-size:12.5px">${esc(u.dept.replace('กลุ่มสาระการเรียนรู้', ''))}</div></td>
          <td class="c num">${secs.length}</td>
          <td class="c num" style="color:var(--ok)">${c((s) => s.state === 'approved') || ''}</td>
          <td class="c num" style="color:var(--primary)">${c((s) => s.state === 'pending') || ''}</td>
          <td class="c num">${c((s) => s.state === 'draft' && s.structure.length) || ''}</td>
          <td class="c num" style="color:var(--warn)">${c((s) => !s.structure.length) || ''}</td>
          <td><div class="row" style="gap:8px"><div class="progress ${sent === secs.length ? 'ok' : ''}" style="flex:1"><span style="width:${(sent / secs.length) * 100}%"></span></div><span class="num" style="font-size:13px">${sent}/${secs.length}</span></div></td>
          <td><div class="row wrap" style="gap:4px">${secs.map((s) => `<a class="chip mx-chip mx-${sectionState(s).key}" href="#/a/s/${s.id}/scores" title="${esc(`${s.code} ${s.name} · ${sectionState(s).label}`)}">${s.room} ${esc((SUBJECTS.find((x) => x.slot === s.slot)?.short) || s.code)}</a>`).join('')}</div></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  };

  view.innerHTML = `
    <div class="page-head">
      <div><h1>ภาพรวมการบันทึกคะแนน</h1><p>ติดตามการกรอกคะแนนของครูผู้สอนทุกคน ข้อมูลที่เห็นคือข้อมูลที่ครู <b>บันทึกแล้ว</b></p></div>
      <div class="filters">${termSelect('aTerm')}</div>
    </div>
    <div class="stat-row stat-row-6">
      <div class="card stat"><div class="stat-label">ส่งผลการเรียนแล้ว</div><div class="stat-value">${submitted}<small> / ${secsAll.length} ห้อง</small></div><div class="progress ${submitted === secsAll.length && secsAll.length ? 'ok' : ''}" style="margin-top:6px"><span style="width:${secsAll.length ? (submitted / secsAll.length) * 100 : 0}%"></span></div></div>
      <a class="card stat stat-link" href="#/a/inbox"><div class="stat-label">รอตรวจ</div><div class="stat-value" style="color:var(--primary)">${pendingN}</div></a>
      <div class="card stat"><div class="stat-label">อนุมัติแล้ว</div><div class="stat-value" style="color:var(--ok)">${approvedN}</div></div>
      <a class="card stat stat-link" href="#/a/inbox"><div class="stat-label">คำขอปลดล็อก</div><div class="stat-value" style="color:${unlockN ? 'var(--warn)' : 'inherit'}">${unlockN}</div></a>
      <div class="card stat"><div class="stat-label">ยังไม่เริ่ม</div><div class="stat-value">${notStarted}</div></div>
      <div class="card stat"><div class="stat-label">ถึงกำหนดส่ง</div><div class="stat-value">${dl == null ? '—' : dl < 0 ? `<span style="color:var(--bad);white-space:nowrap">เลย ${-dl} <small>วัน</small></span>` : `${dl} <small>วัน</small>`}</div></div>
    </div>
    <div class="toolbar">
      <div class="seg" id="aTabs"><button data-t="matrix" class="${ui.aTab === 'matrix' ? 'on' : ''}">${icon('grid')}ห้อง × รายวิชา</button><button data-t="teacher" class="${ui.aTab === 'teacher' ? 'on' : ''}">${icon('users')}รายครู</button></div>
      ${ui.aTab === 'matrix' ? `
        <select class="select" data-af="grade"><option value="all">ทุกระดับชั้น</option>${GRADES.map((g) => `<option value="${g}" ${f.grade === String(g) ? 'selected' : ''}>ม.${g}</option>`).join('')}</select>
        <select class="select" data-af="slot"><option value="all">ทุกรายวิชา</option>${SUBJECTS.map((s) => `<option value="${s.slot}" ${f.slot === s.slot ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
        <select class="select" data-af="status"><option value="all">ทุกสถานะ</option>
          ${[['nostructure', 'ยังไม่เริ่ม'], ['draft', 'กำลังบันทึก'], ['returned', 'ตีกลับ'], ['pending', 'รอตรวจ'], ['approved', 'อนุมัติแล้ว'], ['unlock', 'มีคำขอปลดล็อก']].map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
    </div>
    <div id="aBody">${ui.aTab === 'matrix' ? matrix() : byTeacher()}</div>`;

  $('#aTerm').addEventListener('change', (e) => { ui.term = e.target.value; updateFollowBadge(); renderAOverview(); });
  $('#aTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { ui.aTab = b.dataset.t; renderAOverview(); } });
  $$('[data-af]').forEach((el) => el.addEventListener('change', () => {
    ui.aFilter[el.dataset.af] = el.type === 'checkbox' ? el.checked : el.value;
    renderAOverview();
  }));
}

/* =========================================================
 *  หน้า: กล่องงาน
 * ========================================================= */
function renderAInbox() {
  $('#topbarTitle').textContent = 'กล่องงาน';
  const items = inboxItems(ui.term);
  const reviews = items.filter((x) => x.type === 'review').map((x) => x.sec).sort((a, b) => a.submittedAt - b.submittedAt);
  const unlocks = items.filter((x) => x.type === 'unlock').map((x) => x.sec).sort((a, b) => a.unlockRequest.at - b.unlockRequest.at);
  [...ui.bulk].forEach((id) => { const s = sectionById(id); if (!s || !bulkEligibility(s).ok) ui.bulk.delete(id); });
  const eligible = reviews.filter((s) => bulkEligibility(s).ok);

  view.innerHTML = `
    <div class="page-head">
      <div><h1>กล่องงาน</h1><p>ห้องที่รอตรวจ และคำขอปลดล็อกจากครูผู้สอน เรียงจากรายการที่รอนานที่สุด</p></div>
      <div class="filters">${termSelect('iTerm')}</div>
    </div>

    <div class="card list-wrap" style="margin-bottom:18px">
      <div class="row wrap card-pad" style="padding-bottom:12px">
        <h3 style="font-size:16px">รอตรวจ <span class="chip chip-primary">${reviews.length}</span></h3>
        <span class="spacer"></span>
        <span class="faint" style="font-size:13px">อนุมัติพร้อมกันได้ ${eligible.length} ห้อง (ไม่ใช่งานตนเอง ไม่มีคำขอปลดล็อกค้าง)</span>
        <button class="btn btn-sm" id="selEligible" ${eligible.length ? '' : 'disabled'}>เลือกทั้งหมดที่อนุมัติได้</button>
        <button class="btn btn-sm btn-ok" id="bulkApprove" ${ui.bulk.size ? '' : 'disabled'}>${icon('check')}อนุมัติที่เลือก (${ui.bulk.size})</button>
      </div>
      ${reviews.length ? `<table class="list">
        <thead><tr><th style="width:40px"></th><th>รายวิชา · ห้อง</th><th>ครูผู้สอน</th><th>ส่งเมื่อ</th><th></th></tr></thead>
        <tbody>${reviews.map((s) => {
          const el = bulkEligibility(s);
          return `<tr class="${ui.bulk.has(s.id) ? 'row-sel' : ''}">
            <td class="c"><input type="checkbox" data-bulk="${s.id}" ${ui.bulk.has(s.id) ? 'checked' : ''} ${el.ok ? '' : 'disabled'} title="${el.ok ? 'เลือกเพื่ออนุมัติพร้อมกัน' : esc(el.why)}" style="accent-color:var(--ok);width:16px;height:16px"></td>
            <td><b>${s.code} ${esc(s.name)}</b><div class="faint" style="font-size:12.5px">${s.room} · รอบที่ ${s.reviews.length}</div></td>
            <td>${esc(teacherName(s))}${isSelfReview(s) ? ` <span class="chip chip-ms" style="font-size:11px">${icon('eye')}ตรวจงานตนเอง</span>` : ''}${hasUnlockRequest(s) ? ` <span class="chip chip-warn" style="font-size:11px">${icon('lock')}ขอปลดล็อก</span>` : ''}</td>
            <td class="muted">${relTime(s.submittedAt)}</td>
            <td class="r"><a class="btn btn-sm btn-primary" href="#/a/s/${s.id}/scores">ตรวจ ${icon('chev')}</a></td>
          </tr>`;
        }).join('')}</tbody></table>` : `<div class="empty" style="padding:28px">ไม่มีห้องที่รอตรวจ</div>`}
    </div>

    <div class="card list-wrap">
      <div class="card-pad" style="padding-bottom:12px"><h3 style="font-size:16px">คำขอปลดล็อก <span class="chip chip-warn">${unlocks.length}</span></h3></div>
      ${unlocks.length ? `<table class="list">
        <thead><tr><th>รายวิชา · ห้อง</th><th>ครูผู้สอน</th><th>สถานะปัจจุบัน</th><th>เหตุผลของครู</th><th>ยื่นเมื่อ</th><th></th></tr></thead>
        <tbody>${unlocks.map((s) => `<tr>
          <td><a href="#/a/s/${s.id}/history"><b>${s.code} ${esc(s.name)}</b></a><div class="faint" style="font-size:12.5px">${s.room}</div></td>
          <td>${esc(teacherName(s))}</td>
          <td><span class="chip ${sectionState(s).chip}">${sectionState(s).label}</span></td>
          <td>${esc(s.unlockRequest.reason)}</td>
          <td class="muted">${relTime(s.unlockRequest.at)}</td>
          <td class="r" style="white-space:nowrap"><button class="btn btn-sm" data-unrej="${s.id}">ปฏิเสธ</button> <button class="btn btn-sm btn-primary" data-unok="${s.id}">อนุมัติคำขอ</button></td>
        </tr>`).join('')}</tbody></table>` : `<div class="empty" style="padding:28px">ไม่มีคำขอปลดล็อก</div>`}
    </div>`;

  $('#iTerm').addEventListener('change', (e) => { ui.term = e.target.value; ui.bulk.clear(); updateFollowBadge(); renderAInbox(); });
  $('#selEligible').addEventListener('click', () => { eligible.forEach((s) => ui.bulk.add(s.id)); renderAInbox(); });
  $('#bulkApprove').addEventListener('click', openBulkApprove);
  $$('[data-bulk]').forEach((cb) => cb.addEventListener('change', () => { if (cb.checked) ui.bulk.add(cb.dataset.bulk); else ui.bulk.delete(cb.dataset.bulk); renderAInbox(); }));
  $$('[data-unok]').forEach((b) => b.addEventListener('click', () => openUnlockDecision(sectionById(b.dataset.unok), true, renderAInbox)));
  $$('[data-unrej]').forEach((b) => b.addEventListener('click', () => openUnlockDecision(sectionById(b.dataset.unrej), false, renderAInbox)));
}

function openBulkApprove() {
  const secs = [...ui.bulk].map(sectionById).filter((s) => s && bulkEligibility(s).ok);
  if (!secs.length) return;
  openModal({
    title: `อนุมัติพร้อมกัน ${secs.length} ห้อง`,
    body: `<p class="muted" style="margin:0 0 10px">ทุกห้องผ่านเงื่อนไข: รอตรวจ · ไม่มีคำขอปลดล็อก · ไม่ใช่การตรวจงานตนเอง</p>
      <div class="checklist">${secs.map((s) => `<div class="cl-item"><span class="cl-icon cl-ok">${icon('check')}</span><span><b>${s.code} ${esc(s.name)}</b> · ${s.room} <span class="faint">· ${esc(teacherName(s))}</span></span></div>`).join('')}</div>`,
    actions: [
      { label: 'ยกเลิก', cls: 'btn-ghost' },
      { label: `ยืนยันอนุมัติ ${secs.length} ห้อง`, cls: 'btn-ok', icon: 'check', onClick: () => {
        secs.forEach((s) => decide(s, 'approved'));
        ui.bulk.clear();
        updateFollowBadge(); renderAInbox();
        toast(`อนุมัติแล้ว ${secs.length} ห้อง`, 'ok');
      } },
    ],
  });
}

/* =========================================================
 *  หน้า: รายงานภาพรวม (ส่งออก CSV)
 * ========================================================= */
function statusRows(term) {
  return termSections(term).map((s) => {
    const r = lastReview(s);
    const approvedR = [...(s.reviews || [])].reverse().find((x) => x.decision === 'approved');
    return {
      sec: s, room: s.room, subject: `${s.code} ${s.name}`, teacher: teacherName(s), status: sectionState(s).label,
      progress: Math.round(sectionProgress(s).overall * 100),
      submitted: s.submittedAt && isLocked(s) ? thDate(s.submittedAt, true) : '',
      approvedAt: s.state === 'approved' && approvedR ? thDate(approvedR.decidedAt, true) : '',
      approver: s.state === 'approved' && approvedR ? userById(approvedR.reviewerId)?.name || '' : '',
      self: s.state === 'approved' && approvedR && approvedR.reviewerId === s.teacherId ? 'ใช่' : '',
      unlock: hasUnlockRequest(s) ? 'มี' : '',
      rounds: s.reviews?.length || 0, returned: r?.decision === 'returned' && s.state === 'draft' ? 'ใช่' : '',
    };
  }).sort((a, b) => a.room.localeCompare(b.room, 'th') || a.subject.localeCompare(b.subject, 'th'));
}

function renderAReports() {
  $('#topbarTitle').textContent = 'รายงานภาพรวม';
  const rows = statusRows(ui.term);
  const flagged = followupRows(ui.term, true);
  const fc = (c) => flagged.filter((x) => x.r.code === c).length;
  view.innerHTML = `
    <div class="page-head">
      <div><h1>รายงานภาพรวม</h1><p>ส่งออกเป็น CSV แล้วเปิดด้วย Excel ได้</p></div>
      <div class="filters">${termSelect('rTerm')}</div>
    </div>
    <div class="card list-wrap" style="margin-bottom:18px">
      <div class="row wrap card-pad" style="padding-bottom:12px"><div><h3 style="font-size:16px">สถานะการส่งผลการเรียนทุกห้อง</h3><div class="faint" style="font-size:13px">${rows.length} ห้องเรียนที่สอน · อนุมัติ ${rows.filter((x) => x.sec.state === 'approved').length} · รอตรวจ ${rows.filter((x) => x.sec.state === 'pending').length} · ยังไม่ส่ง ${rows.filter((x) => !isLocked(x.sec)).length}</div></div><span class="spacer"></span>
        <button class="btn" id="csvStatus" ${rows.length ? '' : 'disabled'}>${icon('download')}ส่งออก CSV</button></div>
      <div style="max-height:420px;overflow:auto"><table class="list">
        <thead><tr><th>ห้อง</th><th>รายวิชา</th><th>ครูผู้สอน</th><th>สถานะ</th><th class="c">ความคืบหน้า</th><th>ส่งเมื่อ</th><th>อนุมัติโดย</th></tr></thead>
        <tbody>${rows.map((x) => `<tr>
          <td>${x.room}</td><td><a href="#/a/s/${x.sec.id}/scores">${esc(x.subject)}</a></td><td>${esc(x.teacher)}</td>
          <td><span class="chip ${sectionState(x.sec).chip}" style="font-size:11.5px">${x.status}</span>${x.unlock ? ` <span class="chip chip-warn" style="font-size:11px">ขอปลดล็อก</span>` : ''}</td>
          <td class="c num">${x.progress}%</td><td class="muted">${x.submitted || '—'}</td>
          <td>${x.approver ? `${esc(x.approver)}${x.self ? ' <span class="chip chip-ms" style="font-size:11px">ตรวจงานตนเอง</span>' : ''}` : '<span class="faint">—</span>'}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="card list-wrap">
      <div class="row wrap card-pad" style="padding-bottom:12px"><div><h3 style="font-size:16px">นักเรียนที่ต้องติดตามทั้งโรงเรียน</h3><div class="faint" style="font-size:13px">${flagged.length} รายการ · ได้ 0: ${fc('fail')} · ร: ${fc('r')} · มส: ${fc('ms')}</div></div><span class="spacer"></span>
        <button class="btn" id="csvFlag" ${flagged.length ? '' : 'disabled'}>${icon('download')}ส่งออก CSV</button></div>
      <div style="max-height:420px;overflow:auto"><table class="list">
        <thead><tr><th>นักเรียน</th><th>ห้อง</th><th>รายวิชา</th><th>ครูผู้สอน</th><th>สถานะ</th><th>รายละเอียด</th></tr></thead>
        <tbody>${flagged.map(({ sec, s, r, detail }) => `<tr><td>${esc(fullName(s))}<div class="faint" style="font-size:12px">${s.id}</div></td><td>${sec.room}</td><td>${sec.code} ${esc(sec.name)}</td><td>${esc(teacherName(sec))}</td><td>${statusChip(r.code)}</td><td class="muted">${esc(detail)}</td></tr>`).join('') || '<tr><td colspan="6" class="c muted" style="padding:24px">ไม่มีนักเรียนที่ต้องติดตาม</td></tr>'}</tbody></table></div>
    </div>`;
  $('#rTerm').addEventListener('change', (e) => { ui.term = e.target.value; updateFollowBadge(); renderAReports(); });
  $('#csvStatus').addEventListener('click', () => {
    const head = ['ห้อง', 'รายวิชา', 'ครูผู้สอน', 'สถานะ', 'ความคืบหน้า(%)', 'รอบการตรวจ', 'ส่งเมื่อ', 'อนุมัติเมื่อ', 'ผู้อนุมัติ', 'ตรวจงานตนเอง', 'ถูกตีกลับ', 'คำขอปลดล็อก'];
    const lines = [head, ...rows.map((x) => [x.room, x.subject, x.teacher, x.status, x.progress, x.rounds, x.submitted, x.approvedAt, x.approver, x.self, x.returned, x.unlock])];
    downloadFile(`สถานะการส่งผลการเรียน_${ui.term}.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
    toast('ส่งออกไฟล์ CSV แล้ว', 'ok');
  });
  $('#csvFlag').addEventListener('click', () => {
    const head = ['รหัสนักเรียน', 'ชื่อ-สกุล', 'ห้อง', 'รายวิชา', 'ครูผู้สอน', 'สถานะ', 'รายละเอียด'];
    const lines = [head, ...flagged.map(({ sec, s, r, detail }) => [s.id, fullName(s), sec.room, `${sec.code} ${sec.name}`, teacherName(sec), STATUS[r.code].label, detail])];
    downloadFile(`นักเรียนที่ต้องติดตาม_${ui.term}.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
    toast('ส่งออกไฟล์ CSV แล้ว', 'ok');
  });
}

boot();
