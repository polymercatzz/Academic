'use strict';
/* =========================================================
 *  บันทึกผลการสอบซ่อม (UC-20) — มุมมองครูผู้สอน
 *  นักเรียนที่ได้ระดับ 0 สอบซ่อมได้ไม่เกิน MAX_REMEDIAL ครั้ง ผ่านเมื่อได้ 50% ขึ้นไป และได้ระดับไม่เกิน 1
 *  บันทึกได้ทั้งก่อนส่งผลและหลังอนุมัติ แต่ไม่ได้ระหว่างรอตรวจ (ADR 0012)
 *
 *  sec.remedialAttempts = { sid: [{ no, date, score, note, by, at }] }
 *  sec.remedial = { sid: score } ข้อมูลรูปแบบเดิม (บันทึกได้ครั้งเดียว) อ่านเป็นครั้งที่ 1
 * ========================================================= */

const MAX_REMEDIAL = 2;
const REMEDIAL_PASS = 50;

function remedialAttempts(sec, sid) {
  const list = sec.remedialAttempts?.[sid];
  if (list) return list;
  const legacy = sec.remedial?.[sid];
  return legacy != null ? [{ no: 1, date: null, score: legacy, note: '', by: sec.teacherId, at: null }] : [];
}
const remedialPassed = (sec, sid) => remedialAttempts(sec, sid).some((a) => a.score >= REMEDIAL_PASS);
const bestRemedial = (sec, sid) => Math.max(...remedialAttempts(sec, sid).map((a) => a.score));
const canRecordRemedial = (sec) => !isAcademic() && sec.teacherId === CURRENT_USER_ID && sec.state !== 'pending';

/* สถานะการสอบซ่อมของนักเรียนที่ได้ 0: waiting | retry | passed | exhausted (ต้องเรียนซ้ำรายวิชา) */
function remedialState(sec, sid) {
  const list = remedialAttempts(sec, sid);
  if (list.some((a) => a.score >= REMEDIAL_PASS)) return 'passed';
  if (!list.length) return 'waiting';
  return list.length >= MAX_REMEDIAL ? 'exhausted' : 'retry';
}
const REMEDIAL_STATE = {
  waiting: { label: 'รอสอบซ่อม', chip: 'chip-warn' },
  retry: { label: 'ไม่ผ่าน · สอบซ่อมได้อีก', chip: 'chip-bad' },
  passed: { label: 'สอบซ่อมผ่าน (ระดับ 1)', chip: 'chip-ok' },
  exhausted: { label: 'ไม่ผ่าน · ต้องเรียนซ้ำรายวิชา', chip: 'chip-ms' },
};
const remedialChip = (st) => `<span class="chip ${REMEDIAL_STATE[st].chip}"><span class="dot"></span>${REMEDIAL_STATE[st].label}</span>`;

/* นักเรียนที่ได้ 0 (รวมคนที่สอบซ่อมผ่านแล้ว) ในห้องเรียนที่ครูสอน */
function remedialRows(term) {
  const out = [];
  mySections(term).filter((sec) => sec.structure.length).forEach((sec) => sec.students.forEach((s) => {
    const r = computeStudent(sec, s);
    if (r.code === 'fail' || r.code === 'remedial-pass') out.push({ sec, s, r, st: remedialState(sec, s.id), list: remedialAttempts(sec, s.id) });
  }));
  return out;
}

function renderRemedial() {
  $('#topbarTitle').textContent = 'บันทึกผลการสอบซ่อม';
  const all = remedialRows(ui.term);
  const count = (k) => all.filter((x) => x.st === k).length;
  const f = ui.remedialFilter || 'all';
  const rows = all.filter((x) => f === 'all' || x.st === f);
  view.innerHTML = `
    <div class="page-head">
      <div><h1>บันทึกผลการสอบซ่อม</h1><p>นักเรียนที่ได้ระดับผลการเรียน 0 ในรายวิชาที่ท่านสอน สอบซ่อมได้ไม่เกิน ${MAX_REMEDIAL} ครั้ง ถ้าได้ ${REMEDIAL_PASS}% ขึ้นไปจะได้ระดับ 1</p></div>
      <select class="select" id="remTerm">${TERMS.map((t) => `<option value="${t.key}" ${t.key === ui.term ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
    </div>
    <div class="stat-row">
      <div class="card stat"><div class="stat-label">มีสิทธิ์สอบซ่อม (ได้ 0)</div><div class="stat-value">${all.length}<small> คน-วิชา</small></div></div>
      <div class="card stat"><div class="stat-label">รอสอบซ่อม</div><div class="stat-value" style="color:${count('waiting') + count('retry') ? 'var(--warn)' : 'inherit'}">${count('waiting') + count('retry')}<small> คน-วิชา</small></div></div>
      <div class="card stat"><div class="stat-label">สอบซ่อมผ่าน</div><div class="stat-value" style="color:var(--ok)">${count('passed')}<small> คน-วิชา</small></div></div>
      <div class="card stat"><div class="stat-label">ต้องเรียนซ้ำรายวิชา</div><div class="stat-value" style="color:${count('exhausted') ? 'var(--ms)' : 'inherit'}">${count('exhausted')}<small> คน-วิชา</small></div></div>
    </div>
    <div id="remBody">
      <div class="toolbar">
        <div class="seg" id="remFilter">${[['all', 'ทั้งหมด', all.length], ['waiting', 'รอสอบซ่อม', count('waiting')], ['retry', 'สอบซ่อมได้อีก', count('retry')], ['passed', 'ผ่าน', count('passed')], ['exhausted', 'ต้องเรียนซ้ำ', count('exhausted')]]
          .map(([k, l, c]) => `<button data-f="${k}" class="${f === k ? 'on' : ''}">${l}<span class="cnt">${c}</span></button>`).join('')}</div>
        <span class="spacer"></span>
        <span class="faint" style="font-size:13px">นักเรียนที่ติด ร ให้แก้คะแนนในหน้ารายวิชา · ติด มส ดูที่ <a href="${AcademicLayout.url('attendance.html#/sections/ms')}">ห้องที่ฉันสอน</a></span>
      </div>
      ${rows.length ? `<div class="card list-wrap"><table class="list">
        <thead><tr><th>นักเรียน</th><th>รายวิชา</th><th class="c">ห้อง</th><th class="r">คะแนนเดิม</th><th class="c">สอบซ่อม</th><th>ผลครั้งล่าสุด</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${rows.map(({ sec, s, r, st, list }) => {
          const last = list[list.length - 1];
          const btn = !canRecordRemedial(sec)
            ? `<span class="chip" title="ผลการเรียนอยู่ระหว่างรอฝ่ายวิชาการตรวจ">${icon('lock')}รอตรวจ</span>`
            : `<button class="btn btn-sm ${st === 'waiting' || st === 'retry' ? 'btn-primary' : ''}" data-rem="${sec.id}|${s.id}">${st === 'waiting' || st === 'retry' ? 'บันทึกผล' : 'ดูประวัติ'}</button>`;
          return `<tr>
            <td><b>${esc(fullName(s))}</b><div class="faint" style="font-size:12.5px">รหัส ${s.id} · เลขที่ ${s.no}</div></td>
            <td>${sec.code} ${esc(sec.name)}</td>
            <td class="c">${sec.room}</td>
            <td class="r num">${fmt1(r.total)}</td>
            <td class="c num">${list.length} / ${MAX_REMEDIAL}</td>
            <td>${last ? `<span class="num" style="font-weight:700;color:${last.score >= REMEDIAL_PASS ? 'var(--ok)' : 'var(--bad)'}">${fmt1(last.score)}%</span> <span class="faint" style="font-size:12.5px">${last.date ? thDate(last.date) : ''}</span>` : '<span class="faint">—</span>'}</td>
            <td>${remedialChip(st)}</td>
            <td class="r">${btn}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
      : `<div class="card empty"><div class="empty-icon">${icon('check')}</div><h3>ไม่มีนักเรียนในกลุ่มนี้</h3><div>ภาคเรียนนี้ยังไม่มีนักเรียนที่ได้ระดับ 0 ในรายวิชาที่ท่านสอน</div></div>`}
    </div>`;
  $('#remTerm').addEventListener('change', (e) => { ui.term = e.target.value; updateFollowBadge(); renderRemedial(); });
  $('#remBody').addEventListener('click', (e) => {
    const fb = e.target.closest('#remFilter [data-f]');
    if (fb) { ui.remedialFilter = fb.dataset.f; renderRemedial(); return; }
    const b = e.target.closest('[data-rem]');
    if (b) {
      const [secId, sid] = b.dataset.rem.split('|');
      const sec = sectionById(secId);
      openRemedial(sec, sec.students.find((x) => x.id === sid), renderRemedial);
    }
  });
}

function openRemedial(sec, s, after) {
  const list = remedialAttempts(sec, s.id);
  const st = remedialState(sec, s.id);
  const canAdd = canRecordRemedial(sec) && (st === 'waiting' || st === 'retry');
  const r = computeStudent(sec, s);
  const history = list.length ? `
    <table class="list" style="margin-bottom:14px">
      <thead><tr><th class="c">ครั้งที่</th><th>วันที่สอบ</th><th class="r">คะแนน</th><th>ผล</th><th>หมายเหตุ</th></tr></thead>
      <tbody>${list.map((a) => `<tr><td class="c num">${a.no}</td><td>${a.date ? thDate(a.date) : '—'}</td><td class="r num">${fmt1(a.score)}%</td>
        <td>${a.score >= REMEDIAL_PASS ? '<span class="chip chip-ok">ผ่าน</span>' : '<span class="chip chip-bad">ไม่ผ่าน</span>'}</td><td class="muted">${esc(a.note || '')}</td></tr>`).join('')}</tbody>
    </table>` : '<p class="muted" style="margin:0 0 14px">ยังไม่เคยสอบซ่อม</p>';
  const form = canAdd ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label style="font-size:14px;font-weight:600">วันที่สอบซ่อม<input class="input" type="date" id="remDate" style="width:100%;margin-top:6px" value="${isoDate(new Date())}"></label>
      <label style="font-size:14px;font-weight:600">คะแนนที่ได้ (ร้อยละ)<input class="input" id="remIn" inputmode="decimal" placeholder="0–100" style="width:100%;margin-top:6px"></label>
    </div>
    <label style="display:block;margin-top:10px;font-size:14px;font-weight:600">วิธีสอบ / หมายเหตุ<input class="input" id="remNote" placeholder="เช่น สอบข้อเขียน, ส่งงานเพิ่ม" style="width:100%;margin-top:6px"></label>
    <div class="callout" style="margin-top:12px">${icon('info')}<div>ครั้งที่ ${list.length + 1} จาก ${MAX_REMEDIAL} · ได้ ${REMEDIAL_PASS}% ขึ้นไปจะปรับระดับผลการเรียนเป็น <b>1</b>${list.length + 1 === MAX_REMEDIAL ? ' · ถ้าไม่ผ่านครั้งนี้ นักเรียนต้องเรียนซ้ำรายวิชา' : ''}${sec.state === 'approved' ? ' · ผลการเรียนห้องนี้อนุมัติแล้ว การบันทึกจะเก็บในประวัติการแก้ไขให้ฝ่ายวิชาการเห็น' : ''}</div></div>`
    : `<div class="callout ${st === 'passed' ? 'ok' : st === 'exhausted' ? 'warn' : ''}">${icon(st === 'passed' ? 'check' : 'info')}<div>${
      st === 'passed' ? 'สอบซ่อมผ่านแล้ว ระดับผลการเรียนเป็น 1'
        : st === 'exhausted' ? `สอบซ่อมครบ ${MAX_REMEDIAL} ครั้งแล้วยังไม่ผ่าน นักเรียนต้องเรียนซ้ำรายวิชานี้`
          : 'ผลการเรียนห้องนี้อยู่ระหว่างรอฝ่ายวิชาการตรวจ บันทึกผลสอบซ่อมได้หลังตรวจเสร็จ'}</div></div>`;
  const actions = [{ label: canAdd ? 'ยกเลิก' : 'ปิด', cls: 'btn-ghost' }];
  if (canAdd) actions.push({ label: 'บันทึกผลสอบซ่อม', cls: 'btn-primary', icon: 'save', onClick: () => {
    const v = $('#remIn').value.trim();
    const date = $('#remDate').value;
    if (!/^\d+(\.\d+)?$/.test(v) || +v > 100) { toast('กรอกคะแนน 0–100', 'bad'); return false; }
    if (!date) { toast('เลือกวันที่สอบซ่อม', 'bad'); return false; }
    const score = +v;
    const attempt = { no: list.length + 1, date, score, note: $('#remNote').value.trim(), by: CURRENT_USER_ID, at: Date.now() };
    sec.remedialAttempts = sec.remedialAttempts || {};
    sec.remedialAttempts[s.id] = [...list, attempt];
    const passed = score >= REMEDIAL_PASS;
    sec.history.unshift({ t: Date.now(), who: TEACHER.name, student: fullName(s), field: `ผลสอบซ่อมครั้งที่ ${attempt.no}`, from: '', to: `${fmt1(score)}% ${passed ? '→ ผ่าน (1)' : attempt.no >= MAX_REMEDIAL ? '→ ไม่ผ่าน · เรียนซ้ำ' : '→ ไม่ผ่าน'}` });
    sec.updatedAt = Date.now();
    persist(); updateFollowBadge();
    if (after) after();
    toast(passed ? 'สอบซ่อมผ่าน · ปรับผลการเรียนเป็น 1' : attempt.no >= MAX_REMEDIAL ? 'ไม่ผ่าน · นักเรียนต้องเรียนซ้ำรายวิชา' : 'บันทึกแล้ว · ยังสอบซ่อมได้อีก 1 ครั้ง', passed ? 'ok' : 'bad');
  } });
  openModal({
    title: 'ผลการสอบซ่อม',
    body: `<p style="margin:0 0 12px"><b>${esc(fullName(s))}</b> <span class="muted">· ${sec.code} ${esc(sec.name)} · ${sec.room} · คะแนนเดิม ${fmt1(r.total)}</span></p>${history}${form}`,
    actions,
    onMount: (m) => $('#remIn', m)?.focus(),
  });
}
