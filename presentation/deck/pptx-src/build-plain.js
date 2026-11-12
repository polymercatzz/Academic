// Builds the defense deck as .pptx. Run: node build.js <out.pptx>
// Design rules: .claude/skills/slide-design — no icons, no cards, no shadows, one accent color,
// one typeface (IBM Plex Sans Thai Looped, regular + bold), flat tables with thin rules.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const SCRATCH = __dirname;
const DECK = path.join(SCRATCH, "..");
const ASSET = (n) => path.join(DECK, "assets", n + ".png");
const SHOT = (n) => path.join(SCRATCH, "shots", n + ".png");
const OUT = process.argv[2] || path.join(SCRATCH, "deck.pptx");

const FONT = "IBM Plex Sans Thai Looped";
// Palette (from presentation/02-slide-outline.md): paper, ink, gray, light rule, one accent.
const C = { paper: "FBFBF9", ink: "1F2328", body: "374151", gray: "6B7280", faint: "9CA3AF", rule: "D1D5DB", bar: "E5E7EB", accent: "B8440B", white: "FFFFFF" };
// Role colors: used only to mark which user role something belongs to (Persona, scope, approval, demo).
// Orange accent stays reserved for the key point of a slide.
const ROLE = {
  acad: { c: "2F5D9A", dark: "1F3F6B", tint: "E6EEF8", name: "ครูฝ่ายวิชาการ" },
  teach: { c: "1E7A66", dark: "13564A", tint: "E3F2EE", name: "ครูผู้สอน" },
};
// Type scale: title 30, lead 20, body 17–18, secondary 15, table 14, source 12.
const SZ = { title: 30, lead: 20, body: 18, small: 15, table: 14, src: 12 };
const W = 13.333, H = 7.5, M = 0.7, CW = W - 2 * M, Y0 = 1.95;

function fromHtml(id) {
  const h = fs.readFileSync(path.join(DECK, "project", "slides", id + ".html"), "utf8");
  const t = (h.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/) || [])[1] || "";
  const a = (h.match(/<aside>([\s\S]*?)<\/aside>/) || [])[1] || "";
  return { title: t.replace(/<br>/g, "\n"), notes: a.trim() };
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "ระบบบริหารจัดการงานวิชาการภายในโรงเรียน";
  pres.author = "ปณวัฒน์ ธรรมเจริญ, อิสรีย์ แม้นถาวรสิริ";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

  pres.defineSlideMaster({
    title: "CONTENT", background: { color: C.paper },
    objects: [{ placeholder: { options: { name: "title", type: "title", x: M, y: 0.5, w: CW, h: 1.25, fontFace: FONT, fontSize: SZ.title, bold: true, color: C.ink, align: "left", valign: "top", margin: 0 }, text: "" } }],
    slideNumber: { x: W - M - 0.6, y: 6.95, w: 0.6, h: 0.3, fontFace: FONT, fontSize: SZ.src, color: C.gray, align: "right" },
  });
  pres.defineSlideMaster({ title: "PLAIN", background: { color: C.paper } });

  // ---------- helpers ----------
  const T = (s, str, x, y, w, h, o = {}) =>
    s.addText(str, Object.assign({ x, y, w, h, fontFace: FONT, fontSize: SZ.body, color: C.ink, margin: 0, valign: "top", align: "left", isTextBox: true, lineSpacingMultiple: 1.15 }, o));
  const src = (s, str) => T(s, str, M, 6.95, CW - 1, 0.3, { fontSize: SZ.src, color: C.gray });
  const rule = (s, x, y, w) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color: C.rule, width: 0.75 } });
  // Flat image with a hairline border (no shadow).
  const img = (s, file, x, y, w, h) => {
    s.addImage({ path: file, x, y, w, h });
    s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { type: "none" }, line: { color: C.rule, width: 0.75 } });
  };
  // Accent outline on the part of a diagram the slide talks about. r = [x, y, w, h] as fractions of the image.
  const mark = (s, x, y, w, h, r) =>
    s.addShape(pres.ShapeType.rect, { x: x + r[0] * w, y: y + r[1] * h, w: r[2] * w, h: r[3] * h, fill: { type: "none" }, line: { color: C.accent, width: 2.5 } });
  const bullets = (arr, o = {}) => arr.map((t, i) => ({ text: t, options: Object.assign({ bullet: { indent: 16 }, breakLine: i < arr.length - 1, paraSpaceAfter: 6 }, o) }));
  // Table cell with only a thin bottom rule.
  const cell = (t, o = {}) => ({ text: t, options: Object.assign({ fontFace: FONT, fontSize: SZ.table, color: C.ink, valign: "middle", border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.rule, pt: 0.75 }, { type: "none" }] }, o) });
  const head = (t, o = {}) => cell(t, Object.assign({ bold: true, color: C.gray, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.ink, pt: 1 }, { type: "none" }] }, o));
  function content(id, section) {
    const d = fromHtml(id);
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    s.addText(d.title, { placeholder: "title", fontFace: FONT });
    if (d.notes) s.addNotes(d.notes);
    return s;
  }

  const SEC = ["ปัญหาและการค้นคว้า", "การวิเคราะห์และออกแบบ", "ระบบต้นแบบ", "สถานะและแผนเทอม 2"];
  SEC.forEach((t) => pres.addSection({ title: t }));

  // ================= 1 cover =================
  {
    const d = fromHtml("cover");
    const s = pres.addSlide({ masterName: "PLAIN", sectionTitle: SEC[0] });
    T(s, "ระบบบริหารจัดการ\nงานวิชาการภายในโรงเรียน", M, 1.25, 6.3, 1.9, { fontSize: 37, bold: true, lineSpacingMultiple: 1.1 });
    T(s, "Development of Academic Management System for Schools", M, 3.3, 6.4, 0.4, { fontSize: 16, color: C.gray });
    T(s, "สอบโครงงาน ภาคเรียนที่ 1 ปีการศึกษา 2569", M, 4.55, 6.4, 0.4, { fontSize: 18, bold: true });
    T(s, "ปณวัฒน์ ธรรมเจริญ 66070113\nอิสรีย์ แม้นถาวรสิริ 66070323", M, 5.05, 6.4, 0.8, { fontSize: 18 });
    T(s, "อาจารย์ที่ปรึกษา ดร.ศิรสิทธิ์ โล่ห์ชนะจิต\nคณะเทคโนโลยีสารสนเทศ สจล.", M, 5.95, 6.4, 0.7, { fontSize: SZ.small, color: C.gray });
    const iw = 5.55, ih = iw * 900 / 1600;
    img(s, SHOT("index@2x"), W - M - iw, 2.0, iw, ih);
    s.addNotes(d.notes);
  }

  // ================= 2 problem =================
  {
    const s = content("problem", SEC[0]);
    const lw = 5.2;
    T(s, "ผู้จัดตารางต้องดู 4 อย่างพร้อมกัน", M, Y0, lw, 0.45, { fontSize: SZ.lead, bold: true, color: C.accent });
    T(s, bullets(["เวลาว่างของครู", "ห้องเรียน", "ตารางเรียนของนักเรียน", "จำนวนคาบของแต่ละรายวิชาในหลักสูตร"]), M, Y0 + 0.65, lw, 2.2, { fontSize: SZ.lead });
    T(s, "ระบบเดิมรองรับเงื่อนไขเหล่านี้ได้ไม่ดี ฝ่ายวิชาการจึงจัดตารางใน Excel และตรวจความถูกต้องเอง", M, Y0 + 3.1, lw, 1.0, { fontSize: SZ.small, color: C.body });
    const rx = M + lw + 0.7, rw = CW - lw - 0.7;
    T(s, "ปัญหาอื่นที่พบในระบบเดิม", rx, Y0, rw, 0.4, { fontSize: SZ.small, bold: true, color: C.gray });
    const probs = [
      ["ข้อมูลไม่เชื่อมโยงกัน", "รายชื่อนักเรียน คะแนน และตารางสอนเก็บแยกกันหลายไฟล์ พอนำมารวมกันจึงเกิดข้อมูลซ้ำและไม่ตรงกัน"],
      ["การรวมคะแนนล่าช้า", "การรวมคะแนนและตัดสินผลการเรียนยังทำด้วยมือหรือกึ่งอัตโนมัติ ช่วงสิ้นภาคเรียนจึงมีงานค้างสะสม"],
      ["นำเข้าข้อมูลจากไฟล์ได้ยาก", "ครูต้องกรอกข้อมูลเดิมซ้ำหลายครั้ง"],
    ];
    probs.forEach((p, i) => {
      const y = Y0 + 0.55 + i * 1.4;
      T(s, [{ text: p[0], options: { bold: true, fontSize: SZ.body, breakLine: true } }, { text: p[1], options: { fontSize: SZ.small, color: C.body } }], rx, y, rw, 1.25);
    });
    src(s, "ที่มา: รายงานบทที่ 1 ข้อ 1.1");
  }

  // ================= 3 persona =================
  {
    const s = content("persona", SEC[0]);
    const pw = 2.3, ph = pw * 402 / 370;
    s.addImage({ path: ASSET("photo-somsri"), x: M, y: Y0, w: pw, h: ph });
    const ax = M + pw + 0.35, aw = 7.3 - pw - 0.35;
    T(s, "ครูสมศรี ใจดี", ax, Y0, aw, 0.45, { fontSize: 24, bold: true, color: ROLE.teach.c });
    T(s, "ครูผู้สอนคณิตศาสตร์ ม.2 ครูประจำชั้น ม.2/1\nและกรรมการฝ่ายวิชาการ ใช้ระบบทุกวัน", ax, Y0 + 0.55, aw, 0.75, { fontSize: SZ.small, color: C.gray });
    T(s, "“อยากกรอกคะแนนครั้งเดียว\nแล้วส่งผลได้เลย”", ax, Y0 + 1.45, aw, 0.9, { fontSize: SZ.lead, bold: true, color: ROLE.teach.dark });
    T(s, "ปัญหาในระบบเดิม", M, Y0 + ph + 0.3, 7.3, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    T(s, bullets(["คะแนนเก็บอยู่หลายไฟล์", "ต้องรวมคะแนนและตรวจความถูกต้องเองก่อนส่งผล", "จะดูว่าเช็คชื่อครบหรือยัง ต้องตั้งตัวกรองทุกครั้ง"]), M, Y0 + ph + 0.7, 7.3, 1.5, { fontSize: SZ.body });

    const bx = M + 8.0, bw = CW - 8.0, qw = 1.3, qh = qw * 402 / 370;
    s.addImage({ path: ASSET("photo-sunisa"), x: bx, y: Y0, w: qw, h: qh });
    T(s, "อ.สุนิสา ปัญญาดี", bx + qw + 0.25, Y0, bw - qw - 0.25, 0.4, { fontSize: SZ.lead, bold: true, color: ROLE.acad.c });
    T(s, "หัวหน้างานวิชาการ ใช้ระบบมาก\nช่วงต้นและปลายภาคเรียน", bx + qw + 0.25, Y0 + 0.5, bw - qw - 0.25, 0.8, { fontSize: SZ.table, color: C.gray });
    T(s, "“อยากรู้ทันทีว่าห้องไหนยังมีปัญหา”", bx, Y0 + 1.6, bw, 0.8, { fontSize: SZ.body, bold: true, color: ROLE.acad.dark });
    T(s, "ปัญหาในระบบเดิม", bx, Y0 + ph + 0.3, bw, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    T(s, bullets(["ไม่รู้ว่าคาบไหนยังไม่เช็คชื่อ", "ไฟล์ส่งออกต้องจัดรูปแบบต่อก่อนส่งผู้บริหาร"]), bx, Y0 + ph + 0.7, bw, 1.5, { fontSize: SZ.small });
    src(s, "ที่มา: รายงานข้อ 3.1.1 รูปที่ 3.1 และ 3.2 Persona สร้างจากการวิเคราะห์ระบบเดิมของโรงเรียน ภาพบุคคลเป็นภาพประกอบ");
  }

  // ================= 4 compare =================
  {
    const s = content("compare", SEC[0]);
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
    const hl = [2, 3];
    const hdr = ["ความสามารถ", "SchoolBright", "SGS", "aSc TimeTables", "ระบบที่พัฒนา"].map((t) => head(t));
    const body = rows.map((r, ri) => r.map((t, ci) => {
      const o = {};
      if (t === "ไม่มี" || t === "ไม่พบข้อมูล") o.color = C.faint;
      if (hl.includes(ri) && ci <= 1) { o.color = C.accent; o.bold = true; }
      return cell(t, o);
    }));
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.1, w: CW, colW: [4.73, 1.8, 1.8, 1.8, 1.8], rowH: 0.37, margin: [0.02, 0.08, 0.02, 0.08] });
    src(s, "ที่มา: รายงานตารางที่ 2.3 “ไม่พบข้อมูล” หมายถึงไม่พบในเอกสารที่ผู้พัฒนาระบบนั้นเผยแพร่");
  }

  // ================= 5 gap =================
  {
    const s = content("gap", SEC[0]);
    const rows = [
      ["การจัดตารางสอน", "SchoolBright ไม่พบการจัดอัตโนมัติและการตรวจการชน ส่วน SGS ไม่มีการจัดตารางสอน", "ข้อ 2", "จัดตารางอัตโนมัติตามเงื่อนไขของครู ห้อง และหลักสูตร และตรวจการชนให้อัตโนมัติ"],
      ["ข้อมูลอยู่หลายระบบ", "aSc TimeTables จัดตารางได้ แต่ไม่มีงานหลักสูตรและคะแนน", "ข้อ 1", "เก็บแผนการเรียน รายวิชา และครูผู้สอนไว้ที่เดียว ให้ตารางสอนและคะแนนดึงไปใช้ต่อ"],
      ["การกำหนดและบันทึกคะแนน", "ไม่พบการกำหนดสัดส่วนคะแนนและการนำเข้าคะแนนจากไฟล์", "ข้อ 4", "กรอกและนำเข้าคะแนนจำนวนมาก มีขั้นตอนส่ง ตรวจ และอนุมัติ"],
      ["การคำนวณผลการเรียน", "SGS ให้ครูสั่งประมวลผลเกรดเอง", "ข้อ 3, 4, 5", "คำนวณผลการเรียนอัตโนมัติ สรุปเวลาเรียนและแจ้ง มส และออกรายงานเป็น Excel หรือ PDF"],
    ];
    const hdr = [head("ปัญหาที่พบในระบบเดิม", { fontSize: SZ.small }), head("วัตถุประสงค์", { fontSize: SZ.small }), head("สิ่งที่โครงงานทำ", { fontSize: SZ.small })];
    const body = rows.map((r) => [
      cell([{ text: r[0], options: { bold: true, fontSize: SZ.body, breakLine: true } }, { text: r[1], options: { fontSize: SZ.table, color: C.body } }], { valign: "top" }),
      cell(r[2], { fontSize: SZ.body, bold: true, valign: "top" }),
      cell(r[3], { fontSize: SZ.small, valign: "top" }),
    ]);
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.1, w: CW, colW: [5.4, 1.6, 4.93], rowH: [0.45, 1.05, 1.05, 1.05, 1.05], margin: [0.1, 0.1, 0.1, 0.08] });
    src(s, "ที่มา: รายงานข้อ 3.1.2 และข้อ 1.2");
  }

  // ================= 6 scope =================
  {
    const s = content("scope", SEC[1]);
    const subs = [
      ["จัดการหลักสูตร", "จัดการหลักสูตร แผนการเรียน และรายวิชา", "ดูโครงสร้างรายวิชาที่ตนเกี่ยวข้อง"],
      ["จัดตารางสอน", "จัดเองหรือจัดอัตโนมัติ เผยแพร่ และพิจารณาคำร้อง", "ดูตารางของตน ยื่นคำร้อง และกรอกเวลาไม่ว่าง"],
      ["เช็คชื่อ", "ดูรายงานการเข้าเรียน", "เช็คชื่อรายคาบ ดูเวลาเรียนและ มส"],
      ["บันทึกคะแนน", "ตรวจ อนุมัติ หรือตีกลับผลการเรียน", "ตั้งองค์ประกอบคะแนน บันทึกหรือนำเข้า แล้วส่งผล"],
      ["ออกรายงาน", "ดูรายงานสรุป ส่งออก Excel หรือ PDF", "ดูผลการเรียนและส่งออกเอกสาร"],
    ];
    const tw = 9.0;
    const roleHead = (r) => head(r.name, { fontSize: SZ.body, color: r.dark, fill: { color: r.tint }, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: r.c, pt: 2 }, { type: "none" }] });
    const hdr = [head("ระบบย่อย", { fontSize: SZ.small }), roleHead(ROLE.acad), roleHead(ROLE.teach)];
    const body = subs.map((r) => [cell(r[0], { bold: true, fontSize: SZ.body }), cell(r[1], { fontSize: SZ.small }), cell(r[2], { fontSize: SZ.small })]);
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.1, w: tw, colW: [2.3, 3.35, 3.35], rowH: [0.45, 0.85, 0.85, 0.85, 0.85, 0.85], margin: [0.06, 0.1, 0.06, 0.08] });
    const rx = M + tw + 0.5, rw = CW - tw - 0.5;
    T(s, [{ text: "อยู่ที่ Service B\nของอีกทีม", options: { bold: true, fontSize: SZ.body, breakLine: true } }, { text: "การยืนยันตัวตน บัญชีผู้ใช้ สิทธิ์การเข้าถึง และข้อมูลหลักของโรงเรียน", options: { fontSize: SZ.small, color: C.body } }], rx, Y0, rw, 1.9);
    rule(s, rx, Y0 + 2.2, rw);
    T(s, [{ text: "ไม่รวมในโครงงาน", options: { bold: true, fontSize: SZ.body, color: C.gray, breakLine: true } }, { text: "ระบบแจ้งลาของนักเรียน งานบุคลากร และการจัดการความประพฤติ", options: { fontSize: SZ.small, color: C.gray } }], rx, Y0 + 2.45, rw, 1.9);
    src(s, "ที่มา: รายงานข้อ 1.3 ขอบเขตของโครงงาน");
  }

  // ================= 7 arch =================
  {
    const s = content("arch", SEC[1]);
    const iw = 8.7, ih = iw * 1421 / 2600, ix = M, iy = Y0 - 0.05;
    img(s, ASSET("architecture"), ix, iy, iw, ih);
    mark(s, ix, iy, iw, ih, [0.458, 0.165, 0.218, 0.18]); // Service A
    mark(s, ix, iy, iw, ih, [0.712, 0.605, 0.255, 0.145]); // Redis + Celery
    const rx = ix + iw + 0.45, rw = CW - iw - 0.45;
    T(s, [{ text: "Service A คือส่วนของโครงงานนี้", options: { bold: true, color: C.accent, fontSize: SZ.body, breakLine: true } }, { text: "พัฒนาด้วย FastAPI ตารางทั้งหมดอยู่ใน schema academic", options: { fontSize: SZ.small, color: C.body } }], rx, iy, rw, 1.6);
    T(s, [{ text: "งานที่ใช้เวลานาน", options: { bold: true, fontSize: SZ.body, breakLine: true } }, { text: "การจัดตารางสอนอัตโนมัติและการคำนวณผลการเรียนเข้าคิวใน Redis แล้วให้ Celery ประมวลผลเบื้องหลัง", options: { fontSize: SZ.small, color: C.body } }], rx, iy + 1.9, rw, 2.0);
    src(s, "ที่มา: รายงานรูปที่ 3.3 เป็นสถาปัตยกรรมเป้าหมาย ส่วนที่พัฒนาแล้วในเทอม 1 คือระบบต้นแบบหน้าจอ");
  }

  // ================= 8 flow =================
  {
    const s = content("flow", SEC[1]);
    const ih = 5.0, iw = ih * 2600 / 1083;
    img(s, ASSET("module-flow"), M + (CW - iw) / 2, 1.6, iw, ih);
    src(s, "ที่มา: รายงานรูปที่ 3.5 เรียงระบบย่อยตามลำดับการใช้งานในหนึ่งภาคเรียน");
  }

  // ================= 9 approve =================
  {
    const s = content("approve", SEC[1]);
    const ih = 4.85, iw = ih * 2000 / 1834;
    img(s, ASSET("act-grade-submit"), M, Y0, iw, ih);
    // Tint the two role swimlane headers in the diagram with their role color.
    const lane = (x0, r) => s.addShape(pres.ShapeType.rect, { x: M + x0 * iw, y: Y0 + 0.004 * ih, w: 0.333 * iw, h: 0.052 * ih, fill: { color: r.c, transparency: 72 }, line: { type: "none" } });
    lane(0.002, ROLE.teach); lane(0.665, ROLE.acad);
    const rx = M + iw + 0.6, rw = CW - iw - 0.6;
    const steps = [
      ["ครูผู้สอนกดส่งผลการเรียน", "ระบบตรวจก่อนว่าคะแนนครบ", ROLE.teach],
      ["ระบบล็อกข้อมูล", "เปลี่ยนสถานะเป็น “รอตรวจ”", null],
      ["ครูฝ่ายวิชาการตรวจ แล้วอนุมัติหรือตีกลับ", "การตีกลับต้องระบุเหตุผลเสมอ", ROLE.acad],
      ["ถ้าตีกลับ ระบบปลดล็อก", "แสดงเหตุผลและหมุดข้อสังเกตให้ครูแก้", null],
    ];
    steps.forEach((st, i) => {
      const y = Y0 + i * 1.08, col = st[2] ? st[2].c : C.ink;
      T(s, String(i + 1), rx, y, 0.4, 0.45, { fontSize: SZ.lead, bold: true, color: st[2] ? st[2].c : C.gray });
      T(s, [{ text: st[0], options: { bold: true, fontSize: SZ.body, color: col, breakLine: true } }, { text: st[1], options: { fontSize: SZ.small, color: C.body } }], rx + 0.5, y, rw - 0.5, 0.95);
    });
    T(s, "แผนภาพนี้คือเฟส 4 ของระบบบันทึกคะแนน ในเล่มมี Activity Diagram รายเฟสทั้งหมด 23 รูป", rx, Y0 + 4.35, rw, 0.5, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานข้อ 3.3.3 Activity Diagram ระบบบันทึกคะแนน เฟส 4 (รูปที่ 3.8 ถึง 3.30)");
  }

  // ================= 10 data =================
  {
    const s = content("data", SEC[1]);
    const ih = 4.85, iw = ih * 1800 / 1772;
    img(s, ASSET("state-grading"), M, Y0, iw, ih);
    mark(s, M, Y0, iw, ih, [0.28, 0.565, 0.44, 0.42]); // locked states
    const rx = M + iw + 0.6, rw = CW - iw - 0.6;
    T(s, "ผลการเรียนของห้องหนึ่งมี 4 สถานะ", rx, Y0, rw, 0.4, { fontSize: SZ.small, bold: true, color: C.gray });
    const st = [["ยังไม่ตั้งโครงสร้างคะแนน", "ยังบันทึกคะแนนไม่ได้", false], ["กำลังบันทึก", "แก้ไขได้", false], ["รอตรวจ", "ล็อก", true], ["อนุมัติแล้ว", "ล็อก", true]];
    const tb = [[head("สถานะ", { fontSize: SZ.small }), head("แก้ไขข้อมูล", { fontSize: SZ.small })], ...st.map((r) => [cell(r[0], { fontSize: SZ.body }), cell(r[1], { fontSize: SZ.body, bold: r[2], color: r[2] ? C.accent : C.ink })])];
    s.addTable(tb, { x: rx, y: Y0 + 0.45, w: rw, colW: [rw * 0.6, rw * 0.4], rowH: 0.48, margin: [0.04, 0.08, 0.04, 0.04] });
    T(s, "เมื่อครูส่งผล ระบบล็อกคะแนน ข้อมูลการเช็คชื่อ และการปลด มส ของห้องนั้น จนกว่าฝ่ายวิชาการจะตีกลับหรืออนุมัติคำขอปลดล็อก", rx, Y0 + 3.0, rw, 1.0, { fontSize: SZ.small, color: C.body });
    T(s, "ฐานข้อมูลอยู่ใน schema academic ของ PostgreSQL มี 58 ตาราง แบ่ง 5 กลุ่ม ออกแบบตามหลัก 3NF", rx, Y0 + 4.15, rw, 0.7, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานรูปที่ 3.31 และข้อ 3.4.1");
  }

  // ================= 11 autosched =================
  {
    const s = content("autosched", SEC[1]);
    const ih = 4.85, iw = ih * 1600 / 1968;
    img(s, ASSET("algo-auto-schedule"), M, Y0, iw, ih);
    const rx = M + iw + 0.6, rw = CW - iw - 0.6;
    const items = [
      ["จัดจากยากไปง่าย", "คาบคู่ วิชาที่ต้องใช้ห้องเฉพาะทาง และวิชาที่มีความสำคัญสูงถูกจัดก่อน เพราะมีช่องเวลาที่เป็นไปได้น้อยกว่า", true],
      ["เงื่อนไขบังคับ (Hard) 13 ข้อ", "ช่องเวลาต้องผ่านทุกข้อ เช่น ครูคนเดียวกันไม่สอนซ้อนเวลา และวิชาเดียวกันไม่เกิน 2 คาบต่อวัน", false],
      ["เงื่อนไขที่ควรทำตาม (Soft) 4 ข้อ", "ใช้ให้คะแนนช่องเวลา เช่น กระจายวิชาเดียวกันไม่ให้อยู่วันเดียวกันหลายคาบ แล้ววางคาบลงช่องที่ได้คะแนนสูงสุด", false],
    ];
    items.forEach((it, i) => {
      T(s, [{ text: it[0], options: { bold: true, fontSize: SZ.body, color: it[2] ? C.accent : C.ink, breakLine: true } }, { text: it[1], options: { fontSize: SZ.small, color: C.body } }], rx, Y0 + i * 1.32, rw, 1.2);
    });
    T(s, "คาบที่วางไม่ได้ ระบบสรุปเป็นรายการให้ครูฝ่ายวิชาการจัดเอง", rx, Y0 + 4.15, rw, 0.5, { fontSize: SZ.small, color: C.gray });
    src(s, "ที่มา: รายงานข้อ 3.5.1 รูปที่ 3.41 และตารางที่ 3.4");
  }

  // ================= 12 conflict =================
  {
    const s = content("conflict", SEC[1]);
    const lw = 5.6;
    T(s, "Conflict 9 ข้อ", M, Y0 - 0.1, lw, 0.85, { fontSize: 40, bold: true, color: C.accent });
    T(s, "ต้องแก้ให้หมดก่อนเผยแพร่ เช่น ครูคนเดียวกันสอนซ้อนเวลา", M, Y0 + 0.75, lw, 0.75, { fontSize: SZ.body });
    T(s, [{ text: "คำเตือน 4 ข้อ  ", options: { bold: true, color: C.body } }, { text: "เผยแพร่ได้ แต่ระบบแสดงให้เห็น เช่น ครูสอนเกิน 24 คาบต่อสัปดาห์" }], M, Y0 + 1.6, lw, 0.75, { fontSize: SZ.small, color: C.body });
    // Publish-blocked dialog from the prototype (882x340 crop).
    const dw = 4.6, dh = dw * 340 / 882;
    img(s, SHOT("timetable_publish-blocked"), M, Y0 + 2.55, dw, dh);
    T(s, "กดเผยแพร่ตอนที่ยังมี Conflict 4 คาบ", M, Y0 + 2.6 + dh, dw, 0.35, { fontSize: SZ.src, color: C.gray });
    // Conflict report from the prototype (1360x1250 crop).
    const rh = 4.85, rw = rh * 1360 / 1250, rx = W - M - rw;
    img(s, SHOT("timetable_conflict-report"), rx, Y0, rw, rh);
    src(s, "ที่มา: รายงานข้อ 3.5.2 ตารางที่ 3.5 ภาพจากต้นแบบหลังนำเข้าไฟล์ตัวอย่างที่มีแถวเป็น Conflict");
  }

  // ================= 13 grade =================
  {
    const s = content("grade", SEC[1]);
    const ih = 4.85, iw = ih * 1600 / 1784;
    img(s, ASSET("algo-grade-result"), M, Y0, iw, ih);
    const rx = M + iw + 0.6, rw = CW - iw - 0.6, resW = 1.9;
    T(s, "ระบบตรวจตามลำดับ", rx, Y0, rw - resW, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    T(s, "ผล", rx + rw - resW, Y0, resW, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    const steps = [
      ["เวลาเรียนต่ำกว่าร้อยละ 80 และไม่ได้ปลด มส", "มส", true],
      ["มีองค์ประกอบคะแนนที่เป็น ร หรือ ข", "ร", true],
      ["คะแนนยังกรอกไม่ครบ", "ยังไม่ตัดสินผล", true],
      ["ผ่านทั้งสามข้อ: รวมคะแนน ปัดเป็นจำนวนเต็ม แล้วแปลงเป็นระดับผลการเรียน", "8 ระดับ (0–4)", false],
      ["ระดับ 0 สอบซ่อมได้ ถ้าสอบซ่อมผ่าน", "ได้ระดับ 1", false],
    ];
    steps.forEach((st, i) => {
      const y = Y0 + 0.45 + i * 0.78;
      rule(s, rx, y, rw);
      T(s, `${i + 1}.  ${st[0]}`, rx, y + 0.08, rw - resW - 0.2, 0.68, { fontSize: SZ.small, valign: "middle" });
      T(s, st[1], rx + rw - resW, y + 0.08, resW, 0.68, { fontSize: SZ.body, bold: true, color: st[2] ? C.accent : C.ink, valign: "middle" });
    });
    T(s, "ระบบคำนวณใหม่ทุกครั้งที่คะแนน เวลาเรียน หรือผลการสอบซ่อมเปลี่ยน", rx, Y0 + 4.45, rw, 0.4, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานข้อ 3.5.3 รูปที่ 3.42");
  }

  // ================= 14 demo =================
  {
    const s = content("demo", SEC[2]);
    const lw = 4.75;
    T(s, "เส้นทางเดโม 5 นาที", M, Y0 - 0.05, lw, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    const steps = [
      ["หลักสูตร", ROLE.acad, "แผนการเรียนและรายวิชาที่ส่งต่อไปยังตารางสอน", false],
      ["จัดตารางสอน", ROLE.acad, "วางคาบ ระบบแจ้ง Conflict จัดอัตโนมัติ และเผยแพร่", true],
      ["ตารางของฉัน", ROLE.teach, "ดูตารางสอนของตนเองและยื่นคำร้องขอเปลี่ยน", false],
      ["เช็คชื่อ", ROLE.teach, "เช็คชื่อรายคาบ สรุปเวลาเรียนและ มส", false],
      ["บันทึกคะแนน", ROLE.teach, "นำเข้าคะแนน คำนวณผลการเรียน และส่งผล", true],
      ["ผลการเรียนและรายงาน", ROLE.acad, "อนุมัติหรือตีกลับ แล้วออกรายงาน", false],
    ];
    steps.forEach((st, i) => {
      const y = Y0 + 0.4 + i * 0.75;
      T(s, [{ text: `${i + 1}. ${st[0]}`, options: { bold: true, color: st[3] ? C.accent : C.ink } }, { text: `  ${st[1].name}`, options: { bold: true, color: st[1].c, fontSize: SZ.table, breakLine: true } }, { text: st[2], options: { fontSize: 13, color: C.body } }], M, y, lw, 0.72, { fontSize: SZ.body });
    });
    const ix = M + lw + 0.4, iw = W - ix - M, ih = iw * 900 / 1600;
    img(s, SHOT("timetable_timetable@2x"), ix, Y0 - 0.05, iw, ih);
    T(s, "หน้าจัดตารางสอนของครูฝ่ายวิชาการในต้นแบบ", ix, Y0 + ih + 0.05, iw, 0.35, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานบทที่ 4 ต้นแบบพัฒนาด้วย HTML และ JavaScript ใช้ข้อมูลจำลองในเบราว์เซอร์");
  }

  // ================= 15 ai =================
  {
    const s = content("ai", SEC[2]);
    const lw = 8.0;
    T(s, "prompt ที่ใช้แบ่งเป็น 3 ส่วน", M, Y0 - 0.05, lw, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    const parts = [
      ["เป้าหมาย", "สิ่งที่ต้องการให้ AI ทำ และผลลัพธ์ที่ต้องได้", "ตรวจการจัดหน้าของเล่มหลังเพิ่มบทที่ 5"],
      ["เนื้อหา", "ข้อมูลและไฟล์ที่ AI ต้องใช้ประกอบ", "ไฟล์เล่มรายงาน และแผนงานในไฟล์ Markdown"],
      ["ข้อจำกัด", "กฎที่ AI ต้องทำตาม และสิ่งที่ห้ามทำ", "จุดที่แก้ต้องเป็นตัวอักษรสีแดง ห้ามลบ section break และใช้รูปแบบตามคู่มือของคณะ"],
    ];
    const tb = [[head("ส่วน", { fontSize: SZ.table }), head("ใส่อะไร", { fontSize: SZ.table }), head("ตัวอย่างจากงานจริง", { fontSize: SZ.table })],
      ...parts.map((p) => [cell(p[0], { bold: true, fontSize: SZ.body, valign: "top" }), cell(p[1], { fontSize: SZ.table, color: C.body, valign: "top" }), cell(p[2], { fontSize: SZ.small, valign: "top" })])];
    s.addTable(tb, { x: M, y: Y0 + 0.35, w: lw, colW: [1.5, 2.7, 3.8], rowH: [0.42, 1.15, 1.15, 1.15], margin: [0.1, 0.1, 0.1, 0.06] });
    const rx = M + lw + 0.6, rw = CW - lw - 0.6;
    T(s, [{ text: "ผู้จัดทำ", options: { bold: true, color: C.accent, fontSize: SZ.lead, breakLine: true } }, { text: "ตัดสินใจและตรวจผลงานทุกขั้นตอน", options: { fontSize: SZ.body } }], rx, Y0 + 0.35, rw, 1.2);
    T(s, [{ text: "AI", options: { bold: true, fontSize: SZ.lead, breakLine: true } }, { text: "ร่างเอกสาร ซักถาม และแก้ไขงานตามที่ได้รับมอบหมาย", options: { fontSize: SZ.body } }], rx, Y0 + 1.75, rw, 1.4);
    rule(s, rx, Y0 + 3.35, rw);
    T(s, "เครื่องมือ: Claude Code กับโมเดล Claude Opus, skill สำหรับซักถามทวนแบบ, ไฟล์ Markdown และ memory", rx, Y0 + 3.5, rw, 1.0, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานข้อ 3.6 ตารางที่ 3.6 และ 3.7");
  }

  // ================= 16 progress =================
  {
    const s = content("progress", SEC[3]);
    T(s, "47.5%", M, Y0 - 0.1, 3.6, 1.3, { fontSize: 72, bold: true, color: C.accent, valign: "middle" });
    T(s, "ความคืบหน้ารวม คิดจากน้ำหนักงานคูณความคืบหน้าของแต่ละงาน", M, Y0 + 1.3, 3.3, 1.0, { fontSize: SZ.table, color: C.gray });
    const bx = M + 4.1, lab = 3.4, unit = 0.11;
    const rows = [["วิเคราะห์และออกแบบ", 25, 24.5, "24.5 จาก 25"], ["ออกแบบ UX/UI", 20, 18, "18 จาก 20"], ["พัฒนา Back-end และฐานข้อมูล", 30, 0, "0 จาก 30"], ["ทดสอบและเชื่อมต่อข้อมูล", 15, 0, "0 จาก 15"], ["เล่มรายงานและการนำเสนอ", 10, 5, "5 จาก 10"]];
    rows.forEach((r, i) => {
      const y = Y0 + i * 0.62, dim = r[2] === 0;
      T(s, r[0], bx, y, lab, 0.42, { fontSize: SZ.small, valign: "middle", color: dim ? C.gray : C.ink });
      s.addShape(pres.ShapeType.rect, { x: bx + lab, y: y + 0.05, w: r[1] * unit, h: 0.32, fill: { color: C.bar }, line: { color: C.bar, width: 0 } });
      if (r[2] > 0) s.addShape(pres.ShapeType.rect, { x: bx + lab, y: y + 0.05, w: r[2] * unit, h: 0.32, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
      T(s, r[3], bx + lab + r[1] * unit + 0.15, y, 1.4, 0.42, { fontSize: SZ.table, bold: !dim, valign: "middle", color: dim ? C.gray : C.ink });
    });
    T(s, "ความยาวแท่งคือน้ำหนักของงาน ส่วนสีส้มคือส่วนที่ทำแล้ว Back-end และการทดสอบเป็นงานของเทอม 2 ตามข้อ 1.4", bx, Y0 + 3.15, CW - 4.1, 0.6, { fontSize: SZ.src, color: C.gray });
    rule(s, M, Y0 + 3.95, CW);
    T(s, [{ text: "ส่งมอบแล้วในเทอม 1  ", options: { bold: true } }, { text: "use case 26 รายการ · Activity Diagram รายเฟส 23 รูป · ฐานข้อมูล 58 ตาราง · หน้าจอต้นแบบ 21 ไฟล์" }], M, Y0 + 4.15, CW, 0.5, { fontSize: SZ.small });
    src(s, "ที่มา: รายงานตารางที่ 5.1 และ 5.2 จำนวนไฟล์หน้าจอนับจากโฟลเดอร์ต้นแบบของโครงงาน");
  }

  // ================= 17 plan =================
  {
    const s = content("plan", SEC[3]);
    // Condensed from report table 5.3 (months) with risks from table 5.4 next to the work they affect.
    const rows = [
      ["ล็อกขอบเขต ให้ผู้ใช้ทดลองต้นแบบ และตกลง API กับ Service B", [1], "เทอม 1 ขอบเขตเปลี่ยนบ่อย จึงล็อกหลังเดือนที่ 1", true],
      ["ติดตั้งสภาพแวดล้อม สร้างฐานข้อมูล และพัฒนาระบบหลักสูตร", [1], "", false],
      ["พัฒนาระบบตารางสอน เช็คชื่อ และบันทึกคะแนน", [2], "ถ้าไม่ทัน ทำระบบหลักก่อน แล้วเลื่อนการจัดตารางแบบกำหนดเงื่อนไขและรายงานบางประเภทเป็นงานเสริม", false],
      ["พัฒนาระบบออกรายงาน", [3], "", false],
      ["Unit Test และบูรณาการกับระบบของกลุ่มอื่นทุก 2 สัปดาห์", [1, 2, 3], "ถ้าระบบของกลุ่มอื่นไม่ทัน ใช้ระบบจำลองที่ตอบตามข้อตกลง API", false],
      ["Integration Test", [3], "", false],
      ["System Test และ Load Test", [3, 4], "", false],
      ["User Acceptance Test", [4], "ถ้าหาผู้ใช้จริงไม่ได้ ให้อาจารย์หรือเพื่อนสวมบทครูตาม Persona", false],
    ];
    const hdr = [head("กิจกรรม", { fontSize: SZ.table }), ...[1, 2, 3, 4].map((m) => head("เดือน " + m, { fontSize: SZ.table, align: "center" })), head("ความเสี่ยงและแผนรองรับ", { fontSize: SZ.table })];
    const body = rows.map((r) => [
      cell(r[0], { fontSize: SZ.table, bold: r[3], color: r[3] ? C.accent : C.ink }),
      ...[1, 2, 3, 4].map((m) => cell("", r[1].includes(m) ? { fill: { color: r[3] ? C.accent : "B0B6BF" } } : {})),
      cell(r[2], { fontSize: 12.5, color: C.body }),
    ]);
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.15, w: CW, colW: [4.3, 0.78, 0.78, 0.78, 0.78, 4.51], rowH: 0.5, margin: [0.03, 0.08, 0.03, 0.08] });
    src(s, "ที่มา: รายงานตารางที่ 5.3 (ย่อกิจกรรมที่ต่อเนื่องกันไว้ในแถวเดียว) ข้อ 5.2.2 และตารางที่ 5.4");
  }

  // ================= 18 commit =================
  {
    const s = content("commit", SEC[3]);
    const lw = 4.3;
    T(s, "5 นาที", M, Y0, lw, 1.1, { fontSize: 60, bold: true, color: C.accent, valign: "middle" });
    T(s, "จัดตารางสอนอัตโนมัติ 40 ห้องเรียน", M, Y0 + 1.1, lw, 0.4, { fontSize: SZ.body });
    T(s, "1 นาที", M, Y0 + 2.0, lw, 1.1, { fontSize: 60, bold: true, color: C.accent, valign: "middle" });
    T(s, "คำนวณผลการเรียนทั้งระดับชั้น", M, Y0 + 3.1, lw, 0.4, { fontSize: SZ.body });
    T(s, "สองตัวเลขนี้คือเกณฑ์ผ่านของ Load Test", M, Y0 + 3.75, lw, 0.4, { fontSize: SZ.table, color: C.gray });
    const rx = M + lw + 0.6, rw = CW - lw - 0.6;
    T(s, "เกณฑ์ผ่านที่จะใช้ทดสอบระบบจริงในเทอม 2", rx, Y0 - 0.05, rw, 0.35, { fontSize: SZ.small, bold: true, color: C.gray });
    const tests = [
      ["Unit Test", "ทุกกรณีทดสอบผ่าน และผลคำนวณตรงกับผลที่คำนวณด้วยมือร้อยละ 100"],
      ["Integration Test", "ข้อมูลที่ซิงก์ตรงกับต้นทาง ผู้ใช้เข้าถึงได้เฉพาะสิทธิ์ตามบทบาท และงานเบื้องหลังแจ้งสถานะได้"],
      ["System Test", "use case ทั้ง 26 รายการทำงานตาม Basic Flow และแสดงข้อความตาม Alternative และ Exception Flow"],
      ["Load Test", "ไม่เกิด Data Conflict จัดตาราง 40 ห้องภายใน 5 นาที และคำนวณผลทั้งระดับชั้นภายใน 1 นาที"],
      ["User Acceptance Test", "ครูผู้สอนและครูฝ่ายวิชาการทำงานตามขั้นตอนได้ครบด้วยตนเอง"],
    ];
    const tb = [[head("การทดสอบ", { fontSize: SZ.table }), head("เกณฑ์ผ่าน", { fontSize: SZ.table })], ...tests.map((t) => [cell(t[0], { bold: true, fontSize: SZ.small }), cell(t[1], { fontSize: SZ.table, color: C.body })])];
    s.addTable(tb, { x: rx, y: Y0 + 0.35, w: rw, colW: [2.3, rw - 2.3], rowH: [0.42, 0.82, 0.82, 0.82, 0.82, 0.82], margin: [0.05, 0.1, 0.05, 0.06] });
    src(s, "ที่มา: รายงานตารางที่ 5.2 แผนการทดสอบ");
  }

  // pptxgenjs writes charset/pitchFamily on every font tag; with IBM Plex Sans Thai Looped this makes
  // PowerPoint space out Latin letters ("S chool B rig ht"). Strip them before saving.
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  for (const name of Object.keys(zip.files).filter((n) => n.endsWith(".xml"))) {
    const xml = await zip.file(name).async("string");
    zip.file(name, xml.replace(/ pitchFamily="\d+" charset="-?\d+"/g, ""));
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
