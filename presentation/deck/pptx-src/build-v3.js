// Builds deck v3 (33 slides, SE focus) as .pptx for import into Canva.
// Run from repo root: NODE_PATH=<dir with pptxgenjs, sharp> node presentation/deck/pptx-src/build-v3.js [out.pptx]
// Images: presentation/deck/assets-v3 (sizes in _sizes.json). Speaker notes: presentation/07-speaker-script.md.
// Style: white, navy text, one sky-blue accent, flat shapes, nothing above the title (see .claude/skills/slide-design).
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.join(__dirname, "..", "..", "..");
const A = (k) => path.join(ROOT, "presentation/deck/assets-v3", k + ".png");
const SIZES = JSON.parse(fs.readFileSync(path.join(ROOT, "presentation/deck/assets-v3/_sizes.json"), "utf8"));
const OUT = process.argv[2] || path.join(ROOT, "presentation/academic-system-defense.v3.pptx");

const FONT = "Noto Sans Thai";
const C = { ink: "102A43", body: "334E68", gray: "627D98", faint: "9FB3C8", rule: "D9E2EC", tint: "F0F4F8", accent: "169EE6", accentTint: "E3F4FD", red: "D64545", redTint: "FDECEC", white: "FFFFFF", navy: "102A43" };
const ROLE = {
  a: { c: "1F4E8C", dark: "173B6B", tint: "E6EEF8", name: "ครูฝ่ายวิชาการ" },
  t: { c: "1E7A66", dark: "13564A", tint: "E3F2EE", name: "ครูผู้สอน" },
};
const W = 13.333, H = 7.5, M = 0.7, CW = W - 2 * M;
const TITLE_W = CW - 1.3; // top-right corner is left free for the faculty logo
const Y0 = 1.9, YB = 6.7; // content area

// ---------- speaker notes from 07-speaker-script.md ----------
const script = fs.readFileSync(path.join(ROOT, "presentation/07-speaker-script.md"), "utf8");
const notes = {};
script.split(/\n(?=## \d+\. )/).forEach((sec) => {
  const m = sec.match(/^## (\d+)\. /);
  if (!m) return;
  notes[+m[1]] = sec
    .split(/\n---/)[0]
    .replace(/^## .*\n/, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
});

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "ระบบบริหารจัดการงานวิชาการภายในโรงเรียน";
pres.author = "ปณวัฒน์ ธรรมเจริญ, อิสรีย์ แม้นถาวรสิริ";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

// ---------- helpers ----------
const T = (s, str, x, y, w, h, o = {}) =>
  s.addText(str, Object.assign({ x, y, w, h, fontFace: FONT, fontSize: 18, color: C.ink, margin: 0, valign: "top", align: "left", isTextBox: true, lineSpacingMultiple: 1.1 }, o));
const rect = (s, x, y, w, h, fill, o = {}) => s.addShape(pres.ShapeType.rect, Object.assign({ x, y, w, h, fill: { color: fill }, line: { type: "none" } }, o));
const rule = (s, x, y, w) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color: C.rule, width: 1 } });
const fit = (k, x, y, w, h, align = "center") => {
  const [iw, ih] = SIZES[k];
  const sc = Math.min(w / iw, h / ih), w2 = iw * sc, h2 = ih * sc;
  return { x: align === "left" ? x : align === "right" ? x + w - w2 : x + (w - w2) / 2, y: y + (h - h2) / 2, w: w2, h: h2 };
};
const pic = (s, k, x, y, w, h, align = "center", border = k.startsWith("scr") || ["conflict", "publishBlocked"].includes(k)) => {
  const b = fit(k, x, y, w, h, align);
  s.addImage(Object.assign({ path: A(k) }, b));
  if (border) s.addShape(pres.ShapeType.rect, Object.assign({}, b, { fill: { type: "none" }, line: { color: C.rule, width: 0.75 } }));
  return b;
};
const caption = (s, str, b, o = {}) => T(s, str, b.x, b.y + b.h + 0.08, Math.max(b.w, 3), 0.3, Object.assign({ fontSize: 12, color: C.gray }, o));
const label = (s, str, x, y, w, color = C.gray) => T(s, str, x, y, w, 0.3, { fontSize: 14, bold: true, color });
const para = (arr) => arr.map((p, i) => ({ text: p[0], options: Object.assign({ breakLine: i < arr.length - 1 }, p[1] || {}) }));
const cell = (t, o = {}) => ({ text: t, options: Object.assign({ fontFace: FONT, fontSize: 14, color: C.ink, valign: "middle", border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.rule, pt: 0.75 }, { type: "none" }] }, o) });
const head = (t, o = {}) => cell(t, Object.assign({ bold: true, color: C.gray, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.ink, pt: 1 }, { type: "none" }] }, o));

let n = 0;
function slide(title, section, source) {
  n += 1;
  const s = pres.addSlide();
  s.background = { color: C.white };
  T(s, title, M, 0.42, TITLE_W, 1.25, { fontSize: 30, bold: true, lineSpacingMultiple: 1.05 });
  T(s, section + (source ? "  ·  ที่มา: " + source : ""), M, 7.0, CW - 0.8, 0.28, { fontSize: 11, color: C.faint });
  T(s, String(n), W - M - 0.6, 7.0, 0.6, 0.28, { fontSize: 11, color: C.faint, align: "right" });
  if (notes[n]) s.addNotes(notes[n]);
  return s;
}

// Phase strip. ph: [[label, roleKey], ...], hl: highlighted indexes. compact = small strip under the title.
function phases(s, ph, hl, y, compact = false) {
  const gap = 0.08, h = compact ? 0.36 : 0.72, w = (CW - gap * (ph.length - 1)) / ph.length;
  ph.forEach(([lab, rk], i) => {
    const r = ROLE[rk], on = hl.includes(i), x = M + i * (w + gap);
    rect(s, x, y, w, h, on ? r.c : compact ? C.tint : r.tint);
    T(s, (compact ? "" : `${i + 1}  `) + lab, x + 0.1, y, w - 0.15, h, { fontSize: compact ? 11 : 15, bold: on, color: on ? C.white : compact ? C.gray : r.dark, valign: "middle", align: compact ? "center" : "left" });
  });
}
const TT = [["เวลาไม่ว่างของครู", "t"], ["สร้างฉบับร่าง", "a"], ["จัดตาราง 3 วิธี", "a"], ["ตรวจการชน", "a"], ["ตรวจและเผยแพร่", "a"], ["คำร้องเปลี่ยนตาราง", "t"]];
const AT = [["เช็คชื่อรายคาบ", "t"], ["แก้ไขย้อนหลัง", "t"], ["คำนวณเวลาเรียนและ มส", "t"], ["ปลด มส", "t"]];
const GR = [["ตั้งโครงสร้าง", "t"], ["กรอกหรือนำเข้า", "t"], ["คำนวณผล", "t"], ["ส่ง ตรวจ อนุมัติ", "a"], ["สอบซ่อม", "t"], ["ขอปลดล็อก", "a"], ["ชุมนุม", "a"]];
const CPY = 1.62; // y of the compact strip

// "Opening" lines of a subsystem: problem / features / focus. Plain text, no box.
function opening(s, rows, y) {
  rows.forEach(([k, v], i) => {
    T(s, k, M, y + i * 0.42, 1.5, 0.4, { fontSize: 14, bold: true, color: k === "วันนี้เจาะ" ? C.accent : C.gray, valign: "middle" });
    T(s, v, M + 1.5, y + i * 0.42, CW - 1.5, 0.4, { fontSize: 17, valign: "middle" });
  });
}

const S = { A: "ปัญหาและที่มา", B: "ภาพรวมการออกแบบ", C: "ระบบจัดการหลักสูตร", D: "ระบบจัดตารางสอน", E: "ระบบเช็คชื่อ", F: "ระบบบันทึกคะแนน", G: "ระบบออกรายงานและต้นแบบ", H: "สถานะและแผน" };

// ================= 1 cover =================
{
  n += 1;
  const s = pres.addSlide();
  s.background = { color: C.white };
  T(s, "สอบโครงงาน ภาคเรียนที่ 1 ปีการศึกษา 2569", M, 1.55, 6.2, 0.4, { fontSize: 16, color: C.gray });
  T(s, "ระบบบริหารจัดการ\nงานวิชาการภายในโรงเรียน", M, 2.0, 6.5, 1.6, { fontSize: 36, bold: true, lineSpacingMultiple: 1.05, fit: "none" });
  T(s, "School Academic Management System", M, 3.85, 6.2, 0.45, { fontSize: 18, color: C.accent });
  const b = pic(s, "scrAcadOverview", 7.35, 1.0, W - M - 7.35, 4.2);
  caption(s, "หน้าภาพรวมงานวิชาการจากระบบต้นแบบ", b);
  rect(s, 0, 5.85, W, 1.65, C.navy);
  const cols = [["ผู้จัดทำ", "ปณวัฒน์ ธรรมเจริญ  66070113\nอิสรีย์ แม้นถาวรสิริ  66070323"], ["อาจารย์ที่ปรึกษา", "ดร.ศิรสิทธิ์ โล่ห์ชนะจิต"], ["คณะเทคโนโลยีสารสนเทศ", "สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง"]];
  const cw = [4.2, 3.4, CW - 7.6];
  let x = M;
  cols.forEach(([k, v], i) => {
    T(s, k, x, 6.12, cw[i] - 0.2, 0.3, { fontSize: 13, bold: true, color: "9FD8F7" });
    T(s, v, x, 6.45, cw[i] - 0.2, 0.8, { fontSize: 15, color: C.white });
    x += cw[i];
  });
  if (notes[1]) s.addNotes(notes[1]);
}

// ================= 2 problem =================
{
  const s = slide("ฝ่ายวิชาการยังจัดตารางสอนใน Excel และตรวจครูหรือห้องที่ซ้อนกันด้วยตนเอง", S.A, "รายงานข้อ 1.1");
  label(s, "ผู้จัดตารางต้องดู 4 อย่างพร้อมกัน", M, Y0, 6);
  ["เวลาว่างของครู", "ห้องเรียน", "ตารางเรียนของนักเรียน", "จำนวนคาบของแต่ละรายวิชาตามหลักสูตร"].forEach((t, i) => {
    T(s, String(i + 1), M, Y0 + 0.55 + i * 0.85, 0.5, 0.7, { fontSize: 32, bold: true, color: C.accent, valign: "middle" });
    T(s, t, M + 0.6, Y0 + 0.55 + i * 0.85, 5.6, 0.7, { fontSize: 22, valign: "middle" });
  });
  const rx = 7.6, rw = W - M - rx;
  label(s, "ปัญหาอื่นที่พบในระบบเดิม", rx, Y0, rw);
  [["ข้อมูลไม่เชื่อมกัน", "รายชื่อนักเรียน คะแนน และตารางสอนอยู่คนละไฟล์ พอรวมกันจึงซ้ำและไม่ตรงกัน"], ["รวมคะแนนล่าช้า", "รวมคะแนนและตัดสินผลยังทำด้วยมือ ปลายภาคงานจึงค้าง"], ["นำเข้าข้อมูลจากไฟล์ได้ยาก", "ครูต้องกรอกข้อมูลเดิมซ้ำหลายครั้ง"]].forEach((p, i) => {
    const y = Y0 + 0.55 + i * 1.35;
    if (i) rule(s, rx, y - 0.15, rw);
    T(s, para([[p[0], { bold: true, fontSize: 18 }], [p[1], { fontSize: 15, color: C.body }]]), rx, y, rw, 1.15);
  });
}

// ================= 3 persona =================
{
  const s = slide("ผู้ใช้มี 2 บทบาท ซึ่งเป็น Actor 2 ตัวของระบบ", S.A, "รายงานข้อ 3.1.1 รูปที่ 3.1 และ 3.2");
  const b1 = pic(s, "personaSomsri", M, Y0, 4.3, 4.75, "left", false);
  let x = b1.x + b1.w + 0.35;
  T(s, para([["ครูผู้สอน · ใช้ระบบทุกวัน", { fontSize: 14, bold: true, color: ROLE.t.c }], ["ครูสมศรี", { fontSize: 26, bold: true }], ["สอนคณิตศาสตร์ ม.2 เป็นครูประจำชั้น และเป็นกรรมการฝ่ายวิชาการ", { fontSize: 15, color: C.body }], [" ", { fontSize: 8 }], ["“อยากกรอกคะแนนครั้งเดียว แล้วส่งผลได้เลย”", { fontSize: 18, bold: true, color: ROLE.t.dark }]]), x, Y0 + 0.1, 3.0, 3.2);
  const b2 = pic(s, "personaSunisa", 9.55, Y0, W - M - 9.55, 2.9, "left", false);
  T(s, para([["ครูฝ่ายวิชาการ · ต้นและปลายภาค", { fontSize: 13, bold: true, color: ROLE.a.c }], ["อ.สุนิสา หัวหน้างานวิชาการ", { fontSize: 18, bold: true }], ["“อยากรู้ทันทีว่าห้องไหนยังมีปัญหา”", { fontSize: 16, bold: true, color: ROLE.a.dark }]]), 9.55, b2.y + b2.h + 0.2, W - M - 9.55, 1.5);
}

// ================= 4 compare =================
{
  const s = slide("SchoolBright ครอบคลุมมากที่สุด 7 จาก 12 ข้อ แต่ไม่พบการจัดตารางอัตโนมัติและการตรวจการชน", S.A, "รายงานตารางที่ 2.3 ไม่พบข้อมูล หมายถึงไม่พบในเอกสารที่ผู้พัฒนาเผยแพร่");
  const rows = [
    ["จัดการหลักสูตรและโครงสร้างหลักสูตร", "มี", "มี", "ไม่มี", "มี"],
    ["สร้างและแก้ไขตารางสอน", "มี", "ไม่มี", "มี", "มี"],
    ["จัดตารางสอนอัตโนมัติตามเงื่อนไข", "ไม่พบข้อมูล", "ไม่มี", "มี", "มี"],
    ["ตรวจสอบการชนกันของครูและห้องเรียน", "ไม่พบข้อมูล", "ไม่มี", "มี", "มี"],
    ["กำหนดโครงสร้างและสัดส่วนคะแนน", "บางส่วน", "บางส่วน", "ไม่มี", "มี"],
    ["บันทึกคะแนน", "มี", "มี", "ไม่มี", "มี"],
    ["นำเข้าคะแนนจากไฟล์", "ไม่พบข้อมูล", "ไม่พบข้อมูล", "ไม่มี", "มี"],
    ["คำนวณเกรดและเกรดเฉลี่ยอัตโนมัติ", "มี", "บางส่วน", "ไม่มี", "มี"],
    ["เช็คชื่อและเวลาเรียน", "มี", "บางส่วน", "ไม่มี", "มี"],
    ["ประเมินคุณลักษณะฯ และการอ่าน คิดวิเคราะห์ เขียน", "ไม่พบข้อมูล", "มี", "ไม่มี", "มี"],
    ["รายงานผลการเรียน", "มี", "มี", "ไม่มี", "มี"],
    ["ใช้งานบนมือถือ", "มี (แอป)", "บางส่วน (เว็บ)", "มี", "บางส่วน (เว็บ)"],
  ];
  const hl = [2, 3, 6];
  const hdr = ["ความสามารถ", "SchoolBright", "SGS", "aSc TimeTables", "ระบบที่พัฒนา"].map((t, i) => head(t, i === 4 ? { color: C.ink } : {}));
  const body = rows.map((r, ri) => r.map((t, ci) => {
    const o = {};
    if (t === "ไม่มี" || t === "ไม่พบข้อมูล") o.color = C.faint;
    if (ci === 4) o.bold = true;
    if (hl.includes(ri)) { o.fill = { color: C.accentTint }; if (ci === 0 || ci === 1) { o.bold = true; o.color = ci === 1 ? C.accent : C.ink; } }
    return cell(t, o);
  }));
  s.addTable([hdr, ...body], { x: M, y: Y0 - 0.05, w: CW, colW: [4.73, 1.8, 1.8, 1.8, 1.8], rowH: 0.36, margin: [0.02, 0.08, 0.02, 0.1] });
}

// ================= 5 gap =================
{
  const s = slide("ปัญหา 4 ด้านของระบบเดิมกลายเป็นวัตถุประสงค์ 5 ข้อของโครงงาน", S.A, "รายงานข้อ 3.1.2 และข้อ 1.2");
  const rows = [
    ["การจัดตารางสอน", "SchoolBright ไม่พบการจัดอัตโนมัติและการตรวจการชน SGS ไม่มีการจัดตาราง", "2", "จัดตารางอัตโนมัติตามเงื่อนไขของครู ห้อง และหลักสูตร และตรวจการชนให้อัตโนมัติ"],
    ["ข้อมูลอยู่หลายระบบ", "aSc TimeTables จัดตารางได้ แต่ไม่มีงานหลักสูตรและคะแนน", "1", "เก็บแผนการเรียน รายวิชา และครูผู้สอนไว้ที่เดียว ให้ระบบอื่นดึงไปใช้ต่อ"],
    ["การกำหนดและบันทึกคะแนน", "ไม่พบการกำหนดสัดส่วนคะแนนและการนำเข้าคะแนนจากไฟล์", "4", "กรอกและนำเข้าคะแนนจำนวนมาก มีขั้นส่ง ตรวจ และอนุมัติ"],
    ["การคำนวณผลการเรียน", "SGS ให้ครูสั่งประมวลผลเกรดเอง", "3, 4, 5", "คำนวณผลอัตโนมัติ สรุปเวลาเรียนและแจ้ง มส และออกรายงาน Excel หรือ PDF"],
  ];
  const hdr = [head("ปัญหา"), head("สิ่งที่พบในระบบเดิม"), head("ข้อ", { align: "center", color: C.accent }), head("วัตถุประสงค์ที่ตอบ")];
  const body = rows.map((r) => [cell(r[0], { bold: true, fontSize: 17 }), cell(r[1], { fontSize: 14, color: C.body }), cell(r[2], { fontSize: 22, bold: true, color: C.accent, align: "center" }), cell(r[3], { fontSize: 15 })]);
  s.addTable([hdr, ...body], { x: M, y: Y0, w: CW, colW: [2.6, 3.9, 1.1, 4.33], rowH: [0.45, 1.05, 1.05, 1.05, 1.05], margin: [0.05, 0.12, 0.05, 0.1] });
}

// ================= 6 scope =================
{
  const s = slide("ทีมเรารับผิดชอบ 5 ระบบย่อยงานวิชาการ ส่วนบัญชีผู้ใช้และสิทธิ์อยู่ที่ Service B ของอีกทีม", S.A, "รายงานข้อ 1.3");
  const subs = [
    ["จัดการหลักสูตร", "จัดการหลักสูตร แผนการเรียน และรายวิชา", "ดูโครงสร้างรายวิชาที่ตนเกี่ยวข้อง"],
    ["จัดตารางสอน", "จัดเองหรือจัดอัตโนมัติ เผยแพร่ และพิจารณาคำร้อง", "ดูตารางของตน ยื่นคำร้อง และกรอกเวลาไม่ว่าง"],
    ["เช็คชื่อ", "ดูรายงานการเข้าเรียน", "เช็คชื่อรายคาบ ดูเวลาเรียนและ มส"],
    ["บันทึกคะแนน", "ตรวจ อนุมัติ หรือตีกลับผลการเรียน", "ตั้งองค์ประกอบคะแนน บันทึกหรือนำเข้า แล้วส่งผล"],
    ["ออกรายงาน", "ดูรายงานสรุป ส่งออก Excel หรือ PDF", "ดูผลการเรียนและส่งออกเอกสาร"],
  ];
  const rh = (r) => head(r.name, { color: r.c, fontSize: 16, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: r.c, pt: 2 }, { type: "none" }] });
  const tw = 8.6;
  s.addTable([[head("ระบบย่อย"), rh(ROLE.a), rh(ROLE.t)], ...subs.map((r) => [cell(r[0], { bold: true, fontSize: 17 }), cell(r[1], { fontSize: 15 }), cell(r[2], { fontSize: 15 })])], { x: M, y: Y0, w: tw, colW: [2.2, 3.2, 3.2], rowH: [0.5, 0.85, 0.85, 0.85, 0.85, 0.85], margin: [0.05, 0.1, 0.05, 0.08] });
  const rx = M + tw + 0.5, rw = CW - tw - 0.5;
  T(s, para([["อยู่ที่ Service B ของอีกทีม", { bold: true, color: C.accent, fontSize: 17 }], ["การยืนยันตัวตน บัญชีผู้ใช้ สิทธิ์การเข้าถึง และข้อมูลหลักของโรงเรียน สองระบบคุยกันผ่าน API", { fontSize: 15, color: C.body }]]), rx, Y0, rw, 2.0);
  rule(s, rx, Y0 + 2.3, rw);
  T(s, para([["ไม่รวมในโครงงาน", { bold: true, color: C.gray, fontSize: 17 }], ["ระบบแจ้งลาของนักเรียน งานบุคลากร และการจัดการความประพฤติ", { fontSize: 15, color: C.body }]]), rx, Y0 + 2.5, rw, 1.8);
}

// ================= 7 use case =================
{
  const s = slide("ระบบมี 26 use case ใน 5 ระบบย่อย ครูผู้สอนใช้งานรายวัน ส่วนฝ่ายวิชาการเป็นผู้อนุมัติ", S.B, "รายงานรูปที่ 3.6 และตารางที่ 3.2");
  const b = pic(s, "usecase", M, Y0, 4.0, YB - Y0, "left", true);
  const rx = b.x + b.w + 0.7, rw = W - M - rx;
  T(s, "26", rx, Y0 - 0.1, 2.2, 1.3, { fontSize: 88, bold: true, color: C.accent });
  T(s, "use case ใน 5 ระบบย่อย ทุกตัวมีคำอธิบายและเลขรูป Activity กำกับในตาราง 3.2", rx + 2.3, Y0 + 0.2, rw - 2.3, 0.9, { fontSize: 16, color: C.body });
  label(s, "รูปแบบที่ซ้ำทั้งระบบ: ครูผู้สอนยื่น ฝ่ายวิชาการอนุมัติ", rx, Y0 + 1.45, rw, C.ink);
  const pairs = [["ส่งผลการเรียน", "UC-17", "ตรวจและอนุมัติผลการเรียน", "UC-18"], ["ขอปลดล็อกผลการเรียน", "UC-19", "พิจารณาคำขอปลดล็อก", "UC-19"], ["ยื่นคำร้องเปลี่ยนตาราง", "UC-21", "พิจารณาคำร้อง", "UC-21"], ["กรอกเวลาไม่ว่าง", "UC-22", "พิจารณาเวลาไม่ว่าง", "UC-22"]];
  const hdr = [head(ROLE.t.name, { color: ROLE.t.c }), head(""), head(ROLE.a.name, { color: ROLE.a.c })];
  const body = pairs.map((p) => [cell(p[0] + "  " + p[1], { fontSize: 15 }), cell("→", { align: "center", color: C.gray }), cell(p[2] + "  " + p[3], { fontSize: 15 })]);
  s.addTable([hdr, ...body], { x: rx, y: Y0 + 1.85, w: rw, colW: [(rw - 0.5) / 2, 0.5, (rw - 0.5) / 2], rowH: 0.46, margin: [0.03, 0.08, 0.03, 0.08] });
  T(s, "ระบบที่จะเจาะต่อ  ตารางสอน · เช็คชื่อ · บันทึกคะแนน", rx, YB - 0.25, rw, 0.4, { fontSize: 16, bold: true, color: C.accent });
}

// ================= 8 architecture =================
{
  const s = slide("ระบบงานวิชาการเป็นหนึ่งในสาม service หลัง Nginx และส่งงานที่ใช้เวลานานให้ Celery ทำเบื้องหลัง", S.B, "รายงานรูปที่ 3.3 สถาปัตยกรรมเป้าหมายของเทอม 2");
  const b = pic(s, "arch", M, Y0, 8.6, YB - Y0, "left", true);
  const rx = b.x + b.w + 0.5, rw = W - M - rx;
  T(s, para([["Service A คือส่วนของเรา", { bold: true, color: C.accent, fontSize: 18 }], ["FastAPI ตารางทั้งหมดอยู่ใน schema academic ของ PostgreSQL ที่ใช้ร่วมกับทีมอื่น", { fontSize: 15, color: C.body }]]), rx, Y0, rw, 1.9);
  rule(s, rx, Y0 + 2.1, rw);
  T(s, para([["งานที่ใช้เวลานาน", { bold: true, fontSize: 18 }], ["จัดตารางทั้งโรงเรียนและคำนวณผลทั้งระดับชั้น เข้าคิวใน Redis แล้วให้ Celery ทำเบื้องหลัง หน้าจอจึงไม่ค้าง", { fontSize: 15, color: C.body }]]), rx, Y0 + 2.3, rw, 2.3);
}

// ================= 9 data flow =================
{
  const s = slide("ข้อมูลไหลจากหลักสูตรไปถึงรายงานโดยครูไม่ต้องกรอกซ้ำ", S.B, "รายงานรูปที่ 3.7 Activity รายเฟสอยู่ในรูปที่ 3.8 ถึง 3.30");
  const flow = ["หลักสูตร", "ตารางสอน", "เช็คชื่อ", "บันทึกคะแนน", "รายงาน"];
  const what = ["ห้องไหนเรียนวิชาอะไรกับครูคนไหน", "คาบที่เผยแพร่แล้วคือคาบที่ต้องเช็คชื่อ", "เวลาเรียนและ มส ใช้ตัดสินผล", "ผลที่อนุมัติแล้วไปออกรายงาน", ""];
  flow.forEach((f, i) => {
    const y = Y0 + i * 0.95, on = i >= 1 && i <= 3;
    T(s, f, M, y, 2.4, 0.5, { fontSize: 20, bold: true, color: on ? C.accent : C.ink, valign: "middle" });
    if (what[i]) T(s, "↓  " + what[i], M + 0.1, y + 0.48, 5.4, 0.42, { fontSize: 14, color: C.gray, valign: "middle" });
  });
  pic(s, "actOverview", 6.4, Y0, W - M - 6.4, YB - Y0, "right", true);
}

// ================= 10 database =================
{
  const s = slide("ฐานข้อมูล 58 ตารางแบ่งเป็นข้อมูลหลัก 1 กลุ่ม และกลุ่มของระบบย่อยอีก 4 กลุ่ม", S.B, "รายงานข้อ 3.4.1 ER เต็มอยู่ในรูปที่ 3.35 ถึง 3.40");
  T(s, "58", M, Y0 - 0.1, 3.0, 1.5, { fontSize: 100, bold: true, color: C.accent });
  T(s, "ตาราง · schema academic · ออกแบบตาม 3NF", M, Y0 + 1.45, 5.2, 0.4, { fontSize: 17, color: C.body });
  ["ข้อมูลหลักที่ใช้ร่วมกัน", "หลักสูตร", "ตารางสอน", "เช็คชื่อ", "บันทึกคะแนน"].forEach((g, i) => {
    const y = Y0 + 2.15 + i * 0.5;
    rule(s, M, y, 5.0);
    T(s, g, M, y + 0.05, 5.0, 0.42, { fontSize: 17, bold: i === 0, valign: "middle" });
  });
  T(s, "ระบบออกรายงานอ่านข้อมูลจากกลุ่มอื่น จึงไม่มีตารางของตัวเอง", M, Y0 + 4.75, 5.4, 0.4, { fontSize: 13, color: C.gray });
  pic(s, "erOverview", 6.4, Y0, W - M - 6.4, YB - Y0, "right", true);
}

// ================= 11 curriculum =================
{
  const s = slide("หลักสูตรประกาศใช้ได้เมื่อทุกแผนมีรายวิชาและทุกรายวิชามีครูผู้สอน", S.C, "รายงานรูปที่ 3.34 และ Activity ระบบหลักสูตร เฟส 4");
  opening(s, [["แก้ปัญหา", "ข้อมูลกระจายหลายไฟล์ ไม่มีต้นทางเดียว"], ["ทำได้", "กลุ่มสาระและรายวิชา · หลักสูตรและแผนการเรียน · กำหนดครูผู้สอน · ประกาศใช้"]], Y0 - 0.15);
  const y = Y0 + 1.0;
  ["ฉบับร่าง", "ใช้งานอยู่", "ปิดใช้งาน"].forEach((st, i) => {
    T(s, st, M, y + i * 0.85, 2.6, 0.5, { fontSize: 22, bold: true, color: i === 1 ? C.accent : C.ink, valign: "middle" });
    T(s, ["แก้ไขได้ ลบได้", "ใช้จัดตาราง ระดับละ 1 หลักสูตร", "อ่านอย่างเดียว ผลการเรียนเก่ายังอ้างถึง"][i], M + 2.6, y + i * 0.85, 3.1, 0.5, { fontSize: 14, color: C.gray, valign: "middle" });
  });
  T(s, "ก่อนประกาศใช้ ระบบตรวจว่าทุกแผนมีรายวิชาและทุกรายวิชามีครูผู้สอน ถ้าไม่ครบจะแสดงรายการที่ขาด", M, y + 2.75, 5.6, 1.0, { fontSize: 16, color: C.body });
  pic(s, "actC4", 6.7, y, W - M - 6.7, YB - y, "right", true);
}

// ================= 12 timetable opening =================
{
  const s = slide("การจัดตารางสอนแบ่งเป็น 6 เฟส ตั้งแต่เวลาไม่ว่างของครูจนถึงคำร้องเปลี่ยนตาราง", S.D, "รายงาน Activity ระบบตารางสอน เฟส 1 ถึง 6 · UC-4 ถึง UC-10, UC-21, UC-22");
  opening(s, [["แก้ปัญหา", "จัดตารางใน Excel และตรวจการชนด้วยตนเอง"], ["วันนี้เจาะ", "เฟส 3 และ 4 คือจัดอัตโนมัติและตรวจการชน เพราะไม่พบในระบบที่ศึกษา"]], Y0 - 0.15);
  phases(s, TT, [2, 3], Y0 + 0.85);
  T(s, "สีเขียว = ครูผู้สอน   สีน้ำเงิน = ครูฝ่ายวิชาการ", M, Y0 + 1.65, 6, 0.3, { fontSize: 12, color: C.gray });
  const b = pic(s, "scrTimetable", M, Y0 + 2.05, 7.6, YB - Y0 - 2.35, "left");
  caption(s, "หน้าจัดการตารางสอนในต้นแบบ", b);
  T(s, "ฉบับร่างแสดงความคืบหน้า จำนวน Conflict และคำเตือน ก่อนกดจัดอัตโนมัติหรือเผยแพร่", b.x + b.w + 0.4, b.y, W - M - b.x - b.w - 0.4, 1.4, { fontSize: 15, color: C.body });
}

// ================= 13 unavailability =================
{
  const s = slide("เวลาไม่ว่างของครูต้องได้รับอนุมัติก่อน จึงใช้เป็นเงื่อนไขจัดตารางได้", S.D, "รายงาน Activity ระบบตารางสอน เฟส 1 · UC-22");
  phases(s, TT, [0], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "actT1", M, y, 5.4, YB - y, "left", true);
  const rx = 6.5, rw = W - M - rx;
  label(s, "ครูผู้สอนแจ้ง", rx, y, 3, ROLE.t.c);
  const b1 = pic(s, "scrUnavail", rx, y + 0.35, rw, 1.95, "left");
  label(s, "ครูฝ่ายวิชาการพิจารณา", rx, y + 2.45, 4, ROLE.a.c);
  pic(s, "scrUnavailApprove", rx, y + 2.8, rw, 1.95, "left");
  T(s, "ระบบตรวจวันปิดรับก่อน\nอนุมัติแล้วจึงเป็นเงื่อนไขจัดตาราง", b1.x + b1.w + 0.25, y + 0.4, W - M - b1.x - b1.w - 0.25, 1.6, { fontSize: 14, color: C.body });
}

// ================= 14 three methods =================
{
  const s = slide("ฝ่ายวิชาการเลือกจัดตารางได้ 3 วิธี คือจัดเอง จัดอัตโนมัติ และจัดอัตโนมัติแบบกำหนดเงื่อนไข", S.D, "รายงาน Activity ระบบตารางสอน เฟส 3 · UC-5, UC-6, UC-7");
  phases(s, TT, [2], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "actT3", M, y, 5.6, YB - y, "left", true);
  const rx = 6.7, rw = W - M - rx;
  [["จัดเอง", "UC-5", "ลากวิชาและครูลงคาบทีละคาบ"], ["จัดอัตโนมัติ", "UC-7", "ใช้เงื่อนไขมาตรฐาน ทำเป็นงานเบื้องหลัง"], ["จัดอัตโนมัติแบบกำหนดเงื่อนไข", "UC-6", "เพิ่มเงื่อนไข เช่น ช่วงเช้า คาบคู่ ห้องเฉพาะทาง"]].forEach((m, i) => {
    const yy = y + i * 0.78;
    T(s, para([[m[0] + "  ", { bold: true, fontSize: 18 }], [m[1], { fontSize: 13, color: C.gray }]].map((p, j) => [p[0], Object.assign({}, p[1], { breakLine: false })])), rx, yy, rw, 0.4);
    T(s, m[2], rx, yy + 0.36, rw, 0.36, { fontSize: 14, color: C.body });
  });
  const b = pic(s, "scrDrag", rx, y + 2.45, rw, YB - y - 2.75, "left");
  caption(s, "จัดรายครูแบบลากวางในต้นแบบ", b);
}

// ================= 15 auto schedule =================
{
  const s = slide("การจัดตารางอัตโนมัติวางคาบที่จัดยากก่อน แล้วใช้ Soft constraint ให้คะแนนช่องเวลาที่เหลือ", S.D, "รายงานข้อ 3.5.1 รูปที่ 3.41 และตารางที่ 3.4");
  phases(s, TT, [2], CPY, true);
  const y = Y0 + 0.2;
  const b = pic(s, "algo1", M, y, 4.6, YB - y, "left", true);
  const rx = b.x + b.w + 0.6, rw = W - M - rx;
  T(s, para([["1  เรียงงานจากยากไปง่าย", { bold: true, fontSize: 18 }], ["คาบคู่ วิชาที่ใช้ห้องเฉพาะ และวิชาสำคัญถูกจัดก่อน เพราะมีช่องให้ลงน้อย", { fontSize: 14, color: C.body }]]), rx, y, rw, 1.0);
  T(s, "13", rx, y + 1.15, 1.4, 0.9, { fontSize: 54, bold: true, color: C.accent });
  T(s, para([["Hard constraint ต้องผ่านทุกข้อ", { bold: true, fontSize: 17 }], ["เช่น ครูคนเดียวห้ามสอนซ้อนเวลา", { fontSize: 14, color: C.body }]]), rx + 1.5, y + 1.25, rw - 1.5, 0.8);
  T(s, "4", rx, y + 2.15, 1.4, 0.9, { fontSize: 54, bold: true, color: C.ink });
  T(s, para([["Soft constraint ให้คะแนนช่องเวลา", { bold: true, fontSize: 17 }], ["วางคาบลงช่องที่ได้คะแนนสูงสุด", { fontSize: 14, color: C.body }]]), rx + 1.5, y + 2.25, rw - 1.5, 0.8);
  rule(s, rx, y + 3.3, rw);
  T(s, "คาบคู่ที่หาช่องติดกันไม่ได้ถูกแตกเป็นคาบเดี่ยว คาบที่ยังวางไม่ได้ ระบบรายงานพร้อมเหตุผลให้ฝ่ายวิชาการจัดเอง", rx, y + 3.45, rw, 1.0, { fontSize: 14, color: C.body });
}

// ================= 16 real time =================
{
  const s = slide("ระบบตรวจการชนด้วยเวลาจริงตามนาฬิกา ไม่ใช่เลขคาบ", S.D, "รายงาน Activity ระบบตารางสอน เฟส 4 · UC-8");
  phases(s, TT, [3], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "actT4", M, y, 6.0, YB - y, "left", true);
  const rx = 7.1, rw = W - M - rx;
  T(s, para([["ม.ต้น คาบละ 50 นาที", { bold: true, fontSize: 20 }], ["ม.ปลาย คาบละ 55 นาที", { bold: true, fontSize: 20 }], ["คาบที่ 5 ของสองช่วงชั้นจึงเป็นคนละเวลา ถ้าเทียบเลขคาบ ครูที่สอนทั้งสองช่วงชั้นจะถูกตรวจผิด", { fontSize: 15, color: C.body }]]), rx, y, rw, 2.0);
  const b = pic(s, "scrTimeStruct", rx, y + 2.2, rw, YB - y - 2.5, "left");
  caption(s, "ตั้งโครงสร้างเวลาแยกตามช่วงชั้นในต้นแบบ", b);
}

// ================= 17 conflict =================
{
  const s = slide("Conflict 9 ข้อต้องแก้ให้หมดก่อนเผยแพร่ ส่วนคำเตือน 4 ข้อยังเผยแพร่ได้", S.D, "รายงานข้อ 3.5.2 ตารางที่ 3.5");
  phases(s, TT, [3, 4], CPY, true);
  const y = Y0 + 0.2;
  T(s, "9", M, y - 0.1, 1.3, 1.2, { fontSize: 80, bold: true, color: C.red });
  T(s, para([["Conflict ต้องแก้ก่อนเผยแพร่", { bold: true, fontSize: 18 }], ["เช่น ครูคนเดียวสอนสองห้องพร้อมกัน", { fontSize: 14, color: C.body }]]), M + 1.4, y + 0.1, 4.4, 1.0);
  T(s, "4", M, y + 1.25, 1.3, 1.2, { fontSize: 80, bold: true, color: C.gray });
  T(s, para([["คำเตือน เผยแพร่ได้แต่แสดงให้เห็น", { bold: true, fontSize: 18 }], ["เช่น ครูสอนเกิน 24 คาบต่อสัปดาห์", { fontSize: 14, color: C.body }]]), M + 1.4, y + 1.45, 4.4, 1.0);
  const b2 = pic(s, "publishBlocked", M, y + 2.9, 5.4, 1.4, "left");
  caption(s, "กดเผยแพร่ตอนยังมี Conflict 4 คาบ ระบบไม่ยอม", b2);
  pic(s, "conflict", 6.6, y, W - M - 6.6, YB - y, "right");
}

// ================= 18 versions =================
{
  const s = slide("ตารางที่เผยแพร่แล้วแก้ตรงไม่ได้ ครูต้องยื่นคำร้องและระบบสร้างฉบับใหม่", S.D, "รายงานรูปที่ 3.32 และ Activity ระบบตารางสอน เฟส 6 · UC-9, UC-21");
  phases(s, TT, [4, 5], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "stTT", M, y, 5.0, YB - y, "left", true);
  const rx = 6.1, rw = W - M - rx;
  T(s, "คาบที่เผยแพร่แล้วคือคาบที่ครูเช็คชื่อ ถ้าย้ายตรง ๆ ข้อมูลเช็คชื่อที่ผูกกับคาบเดิมจะเสีย", rx, y, rw, 0.8, { fontSize: 17 });
  T(s, "ครูยื่นคำร้อง → ฝ่ายวิชาการดูตารางก่อนและหลัง → ระบบตรวจการชนอีกรอบ → สร้างฉบับเผยแพร่ใหม่ ฉบับเดิมเป็นฉบับเก่า", rx, y + 0.9, rw, 0.9, { fontSize: 15, color: C.body });
  const b = pic(s, "scrRequest", rx, y + 1.95, rw, YB - y - 2.25, "left");
  caption(s, "ฝ่ายวิชาการพิจารณาคำร้องในต้นแบบ", b);
}

// ================= 19 attendance opening =================
{
  const s = slide("ครูเช็คชื่อรายคาบโดยเริ่มจาก “มา” ทุกคน และการแก้ขาดเป็นมาต้องระบุเหตุผล", S.E, "รายงาน Activity ระบบเช็คชื่อ เฟส 1 และ 2 · UC-23, UC-24");
  opening(s, [["แก้ปัญหา", "เวลาเรียนแยกอยู่คนละที่กับคะแนน ต้องนับ มส เอง"], ["วันนี้เจาะ", "การคำนวณ มส เพราะส่งต่อไปตัดสินผลการเรียนโดยตรง"]], Y0 - 0.15);
  phases(s, AT, [0], Y0 + 0.85);
  const y = Y0 + 1.85;
  const b = pic(s, "scrAttend", M, y, 7.4, YB - y - 0.3, "left");
  caption(s, "หน้าเช็คชื่อนักเรียนรายคาบในต้นแบบ", b);
  const rx = b.x + b.w + 0.45, rw = W - M - rx;
  T(s, para([["เริ่มจาก “มา” ทุกคน", { bold: true, fontSize: 17 }], ["ครูกดเฉพาะคนที่สาย ลา หรือขาด", { fontSize: 14, color: C.body }], [" ", { fontSize: 8 }], ["แก้ขาดเป็นมา", { bold: true, fontSize: 17 }], ["ต้องกรอกเหตุผลอย่างน้อย 10 ตัวอักษร ระบบเก็บประวัติไว้", { fontSize: 14, color: C.body }]]), rx, y, rw, 3.2);
}

// ================= 20 ms =================
{
  const s = slide("นักเรียนที่เวลาเรียนต่ำกว่าร้อยละ 80 ถูกจัดเป็น มส ทันที", S.E, "รายงานข้อ 3.5.3 และ Activity ระบบเช็คชื่อ เฟส 3");
  phases(s, AT, [2], CPY, true);
  const y = Y0 + 0.4;
  T(s, "เวลาเรียน", M, y, 5.8, 0.5, { fontSize: 20, color: C.gray });
  T(s, "(มา + สาย) ÷ คาบที่เช็คแล้ว", M, y + 0.5, 5.8, 0.8, { fontSize: 30, bold: true });
  T(s, "ต่ำกว่า 80%  →  มส", M, y + 1.55, 5.8, 0.9, { fontSize: 36, bold: true, color: C.accent });
  T(s, "ผล มส ส่งตรงไปที่การคำนวณเกรดในระบบคะแนน ครูประจำชั้นดูห้องของตัวเองได้แบบอ่านอย่างเดียว", M, y + 2.7, 5.6, 1.1, { fontSize: 15, color: C.body });
  const b = pic(s, "scrAttendSum", 6.9, y, W - M - 6.9, YB - y - 0.3, "right");
  caption(s, "สรุปเวลาเรียนของห้องในต้นแบบ", b);
}

// ================= 21 waive ms =================
{
  const s = slide("การปลด มส ต้องมีบันทึกอนุมัติจากผู้บริหาร และไม่เปลี่ยนเวลาเรียน", S.E, "รายงานข้อ 3.5.3 และ Activity ระบบเช็คชื่อ เฟส 4");
  phases(s, AT, [3], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "actA4", M, y, 6.0, YB - y, "left", true);
  const rx = 7.1, rw = W - M - rx;
  T(s, para([["เหตุสุดวิสัย", { bold: true, fontSize: 20 }], ["ตัดสินผลตามปกติ", { fontSize: 15, color: C.body }]]), rx, y, rw, 0.9);
  rule(s, rx, y + 1.05, rw);
  T(s, para([["เรียนชดเชย", { bold: true, fontSize: 20 }], ["ระดับผลการเรียนได้ไม่เกิน 1", { fontSize: 15, color: C.body }]]), rx, y + 1.2, rw, 0.9);
  rule(s, rx, y + 2.25, rw);
  T(s, "ระบบเก็บการปลดเป็นอีกรายการ ตัวเลขเวลาเรียนจริงไม่ถูกแก้ ถ้าห้องนั้นส่งผลแล้วต้องขอปลดล็อกก่อน", rx, y + 2.45, rw, 1.3, { fontSize: 15, color: C.body });
}

// ================= 22 grading opening =================
{
  const s = slide("ครูบันทึกคะแนนได้เมื่อโครงสร้างคะแนนรวมครบ 100%", S.F, "รายงาน Activity ระบบบันทึกคะแนน เฟส 1 · UC-11 ถึง UC-20, UC-25, UC-26");
  opening(s, [["แก้ปัญหา", "รวมคะแนนและตัดสินผลด้วยมือ นำเข้าไฟล์ยาก"], ["วันนี้เจาะ", "คำนวณผลและขั้นส่ง ตรวจ อนุมัติ เพราะเป็นจุดที่สองบทบาทมาเจอกัน"]], Y0 - 0.15);
  phases(s, GR, [0], Y0 + 0.85);
  const y = Y0 + 1.85;
  T(s, "100%", M, y, 4.2, 1.2, { fontSize: 72, bold: true, color: C.accent });
  T(s, "ระบบดึงโครงสร้างตั้งต้นของรายวิชามาให้ ครูปรับองค์ประกอบ คะแนนเต็ม สัดส่วน และตัวชี้วัด ถ้าสัดส่วนรวมไม่ครบ ระบบไม่ให้บันทึก", M, y + 1.3, 4.8, 1.6, { fontSize: 15, color: C.body });
  pic(s, "actG1", 6.0, y, W - M - 6.0, YB - y, "right", true);
}

// ================= 23 score entry =================
{
  const s = slide("ครูกรอกคะแนนเองหรือนำเข้าจาก Excel และ CSV ได้ โดยระบบตรวจช่วงคะแนนให้", S.F, "รายงาน Activity ระบบบันทึกคะแนน เฟส 2 · UC-12, UC-25");
  phases(s, GR, [1], CPY, true);
  const y = Y0 + 0.2;
  const b = pic(s, "scrScores", M, y, 8.6, YB - y - 0.3, "left");
  caption(s, "แท็บกรอกคะแนนของห้องเรียนที่สอนในต้นแบบ", b);
  const rx = b.x + b.w + 0.45, rw = W - M - rx;
  T(s, para([["กรอกเอง", { bold: true, fontSize: 18 }], ["หรือระบุ ร กับ ข", { fontSize: 14, color: C.body }], [" ", { fontSize: 8 }], ["นำเข้า Excel หรือ CSV", { bold: true, fontSize: 18 }], ["ลดการกรอกซ้ำ", { fontSize: 14, color: C.body }], [" ", { fontSize: 8 }], ["ตรวจเดียวกันทั้งสองทาง", { bold: true, fontSize: 18 }], ["ตัวเลข 0 ถึงคะแนนเต็ม ทุกการแก้เก็บเป็นประวัติ", { fontSize: 14, color: C.body }]]), rx, y, rw, 4.4);
}

// ================= 24 grade calc =================
{
  const s = slide("ระบบตรวจเวลาเรียนและความครบของคะแนนก่อน แล้วจึงคำนวณระดับผลการเรียน", S.F, "รายงานข้อ 3.5.3 รูปที่ 3.42 · UC-13, UC-14");
  phases(s, GR, [2], CPY, true);
  const y = Y0 + 0.2;
  const b = pic(s, "algo2", M, y, 4.8, YB - y, "left", true);
  const rx = b.x + b.w + 0.6, rw = W - M - rx;
  const steps = [["เวลาเรียนต่ำกว่าร้อยละ 80 และยังไม่ปลด มส", "มส"], ["มีองค์ประกอบที่เป็น ร หรือ ข", "ร"], ["คะแนนยังกรอกไม่ครบ", "ยังไม่ตัดสิน"], ["ผ่านทั้งหมด รวมคะแนนตามสัดส่วน ปัดเป็นจำนวนเต็ม", "ระดับ 0 ถึง 4"]];
  const tb = steps.map((st, i) => [cell(String(i + 1), { bold: true, fontSize: 18, color: i < 3 ? C.accent : C.ink }), cell(st[0], { fontSize: 15 }), cell(st[1], { fontSize: 16, bold: true, align: "right", color: i < 3 ? C.accent : C.ink })]);
  s.addTable(tb, { x: rx, y, w: rw, colW: [0.5, rw - 2.3, 1.8], rowH: 0.8, margin: [0.04, 0.08, 0.04, 0.08] });
  T(s, "ระดับ 0 สอบซ่อมได้ ระบบคำนวณใหม่ทุกครั้งที่คะแนน เวลาเรียน หรือผลสอบซ่อมเปลี่ยน", rx, y + 3.45, rw, 0.9, { fontSize: 14, color: C.gray });
}

// ================= 25 submit review approve =================
{
  const s = slide("ผลการเรียนต้องผ่านขั้นส่ง ตรวจ และอนุมัติ ก่อนออกเป็นรายงาน", S.F, "รายงาน Activity ระบบบันทึกคะแนน เฟส 4 · UC-17, UC-18");
  phases(s, GR, [3], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "actG4", M, y, 6.6, YB - y, "left", true);
  const rx = 7.7, rw = W - M - rx;
  const st = [["ครูผู้สอนกดส่งผล", "ระบบตรวจว่าคะแนนครบก่อน", ROLE.t], ["ระบบล็อกข้อมูล", "สถานะเป็นรอตรวจ บันทึกรอบการส่ง", null], ["ฝ่ายวิชาการอนุมัติหรือตีกลับ", "ตีกลับต้องปักหมุดและกรอกเหตุผล", ROLE.a], ["ถ้าตีกลับ ระบบปลดล็อก", "ครูเห็นหมุดว่าต้องแก้ตรงไหน", null]];
  st.forEach((p, i) => {
    const yy = y + i * 1.1;
    T(s, String(i + 1), rx, yy, 0.45, 0.5, { fontSize: 22, bold: true, color: p[2] ? p[2].c : C.gray });
    T(s, para([[p[0], { bold: true, fontSize: 17, color: p[2] ? p[2].dark : C.ink }], [p[1], { fontSize: 14, color: C.body }]]), rx + 0.5, yy, rw - 0.5, 1.0);
  });
}

// ================= 26 state =================
{
  const s = slide("เมื่อครูส่งผล ระบบล็อกคะแนน เวลาเรียน และการปลด มส ของห้องนั้นพร้อมกัน", S.F, "รายงานรูปที่ 3.31 และข้อ 3.3.4");
  phases(s, GR, [3], CPY, true);
  const y = Y0 + 0.2;
  pic(s, "stGrade", M, y, 5.4, YB - y, "left", true);
  const rx = 6.5, rw = W - M - rx;
  const st = [["ยังไม่ตั้งโครงสร้างคะแนน", "บันทึกคะแนนไม่ได้", C.gray], ["กำลังบันทึก", "สถานะเดียวที่แก้ไขได้", ROLE.t.c], ["รอตรวจ", "ล็อก", C.accent], ["อนุมัติแล้ว", "ล็อก", C.accent]];
  st.forEach((p, i) => {
    const yy = y + i * 0.62;
    T(s, p[0], rx, yy, 3.6, 0.5, { fontSize: 18, bold: true, valign: "middle" });
    T(s, p[1], rx + 3.6, yy, rw - 3.6, 0.5, { fontSize: 15, bold: p[2] === C.accent, color: p[2], valign: "middle" });
  });
  T(s, "ล็อกทั้งคะแนน การเช็คชื่อ และการปลด มส เพราะทั้งสามอย่างใช้คำนวณเกรด", rx, y + 2.65, rw, 0.9, { fontSize: 17 });
  T(s, "การตีกลับไม่ใช่สถานะใหม่ แต่กลับไปเป็นกำลังบันทึกพร้อมเหตุผล", rx, y + 3.55, rw, 0.9, { fontSize: 15, color: C.body });
}

// ================= 27 remedial / unlock =================
{
  const s = slide("หลังส่งผลแล้ว ครูแก้ผลได้ผ่านการสอบซ่อมหรือการขอปลดล็อกเท่านั้น", S.F, "รายงานข้อ 3.5.3 และ Activity ระบบบันทึกคะแนน เฟส 5, 6 · UC-19, UC-20");
  phases(s, GR, [4, 5], CPY, true);
  const y = Y0 + 0.2, cw = (CW - 0.6) / 2;
  T(s, para([["สอบซ่อม", { bold: true, fontSize: 20 }], ["หลังอนุมัติผล ไม่เกิน 2 ครั้ง ได้ร้อยละ 50 ขึ้นไปเป็นระดับ 1 ถ้าไม่ถึงต้องเรียนซ้ำ", { fontSize: 15, color: C.body }]]), M, y, cw, 1.2);
  const b1 = pic(s, "scrRemedial", M, y + 1.35, cw, YB - y - 1.65, "left");
  caption(s, "หน้าต่างบันทึกผลสอบซ่อมในต้นแบบ", b1);
  const rx = M + cw + 0.6;
  T(s, para([["ขอปลดล็อก", { bold: true, fontSize: 20 }], ["ครูกรอกเหตุผล สถานะเดิมยังอยู่ ฝ่ายวิชาการอนุมัติแล้วจึงกลับเป็นกำลังบันทึก", { fontSize: 15, color: C.body }]]), rx, y, cw, 1.2);
  pic(s, "actG6", rx, y + 1.35, cw, YB - y - 1.35, "left", true);
}

// ================= 28 reports =================
{
  const s = slide("รายงานแสดงตามสิทธิ์ ครูผู้สอนเห็นเฉพาะห้องที่ตนสอน", S.G, "รายงาน Activity ระบบออกรายงาน เฟส 1");
  opening(s, [["แก้ปัญหา", "ฝ่ายวิชาการต้องรวมข้อมูลจากหลายไฟล์"], ["ทำได้", "รายงานตามสิทธิ์ · ค้นหลักสูตรและรายวิชา · ส่งออก Excel และ PDF"]], Y0 - 0.15);
  const y = Y0 + 1.1, cw = (CW - 0.5) / 2;
  label(s, "ครูฝ่ายวิชาการ เห็นทั้งโรงเรียน", M, y, cw, ROLE.a.c);
  pic(s, "scrAcadOverview", M, y + 0.4, cw, YB - y - 0.4, "left");
  label(s, "ครูผู้สอน เห็นเฉพาะห้องที่สอน", M + cw + 0.5, y, cw, ROLE.t.c);
  pic(s, "scrTeacherReport", M + cw + 0.5, y + 0.4, cw, YB - y - 0.4, "left");
}

// ================= 29 traceability =================
{
  const s = slide("ทุกหน้าจอในต้นแบบสืบกลับไปหา use case ได้", S.G, "รายงานตารางที่ 3.2 และ docs/database/table-uc-map.md");
  const chain = [["วัตถุประสงค์", "ข้อ 4"], ["Use case", "UC-17 ส่งผลการเรียน"], ["Activity", "ระบบคะแนน เฟส 4"], ["State", "ผลการเรียน รูปที่ 3.31"], ["ตาราง", "grade_submission\nreview_note"], ["หน้าจอ", "บันทึกคะแนน"], ["เทอม 2", "Test Case"]];
  const gap = 0.32, w = (CW - gap * 6) / 7, y = Y0 + 0.3, h = 1.7;
  chain.forEach((c, i) => {
    const x = M + i * (w + gap), last = i === 6;
    s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: last ? C.white : i === 1 ? C.accentTint : C.tint }, line: last ? { color: C.faint, width: 1.25, dashType: "dash" } : { type: "none" } });
    T(s, para([[c[0], { fontSize: 13, color: C.gray, bold: true }], [c[1], { fontSize: c[1].includes("_") ? 11 : 15, bold: true, color: last ? C.gray : C.ink }]]), x + 0.12, y + 0.15, w - 0.2, h - 0.25);
    if (!last) T(s, "→", x + w, y + h / 2 - 0.2, gap, 0.4, { fontSize: 18, color: C.gray, align: "center", valign: "middle" });
  });
  const b = pic(s, "scrScores", M, y + h + 0.45, 6.0, YB - y - h - 0.75, "left");
  caption(s, "ปลายทางของสายนี้ในต้นแบบ จะเห็นอีกครั้งในเดโม", b);
  T(s, "ตาราง 3.2 โยง use case กับ Activity ส่วนการโยงตารางกับ use case ครบทั้ง 58 ตาราง การโยงกับ Test Case จะทำในเทอม 2", b.x + b.w + 0.5, b.y, W - M - b.x - b.w - 0.5, 1.6, { fontSize: 15, color: C.body });
}

// ================= 30 demo =================
{
  const s = slide("ต้นแบบหน้าจอแสดงกฎของทั้ง 3 ระบบเด่นทำงานจริง", S.G, "รายงานบทที่ 4 ต้นแบบใช้ HTML และ JavaScript กับข้อมูลจำลอง");
  const st = [["จัดตารางสอน", ROLE.a, "วางคาบให้ชน จัดอัตโนมัติ และลองเผยแพร่"], ["เช็คชื่อ", ROLE.t, "เช็คชื่อรายคาบ ดูสรุปเวลาเรียน"], ["บันทึกคะแนน", ROLE.t, "นำเข้าคะแนน คำนวณผล แล้วส่งผล"], ["อนุมัติผล", ROLE.a, "ตรวจ ปักหมุด อนุมัติหรือตีกลับ"]];
  st.forEach((p, i) => {
    const y = Y0 + i * 1.15;
    T(s, String(i + 1), M, y, 0.6, 0.6, { fontSize: 30, bold: true, color: p[1].c });
    T(s, para([[p[0], { bold: true, fontSize: 20 }], [p[1].name + " · " + p[2], { fontSize: 14, color: C.body }]]), M + 0.65, y, 4.3, 1.05);
  });
  const b = pic(s, "scrDrag", 5.9, Y0, W - M - 5.9, YB - Y0 - 0.3, "right");
  caption(s, "หน้าจัดตารางสอนในต้นแบบ", b);
}

// ================= 31 progress =================
{
  const s = slide("เทอม 1 ทำงานวิเคราะห์ ออกแบบ และต้นแบบแล้ว คิดเป็นความคืบหน้า 47.5% ของทั้งโครงงาน", S.H, "รายงานตารางที่ 5.1 จำนวนไฟล์หน้าจอนับจากโฟลเดอร์ต้นแบบ");
  T(s, "47.5%", M, Y0 - 0.1, 4.0, 1.4, { fontSize: 80, bold: true, color: C.accent });
  T(s, "ความคืบหน้ารวม คิดจากน้ำหนักงานคูณความคืบหน้าของแต่ละงาน", M, Y0 + 1.35, 3.8, 1.0, { fontSize: 15, color: C.body });
  const bx = 5.2, lab = 3.4, unit = 0.11;
  const rows = [["วิเคราะห์และออกแบบ", 25, 24.5, "24.5 จาก 25"], ["ออกแบบ UX/UI", 20, 18, "18 จาก 20"], ["พัฒนา Back-end และฐานข้อมูล", 30, 0, "0 จาก 30"], ["ทดสอบและเชื่อมต่อข้อมูล", 15, 0, "0 จาก 15"], ["เล่มรายงานและการนำเสนอ", 10, 5, "5 จาก 10"]];
  rows.forEach((r, i) => {
    const y = Y0 + i * 0.6, dim = r[2] === 0;
    T(s, r[0], bx, y, lab, 0.42, { fontSize: 15, valign: "middle", color: dim ? C.gray : C.ink });
    rect(s, bx + lab, y + 0.06, r[1] * unit, 0.3, C.tint);
    if (r[2] > 0) rect(s, bx + lab, y + 0.06, r[2] * unit, 0.3, C.accent);
    T(s, r[3], bx + lab + r[1] * unit + 0.15, y, 1.4, 0.42, { fontSize: 13, bold: !dim, valign: "middle", color: dim ? C.gray : C.ink });
  });
  T(s, "Back-end และการทดสอบเป็นงานเทอม 2 ตามแผนในข้อ 1.4", bx, Y0 + 3.05, CW - bx + M, 0.35, { fontSize: 12, color: C.gray });
  rule(s, M, Y0 + 3.75, CW);
  T(s, para([["สิ่งที่ส่งมอบแล้ว   ", { fontSize: 15, color: C.gray, bold: true }], ["26 ", { bold: true, fontSize: 22 }], ["use case    ", { fontSize: 16 }], ["23 ", { bold: true, fontSize: 22 }], ["Activity Diagram    ", { fontSize: 16 }], ["58 ", { bold: true, fontSize: 22 }], ["ตาราง    ", { fontSize: 16 }], ["21 ", { bold: true, fontSize: 22 }], ["ไฟล์หน้าจอต้นแบบ", { fontSize: 16 }]].map((p) => [p[0], Object.assign({}, p[1], { breakLine: false })])), M, Y0 + 3.95, CW, 0.6, { valign: "middle" });
}

// ================= 32 plan =================
{
  const s = slide("เทอม 2 จะล็อกขอบเขตในเดือนที่ 1 แล้วพัฒนาระบบย่อยตามลำดับที่ข้อมูลส่งต่อกัน", S.H, "รายงานตารางที่ 5.3 ข้อ 5.2.2 และตารางที่ 5.4");
  const DEV = ROLE.a.c, TEST = ROLE.t.c;
  const rows = [
    ["ล็อกขอบเขต ให้ผู้ใช้ทดลองต้นแบบ และตกลง API กับ Service B", [1], "เทอม 1 ขอบเขตเปลี่ยนบ่อย จึงล็อกหลังเดือนที่ 1", C.accent],
    ["ติดตั้งสภาพแวดล้อม สร้างฐานข้อมูล และพัฒนาระบบหลักสูตร", [1], "", DEV],
    ["พัฒนาระบบตารางสอน เช็คชื่อ และบันทึกคะแนน", [2], "ถ้าไม่ทัน ทำระบบหลักก่อน เลื่อนการจัดแบบกำหนดเงื่อนไขและรายงานบางประเภท", DEV],
    ["พัฒนาระบบออกรายงาน", [3], "", DEV],
    ["Unit Test และบูรณาการกับกลุ่มอื่นทุก 2 สัปดาห์", [1, 2, 3], "ถ้าระบบกลุ่มอื่นไม่ทัน ใช้ระบบจำลองตามข้อตกลง API", TEST],
    ["Integration Test", [3], "", TEST],
    ["System Test และ Load Test", [3, 4], "", TEST],
    ["User Acceptance Test", [4], "ถ้าหาผู้ใช้จริงไม่ได้ ให้อาจารย์หรือเพื่อนสวมบทตาม Persona", TEST],
  ];
  const hdr = [head("กิจกรรม"), ...[1, 2, 3, 4].map((m) => head("เดือน " + m, { align: "center" })), head("ความเสี่ยงและแผนรองรับ")];
  const body = rows.map((r) => [cell(r[0], { fontSize: 14, bold: r[3] === C.accent }), ...[1, 2, 3, 4].map((m) => cell("", r[1].includes(m) ? { fill: { color: r[3] } } : {})), cell(r[2], { fontSize: 13, color: C.body })]);
  s.addTable([hdr, ...body], { x: M, y: Y0 - 0.1, w: CW, colW: [4.4, 0.78, 0.78, 0.78, 0.78, 4.41], rowH: 0.52, margin: [0.03, 0.08, 0.03, 0.08] });
  [[C.accent, "ล็อกขอบเขต"], [DEV, "พัฒนา"], [TEST, "ทดสอบ"]].forEach((l, i) => {
    rect(s, M + i * 1.7, 6.6, 0.22, 0.16, l[0]);
    T(s, l[1], M + i * 1.7 + 0.3, 6.53, 1.3, 0.3, { fontSize: 12, color: C.gray });
  });
}

// ================= 33 commitment =================
{
  const s = slide("เมื่อจบเทอม 2 ระบบจะจัดตาราง 40 ห้องได้ภายใน 5 นาที และคำนวณผลทั้งระดับชั้นได้ภายใน 1 นาที", S.H, "รายงานตารางที่ 5.2 แผนการทดสอบ");
  T(s, "5 นาที", M, Y0 - 0.1, 4.2, 1.2, { fontSize: 66, bold: true, color: C.accent });
  T(s, "จัดตารางสอนอัตโนมัติ 40 ห้องเรียน", M, Y0 + 1.1, 4.2, 0.4, { fontSize: 16, color: C.body });
  T(s, "1 นาที", M, Y0 + 1.9, 4.2, 1.2, { fontSize: 66, bold: true, color: C.accent });
  T(s, "คำนวณผลการเรียนทั้งระดับชั้น", M, Y0 + 3.1, 4.2, 0.4, { fontSize: 16, color: C.body });
  T(s, "สองตัวเลขนี้คือเกณฑ์ผ่านของ Load Test", M, Y0 + 3.9, 4.2, 0.4, { fontSize: 13, color: C.gray });
  const rx = M + 4.7, rw = CW - 4.7;
  const tests = [
    ["Unit Test", "ทุกกรณีผ่าน ผลคำนวณตรงกับการคำนวณด้วยมือร้อยละ 100"],
    ["Integration Test", "ข้อมูลที่ซิงก์ตรงกับต้นทาง เข้าถึงได้เฉพาะสิทธิ์ตามบทบาท งานเบื้องหลังแจ้งสถานะได้"],
    ["System Test", "use case ทั้ง 26 รายการทำงานตาม Basic Flow และแสดงข้อความตาม Alternative และ Exception Flow"],
    ["Load Test", "ไม่เกิด Data Conflict จัดตาราง 40 ห้องภายใน 5 นาที คำนวณผลทั้งระดับชั้นภายใน 1 นาที"],
    ["User Acceptance Test", "ครูผู้สอนและครูฝ่ายวิชาการทำงานตามขั้นตอนได้ครบด้วยตนเอง"],
  ];
  s.addTable([[head("การทดสอบ"), head("เกณฑ์ผ่าน")], ...tests.map((t) => [cell(t[0], { bold: true, fontSize: 15, color: t[0] === "Load Test" ? C.accent : C.ink }), cell(t[1], { fontSize: 14, color: C.body })])], { x: rx, y: Y0, w: rw, colW: [2.3, rw - 2.3], rowH: [0.45, 0.85, 0.85, 0.85, 0.85, 0.85], margin: [0.05, 0.1, 0.05, 0.08] });
}

(async () => {
  // pptxgenjs writes pitchFamily/charset on font tags; strip them so PowerPoint/Canva do not space out Latin letters.
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  for (const name of Object.keys(zip.files).filter((f) => f.endsWith(".xml"))) {
    const xml = await zip.file(name).async("string");
    zip.file(name, xml.replace(/ pitchFamily="\d+" charset="-?\d+"/g, ""));
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("wrote", OUT, n, "slides");
})().catch((e) => { console.error(e); process.exit(1); });
