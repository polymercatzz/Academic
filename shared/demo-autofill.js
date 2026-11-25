/* เครื่องมือกรอกข้อมูลอัตโนมัติสำหรับอัดวิดีโอเดโม
 *
 *   F9  กรอกให้ตามหน้าจอที่เปิดอยู่ (ทำทีละอย่างที่สำคัญที่สุดก่อน)
 *   F8  เปิด/ปิดแผงเลือกคำสั่งเอง และตั้งความเร็ว
 *
 * สิ่งที่กรอกให้ เรียงตามลำดับที่ F9 ตรวจ
 *   1. ช่องข้อความว่างในหน้าต่างที่เปิดอยู่ เช่น เหตุผลตีกลับ ข้อความหมุด คำยืนยัน "เผยแพร่"
 *   2. หน้าต่างนำเข้าคะแนน: สร้างไฟล์ CSV ที่เติมช่องว่างครบ แล้วนำเข้าให้
 *   3. หน้าเช็คชื่อรายคาบ: ทำเครื่องหมาย ขาด สาย ลา ให้นักเรียนตัวอย่าง
 *   4. ตารางคะแนน / คุณลักษณะ / อ่านคิดเขียน: เติมช่องที่ยังว่าง
 * ไม่กดบันทึก ส่ง หรือยืนยันแทน ให้ผู้นำเสนอกดเองในวิดีโอ */
(function () {
  if (window.DemoAutofill) return;

  const SPEEDS = { slow: 1.8, normal: 1, fast: 0.35 };
  let speed = 'normal';
  try { speed = localStorage.getItem('demoAutofill:speed') || 'normal'; } catch (e) { /* ignore */ }
  let busy = false;

  // ข้อความตัวอย่างตาม id ของช่อง ถ้าไม่มีในนี้จะใช้ตัวอย่างจาก placeholder
  const PRESET = {
    returnReason: 'คะแนนสอบปลายภาคของนักเรียน 2 คนยังเป็นขาดสอบ กรุณาระบุผลการสอบย้อนหลัง และตรวจคะแนนจิตพิสัยที่ปักหมุดไว้ก่อนส่งใหม่',
    noteText: 'คะแนนนี้ต่ำกว่าเพื่อนในห้องมาก ตรวจสอบว่ากรอกถูกคนหรือไม่',
    rejReason: 'เลยกำหนดแก้ไขผลการเรียนแล้ว ให้ดำเนินการผ่านคำร้องแก้ผลการเรียน',
    unlockReason: 'นักเรียนมาสอบแก้ตัว ร แล้ว ต้องการกรอกคะแนนใหม่',
    strictReason: 'นักเรียนไปแข่งขันในนามโรงเรียน มีหนังสือรับรอง',
    wReason: 'ป่วยนอนโรงพยาบาล 3 สัปดาห์ มีใบรับรองแพทย์',
    wRef: 'วก. 123/2569',
  };

  /* ---------- เครื่องมือย่อย ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * SPEEDS[speed]));
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const editable = (el) => visible(el) && !el.disabled && !el.readOnly;
  // สุ่มแบบกำหนดผลได้ อัดกี่รอบก็ได้ค่าเดิม
  let seed = 2569;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  function pulse(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    const old = el.style.boxShadow, oldT = el.style.transition;
    el.style.transition = 'box-shadow .15s';
    el.style.boxShadow = '0 0 0 3px rgba(37,99,235,.55)';
    setTimeout(() => { el.style.boxShadow = old; el.style.transition = oldT; }, 600 * SPEEDS[speed]);
  }
  function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

  async function typeInto(el, text, perChar = 28) {
    pulse(el);
    el.focus();
    el.value = '';
    fire(el, 'input');
    for (const ch of Array.from(text)) {
      el.value += ch;
      fire(el, 'input');
      await wait(perChar);
    }
    fire(el, 'change');
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#0f172a;color:#fff;padding:8px 14px;border-radius:10px;font:14px "Noto Sans Thai",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  /* ---------- 1. ช่องข้อความในหน้าต่างที่เปิดอยู่ ---------- */
  const DIALOG_SEL = '.modal-backdrop, [role="dialog"], #drawer:not(.hidden), #ttConfirm:not(.hidden), .modal:not(.hidden)';
  function openDialog() {
    const list = Array.from(document.querySelectorAll(DIALOG_SEL)).filter(visible);
    return list[list.length - 1] || null;
  }
  function sampleFor(el) {
    if (PRESET[el.id]) return PRESET[el.id];
    const ph = el.placeholder || '';
    let m = ph.match(/พิมพ์\s*["“](.+?)["”]/);
    if (m) return m[1];
    m = ph.match(/^เช่น\s*(.+)$/);
    if (m) return m[1].split(/\s+\/\s+/)[0].trim();
    if (el.type === 'number') return String(el.min && +el.min > 0 ? el.min : 1);
    return null;
  }
  function dialogFields() {
    const dlg = openDialog();
    if (!dlg) return [];
    return Array.from(dlg.querySelectorAll('textarea, input:not([type]), input[type="text"], input[type="number"], input[type="search"]'))
      .filter((el) => editable(el) && !el.value.trim() && el.type !== 'file' && sampleFor(el));
  }
  async function fillDialog() {
    const fields = dialogFields();
    for (const el of fields) await typeInto(el, sampleFor(el));
    // กลุ่มตัวเลือกที่ยังไม่มีใครเลือก เลือกข้อแรกให้
    const dlg = openDialog();
    if (dlg) {
      const groups = new Set(Array.from(dlg.querySelectorAll('input[type="radio"]')).map((r) => r.name));
      for (const name of groups) {
        const radios = Array.from(dlg.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
        if (radios.length && !radios.some((r) => r.checked)) { pulse(radios[0].closest('label') || radios[0]); radios[0].click(); await wait(250); }
      }
    }
    return fields.length;
  }

  /* ---------- 2–4. ตารางคะแนน (scores.html) ---------- */
  function gridInfo() {
    const grid = document.getElementById('grid');
    if (!grid || !visible(grid)) return null;
    const heads = Array.from(grid.querySelectorAll('thead tr.h2 th.col-head[data-col]'));
    const cols = heads.map((th) => {
      const meta = th.querySelector('.ch-meta')?.textContent || '';
      const full = meta.match(/เต็ม\s*([\d.]+)/);
      return { name: th.querySelector('.ch-name')?.textContent.trim() || '', max: full ? +full[1] : null, level: /ระดับ/.test(meta) };
    });
    const rows = Array.from(grid.querySelectorAll('tbody tr[data-sid]'));
    return { grid, cols, rows };
  }
  // คะแนนที่ดูสมจริง: คนเก่งได้สูงทุกช่อง ใช้ค่าเฉลี่ยของช่องที่มีอยู่แล้วในแถวเป็นตัวตั้ง
  function rowAbility(tr, info) {
    const vals = [];
    tr.querySelectorAll('input.cell').forEach((inp) => {
      const c = info.cols[+inp.dataset.c];
      const n = parseFloat(inp.value);
      if (c && !isNaN(n)) vals.push(c.max ? n / c.max : n / 3);
    });
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.55 + rand() * 0.35;
  }
  function sampleScore(col, ability) {
    if (col.level) {
      const p = ability + (rand() - 0.5) * 0.4;
      return String(p > 0.82 ? 3 : p > 0.55 ? 2 : 1);
    }
    const p = Math.max(0.3, Math.min(1, ability + (rand() - 0.5) * 0.2));
    return String(Math.round(col.max * p));
  }
  function emptyCells(info) {
    return Array.from(info.grid.querySelectorAll('tbody input.cell')).filter((inp) => editable(inp) && !inp.value.trim());
  }
  async function fillGrid() {
    const info = gridInfo();
    if (!info) return 0;
    const cells = emptyCells(info);
    // ตารางใหญ่ให้เร็วขึ้น ทั้งตารางใช้เวลาราว 4 วินาที
    const step = Math.max(12, Math.min(70, 4000 / Math.max(cells.length, 1)));
    for (const inp of cells) {
      const col = info.cols[+inp.dataset.c];
      if (!col) continue;
      const v = sampleScore(col, rowAbility(inp.closest('tr'), info));
      pulse(inp);
      inp.focus();
      inp.value = v;
      fire(inp, 'input');
      await wait(step);
    }
    return cells.length;
  }

  /* ---------- โครงสร้างคะแนน (scores.html แท็บโครงสร้าง) ---------- */
  // รวม 100% เก็บ 60 : กลางภาค 20 : ปลายภาค 20
  const STRUCTURE = [
    ['collect', 'ใบงานที่ 1', 10, 15], ['collect', 'ใบงานที่ 2', 10, 15], ['collect', 'แบบฝึกหัด', 20, 20], ['collect', 'จิตพิสัย', 10, 10],
    ['mid', 'สอบกลางภาค', 20, 20], ['final', 'สอบปลายภาค', 20, 20],
  ];
  function structurePending() {
    if (document.querySelector('[data-tpl="blank"]')) return true;
    return Array.from(document.querySelectorAll('table.struct [data-sf="name"]')).some((el) => editable(el) && !el.value.trim());
  }
  async function buildStructure() {
    const blank = document.querySelector('[data-tpl="blank"]');
    if (blank) { pulse(blank); await wait(500); blank.click(); await wait(500); }
    for (const [g, name, max, weight] of STRUCTURE) {
      const done = Array.from(document.querySelectorAll('table.struct [data-sf="name"]')).some((el) => el.value.trim() === name);
      if (done) continue;
      const findEmpty = () => {
        const block = document.querySelector(`[data-add="${g}"]`)?.closest('.group-block');
        return block && Array.from(block.querySelectorAll('tr[data-cid]')).find((tr) => !tr.querySelector('[data-sf="name"]').value.trim());
      };
      let tr = findEmpty();
      if (!tr) {
        const add = document.querySelector(`[data-add="${g}"]`);
        if (!add) continue;
        pulse(add); await wait(350); add.click(); await wait(400);
        tr = findEmpty();
      }
      if (!tr) continue;
      await typeInto(tr.querySelector('[data-sf="name"]'), name, 40);
      await typeInto(tr.querySelector('[data-sf="max"]'), String(max), 80);
      await typeInto(tr.querySelector('[data-sf="weight"]'), String(weight), 80);
      await wait(250);
    }
    pulse(document.getElementById('saveStruct'));
    return true;
  }

  /* ---------- ตัวช่วยสร้างตารางสอน ขั้นกิจกรรมล็อกเวลา (timetable.html) ---------- */
  const ACTIVITY = { name: 'กิจกรรมเพื่อสังคม', scope: 'ระดับชั้น ม.3', day: 'ศุกร์', period: 6 };
  function activityPending() {
    const body = document.getElementById('modalBody');
    if (!body || !visible(body) || !body.querySelector('[data-act-add]')) return false;
    return !Array.from(body.querySelectorAll('[data-a="name"]')).some((el) => el.value === ACTIVITY.name);
  }
  async function addActivity() {
    const body = document.getElementById('modalBody');
    const lastRow = () => { const rows = body.querySelectorAll('[data-act-row]'); return rows[rows.length - 1]; };
    const add = body.querySelector('[data-act-add]');
    pulse(add); await wait(400); add.click(); await wait(400);
    lastRow().scrollIntoView({ block: 'center', behavior: 'smooth' });
    await typeInto(lastRow().querySelector('[data-a="name"]'), ACTIVITY.name, 40);
    await wait(300);
    const pick = async (sel, text) => {
      const el = lastRow().querySelector(sel);
      const opt = Array.from(el.options).find((o) => o.text.trim() === text);
      if (!opt) return;
      pulse(el); el.value = opt.value; fire(el, 'change'); await wait(450);
    };
    await pick('[data-a="scopeKey"]', ACTIVITY.scope);
    await pick('[data-a="day"]', ACTIVITY.day);
    for (const p of [1, ACTIVITY.period]) {
      const cb = lastRow().querySelector(`[data-period="${p}"]`);
      if (cb && cb.checked !== (p === ACTIVITY.period)) { pulse(cb.closest('label')); cb.click(); await wait(400); }
    }
    return true;
  }

  /* ---------- เพิ่มรายวิชาเข้าแผน (curriculum-management.html) ---------- */
  function subjectBoxes() {
    const m = document.getElementById('addSubjectModal');
    if (!m || !visible(m)) return [];
    return Array.from(m.querySelectorAll('input[type="checkbox"]')).filter((cb) => !['addShowAll', 'addAutoTeacher'].includes(cb.id) && editable(cb) && !cb.checked);
  }
  async function pickSubjects() {
    const boxes = subjectBoxes().slice(0, 3);
    for (const cb of boxes) { pulse(cb.closest('label, tr, li') || cb); await wait(400); cb.click(); await wait(300); }
    return boxes.length;
  }

  function buildCsv() {
    const info = gridInfo();
    if (!info || info.cols.some((c) => c.level)) return null; // นำเข้าไฟล์ได้เฉพาะแท็บคะแนน
    const q = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
    const head = ['เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', ...info.cols.map((c) => `${c.name} (${c.max})`)];
    const lines = [head.map(q).join(',')];
    info.rows.forEach((tr) => {
      const no = tr.querySelector('td.c-no')?.textContent.trim() || '';
      const name = tr.querySelector('td.c-name')?.textContent.trim() || '';
      const ab = rowAbility(tr, info);
      const vals = Array.from(tr.querySelectorAll('input.cell')).map((inp) => inp.value.trim() || sampleScore(info.cols[+inp.dataset.c], ab));
      lines.push([no, tr.dataset.sid, name, ...vals].map(q).join(','));
    });
    return '﻿' + lines.join('\n');
  }
  function csvName() {
    const h1 = document.querySelector('h1')?.textContent.trim().split(/\s+/)[0] || 'รายวิชา';
    return `คะแนน_${h1}.csv`;
  }
  function downloadCsv() {
    const csv = buildCsv();
    if (!csv) { toast('เปิดแท็บ "คะแนน" ของรายวิชาก่อน'); return false; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = csvName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`บันทึกไฟล์ ${a.download} แล้ว ลากไฟล์นี้ไปวางในหน้าต่างนำเข้าได้`);
    return true;
  }
  async function autoImport() {
    const input = document.getElementById('fileIn');
    if (!input) {
      const btn = document.getElementById('importBtn');
      if (!btn) return false;
      pulse(btn); await wait(400); btn.click(); await wait(500);
    }
    const fileIn = document.getElementById('fileIn');
    const csv = buildCsv();
    if (!fileIn || !csv) return false;
    const drop = document.getElementById('drop');
    drop?.classList.add('over');
    pulse(drop);
    await wait(900);
    drop?.classList.remove('over');
    const dt = new DataTransfer();
    dt.items.add(new File([csv], csvName(), { type: 'text/csv' }));
    fileIn.files = dt.files;
    fire(fileIn, 'change');
    return true;
  }

  /* ---------- 3. เช็คชื่อรายคาบ (attendance.html) ---------- */
  function attRows() {
    const t = document.querySelector('table.att-table');
    if (!t || !visible(t)) return [];
    return Array.from(t.querySelectorAll('tbody tr[data-sid]')).filter((tr) => tr.querySelector('.att-seg button:not([disabled])'));
  }
  async function markAttendance() {
    const rows = attRows();
    if (!rows.length) return 0;
    // คนที่เวลาเรียนต่ำสุดเป็น "ขาด" เพื่อให้เห็นการเตือนใกล้ มส ที่เหลือกระจายตามแถว
    const pct = (tr) => parseFloat(tr.querySelector('td.r')?.textContent) || 100;
    const byLow = [...rows].sort((a, b) => pct(a) - pct(b));
    const plan = [];
    const used = new Set();
    const take = (tr, m) => { if (tr && !used.has(tr)) { used.add(tr); plan.push([tr, m]); } };
    take(byLow[0], 'absent');
    take(rows[Math.floor(rows.length * 0.2)], 'absent');
    take(rows[Math.floor(rows.length * 0.45)], 'late');
    take(rows[Math.floor(rows.length * 0.7)], 'leave');
    plan.sort((a, b) => rows.indexOf(a[0]) - rows.indexOf(b[0]));
    for (const [tr, m] of plan) {
      const b = tr.querySelector(`.att-seg button[data-m="${m}"]`);
      if (!b || b.classList.contains('on')) continue;
      pulse(tr);
      await wait(450);
      b.click();
      await wait(350);
      // ถ้าระบบถามเหตุผล (แก้ ขาด → มา) กรอกให้ด้วย
      if (dialogFields().length) await fillDialog();
    }
    return plan.length;
  }

  /* ---------- F9: ทำสิ่งที่หน้าจอต้องการตอนนี้ ---------- */
  function actions() {
    const list = [];
    if (dialogFields().length) list.push({ id: 'dialog', label: 'กรอกช่องข้อความในหน้าต่างนี้', run: fillDialog });
    if (activityPending()) list.push({ id: 'activity', label: `เพิ่มกิจกรรม "${ACTIVITY.name}"`, run: addActivity });
    if (subjectBoxes().length) list.push({ id: 'subjects', label: 'เลือกรายวิชาตัวอย่าง 3 วิชา', run: pickSubjects });
    if (structurePending()) list.push({ id: 'structure', label: 'ตั้งโครงสร้างคะแนนตัวอย่าง (รวม 100%)', run: buildStructure });
    if (document.getElementById('fileIn') || (document.getElementById('importBtn') && buildCsv())) {
      list.push({ id: 'import', label: 'นำเข้าไฟล์คะแนนตัวอย่าง', run: autoImport });
    }
    if (attRows().length) list.push({ id: 'att', label: 'เช็คชื่อตัวอย่าง (ขาด 2 สาย 1 ลา 1)', run: markAttendance });
    const info = gridInfo();
    if (info && emptyCells(info).length) list.push({ id: 'grid', label: `เติมช่องว่างในตาราง (${emptyCells(info).length} ช่อง)`, run: fillGrid });
    if (info && buildCsv()) list.push({ id: 'csv', label: 'บันทึกไฟล์ CSV ตัวอย่างลงเครื่อง', run: async () => downloadCsv() });
    return list;
  }
  async function run(action) {
    if (busy || !action) return;
    busy = true;
    hidePanel();
    try { await action.run(); } finally { busy = false; }
  }
  async function smart() {
    // ไฟล์ CSV เป็นตัวเลือกเสริม ไม่ทำผ่าน F9
    const a = actions().find((x) => x.id !== 'csv');
    if (!a) { toast('หน้านี้ไม่มีช่องที่ต้องกรอก'); return; }
    await run(a);
  }

  /* ---------- แผงคำสั่ง (F8) ---------- */
  let panel = null;
  function hidePanel() { panel?.remove(); panel = null; }
  function showPanel() {
    hidePanel();
    panel = document.createElement('div');
    panel.setAttribute('data-demo-autofill', '');
    panel.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483647;width:280px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);font:14px/1.5 "Noto Sans Thai",system-ui,sans-serif;padding:12px';
    const acts = actions();
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="flex:1">กรอกข้อมูลเดโม</b>
        <button data-x style="border:0;background:none;font-size:18px;cursor:pointer;color:#64748b" aria-label="ปิด">×</button></div>
      ${acts.length ? acts.map((a, i) => `<button data-i="${i}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:7px 10px;border:1px solid #e2e8f0;border-radius:9px;background:${i ? '#fff' : '#eff6ff'};cursor:pointer;font:inherit">${a.label}${i ? '' : ' <span style="color:#64748b">(F9)</span>'}</button>`).join('')
        : '<div style="color:#64748b">หน้านี้ไม่มีช่องที่ต้องกรอก</div>'}
      <div style="display:flex;gap:6px;align-items:center;margin-top:10px;color:#64748b">ความเร็ว
        ${Object.keys(SPEEDS).map((k) => `<button data-sp="${k}" style="padding:2px 8px;border-radius:7px;border:1px solid ${k === speed ? '#2563eb' : '#e2e8f0'};background:${k === speed ? '#eff6ff' : '#fff'};cursor:pointer;font:inherit">${{ slow: 'ช้า', normal: 'ปกติ', fast: 'เร็ว' }[k]}</button>`).join('')}</div>
      <div style="margin-top:8px;font-size:12px;color:#94a3b8">F9 กรอกให้ทันที F8 เปิด/ปิดแผงนี้</div>`;
    panel.addEventListener('mousedown', (e) => e.stopPropagation());
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-x]')) { hidePanel(); return; }
      const sp = e.target.closest('[data-sp]');
      if (sp) { speed = sp.dataset.sp; try { localStorage.setItem('demoAutofill:speed', speed); } catch (err) { /* ignore */ } showPanel(); return; }
      const b = e.target.closest('[data-i]');
      if (b) run(acts[+b.dataset.i]);
    });
    document.body.appendChild(panel);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F8') { e.preventDefault(); panel ? hidePanel() : showPanel(); }
    else if (e.key === 'F9') { e.preventDefault(); smart(); }
  }, true);

  window.DemoAutofill = { smart, showPanel, fillDialog, fillGrid, autoImport, downloadCsv, markAttendance, buildStructure, addActivity, pickSubjects };
}());
