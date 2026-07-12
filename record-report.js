(() => {
const STORAGE_KEY = "recordReport:lastSearch";

const exportLabels = {
  pdf: "PDF",
  excel: "Excel",
  csv: "CSV"
};

const reportTypeLabels = {
  transcript: "ระเบียนสะสม",
  gpax: "GPAX"
};

const els = {
  academicYear: document.getElementById("recordAcademicYear"),
  grade: document.getElementById("recordGrade"),
  plan: document.getElementById("recordPlan"),
  classroom: document.getElementById("recordClassroom"),
  searchBtn: document.getElementById("recordSearchBtn"),
  resetBtn: document.getElementById("recordResetFiltersBtn"),
  currentAcademicLabel: document.getElementById("recordCurrentAcademicLabel"),
  summaryScope: document.getElementById("recordSummaryScope"),
  typeMeta: document.getElementById("recordTypeMeta"),
  viewMeta: document.getElementById("recordViewMeta"),
  totalRecords: document.getElementById("recordTotalRecords"),
  metricLabelSecondary: document.getElementById("recordMetricLabelSecondary"),
  metricSecondary: document.getElementById("recordMetricSecondary"),
  studentCount: document.getElementById("recordStudentCount"),
  gpaxSummary: document.getElementById("recordGpaxSummary"),
  avgGpax: document.getElementById("recordAvgGpax"),
  normalStatusCount: document.getElementById("recordNormalStatusCount"),
  avgCredits: document.getElementById("recordAvgCredits"),
  toolbarTitle: document.getElementById("recordToolbarTitle"),
  toolbarSubtitle: document.getElementById("recordToolbarSubtitle"),
  resultsTitle: document.getElementById("recordResultsTitle"),
  previewPdfBtn: document.getElementById("recordPreviewPdfBtn"),
  exportBtn: document.getElementById("recordExportBtn"),
  exportDropdown: document.getElementById("recordExportDropdown"),
  exportMenu: document.getElementById("recordExportMenu"),
  printAllBtn: document.getElementById("recordPrintAllBtn"),
  printStudentBtn: document.getElementById("recordPrintStudentBtn"),
  previewPanel: document.getElementById("recordPreviewPanel"),
  previewActionLabel: document.getElementById("recordPreviewActionLabel"),
  previewTypeChip: document.getElementById("recordPreviewTypeChip"),
  template: document.getElementById("recordTemplate"),
  language: document.getElementById("recordLanguage"),
  studentPickerWrap: document.getElementById("recordStudentPickerWrap"),
  studentPicker: document.getElementById("recordStudentPicker"),
  previewSummary: document.getElementById("recordPreviewSummary"),
  generatePreviewBtn: document.getElementById("recordGeneratePreviewBtn"),
  confirmActionBtn: document.getElementById("recordConfirmActionBtn"),
  thead: document.getElementById("recordThead"),
  tbody: document.getElementById("recordTbody"),
  toast: document.getElementById("toast"),
  reportTypeInputs: document.querySelectorAll('input[name="recordReportType"]')
};

if (!els.academicYear || !els.grade || !els.plan || !els.classroom) {
  return;
}

const state = {
  db: null,
  rows: [],
  reportType: "transcript",
  hasSearched: false,
  actionMode: {
    kind: "preview",
    format: "pdf",
    scope: "all"
  }
};

function setToast(message, variant = "info") {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.dataset.variant = variant;
  els.toast.classList.add("show");
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2400);
}

function buildInlineMockDatabase() {
  const academicYears = [
    { id: "ay-2568", name: "2568", isCurrent: false },
    { id: "ay-2569", name: "2569", isCurrent: true }
  ];

  const grades = [
    { id: "grade-m1", name: "ม.1", order: 1 },
    { id: "grade-m2", name: "ม.2", order: 2 },
    { id: "grade-m3", name: "ม.3", order: 3 }
  ];

  const plans = [
    { id: "plan-general", gradeId: "grade-m1", name: "แผนทั่วไป" },
    { id: "plan-stem", gradeId: "grade-m2", name: "แผนวิทย์-คณิต" },
    { id: "plan-language", gradeId: "grade-m2", name: "แผนภาษา" },
    { id: "plan-intensive", gradeId: "grade-m3", name: "แผนเข้มข้นวิชาการ" }
  ];

  const classrooms = [
    { id: "room-m1-1", gradeId: "grade-m1", planId: "plan-general", name: "ม.1/1" },
    { id: "room-m1-2", gradeId: "grade-m1", planId: "plan-general", name: "ม.1/2" },
    { id: "room-m2-1", gradeId: "grade-m2", planId: "plan-stem", name: "ม.2/1" },
    { id: "room-m2-2", gradeId: "grade-m2", planId: "plan-language", name: "ม.2/2" },
    { id: "room-m3-1", gradeId: "grade-m3", planId: "plan-intensive", name: "ม.3/1" }
  ];

  const subjectGroups = [
    { key: "thaiCredits", label: "ภาษาไทย" },
    { key: "mathCredits", label: "คณิตศาสตร์" },
    { key: "scienceCredits", label: "วิทยาศาสตร์" },
    { key: "languageCredits", label: "ภาษาต่างประเทศ" },
    { key: "socialCredits", label: "สังคมศึกษา" }
  ];

  const students = [
    ["66001", "กานต์ธิดา สุขผล", "room-m1-1"],
    ["66002", "ธนกฤต แซ่ตั้ง", "room-m1-1"],
    ["66003", "ปวีณ์นุช อินทรา", "room-m1-1"],
    ["66004", "ภูริณัฐ ขยันดี", "room-m1-1"],
    ["66005", "ศุภวิชญ์ เจริญผล", "room-m1-2"],
    ["66006", "ณิชกานต์ พูลทรัพย์", "room-m1-2"],
    ["66007", "พชรพล สุขใจ", "room-m1-2"],
    ["65001", "กมลชนก พรหมมา", "room-m2-1"],
    ["65002", "พีรพัฒน์ วงศ์ดี", "room-m2-1"],
    ["65003", "สุภชา ศรีงาม", "room-m2-1"],
    ["65004", "นภสร รัตนกุล", "room-m2-2"],
    ["65005", "ชวลิต วัฒนะ", "room-m2-2"],
    ["64001", "ปวริศา ศรีสวัสดิ์", "room-m3-1"],
    ["64002", "ชยพล แสงทอง", "room-m3-1"],
    ["64003", "กรวิกา บุญส่ง", "room-m3-1"]
  ].map(([studentCode, name, classroomId], index) => ({
    id: `student-${studentCode}`,
    studentCode,
    name,
    classroomId,
    order: index + 1
  }));

  const transcriptRows = students.map((student, index) => {
    const term1Gpa = (2.1 + ((index * 17) % 18) / 10).toFixed(2);
    const term2Gpa = (2.2 + ((index * 13) % 17) / 10).toFixed(2);
    const cumulativeGpa = ((Number(term1Gpa) + Number(term2Gpa)) / 2).toFixed(2);
    const earnedCredits = 18 + (index % 5);
    const status = Number(cumulativeGpa) >= 2 ? "ผ่าน" : "ต้องติดตาม";
    return {
      studentId: student.id,
      term1Gpa,
      term2Gpa,
      cumulativeGpa,
      earnedCredits,
      passedSubjects: 8 + (index % 4),
      remark: status === "ผ่าน" ? "ผลการเรียนอยู่ในเกณฑ์ปกติ" : "ควรวางแผนเสริมรายวิชาหลัก",
      status
    };
  });

  const gpaxRows = students.map((student, index) => {
    const gpax = (2.05 + ((index * 9) % 19) / 10).toFixed(2);
    const gpa = (2.15 + ((index * 7) % 16) / 10).toFixed(2);
    const totalCredits = 42 + (index % 6) * 2;
    const pr = 12 + (index * 5) % 88;
    const status = Number(gpax) >= 2.3 ? "ปกติ" : "เฝ้าระวัง";
    return {
      studentId: student.id,
      gpax,
      gpa,
      pr,
      totalCredits,
      thaiCredits: 8 + (index % 2),
      mathCredits: 8 + ((index + 1) % 3),
      scienceCredits: 8 + ((index + 2) % 3),
      languageCredits: 8 + (index % 3),
      socialCredits: 8 + ((index + 1) % 2),
      status
    };
  });

  return {
    academicYears,
    grades,
    plans,
    classrooms,
    students,
    transcriptRows,
    gpaxRows,
    subjectGroups
  };
}

function getSelectedReportType() {
  const active = Array.from(els.reportTypeInputs).find((input) => input.checked);
  return active ? active.value : "transcript";
}

function populateAcademicYears() {
  const options = state.db.academicYears.map((year) => {
    const selected = year.isCurrent ? " selected" : "";
    return `<option value="${year.id}"${selected}>${year.name}</option>`;
  });
  els.academicYear.innerHTML = options.join("");

  const current = state.db.academicYears.find((year) => year.isCurrent) || state.db.academicYears[0];
  els.currentAcademicLabel.textContent = `${current.name} / ${reportTypeLabels[getSelectedReportType()]}`;
}

function populateGrades() {
  els.grade.innerHTML = ['<option value="">เลือกระดับชั้น</option>']
    .concat(state.db.grades.map((grade) => `<option value="${grade.id}">${grade.name}</option>`))
    .join("");
}

function syncPlans() {
  const gradeId = els.grade.value;
  const plans = state.db.plans.filter((plan) => plan.gradeId === gradeId);
  els.plan.disabled = !gradeId;
  els.plan.innerHTML = ['<option value="">เลือกแผนการเรียน</option>']
    .concat(plans.map((plan) => `<option value="${plan.id}">${plan.name}</option>`))
    .join("");
  els.classroom.disabled = true;
  els.classroom.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
}

function syncClassrooms() {
  const planId = els.plan.value;
  const classrooms = state.db.classrooms.filter((room) => room.planId === planId);
  els.classroom.disabled = !planId;
  els.classroom.innerHTML = ['<option value="">เลือกชั้นเรียน</option>']
    .concat(classrooms.map((room) => `<option value="${room.id}">${room.name}</option>`))
    .join("");
}

function syncSearchButton() {
  const requiredReady = Boolean(
    els.academicYear.value &&
    els.grade.value &&
    els.plan.value &&
    els.classroom.value &&
    getSelectedReportType()
  );
  els.searchBtn.disabled = !requiredReady;
}

function saveLastSearch() {
  const payload = {
    academicYear: els.academicYear.value,
    grade: els.grade.value,
    plan: els.plan.value,
    classroom: els.classroom.value,
    reportType: getSelectedReportType()
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function restoreLastSearch() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved.academicYear) {
      els.academicYear.value = saved.academicYear;
    }
    if (saved.grade) {
      els.grade.value = saved.grade;
      syncPlans();
    }
    if (saved.plan) {
      els.plan.value = saved.plan;
      syncClassrooms();
    }
    if (saved.classroom) {
      els.classroom.value = saved.classroom;
    }
    if (saved.reportType) {
      const target = Array.from(els.reportTypeInputs).find((input) => input.value === saved.reportType);
      if (target) {
        target.checked = true;
      }
    }
  } catch (error) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function getContext() {
  const classroom = state.db.classrooms.find((room) => room.id === els.classroom.value);
  const plan = state.db.plans.find((item) => item.id === els.plan.value);
  const grade = state.db.grades.find((item) => item.id === els.grade.value);
  const year = state.db.academicYears.find((item) => item.id === els.academicYear.value);
  return { classroom, plan, grade, year };
}

function buildRows() {
  const { classroom } = getContext();
  const students = state.db.students
    .filter((student) => student.classroomId === classroom.id)
    .sort((a, b) => a.order - b.order);

  if (state.reportType === "transcript") {
    return students.map((student, index) => {
      const transcript = state.db.transcriptRows.find((row) => row.studentId === student.id);
      return { ...student, index: index + 1, ...transcript };
    });
  }

  return students.map((student, index) => {
    const gpax = state.db.gpaxRows.find((row) => row.studentId === student.id);
    return { ...student, index: index + 1, ...gpax };
  });
}

function getStatusChip(status) {
  if (status === "ผ่าน" || status === "ปกติ") {
    return "score-grade-chip score-grade-chip-good";
  }
  return "score-grade-chip score-grade-chip-warn";
}

function renderTranscriptTable() {
  els.thead.innerHTML = `
    <tr>
      <th class="sticky-top sticky-col-score-no">ลำดับ</th>
      <th class="sticky-top sticky-col-score-id">รหัสนักเรียน</th>
      <th class="sticky-top sticky-col-score-name">ชื่อ</th>
      <th class="sticky-top">GPA ภาคเรียน 1</th>
      <th class="sticky-top">GPA ภาคเรียน 2</th>
      <th class="sticky-top">ผลการเรียนสะสม</th>
      <th class="sticky-top">วิชาที่ผ่าน</th>
      <th class="sticky-top">หน่วยกิตที่ได้</th>
      <th class="sticky-top">สถานะ</th>
      <th class="sticky-top">หมายเหตุ</th>
    </tr>
  `;

  if (!state.hasSearched) {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน</div>
        </td>
      </tr>
    `;
    return;
  }

  if (!state.rows.length) {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก</div>
        </td>
      </tr>
    `;
    return;
  }

  els.tbody.innerHTML = state.rows.map((row) => `
    <tr>
      <td class="sticky-col-score-no">${row.index}</td>
      <td class="sticky-col-score-id">${row.studentCode}</td>
      <td class="sticky-col-score-name">${row.name}</td>
      <td>${row.term1Gpa}</td>
      <td>${row.term2Gpa}</td>
      <td><strong>${row.cumulativeGpa}</strong></td>
      <td>${row.passedSubjects} วิชา</td>
      <td>${row.earnedCredits}</td>
      <td><span class="${getStatusChip(row.status)}">${row.status}</span></td>
      <td>${row.remark}</td>
    </tr>
  `).join("");
}

function renderGpaxTable() {
  els.thead.innerHTML = `
    <tr>
      <th class="sticky-top sticky-col-score-no">ลำดับ</th>
      <th class="sticky-top sticky-col-score-id">รหัสนักเรียน</th>
      <th class="sticky-top sticky-col-score-name">ชื่อ</th>
      <th class="sticky-top">GPAX</th>
      <th class="sticky-top">GPA ล่าสุด</th>
      <th class="sticky-top">PR</th>
      <th class="sticky-top">หน่วยกิตรวม</th>
      <th class="sticky-top">ไทย</th>
      <th class="sticky-top">คณิต</th>
      <th class="sticky-top">วิทย์</th>
      <th class="sticky-top">ภาษา</th>
      <th class="sticky-top">สังคม</th>
      <th class="sticky-top">สถานะการศึกษา</th>
    </tr>
  `;

  if (!state.hasSearched) {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="13">
          <div class="empty-state">กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน</div>
        </td>
      </tr>
    `;
    return;
  }

  if (!state.rows.length) {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="13">
          <div class="empty-state">ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก</div>
        </td>
      </tr>
    `;
    return;
  }

  els.tbody.innerHTML = state.rows.map((row) => `
    <tr>
      <td class="sticky-col-score-no">${row.index}</td>
      <td class="sticky-col-score-id">${row.studentCode}</td>
      <td class="sticky-col-score-name">${row.name}</td>
      <td><strong>${row.gpax}</strong></td>
      <td>${row.gpa}</td>
      <td>${row.pr}</td>
      <td>${row.totalCredits}</td>
      <td>${row.thaiCredits}</td>
      <td>${row.mathCredits}</td>
      <td>${row.scienceCredits}</td>
      <td>${row.languageCredits}</td>
      <td>${row.socialCredits}</td>
      <td><span class="${getStatusChip(row.status)}">${row.status}</span></td>
    </tr>
  `).join("");
}

function renderTable() {
  if (state.reportType === "transcript") {
    renderTranscriptTable();
    return;
  }
  renderGpaxTable();
}

function updateSummary() {
  const { classroom, plan, grade, year } = getContext();
  els.summaryScope.textContent = `${reportTypeLabels[state.reportType]} | ${year.name} | ${grade.name} | ${plan.name} | ${classroom.name}`;
  els.typeMeta.textContent = reportTypeLabels[state.reportType];
  els.previewTypeChip.textContent = reportTypeLabels[state.reportType];
  els.resultsTitle.textContent = state.reportType === "transcript" ? "รายงานผลการเรียนระเบียนสะสม" : "รายงาน GPAX";
  els.toolbarTitle.textContent = state.reportType === "transcript"
    ? "ตารางผลการเรียนรายภาคและผลการเรียนสะสม"
    : "ตารางสรุป GPAX และหน่วยกิตสะสม";
  els.toolbarSubtitle.textContent = state.reportType === "transcript"
    ? "ตรึงข้อมูลนักเรียนทางซ้าย และเลื่อนดูรายละเอียดผลการเรียนได้ในตารางเดียว"
    : "แสดงตัวชี้วัด GPAX ที่จำเป็นสำหรับนักเรียนจำนวนมาก พร้อมหน่วยกิตตามกลุ่มสาระ";
  els.viewMeta.textContent = state.reportType === "transcript" ? "ตารางรายภาค" : "ตารางสรุปสะสม";
  els.totalRecords.textContent = String(state.rows.length);
  els.studentCount.textContent = String(state.rows.length);

  if (state.reportType === "transcript") {
    els.metricLabelSecondary.textContent = "ภาคเรียน";
    els.metricSecondary.textContent = "2";
    els.gpaxSummary.classList.add("hidden");
  } else {
    els.metricLabelSecondary.textContent = "กลุ่มสาระ";
    els.metricSecondary.textContent = String(state.db.subjectGroups.length);
    els.gpaxSummary.classList.remove("hidden");

    const avgGpax = state.rows.length
      ? (state.rows.reduce((sum, row) => sum + Number(row.gpax), 0) / state.rows.length).toFixed(2)
      : "0.00";
    const normalCount = state.rows.filter((row) => row.status === "ปกติ").length;
    const avgCredits = state.rows.length
      ? Math.round(state.rows.reduce((sum, row) => sum + Number(row.totalCredits), 0) / state.rows.length)
      : 0;

    els.avgGpax.textContent = avgGpax;
    els.normalStatusCount.textContent = String(normalCount);
    els.avgCredits.textContent = String(avgCredits);
  }
}

function populateStudentPicker() {
  els.studentPicker.innerHTML = state.rows
    .map((row) => `<option value="${row.studentId}">${row.studentCode} - ${row.name}</option>`)
    .join("");
}

function updatePreviewText() {
  const { classroom, plan, grade, year } = getContext();
  const selectedStudent = state.rows.find((row) => row.studentId === els.studentPicker.value);
  const actionTitle = state.actionMode.kind === "print"
    ? `พิมพ์${state.actionMode.scope === "student" ? "รายบุคคล" : "ทั้งหมด"}`
    : state.actionMode.kind === "export"
      ? `ส่งออก ${exportLabels[state.actionMode.format]}`
      : "ดูตัวอย่าง PDF";
  const languageLabel = {
    th: "ไทย",
    en: "English",
    "th-en": "ไทย / English"
  }[els.language.value] || els.language.value;

  els.previewActionLabel.textContent = actionTitle;
  els.previewSummary.innerHTML = `
    <strong>${actionTitle}</strong><br />
    รายงาน: ${reportTypeLabels[state.reportType]} | ปีการศึกษา ${year.name} | ${grade.name} ${plan.name} ${classroom.name}<br />
    Template: ${els.template.options[els.template.selectedIndex].textContent} | ภาษา: ${languageLabel}
    ${selectedStudent && state.actionMode.scope === "student" ? `<br />นักเรียน: ${selectedStudent.studentCode} - ${selectedStudent.name}` : ""}
  `;
}

function openPreviewPanel(mode) {
  state.actionMode = mode;
  els.studentPickerWrap.classList.toggle("hidden", mode.scope !== "student");
  els.previewPanel.classList.remove("hidden");
  updatePreviewText();
}

function closeMenus() {
  els.exportMenu.classList.add("hidden");
  els.exportBtn.setAttribute("aria-expanded", "false");
}

function runSearch() {
  state.reportType = getSelectedReportType();
  state.rows = buildRows();
  state.hasSearched = true;
  saveLastSearch();
  renderTable();
  updateSummary();
  populateStudentPicker();
  els.exportBtn.disabled = state.rows.length === 0;
  els.previewPdfBtn.disabled = state.rows.length === 0;
  els.printAllBtn.disabled = state.rows.length === 0;
  els.printStudentBtn.disabled = state.rows.length === 0;
  setToast(`โหลดรายงาน${reportTypeLabels[state.reportType]}เรียบร้อย`, "success");
}

function resetFilters() {
  const currentYear = state.db.academicYears.find((year) => year.isCurrent) || state.db.academicYears[0];
  els.academicYear.value = currentYear.id;
  els.grade.value = "";
  els.plan.innerHTML = '<option value="">เลือกแผนการเรียน</option>';
  els.plan.disabled = true;
  els.classroom.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
  els.classroom.disabled = true;
  const transcriptInput = Array.from(els.reportTypeInputs).find((input) => input.value === "transcript");
  if (transcriptInput) {
    transcriptInput.checked = true;
  }
  state.reportType = "transcript";
  state.rows = [];
  state.hasSearched = false;
  els.summaryScope.textContent = "ยังไม่มีผลการค้นหา";
  els.totalRecords.textContent = "0";
  els.metricLabelSecondary.textContent = "ภาคเรียน";
  els.metricSecondary.textContent = "0";
  els.studentCount.textContent = "0";
  els.gpaxSummary.classList.add("hidden");
  els.previewPanel.classList.add("hidden");
  els.exportBtn.disabled = true;
  els.previewPdfBtn.disabled = true;
  els.printAllBtn.disabled = true;
  els.printStudentBtn.disabled = true;
  renderTable();
  syncSearchButton();
  window.localStorage.removeItem(STORAGE_KEY);
  setToast("ล้างเงื่อนไขเรียบร้อย", "info");
}

function confirmAction() {
  const selectedStudent = state.rows.find((row) => row.studentId === els.studentPicker.value);
  let message = "";
  if (state.actionMode.kind === "print") {
    message = state.actionMode.scope === "student"
      ? `กำลังพิมพ์รายบุคคล: ${selectedStudent ? selectedStudent.name : "-"}`
      : `กำลังพิมพ์รายงาน${reportTypeLabels[state.reportType]}ทั้งหมด`;
  } else if (state.actionMode.kind === "export") {
    message = `กำลังส่งออกรายงาน${reportTypeLabels[state.reportType]}เป็น ${exportLabels[state.actionMode.format]}`;
  } else {
    message = `กำลังเปิดตัวอย่าง PDF ของรายงาน${reportTypeLabels[state.reportType]}`;
  }
  window.alert(message);
  setToast(message, "success");
}

function attachEvents() {
  els.grade.addEventListener("change", () => {
    syncPlans();
    syncSearchButton();
  });

  els.plan.addEventListener("change", () => {
    syncClassrooms();
    syncSearchButton();
  });

  els.classroom.addEventListener("change", syncSearchButton);
  els.academicYear.addEventListener("change", () => {
    els.currentAcademicLabel.textContent = `${els.academicYear.options[els.academicYear.selectedIndex].textContent} / ${reportTypeLabels[getSelectedReportType()]}`;
    syncSearchButton();
  });

  els.reportTypeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.reportType = getSelectedReportType();
      els.currentAcademicLabel.textContent = `${els.academicYear.options[els.academicYear.selectedIndex].textContent} / ${reportTypeLabels[state.reportType]}`;
      syncSearchButton();
      if (state.rows.length) {
        runSearch();
      }
    });
  });

  els.searchBtn.addEventListener("click", runSearch);
  els.resetBtn.addEventListener("click", resetFilters);

  els.previewPdfBtn.addEventListener("click", () => openPreviewPanel({ kind: "preview", format: "pdf", scope: "all" }));
  els.printAllBtn.addEventListener("click", () => openPreviewPanel({ kind: "print", format: "pdf", scope: "all" }));
  els.printStudentBtn.addEventListener("click", () => openPreviewPanel({ kind: "print", format: "pdf", scope: "student" }));
  els.generatePreviewBtn.addEventListener("click", () => {
    updatePreviewText();
    setToast("สร้าง Preview เรียบร้อย", "success");
  });
  els.confirmActionBtn.addEventListener("click", confirmAction);
  els.template.addEventListener("change", updatePreviewText);
  els.language.addEventListener("change", updatePreviewText);
  els.studentPicker.addEventListener("change", updatePreviewText);

  els.exportBtn.addEventListener("click", () => {
    const isHidden = els.exportMenu.classList.contains("hidden");
    closeMenus();
    if (isHidden && !els.exportBtn.disabled) {
      els.exportMenu.classList.remove("hidden");
      els.exportBtn.setAttribute("aria-expanded", "true");
    }
  });

  els.exportMenu.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      closeMenus();
      openPreviewPanel({ kind: "export", format: button.dataset.export, scope: "all" });
    });
  });

  document.addEventListener("click", (event) => {
    if (!els.exportDropdown.contains(event.target)) {
      closeMenus();
    }
  });
}

function init() {
  state.db = buildInlineMockDatabase();
  populateAcademicYears();
  populateGrades();
  restoreLastSearch();
  state.reportType = getSelectedReportType();
  els.currentAcademicLabel.textContent = `${els.academicYear.options[els.academicYear.selectedIndex].textContent} / ${reportTypeLabels[state.reportType]}`;
  syncSearchButton();
  renderTable();
  els.exportBtn.disabled = true;
  els.previewPdfBtn.disabled = true;
  els.printAllBtn.disabled = true;
  els.printStudentBtn.disabled = true;
  if (!els.searchBtn.disabled) {
    runSearch();
  }
}

attachEvents();
init();
})();
