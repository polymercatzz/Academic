'use strict';
/* =========================================================
 *  วันหยุดของโรงเรียน (UC-25) — มุมมองฝ่ายวิชาการ
 *  คาบในวันหยุดไม่ต้องเช็คชื่อและไม่นับเป็นเวลาเรียน (holidayOn ใน attendance-core.js)
 *  กำหนดได้เฉพาะวันจันทร์–ศุกร์ในภาคเรียนปัจจุบัน ซึ่งเป็นภาคเรียนเดียวที่มีตารางสอนในระบบ
 * ========================================================= */

const WEEKDAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/* คาบตามตารางสอนในวันนั้นทั้งโรงเรียน และคาบที่เช็คชื่อไปแล้ว */
function periodsOn(date) {
  const slots = db.att.timetable.filter((t) => t.day === weekdayOf(date));
  const checked = slots.filter((t) => db.att.records[sessionKey(t.sec, date, t.period)]);
  const lockedSecs = new Set(checked.map((t) => sectionById(t.sec)).filter((sec) => sec && secLocked(sec)).map((sec) => sec.id));
  return { total: slots.length, checked: checked.length, locked: lockedSecs.size };
}

function holidaysChanged() {
  attTouch(); calcCache.clear();
  persist(); updateFollowBadge();
  renderAHolidays();
}

function renderAHolidays() {
  $('#topbarTitle').textContent = 'วันหยุดของโรงเรียน';
  const list = [...db.att.holidays].sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = todayISO();
  const start = db.att.start, end = termEnd(db);
  const upcoming = list.filter((h) => h.date >= today);
  const lost = list.reduce((a, h) => a + periodsOn(h.date).total, 0);
  view.innerHTML = `
    <div class="page-head">
      <div><h1>วันหยุดของโรงเรียน</h1><p>${termOf(currentTermKey()).label} · ${thDate(start)} ถึง ${thDate(end)} · คาบเรียนในวันหยุดจะไม่ต้องเช็คชื่อและไม่นับเป็นเวลาเรียน</p></div>
    </div>
    <div class="stat-row">
      <div class="card stat"><div class="stat-label">วันหยุดในภาคเรียน</div><div class="stat-value">${list.length}<small> วัน</small></div></div>
      <div class="card stat"><div class="stat-label">วันหยุดที่จะถึง</div><div class="stat-value">${upcoming.length}<small> วัน</small></div><div class="faint" style="font-size:12.5px">${upcoming[0] ? `ถัดไป ${thDate(upcoming[0].date)}` : '—'}</div></div>
      <div class="card stat"><div class="stat-label">คาบเรียนที่งดทั้งโรงเรียน</div><div class="stat-value">${lost}<small> คาบ</small></div></div>
      <div class="card stat"><div class="stat-label">สัปดาห์เรียน</div><div class="stat-value">${TERM_WEEKS}<small> สัปดาห์</small></div></div>
    </div>
    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-size:16px;margin:0 0 10px">เพิ่มวันหยุด</h3>
      <div class="row wrap" style="gap:10px;align-items:flex-end">
        <label style="font-size:14px;font-weight:600">วันที่<input class="input" type="date" id="hdDate" min="${start}" max="${end}" style="display:block;margin-top:6px"></label>
        <label style="font-size:14px;font-weight:600;flex:1;min-width:220px">ชื่อวันหยุด / กิจกรรม<input class="input" id="hdName" placeholder="เช่น วันหยุดชดเชย, กีฬาสี, ทัศนศึกษา" style="display:block;width:100%;margin-top:6px"></label>
        <button class="btn btn-primary" id="hdAdd">${icon('plus')}เพิ่มวันหยุด</button>
      </div>
      <div id="hdHint" class="faint" style="font-size:13px;margin-top:8px">เลือกวันจันทร์–ศุกร์ภายในภาคเรียน</div>
    </div>
    <div class="card list-wrap" id="hdList">
      <table class="list">
        <thead><tr><th>วันที่</th><th>วัน</th><th>ชื่อวันหยุด / กิจกรรม</th><th class="c">คาบที่งด</th><th>กำหนดโดย</th><th></th></tr></thead>
        <tbody>${list.map((h) => {
          const p = periodsOn(h.date);
          return `<tr class="${h.date < today ? 'faint' : ''}">
            <td class="num">${thDate(h.date)}</td><td>${WEEKDAY_TH[weekdayOf(h.date)]}</td>
            <td><b>${esc(h.name)}</b>${h.date < today ? ' <span class="chip" style="font-size:11px">ผ่านมาแล้ว</span>' : ''}</td>
            <td class="c num">${p.total}</td>
            <td class="muted">${h.by ? `${esc(userById(h.by)?.name || '—')}<div class="faint" style="font-size:12px">${thDate(h.at, true)}</div>` : 'วันหยุดราชการ (ตั้งต้น)'}</td>
            <td class="r"><button class="icon-btn" data-del="${h.date}" title="ลบวันหยุด">${icon('trash')}</button></td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" class="c muted" style="padding:24px">ยังไม่มีวันหยุดในภาคเรียนนี้</td></tr>'}</tbody>
      </table>
    </div>`;

  const hint = $('#hdHint');
  $('#hdDate').addEventListener('change', (e) => {
    const d = e.target.value;
    if (!d) { hint.textContent = 'เลือกวันจันทร์–ศุกร์ภายในภาคเรียน'; hint.style.color = ''; return; }
    const why = holidayProblem(d);
    if (why) { hint.textContent = why; hint.style.color = 'var(--bad)'; return; }
    const p = periodsOn(d);
    hint.style.color = p.checked ? 'var(--warn)' : '';
    hint.textContent = `วัน${WEEKDAY_TH[weekdayOf(d)]} · มีคาบเรียน ${p.total} คาบ${p.checked ? ` · ครูเช็คชื่อไปแล้ว ${p.checked} คาบ ซึ่งจะไม่นับเป็นเวลาเรียน` : ''}`;
  });
  $('#hdAdd').addEventListener('click', () => {
    const date = $('#hdDate').value;
    const name = $('#hdName').value.trim();
    if (!date) { toast('เลือกวันที่', 'bad'); return; }
    const why = holidayProblem(date);
    if (why) { toast(why, 'bad'); return; }
    if (!name) { toast('ระบุชื่อวันหยุด', 'bad'); return; }
    const add = () => {
      db.att.holidays.push({ date, name, by: CURRENT_USER_ID, at: Date.now() });
      holidaysChanged();
      toast(`เพิ่มวันหยุด ${thDate(date)} แล้ว`, 'ok');
    };
    const p = periodsOn(date);
    if (!p.checked) { add(); return; }
    confirmModal({
      title: 'เพิ่มวันหยุดย้อนหลัง',
      message: `วันที่ ${thDate(date)} ครูเช็คชื่อไปแล้ว ${p.checked} คาบ เมื่อกำหนดเป็นวันหยุด คาบเหล่านี้จะไม่นับเป็นเวลาเรียน และเวลาเรียน (%) ของนักเรียนจะเปลี่ยน${p.locked ? ` <b>รวมถึง ${p.locked} ห้องเรียนที่ส่งผลหรืออนุมัติแล้ว</b>` : ''}`,
      okLabel: 'กำหนดเป็นวันหยุด', okCls: 'btn-danger', onOk: add,
    });
  });
  $('#hdList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const h = db.att.holidays.find((x) => x.date === b.dataset.del);
    const past = h.date < todayISO();
    confirmModal({
      title: 'ลบวันหยุด',
      message: `ลบ “${esc(h.name)}” (${thDate(h.date)})${past ? ' คาบในวันนั้นจะกลับมาเป็นคาบที่ต้องเช็คชื่อ และขึ้นเป็น “ยังไม่เช็ค” ในหน้าของครู' : ' คาบในวันนั้นจะกลับมาเป็นวันเรียนปกติ'}`,
      okLabel: 'ลบวันหยุด', okCls: 'btn-danger',
      onOk: () => { db.att.holidays = db.att.holidays.filter((x) => x !== h); holidaysChanged(); toast('ลบวันหยุดแล้ว', 'ok'); },
    });
  });
}

function holidayProblem(date) {
  if (!inTerm(db, date)) return 'วันที่อยู่นอกภาคเรียน';
  if (!isSchoolDay(date)) return 'วันเสาร์–อาทิตย์เป็นวันหยุดอยู่แล้ว';
  const h = holidayOn(db, date);
  if (h) return `วันนี้เป็นวันหยุดอยู่แล้ว (${h.name})`;
  return '';
}
