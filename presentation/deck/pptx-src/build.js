// Builds the defense deck as .pptx (decorated version: icons, tinted cards, role colors).
// Run: node build.js <out.pptx>   needs: pptxgenjs, sharp, lucide-static
// The plain version without icons/cards is kept in build-plain.js.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const SCRATCH = __dirname;
const DECK = path.join(SCRATCH, "..");
const ASSET = (n) => path.join(DECK, "assets", n + ".png");
const SHOT = (n) => path.join(SCRATCH, "shots", n + ".png");
const OUT = process.argv[2] || path.join(SCRATCH, "deck.pptx");
const LUCIDE = path.join(path.dirname(require.resolve("lucide-static/package.json")), "icons");

const FONT = "IBM Plex Sans Thai Looped";
const C = {
  paper: "FFFFFF", ink: "1F2328", body: "374151", gray: "6B7280", faint: "9CA3AF", rule: "D1D5DB", bar: "E5E7EB",
  tint: "F1F3F5", accent: "C2410C", accentTint: "FDEEE3", navy: "1B365D", navyLite: "BFD0F5", white: "FFFFFF",
};
// Role colors: which user role something belongs to. Orange accent = the key point of a slide.
const ROLE = {
  acad: { c: "2F5D9A", dark: "1F3F6B", tint: "E6EEF8", name: "ครูฝ่ายวิชาการ" },
  teach: { c: "1E7A66", dark: "13564A", tint: "E3F2EE", name: "ครูผู้สอน" },
};
const SZ = { title: 30, lead: 20, body: 18, small: 15, table: 14, src: 12 };
const W = 13.333, M = 0.7, CW = W - 2 * M, Y0 = 1.95;

function fromHtml(id) {
  const h = fs.readFileSync(path.join(DECK, "project", "slides", id + ".html"), "utf8");
  const t = (h.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/) || [])[1] || "";
  const a = (h.match(/<aside>([\s\S]*?)<\/aside>/) || [])[1] || "";
  return { title: t.replace(/<br>/g, "\n"), notes: a.trim() };
}

// Lucide icon -> PNG data URI in the given color.
const iconCache = {};
async function icon(name, color) {
  const key = name + color;
  if (iconCache[key]) return iconCache[key];
  const svg = fs.readFileSync(path.join(LUCIDE, name + ".svg"), "utf8").replace(/currentColor/g, "#" + color);
  const buf = await sharp(Buffer.from(svg), { density: 900 }).resize(256, 256).png().toBuffer();
  return (iconCache[key] = "image/png;base64," + buf.toString("base64"));
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
  pres.defineSlideMaster({ title: "DARK", background: { color: C.navy } });

  // ---------- helpers ----------
  const T = (s, str, x, y, w, h, o = {}) =>
    s.addText(str, Object.assign({ x, y, w, h, fontFace: FONT, fontSize: SZ.body, color: C.ink, margin: 0, valign: "top", align: "left", isTextBox: true, lineSpacingMultiple: 1.12 }, o));
  const src = (s, str) => T(s, str, M, 6.95, CW - 1, 0.3, { fontSize: SZ.src, color: C.gray });
  const card = (s, x, y, w, h, fill) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" } });
  const img = (s, file, x, y, w, h) => {
    s.addImage({ path: file, x, y, w, h });
    s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { type: "none" }, line: { color: C.rule, width: 0.75 } });
  };
  const mark = (s, x, y, w, h, r) =>
    s.addShape(pres.ShapeType.rect, { x: x + r[0] * w, y: y + r[1] * h, w: r[2] * w, h: r[3] * h, fill: { type: "none" }, line: { color: C.accent, width: 2.5 } });
  // Icon inside a filled circle.
  async function ic(s, name, x, y, d, bg, fg) {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
    const p = d * 0.24;
    s.addImage({ data: await icon(name, fg), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  }
  const bare = async (s, name, x, y, d, color) => s.addImage({ data: await icon(name, color), x, y, w: d, h: d });
  const num = (s, n, x, y, d, bg, fg = C.white) => {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
    T(s, String(n), x, y, d, d, { fontSize: Math.round(d * 34), bold: true, color: fg, align: "center", valign: "middle" });
  };
  const bullets = (arr, o = {}) => arr.map((t, i) => ({ text: t, options: Object.assign({ bullet: { indent: 16 }, breakLine: i < arr.length - 1, paraSpaceAfter: 5 }, o) }));
  const cell = (t, o = {}) => ({ text: t, options: Object.assign({ fontFace: FONT, fontSize: SZ.table, color: C.ink, valign: "middle", border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.rule, pt: 0.75 }, { type: "none" }] }, o) });
  const head = (t, o = {}) => cell(t, Object.assign({ bold: true, color: C.gray, fill: { color: C.tint }, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: C.ink, pt: 1 }, { type: "none" }] }, o));
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
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: SEC[0] });
    s.addShape(pres.ShapeType.ellipse, { x: 9.2, y: -1.6, w: 5.6, h: 5.6, fill: { color: "24477A" }, line: { type: "none" } });
    s.addShape(pres.ShapeType.ellipse, { x: 6.4, y: 5.2, w: 3.6, h: 3.6, fill: { color: "214070" }, line: { type: "none" } });
    T(s, "ระบบบริหารจัดการ\nงานวิชาการภายในโรงเรียน", M, 1.2, 6.3, 1.9, { fontSize: 37, bold: true, color: C.white, lineSpacingMultiple: 1.1 });
    T(s, "Development of Academic Management System for Schools", M, 3.25, 6.3, 0.4, { fontSize: 16, color: C.navyLite });
    T(s, "สอบโครงงาน ภาคเรียนที่ 1 ปีการศึกษา 2569", M, 4.5, 6.3, 0.4, { fontSize: 18, bold: true, color: "F6A66B" });
    T(s, "ปณวัฒน์ ธรรมเจริญ 66070113\nอิสรีย์ แม้นถาวรสิริ 66070323", M, 5.0, 6.3, 0.8, { fontSize: 18, color: C.white });
    T(s, "อาจารย์ที่ปรึกษา ดร.ศิรสิทธิ์ โล่ห์ชนะจิต\nคณะเทคโนโลยีสารสนเทศ สจล.", M, 5.9, 6.3, 0.7, { fontSize: SZ.small, color: C.navyLite });
    const iw = 5.3, ih = iw * 900 / 1600, ix = W - M - iw, iy = 2.0;
    card(s, ix - 0.14, iy - 0.14, iw + 0.28, ih + 0.28, C.white);
    s.addImage({ path: SHOT("index@2x"), x: ix, y: iy, w: iw, h: ih });
    T(s, "หน้าภาพรวมงานวิชาการจากระบบต้นแบบ", ix, iy + ih + 0.3, iw, 0.3, { fontSize: SZ.src, color: C.navyLite });
    s.addNotes(d.notes);
  }

  // ================= 2 problem =================
  {
    const s = content("problem", SEC[0]);
    const lw = 5.3;
    card(s, M, Y0, lw, 4.8, C.accentTint);
    T(s, "ผู้จัดตารางต้องดู 4 อย่างพร้อมกัน", M + 0.35, Y0 + 0.3, lw - 0.6, 0.45, { fontSize: SZ.body, bold: true, color: C.accent });
    const conds = [["user", "เวลาว่างของครู"], ["door-open", "ห้องเรียน"], ["users", "ตารางเรียนของนักเรียน"], ["book-open", "จำนวนคาบของแต่ละรายวิชา"]];
    for (let i = 0; i < conds.length; i++) {
      const y = Y0 + 0.95 + i * 0.78;
      await ic(s, conds[i][0], M + 0.35, y, 0.6, C.white, C.accent);
      T(s, conds[i][1], M + 1.15, y, lw - 1.4, 0.6, { fontSize: SZ.body, valign: "middle" });
    }
    T(s, "ระบบเดิมรองรับไม่ดี ฝ่ายวิชาการจึงจัดใน Excel และตรวจเอง", M + 0.35, Y0 + 4.1, lw - 0.6, 0.6, { fontSize: SZ.table, color: "7C2D12" });
    const rx = M + lw + 0.6, rw = CW - lw - 0.6;
    T(s, "ปัญหาอื่นที่พบในระบบเดิม", rx, Y0, rw, 0.4, { fontSize: SZ.small, bold: true, color: C.gray });
    const probs = [
      ["unlink", "ข้อมูลไม่เชื่อมโยงกัน", "รายชื่อนักเรียน คะแนน และตารางสอนเก็บแยกหลายไฟล์ พอรวมกันจึงซ้ำและไม่ตรงกัน"],
      ["hourglass", "การรวมคะแนนล่าช้า", "รวมคะแนนและตัดสินผลยังทำด้วยมือ ช่วงสิ้นภาคเรียนจึงมีงานค้างสะสม"],
      ["file-up", "นำเข้าข้อมูลจากไฟล์ได้ยาก", "ครูต้องกรอกข้อมูลเดิมซ้ำหลายครั้ง"],
    ];
    for (let i = 0; i < probs.length; i++) {
      const y = Y0 + 0.55 + i * 1.42;
      await ic(s, probs[i][0], rx, y, 0.72, ROLE.acad.tint, ROLE.acad.c);
      T(s, [{ text: probs[i][1], options: { bold: true, fontSize: SZ.body, breakLine: true } }, { text: probs[i][2], options: { fontSize: SZ.small, color: C.body } }], rx + 0.95, y - 0.02, rw - 0.95, 1.25);
    }
    src(s, "ที่มา: รายงานบทที่ 1 ข้อ 1.1");
  }

  // ================= 3 persona =================
  {
    const s = content("persona", SEC[0]);
    const aw = 7.3, h = 4.8, T1 = ROLE.teach, A1 = ROLE.acad;
    card(s, M, Y0, aw, h, T1.tint);
    const pw = 2.0, ph = pw * 402 / 370;
    s.addImage({ path: ASSET("photo-somsri"), x: M + 0.3, y: Y0 + 0.3, w: pw, h: ph });
    const ax = M + pw + 0.6, atw = aw - pw - 0.85;
    await bare(s, "graduation-cap", ax, Y0 + 0.32, 0.3, T1.c);
    T(s, T1.name, ax + 0.4, Y0 + 0.3, atw - 0.4, 0.35, { fontSize: SZ.table, bold: true, color: T1.c });
    T(s, "ครูสมศรี ใจดี", ax, Y0 + 0.7, atw, 0.45, { fontSize: 22, bold: true, color: T1.dark });
    T(s, "สอนคณิตศาสตร์ ม.2 ครูประจำชั้น ม.2/1 และกรรมการฝ่ายวิชาการ ใช้ระบบทุกวัน", ax, Y0 + 1.2, atw, 0.75, { fontSize: SZ.table, color: C.body });
    T(s, "“อยากกรอกคะแนนครั้งเดียว\nแล้วส่งผลได้เลย”", ax, Y0 + 1.95, atw, 0.75, { fontSize: SZ.body, bold: true, color: T1.dark });
    T(s, "ปัญหาในระบบเดิม", M + 0.3, Y0 + 2.85, aw - 0.6, 0.35, { fontSize: SZ.table, bold: true, color: T1.c });
    T(s, bullets(["คะแนนเก็บอยู่หลายไฟล์", "ต้องรวมคะแนนและตรวจความถูกต้องเองก่อนส่งผล", "จะดูว่าเช็คชื่อครบหรือยัง ต้องตั้งตัวกรองทุกครั้ง"]), M + 0.3, Y0 + 3.2, aw - 0.6, 1.5, { fontSize: 16 });

    const bx = M + aw + 0.35, bw = CW - aw - 0.35, qw = 1.2, qh = qw * 402 / 370;
    card(s, bx, Y0, bw, h, A1.tint);
    s.addImage({ path: ASSET("photo-sunisa"), x: bx + 0.3, y: Y0 + 0.3, w: qw, h: qh });
    const tx = bx + qw + 0.5, tw = bw - qw - 0.75;
    await bare(s, "user-cog", tx, Y0 + 0.32, 0.28, A1.c);
    T(s, A1.name, tx + 0.36, Y0 + 0.3, tw - 0.36, 0.35, { fontSize: 13, bold: true, color: A1.c });
    T(s, "อ.สุนิสา ปัญญาดี", tx, Y0 + 0.68, tw, 0.4, { fontSize: SZ.body, bold: true, color: A1.dark });
    T(s, "หัวหน้างานวิชาการ ใช้ระบบมากช่วงต้นและปลายภาค", bx + 0.3, Y0 + 1.75, bw - 0.6, 0.7, { fontSize: 13, color: C.body });
    T(s, "“อยากรู้ทันทีว่าห้องไหนยังมีปัญหา”", bx + 0.3, Y0 + 2.25, bw - 0.6, 0.6, { fontSize: 16, bold: true, color: A1.dark });
    T(s, "ปัญหาในระบบเดิม", bx + 0.3, Y0 + 2.85, bw - 0.6, 0.35, { fontSize: SZ.table, bold: true, color: A1.c });
    T(s, bullets(["ไม่รู้ว่าคาบไหนยังไม่เช็คชื่อ", "ไฟล์ส่งออกต้องจัดรูปแบบต่อก่อนส่งผู้บริหาร"]), bx + 0.3, Y0 + 3.2, bw - 0.6, 1.5, { fontSize: SZ.small });
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
    const hdr = ["ความสามารถ", "SchoolBright", "SGS", "aSc TimeTables", "ระบบที่พัฒนา"].map((t, i) => head(t, i === 4 ? { color: C.white, fill: { color: ROLE.acad.c } } : {}));
    const body = rows.map((r, ri) => r.map((t, ci) => {
      const o = {};
      if (t === "ไม่มี" || t === "ไม่พบข้อมูล") o.color = C.faint;
      if (ci === 4) { o.bold = true; o.color = ROLE.acad.c; o.fill = { color: ROLE.acad.tint }; }
      if (hl.includes(ri)) { o.fill = { color: C.accentTint }; if (ci <= 1) { o.color = C.accent; o.bold = true; } }
      return cell(t, o);
    }));
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.1, w: CW, colW: [4.73, 1.8, 1.8, 1.8, 1.8], rowH: 0.37, margin: [0.02, 0.08, 0.02, 0.1] });
    src(s, "ที่มา: รายงานตารางที่ 2.3 “ไม่พบข้อมูล” หมายถึงไม่พบในเอกสารที่ผู้พัฒนาระบบนั้นเผยแพร่");
  }

  // ================= 5 gap =================
  {
    const s = content("gap", SEC[0]);
    const rows = [
      ["การจัดตารางสอน", "SchoolBright ไม่พบการจัดอัตโนมัติและการตรวจการชน ส่วน SGS ไม่มีการจัดตารางสอน", "2", "จัดตารางอัตโนมัติตามเงื่อนไขของครู ห้อง และหลักสูตร และตรวจการชนให้อัตโนมัติ"],
      ["ข้อมูลอยู่หลายระบบ", "aSc TimeTables จัดตารางได้ แต่ไม่มีงานหลักสูตรและคะแนน", "1", "เก็บแผนการเรียน รายวิชา และครูผู้สอนไว้ที่เดียว ให้ตารางสอนและคะแนนดึงไปใช้ต่อ"],
      ["การกำหนดและบันทึกคะแนน", "ไม่พบการกำหนดสัดส่วนคะแนนและการนำเข้าคะแนนจากไฟล์", "4", "กรอกและนำเข้าคะแนนจำนวนมาก มีขั้นตอนส่ง ตรวจ และอนุมัติ"],
      ["การคำนวณผลการเรียน", "SGS ให้ครูสั่งประมวลผลเกรดเอง", "3 4 5", "คำนวณผลอัตโนมัติ สรุปเวลาเรียนและแจ้ง มส และออกรายงานเป็น Excel หรือ PDF"],
    ];
    const lw = 5.4, gap = 0.75, rw = CW - lw - gap, rh = 1.0, rg = 0.13;
    T(s, "สิ่งที่พบในระบบเดิม", M, Y0 - 0.15, lw, 0.35, { fontSize: SZ.table, bold: true, color: C.gray });
    T(s, "วัตถุประสงค์ข้อที่ตอบ", M + lw + gap, Y0 - 0.15, rw, 0.35, { fontSize: SZ.table, bold: true, color: ROLE.acad.c });
    for (let i = 0; i < rows.length; i++) {
      const y = Y0 + 0.25 + i * (rh + rg), r = rows[i];
      card(s, M, y, lw, rh, C.tint);
      T(s, [{ text: r[0], options: { bold: true, fontSize: 16, breakLine: true } }, { text: r[1], options: { fontSize: 13, color: C.body } }], M + 0.25, y + 0.1, lw - 0.45, rh - 0.15);
      await bare(s, "arrow-right", M + lw + 0.18, y + rh / 2 - 0.2, 0.4, ROLE.acad.c);
      const rx = M + lw + gap;
      card(s, rx, y, rw, rh, ROLE.acad.tint);
      const ns = r[2].split(" ");
      ns.forEach((n, k) => num(s, n, rx + 0.2 + k * 0.48, y + rh / 2 - 0.21, 0.42, ROLE.acad.c));
      const tx = rx + 0.32 + ns.length * 0.48;
      T(s, r[3], tx, y, rx + rw - tx - 0.2, rh, { fontSize: SZ.table, valign: "middle" });
    }
    src(s, "ที่มา: รายงานข้อ 3.1.2 และข้อ 1.2 เลขในวงกลมคือเลขข้อของวัตถุประสงค์");
  }

  // ================= 6 scope =================
  {
    const s = content("scope", SEC[1]);
    const subs = [
      ["book-open", "จัดการหลักสูตร", "จัดการหลักสูตร แผนการเรียน และรายวิชา", "ดูโครงสร้างรายวิชาที่ตนเกี่ยวข้อง"],
      ["calendar-days", "จัดตารางสอน", "จัดเองหรือจัดอัตโนมัติ เผยแพร่ และพิจารณาคำร้อง", "ดูตารางของตน ยื่นคำร้อง และกรอกเวลาไม่ว่าง"],
      ["clipboard-check", "เช็คชื่อ", "ดูรายงานการเข้าเรียน", "เช็คชื่อรายคาบ ดูเวลาเรียนและ มส"],
      ["pencil-line", "บันทึกคะแนน", "ตรวจ อนุมัติ หรือตีกลับผลการเรียน", "ตั้งองค์ประกอบคะแนน บันทึกหรือนำเข้า แล้วส่งผล"],
      ["chart-column", "ออกรายงาน", "ดูรายงานสรุป ส่งออก Excel หรือ PDF", "ดูผลการเรียนและส่งออกเอกสาร"],
    ];
    const tw = 9.1, ty = Y0 - 0.1, hh = 0.5, rh = 0.85;
    const roleHead = (r) => head(r.name, { fontSize: 16, color: r.dark, fill: { color: r.tint }, border: [{ type: "none" }, { type: "none" }, { type: "solid", color: r.c, pt: 2 }, { type: "none" }] });
    const hdr = [head(""), head("ระบบย่อย", { fontSize: SZ.table }), roleHead(ROLE.acad), roleHead(ROLE.teach)];
    const body = subs.map((r) => [cell(""), cell(r[1], { bold: true, fontSize: 16 }), cell(r[2], { fontSize: SZ.table }), cell(r[3], { fontSize: SZ.table })]);
    s.addTable([hdr, ...body], { x: M, y: ty, w: tw, colW: [0.75, 1.95, 3.2, 3.2], rowH: [hh, rh, rh, rh, rh, rh], margin: [0.05, 0.1, 0.05, 0.08] });
    for (let i = 0; i < subs.length; i++) await ic(s, subs[i][0], M + 0.1, ty + hh + i * rh + (rh - 0.55) / 2, 0.55, ROLE.acad.c, C.white);
    const rx = M + tw + 0.4, rw = CW - tw - 0.4;
    card(s, rx, Y0, rw, 2.3, C.accentTint);
    await ic(s, "shield-check", rx + 0.22, Y0 + 0.22, 0.55, C.accent, C.white);
    T(s, "อยู่ที่ Service B\nของอีกทีม", rx + 0.9, Y0 + 0.18, rw - 1.05, 0.7, { fontSize: SZ.small, bold: true, color: C.accent });
    T(s, "การยืนยันตัวตน บัญชีผู้ใช้ สิทธิ์การเข้าถึง และข้อมูลหลักของโรงเรียน", rx + 0.22, Y0 + 1.0, rw - 0.4, 1.2, { fontSize: 13 });
    card(s, rx, Y0 + 2.5, rw, 2.3, C.tint);
    await ic(s, "circle-slash", rx + 0.22, Y0 + 2.72, 0.55, "CBD5E1", "475569");
    T(s, "ไม่รวม\nในโครงงาน", rx + 0.9, Y0 + 2.68, rw - 1.05, 0.7, { fontSize: SZ.small, bold: true, color: "475569" });
    T(s, "ระบบแจ้งลาของนักเรียน งานบุคลากร และการจัดการความประพฤติ", rx + 0.22, Y0 + 3.5, rw - 0.4, 1.2, { fontSize: 13, color: "475569" });
    src(s, "ที่มา: รายงานข้อ 1.3 ขอบเขตของโครงงาน");
  }

  // ================= 7 arch =================
  {
    const s = content("arch", SEC[1]);
    const iw = 8.4, ih = iw * 1421 / 2600, ix = M, iy = Y0 - 0.05;
    img(s, ASSET("architecture"), ix, iy, iw, ih);
    mark(s, ix, iy, iw, ih, [0.458, 0.165, 0.218, 0.18]);
    mark(s, ix, iy, iw, ih, [0.712, 0.605, 0.255, 0.145]);
    const rx = ix + iw + 0.4, rw = CW - iw - 0.4;
    card(s, rx, iy, rw, 2.15, C.accentTint);
    await ic(s, "server", rx + 0.22, iy + 0.22, 0.6, C.accent, C.white);
    T(s, "Service A คือส่วนของ\nโครงงานนี้", rx + 1.0, iy + 0.2, rw - 1.15, 0.7, { fontSize: SZ.small, bold: true, color: C.accent });
    T(s, "พัฒนาด้วย FastAPI ตารางทั้งหมดอยู่ใน schema academic", rx + 0.22, iy + 1.05, rw - 0.4, 0.9, { fontSize: SZ.table, color: C.body });
    card(s, rx, iy + 2.35, rw, 2.25, ROLE.acad.tint);
    await ic(s, "list-ordered", rx + 0.22, iy + 2.57, 0.6, ROLE.acad.c, C.white);
    T(s, "งานที่ใช้เวลานาน", rx + 1.0, iy + 2.57, rw - 1.15, 0.6, { fontSize: SZ.small, bold: true, color: ROLE.acad.dark, valign: "middle" });
    T(s, "จัดตารางอัตโนมัติและคำนวณผลเข้าคิวใน Redis แล้วให้ Celery ทำเบื้องหลัง", rx + 0.22, iy + 3.4, rw - 0.4, 1.0, { fontSize: SZ.table, color: C.body });
    src(s, "ที่มา: รายงานรูปที่ 3.3 เป็นสถาปัตยกรรมเป้าหมาย ส่วนที่พัฒนาแล้วในเทอม 1 คือระบบต้นแบบหน้าจอ");
  }

  // ================= 8 flow =================
  {
    const s = content("flow", SEC[1]);
    const subs = [["book-open", "หลักสูตร"], ["calendar-days", "ตารางสอน"], ["clipboard-check", "เช็คชื่อ"], ["pencil-line", "บันทึกคะแนน"], ["chart-column", "รายงาน"]];
    const cw = 2.05, gx = (CW - subs.length * cw) / (subs.length - 1), y = 1.45;
    for (let i = 0; i < subs.length; i++) {
      const x = M + i * (cw + gx);
      card(s, x, y, cw, 0.62, ROLE.acad.tint);
      await ic(s, subs[i][0], x + 0.08, y + 0.07, 0.48, ROLE.acad.c, C.white);
      T(s, subs[i][1], x + 0.64, y, cw - 0.68, 0.62, { fontSize: SZ.small, bold: true, color: ROLE.acad.dark, valign: "middle" });
      if (i < subs.length - 1) await bare(s, "arrow-right", x + cw + gx / 2 - 0.16, y + 0.15, 0.32, ROLE.acad.c);
    }
    const ih = 4.55, iw = ih * 2600 / 1083;
    img(s, ASSET("module-flow"), M + (CW - iw) / 2, 2.25, iw, ih);
    src(s, "ที่มา: รายงานรูปที่ 3.5 เรียงระบบย่อยตามลำดับการใช้งานในหนึ่งภาคเรียน");
  }

  // ================= 9 approve =================
  {
    const s = content("approve", SEC[1]);
    const ih = 4.85, iw = ih * 2000 / 1834;
    img(s, ASSET("act-grade-submit"), M, Y0, iw, ih);
    const lane = (x0, r) => s.addShape(pres.ShapeType.rect, { x: M + x0 * iw, y: Y0 + 0.004 * ih, w: 0.333 * iw, h: 0.052 * ih, fill: { color: r.c, transparency: 72 }, line: { type: "none" } });
    lane(0.002, ROLE.teach); lane(0.665, ROLE.acad);
    const rx = M + iw + 0.55, rw = CW - iw - 0.55;
    const steps = [
      ["send", "ครูผู้สอนกดส่งผลการเรียน", "ระบบตรวจก่อนว่าคะแนนครบ", ROLE.teach],
      ["lock", "ระบบล็อกข้อมูล", "เปลี่ยนสถานะเป็น “รอตรวจ”", null],
      ["circle-check", "ครูฝ่ายวิชาการตรวจ แล้วอนุมัติหรือตีกลับ", "การตีกลับต้องระบุเหตุผลเสมอ", ROLE.acad],
      ["undo-2", "ถ้าตีกลับ ระบบปลดล็อก", "แสดงเหตุผลและหมุดข้อสังเกตให้ครูแก้", null],
    ];
    for (let i = 0; i < steps.length; i++) {
      const y = Y0 + i * 0.92, st = steps[i], r = st[3];
      await ic(s, st[0], rx, y + 0.02, 0.55, r ? r.c : "CBD5E1", r ? C.white : "475569");
      T(s, [{ text: st[1], options: { bold: true, fontSize: 16, color: r ? r.dark : C.ink, breakLine: true } }, { text: st[2], options: { fontSize: SZ.table, color: C.body } }], rx + 0.75, y, rw - 0.75, 0.85);
    }
    card(s, rx, Y0 + 3.75, rw, 1.1, C.tint);
    await ic(s, "workflow", rx + 0.22, Y0 + 3.98, 0.62, ROLE.acad.c, C.white);
    T(s, [{ text: "23 ", options: { bold: true, fontSize: 24, color: ROLE.acad.c } }, { text: "Activity Diagram รายเฟสในเล่ม แผนภาพนี้คือเฟส 4 ของระบบบันทึกคะแนน", options: { fontSize: 13 } }], rx + 1.0, Y0 + 3.75, rw - 1.15, 1.1, { valign: "middle" });
    src(s, "ที่มา: รายงานข้อ 3.3.3 Activity Diagram ระบบบันทึกคะแนน เฟส 4 (รูปที่ 3.8 ถึง 3.30)");
  }

  // ================= 10 data =================
  {
    const s = content("data", SEC[1]);
    const ih = 4.85, iw = ih * 1800 / 1772;
    img(s, ASSET("state-grading"), M, Y0, iw, ih);
    mark(s, M, Y0, iw, ih, [0.28, 0.565, 0.44, 0.42]);
    const rx = M + iw + 0.55, rw = CW - iw - 0.55;
    const st = [["circle-dashed", "ยังไม่ตั้งโครงสร้างคะแนน", "ยังบันทึกคะแนนไม่ได้", C.tint, C.gray], ["pencil-line", "กำลังบันทึก", "แก้ไขได้", ROLE.teach.tint, ROLE.teach.c], ["lock", "รอตรวจ", "ล็อก", C.accentTint, C.accent], ["lock", "อนุมัติแล้ว", "ล็อก", C.accentTint, C.accent]];
    for (let i = 0; i < st.length; i++) {
      const y = Y0 + i * 0.62;
      await ic(s, st[i][0], rx, y, 0.5, st[i][3], st[i][4]);
      T(s, [{ text: st[i][1], options: { bold: true } }, { text: "   " + st[i][2], options: { color: st[i][4], fontSize: SZ.table, bold: st[i][4] === C.accent } }], rx + 0.68, y, rw - 0.68, 0.5, { fontSize: 16, valign: "middle" });
    }
    T(s, "เมื่อครูส่งผล ระบบล็อกคะแนน ข้อมูลการเช็คชื่อ และการปลด มส ของห้องนั้น จนกว่าฝ่ายวิชาการจะตีกลับหรืออนุมัติคำขอปลดล็อก", rx, Y0 + 2.6, rw, 1.0, { fontSize: SZ.small, color: C.body });
    card(s, rx, Y0 + 3.75, rw, 1.1, ROLE.acad.tint);
    await ic(s, "database", rx + 0.22, Y0 + 3.98, 0.62, ROLE.acad.c, C.white);
    T(s, [{ text: "58 ตาราง", options: { bold: true, fontSize: SZ.body, color: ROLE.acad.dark, breakLine: true } }, { text: "schema academic ของ PostgreSQL แบ่ง 5 กลุ่ม ออกแบบตาม 3NF", options: { fontSize: 13 } }], rx + 1.0, Y0 + 3.75, rw - 1.15, 1.1, { valign: "middle" });
    src(s, "ที่มา: รายงานรูปที่ 3.31 และข้อ 3.4.1");
  }

  // ================= 11 autosched =================
  {
    const s = content("autosched", SEC[1]);
    const ih = 4.85, iw = ih * 1600 / 1968;
    img(s, ASSET("algo-auto-schedule"), M, Y0, iw, ih);
    const rx = M + iw + 0.55, rw = CW - iw - 0.55;
    const items = [
      ["arrow-down-wide-narrow", C.accent, C.accentTint, "จัดจากยากไปง่าย", "คาบคู่ วิชาที่ต้องใช้ห้องเฉพาะทาง และวิชาที่มีความสำคัญสูงถูกจัดก่อน เพราะมีช่องเวลาที่เป็นไปได้น้อยกว่า"],
      ["octagon-x", ROLE.acad.c, ROLE.acad.tint, "เงื่อนไขบังคับ (Hard) 13 ข้อ", "ช่องเวลาต้องผ่านทุกข้อ เช่น ครูคนเดียวกันไม่สอนซ้อนเวลา และวิชาเดียวกันไม่เกิน 2 คาบต่อวัน"],
      ["star", ROLE.acad.c, ROLE.acad.tint, "เงื่อนไขที่ควรทำตาม (Soft) 4 ข้อ", "ใช้ให้คะแนนช่องเวลา เช่น กระจายวิชาเดียวกันไม่ให้อยู่วันเดียวกันหลายคาบ แล้ววางลงช่องที่ได้คะแนนสูงสุด"],
    ];
    for (let i = 0; i < items.length; i++) {
      const y = Y0 + i * 1.3, it = items[i];
      await ic(s, it[0], rx, y, 0.62, it[2], it[1]);
      T(s, [{ text: it[3], options: { bold: true, fontSize: 17, color: i === 0 ? C.accent : C.ink, breakLine: true } }, { text: it[4], options: { fontSize: SZ.table, color: C.body } }], rx + 0.82, y - 0.02, rw - 0.82, 1.2);
    }
    card(s, rx, Y0 + 4.05, rw, 0.8, C.tint);
    await bare(s, "info", rx + 0.22, Y0 + 4.29, 0.32, C.gray);
    T(s, "คาบที่วางไม่ได้ ระบบสรุปเป็นรายการให้ครูฝ่ายวิชาการจัดเอง", rx + 0.7, Y0 + 4.05, rw - 0.85, 0.8, { fontSize: SZ.table, color: "475569", valign: "middle" });
    src(s, "ที่มา: รายงานข้อ 3.5.1 รูปที่ 3.41 และตารางที่ 3.4");
  }

  // ================= 12 conflict =================
  {
    const s = content("conflict", SEC[1]);
    const lw = 5.7;
    card(s, M, Y0, lw, 1.45, C.accentTint);
    await ic(s, "octagon-x", M + 0.25, Y0 + 0.25, 0.62, C.accent, C.white);
    T(s, "Conflict 9 ข้อ", M + 1.05, Y0 + 0.15, lw - 1.2, 0.6, { fontSize: 28, bold: true, color: C.accent });
    T(s, "ต้องแก้ให้หมดก่อนเผยแพร่ เช่น ครูคนเดียวกันสอนซ้อนเวลา", M + 1.05, Y0 + 0.75, lw - 1.25, 0.65, { fontSize: SZ.table, color: "7C2D12" });
    card(s, M, Y0 + 1.6, lw, 1.15, C.tint);
    await ic(s, "triangle-alert", M + 0.25, Y0 + 1.8, 0.55, "CBD5E1", "475569");
    T(s, [{ text: "คำเตือน 4 ข้อ", options: { bold: true, fontSize: 17, color: "475569", breakLine: true } }, { text: "เผยแพร่ได้ แต่ระบบแสดงให้เห็น เช่น ครูสอนเกิน 24 คาบต่อสัปดาห์", options: { fontSize: 13, color: "475569" } }], M + 1.05, Y0 + 1.68, lw - 1.25, 1.0);
    const dw = 4.0, dh = dw * 340 / 882;
    img(s, SHOT("timetable_publish-blocked"), M, Y0 + 2.92, dw, dh);
    T(s, "กดเผยแพร่ตอนที่ยังมี Conflict 4 คาบ", M + dw + 0.2, Y0 + 2.92 + dh - 0.6, lw - dw - 0.2, 0.6, { fontSize: SZ.src, color: C.gray, valign: "bottom" });
    const rh = 4.85, rw = rh * 1360 / 1250, rx = W - M - rw;
    img(s, SHOT("timetable_conflict-report"), rx, Y0, rw, rh);
    src(s, "ที่มา: รายงานข้อ 3.5.2 ตารางที่ 3.5 ภาพจากต้นแบบหลังนำเข้าไฟล์ตัวอย่างที่มีแถวเป็น Conflict");
  }

  // ================= 13 grade =================
  {
    const s = content("grade", SEC[1]);
    const ih = 4.85, iw = ih * 1600 / 1784;
    img(s, ASSET("algo-grade-result"), M, Y0, iw, ih);
    const rx = M + iw + 0.55, rw = CW - iw - 0.55, bw = 1.85;
    const steps = [
      ["เวลาเรียนต่ำกว่าร้อยละ 80 และไม่ได้ปลด มส", "มส", true],
      ["มีองค์ประกอบคะแนนที่เป็น ร หรือ ข", "ร", true],
      ["คะแนนยังกรอกไม่ครบ", "ยังไม่ตัดสินผล", true],
      ["ผ่านทั้งสามข้อ: รวมคะแนน ปัดเป็นจำนวนเต็ม แล้วแปลงเป็นระดับผลการเรียน", "8 ระดับ (0–4)", false],
      ["ระดับ 0 สอบซ่อมได้ ถ้าสอบซ่อมผ่าน", "ได้ระดับ 1", false],
    ];
    for (let i = 0; i < steps.length; i++) {
      const y = Y0 + i * 0.8, st = steps[i];
      num(s, i + 1, rx, y + 0.12, 0.46, st[2] ? C.accent : ROLE.acad.c);
      T(s, st[0], rx + 0.62, y, rw - 0.62 - bw - 0.15, 0.7, { fontSize: SZ.table, valign: "middle" });
      card(s, rx + rw - bw, y + 0.1, bw, 0.52, st[2] ? C.accentTint : ROLE.acad.tint);
      T(s, st[1], rx + rw - bw, y + 0.1, bw, 0.52, { fontSize: SZ.small, bold: true, color: st[2] ? C.accent : ROLE.acad.dark, align: "center", valign: "middle" });
    }
    await ic(s, "refresh-cw", rx, Y0 + 4.25, 0.5, C.tint, C.gray);
    T(s, "ระบบคำนวณใหม่ทุกครั้งที่คะแนน เวลาเรียน หรือผลการสอบซ่อมเปลี่ยน", rx + 0.68, Y0 + 4.2, rw - 0.68, 0.6, { fontSize: 13, color: C.gray, valign: "middle" });
    src(s, "ที่มา: รายงานข้อ 3.5.3 รูปที่ 3.42");
  }

  // ================= 14 demo =================
  {
    const s = content("demo", SEC[2]);
    const lw = 5.0;
    const steps = [
      ["book-open", "หลักสูตร", ROLE.acad, "แผนการเรียนและรายวิชาที่ส่งต่อไปยังตารางสอน", false],
      ["calendar-days", "จัดตารางสอน", ROLE.acad, "วางคาบ ระบบแจ้ง Conflict จัดอัตโนมัติ และเผยแพร่", true],
      ["user", "ตารางของฉัน", ROLE.teach, "ดูตารางสอนของตนเองและยื่นคำร้องขอเปลี่ยน", false],
      ["clipboard-check", "เช็คชื่อ", ROLE.teach, "เช็คชื่อรายคาบ สรุปเวลาเรียนและ มส", false],
      ["pencil-line", "บันทึกคะแนน", ROLE.teach, "นำเข้าคะแนน คำนวณผลการเรียน และส่งผล", true],
      ["chart-column", "ผลการเรียนและรายงาน", ROLE.acad, "อนุมัติหรือตีกลับ แล้วออกรายงาน", false],
    ];
    for (let i = 0; i < steps.length; i++) {
      const y = Y0 - 0.05 + i * 0.8, st = steps[i];
      await ic(s, st[0], M, y + 0.04, 0.58, st[4] ? C.accent : st[2].c, C.white);
      T(s, [{ text: `${i + 1}. ${st[1]}`, options: { bold: true, color: st[4] ? C.accent : C.ink } }, { text: `  ${st[2].name}`, options: { bold: true, color: st[2].c, fontSize: 13, breakLine: true } }, { text: st[3], options: { fontSize: 13, color: C.body } }], M + 0.75, y, lw - 0.75, 0.75, { fontSize: 16 });
    }
    const ix = M + lw + 0.35, iw = W - ix - M, ih = iw * 900 / 1600;
    img(s, SHOT("timetable_timetable@2x"), ix, Y0 - 0.05, iw, ih);
    T(s, "หน้าจัดตารางสอนของครูฝ่ายวิชาการในต้นแบบ", ix, Y0 + ih + 0.05, iw, 0.35, { fontSize: SZ.table, color: C.gray });
    src(s, "ที่มา: รายงานบทที่ 4 ต้นแบบพัฒนาด้วย HTML และ JavaScript ใช้ข้อมูลจำลองในเบราว์เซอร์");
  }

  // ================= 15 ai =================
  {
    const s = content("ai", SEC[2]);
    const lw = 7.7;
    T(s, "prompt ที่ใช้แบ่งเป็น 3 ส่วน", M, Y0 - 0.12, lw, 0.35, { fontSize: SZ.table, bold: true, color: C.gray });
    const parts = [
      ["target", "เป้าหมาย", "สิ่งที่ให้ AI ทำ และผลลัพธ์ที่ต้องได้", "ตรวจการจัดหน้าของเล่มหลังเพิ่มบทที่ 5", false],
      ["files", "เนื้อหา", "ข้อมูลและไฟล์ที่ AI ต้องใช้", "ไฟล์เล่มรายงาน และแผนงานในไฟล์ Markdown", false],
      ["shield-alert", "ข้อจำกัด", "กฎที่ต้องทำตาม และสิ่งที่ห้ามทำ", "จุดที่แก้ต้องเป็นตัวอักษรสีแดง ห้ามลบ section break และใช้รูปแบบตามคู่มือของคณะ", true],
    ];
    for (let i = 0; i < parts.length; i++) {
      const y = Y0 + 0.3 + i * 1.5, p = parts[i], h = 1.38;
      card(s, M, y, lw, h, p[4] ? C.accentTint : C.tint);
      await ic(s, p[0], M + 0.22, y + 0.22, 0.6, p[4] ? C.accent : ROLE.acad.c, C.white);
      T(s, [{ text: p[1], options: { bold: true, fontSize: 16, color: p[4] ? C.accent : C.ink, breakLine: true } }, { text: p[2], options: { fontSize: 12, color: "475569" } }], M + 1.0, y + 0.15, 2.3, h - 0.25);
      T(s, [{ text: "ตัวอย่าง  ", options: { color: C.gray, fontSize: 12 } }, { text: p[3] }], M + 3.45, y, lw - 3.65, h, { fontSize: SZ.table, valign: "middle" });
    }
    const rx = M + lw + 0.35, rw = CW - lw - 0.35;
    card(s, rx, Y0 + 0.3, rw, 4.38, ROLE.acad.tint);
    await ic(s, "user-check", rx + 0.25, Y0 + 0.55, 0.62, ROLE.acad.c, C.white);
    T(s, [{ text: "ผู้จัดทำ", options: { bold: true, fontSize: 17, color: ROLE.acad.dark, breakLine: true } }, { text: "ตัดสินใจและตรวจผลงานทุกขั้นตอน", options: { fontSize: SZ.table } }], rx + 1.05, Y0 + 0.5, rw - 1.25, 1.0);
    await ic(s, "bot", rx + 0.25, Y0 + 1.85, 0.62, C.white, ROLE.acad.c);
    T(s, [{ text: "AI", options: { bold: true, fontSize: 17, breakLine: true } }, { text: "ร่างเอกสาร ซักถาม และแก้ไขงานตามที่ได้รับมอบหมาย", options: { fontSize: SZ.table } }], rx + 1.05, Y0 + 1.8, rw - 1.25, 1.2);
    T(s, "เครื่องมือ: Claude Code กับโมเดล Claude Opus, skill สำหรับซักถามทวนแบบ, ไฟล์ Markdown และ memory", rx + 0.25, Y0 + 3.3, rw - 0.45, 1.2, { fontSize: 12, color: "475569" });
    src(s, "ที่มา: รายงานข้อ 3.6 ตารางที่ 3.6 และ 3.7");
  }

  // ================= 16 progress =================
  {
    const s = content("progress", SEC[3]);
    card(s, M, Y0, 3.5, 3.25, C.accentTint);
    T(s, "47.5%", M, Y0 + 0.35, 3.5, 1.3, { fontSize: 60, bold: true, color: C.accent, align: "center", valign: "middle" });
    T(s, "ความคืบหน้ารวม คิดจากน้ำหนักงานคูณความคืบหน้าของแต่ละงาน", M + 0.3, Y0 + 1.85, 2.9, 1.1, { fontSize: 13, color: "7C2D12", align: "center" });
    const bx = M + 4.0, lab = 3.3, unit = 0.11;
    const rows = [["วิเคราะห์และออกแบบ", 25, 24.5, "24.5 จาก 25"], ["ออกแบบ UX/UI", 20, 18, "18 จาก 20"], ["พัฒนา Back-end และฐานข้อมูล", 30, 0, "0 จาก 30"], ["ทดสอบและเชื่อมต่อข้อมูล", 15, 0, "0 จาก 15"], ["เล่มรายงานและการนำเสนอ", 10, 5, "5 จาก 10"]];
    rows.forEach((r, i) => {
      const y = Y0 + 0.05 + i * 0.6, dim = r[2] === 0;
      T(s, r[0], bx, y, lab, 0.42, { fontSize: SZ.small, valign: "middle", color: dim ? C.gray : C.ink });
      s.addShape(pres.ShapeType.roundRect, { x: bx + lab, y: y + 0.05, w: r[1] * unit, h: 0.32, rectRadius: 0.06, fill: { color: C.bar }, line: { type: "none" } });
      if (r[2] > 0) s.addShape(pres.ShapeType.roundRect, { x: bx + lab, y: y + 0.05, w: r[2] * unit, h: 0.32, rectRadius: 0.06, fill: { color: C.accent }, line: { type: "none" } });
      T(s, r[3], bx + lab + r[1] * unit + 0.15, y, 1.4, 0.42, { fontSize: SZ.table, bold: !dim, valign: "middle", color: dim ? C.gray : C.ink });
    });
    T(s, "ความยาวแท่งคือน้ำหนักของงาน ส่วนสีส้มคือส่วนที่ทำแล้ว Back-end และการทดสอบเป็นงานของเทอม 2", bx, Y0 + 3.0, CW - 4.0, 0.4, { fontSize: SZ.src, color: C.gray });
    const done = [["list-checks", "26", "use case"], ["workflow", "23", "Activity Diagram"], ["database", "58", "ตารางฐานข้อมูล"], ["monitor", "21", "ไฟล์หน้าจอต้นแบบ"]];
    const dy = Y0 + 3.6, dw = (CW - 3 * 0.25) / 4;
    for (let i = 0; i < done.length; i++) {
      const x = M + i * (dw + 0.25);
      card(s, x, dy, dw, 1.15, ROLE.acad.tint);
      await ic(s, done[i][0], x + 0.22, dy + 0.27, 0.6, ROLE.acad.c, C.white);
      T(s, [{ text: done[i][1], options: { fontSize: 24, bold: true, color: ROLE.acad.dark, breakLine: true } }, { text: done[i][2], options: { fontSize: 13 } }], x + 1.0, dy, dw - 1.1, 1.15, { valign: "middle" });
    }
    src(s, "ที่มา: รายงานตารางที่ 5.1 และ 5.2 จำนวนไฟล์หน้าจอนับจากโฟลเดอร์ต้นแบบของโครงงาน");
  }

  // ================= 17 plan =================
  {
    const s = content("plan", SEC[3]);
    const DEV = ROLE.acad.c, TEST = ROLE.teach.c;
    const rows = [
      ["ล็อกขอบเขต ให้ผู้ใช้ทดลองต้นแบบ และตกลง API กับ Service B", [1], "เทอม 1 ขอบเขตเปลี่ยนบ่อย จึงล็อกหลังเดือนที่ 1", C.accent],
      ["ติดตั้งสภาพแวดล้อม สร้างฐานข้อมูล และพัฒนาระบบหลักสูตร", [1], "", DEV],
      ["พัฒนาระบบตารางสอน เช็คชื่อ และบันทึกคะแนน", [2], "ถ้าไม่ทัน ทำระบบหลักก่อน แล้วเลื่อนการจัดตารางแบบกำหนดเงื่อนไขและรายงานบางประเภทเป็นงานเสริม", DEV],
      ["พัฒนาระบบออกรายงาน", [3], "", DEV],
      ["Unit Test และบูรณาการกับระบบของกลุ่มอื่นทุก 2 สัปดาห์", [1, 2, 3], "ถ้าระบบของกลุ่มอื่นไม่ทัน ใช้ระบบจำลองที่ตอบตามข้อตกลง API", TEST],
      ["Integration Test", [3], "", TEST],
      ["System Test และ Load Test", [3, 4], "", TEST],
      ["User Acceptance Test", [4], "ถ้าหาผู้ใช้จริงไม่ได้ ให้อาจารย์หรือเพื่อนสวมบทครูตาม Persona", TEST],
    ];
    const hdr = [head("กิจกรรม"), ...[1, 2, 3, 4].map((m) => head("เดือน " + m, { align: "center" })), head("ความเสี่ยงและแผนรองรับ", { color: C.accent })];
    const body = rows.map((r) => [
      cell(r[0], { fontSize: SZ.table, bold: r[3] === C.accent, color: r[3] === C.accent ? C.accent : C.ink }),
      ...[1, 2, 3, 4].map((m) => cell("", r[1].includes(m) ? { fill: { color: r[3] } } : {})),
      cell(r[2], { fontSize: 12.5, color: C.body, fill: r[2] ? { color: "FFF7ED" } : undefined }),
    ]);
    s.addTable([hdr, ...body], { x: M, y: Y0 - 0.2, w: CW, colW: [4.3, 0.78, 0.78, 0.78, 0.78, 4.51], rowH: 0.5, margin: [0.03, 0.08, 0.03, 0.08] });
    const ly = 6.45;
    [[C.accent, "ล็อกขอบเขต"], [DEV, "พัฒนา"], [TEST, "ทดสอบ"]].forEach((l, i) => {
      s.addShape(pres.ShapeType.rect, { x: M + i * 1.7, y: ly + 0.07, w: 0.22, h: 0.16, fill: { color: l[0] }, line: { type: "none" } });
      T(s, l[1], M + i * 1.7 + 0.3, ly, 1.3, 0.3, { fontSize: SZ.src, color: C.gray });
    });
    src(s, "ที่มา: รายงานตารางที่ 5.3 (ย่อกิจกรรมที่ต่อเนื่องกันไว้ในแถวเดียว) ข้อ 5.2.2 และตารางที่ 5.4");
  }

  // ================= 18 commit =================
  {
    const s = content("commit", SEC[3]);
    const lw = 4.3;
    card(s, M, Y0, lw, 2.05, C.accentTint);
    await ic(s, "timer", M + 0.25, Y0 + 0.3, 0.65, C.accent, C.white);
    T(s, "5 นาที", M + 1.1, Y0 + 0.1, lw - 1.2, 1.05, { fontSize: 46, bold: true, color: C.accent, valign: "middle" });
    T(s, "จัดตารางสอนอัตโนมัติ 40 ห้องเรียน", M + 0.3, Y0 + 1.3, lw - 0.5, 0.5, { fontSize: SZ.small, color: "7C2D12" });
    card(s, M, Y0 + 2.25, lw, 2.05, C.accentTint);
    await ic(s, "calculator", M + 0.25, Y0 + 2.55, 0.65, C.accent, C.white);
    T(s, "1 นาที", M + 1.1, Y0 + 2.35, lw - 1.2, 1.05, { fontSize: 46, bold: true, color: C.accent, valign: "middle" });
    T(s, "คำนวณผลการเรียนทั้งระดับชั้น", M + 0.3, Y0 + 3.55, lw - 0.5, 0.5, { fontSize: SZ.small, color: "7C2D12" });
    T(s, "สองตัวเลขนี้คือเกณฑ์ผ่านของ Load Test", M, Y0 + 4.45, lw, 0.4, { fontSize: 13, color: C.gray });
    const rx = M + lw + 0.5, rw = CW - lw - 0.5;
    T(s, "เกณฑ์ผ่านที่จะใช้ทดสอบระบบจริงในเทอม 2", rx, Y0 - 0.1, rw, 0.35, { fontSize: SZ.small, bold: true, color: ROLE.acad.c });
    const tests = [
      ["Unit Test", "ทุกกรณีทดสอบผ่าน และผลคำนวณตรงกับผลที่คำนวณด้วยมือร้อยละ 100"],
      ["Integration Test", "ข้อมูลที่ซิงก์ตรงกับต้นทาง ผู้ใช้เข้าถึงได้เฉพาะสิทธิ์ตามบทบาท และงานเบื้องหลังแจ้งสถานะได้"],
      ["System Test", "use case ทั้ง 26 รายการทำงานตาม Basic Flow และแสดงข้อความตาม Alternative และ Exception Flow"],
      ["Load Test", "ไม่เกิด Data Conflict จัดตาราง 40 ห้องภายใน 5 นาที และคำนวณผลทั้งระดับชั้นภายใน 1 นาที"],
      ["User Acceptance Test", "ครูผู้สอนและครูฝ่ายวิชาการทำงานตามขั้นตอนได้ครบด้วยตนเอง"],
    ];
    const tb = [[head("การทดสอบ", { color: ROLE.acad.dark, fill: { color: ROLE.acad.tint } }), head("เกณฑ์ผ่าน", { color: ROLE.acad.dark, fill: { color: ROLE.acad.tint } })],
      ...tests.map((t) => [cell(t[0], { bold: true, fontSize: SZ.small, color: t[0] === "Load Test" ? C.accent : C.ink }), cell(t[1], { fontSize: SZ.table, color: C.body })])];
    s.addTable(tb, { x: rx, y: Y0 + 0.3, w: rw, colW: [2.3, rw - 2.3], rowH: [0.45, 0.82, 0.82, 0.82, 0.82, 0.82], margin: [0.05, 0.1, 0.05, 0.08] });
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
