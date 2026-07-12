(() => {
const STORAGE_KEY = "averageScoreYear:lastSearch";

const exportLabels = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF"
};

const statusLabels = {
  active: "กำลังศึกษา",
  watch: "ต้องติดตาม",
  excellent: "ดีเด่น"
};

const scoreToneLabels = {
  excellent: "ดีเด่น",
  active: "ผ่านเกณฑ์",
  watch: "ต้องติดตาม"
};

const els = {
  form: document.getElementById("averageYearFiltersForm"),
  academicYear: document.getElementById("averageYearAcademicYear"),
  semester: document.getElementById("averageYearSemester"),
  grade: document.getElementById("averageYearGrade"),
  classroom: document.getElementById("averageYearClassroom"),
  plan: document.getElementById("averageYearPlan"),
  status: document.getElementById("averageYearStatus"),
  keyword: document.getElementById("averageYearKeyword"),
  searchBtn: document.getElementById("averageYearSearchBtn"),
  resetBtn: document.getElementById("averageYearResetFiltersBtn"),
  exportBtn: document.getElementById("averageYearExportBtn"),
  exportDropdown: document.getElementById("averageYearExportDropdown"),
  exportMenu: document.getElementById("averageYearExportMenu"),
  previewBtn: document.getElementById("averageYearPreviewBtn"),
  printBtn: document.getElementById("averageYearPrintBtn"),
  previewPanel: document.getElementById("averageYearPreviewPanel"),
  template: document.getElementById("averageYearTemplate"),
  language: document.getElementById("averageYearLanguage"),
  exportScope: document.getElementById("averageYearExportScope"),
  previewSummary: document.getElementById("averageYearPreviewSummary"),
  currentAcademicLabel: document.getElementById("averageYearCurrentAcademicLabel"),
  summaryScope: document.getElementById("averageYearSummaryScope"),
  scopeMeta: document.getElementById("averageYearScopeMeta"),
  studentCount: document.getElementById("averageYearStudentCount"),
  averageScore: document.getElementById("averageYearAverageScore"),
  highestScore: document.getElementById("averageYearHighestScore"),
  lowestScore: document.getElementById("averageYearLowestScore"),
  gpaxAverage: document.getElementById("averageYearGpaxAverage"),
  thead: document.getElementById("averageYearThead"),
  tbody: document.getElementById("averageYearTbody"),
  toast: document.getElementById("toast")
};

if (!els.form) return;

const state = {
  db: null,
  maps: null,
  rows: [],
  subjects: []
};

function buildInlineMockDatabase() {
  const academicYears = [
    { id: "ay-2568", name: "2568", isCurrent: true },
    { id: "ay-2567", name: "2567", isCurrent: false }
  ];

  const semesters = [
    { id: "sem-2568-1", academicYearId: "ay-2568", term: 1, name: "ภาคเรียนที่ 1/2568" },
    { id: "sem-2568-2", academicYearId: "ay-2568", term: 2, name: "ภาคเรียนที่ 2/2568" },
    { id: "sem-2567-1", academicYearId: "ay-2567", term: 1, name: "ภาคเรียนที่ 1/2567" },
    { id: "sem-2567-2", academicYearId: "ay-2567", term: 2, name: "ภาคเรียนที่ 2/2567" }
  ];

  const grades = [
    { id: "grade-m1", name: "ม.1", order: 1 },
    { id: "grade-m2", name: "ม.2", order: 2 },
    { id: "grade-m3", name: "ม.3", order: 3 }
  ];

  const plans = [
    { id: "general", name: "แผนทั่วไป" },
    { id: "science", name: "วิทย์-คณิต" },
    { id: "language", name: "ภาษา" }
  ];

  const classrooms = [
    { id: "room-m1-1", gradeId: "grade-m1", name: "ม.1/1", planId: "general" },
    { id: "room-m1-2", gradeId: "grade-m1", name: "ม.1/2", planId: "language" },
    { id: "room-m2-1", gradeId: "grade-m2", name: "ม.2/1", planId: "science" },
    { id: "room-m3-1", gradeId: "grade-m3", name: "ม.3/1", planId: "science" }
  ];

  const students = [
    { id: "student-5104", code: "5104", name: "ณัฐกานต์ ศรีสุข", classroomId: "room-m1-1", status: "active" },
    { id: "student-5334", code: "5334", name: "พิมพ์ชนก วงศ์ดี", classroomId: "room-m1-1", status: "excellent" },
    { id: "student-5342", code: "5342", name: "ภาคิน แสงทอง", classroomId: "room-m1-1", status: "active" },
    { id: "student-5348", code: "5348", name: "มนัสนันท์ ใจมั่น", classroomId: "room-m1-1", status: "watch" },
    { id: "student-5420", code: "5420", name: "ศุภวิชญ์ เจริญผล", classroomId: "room-m1-2", status: "active" },
    { id: "student-5425", code: "5425", name: "อริสรา พูลทรัพย์", classroomId: "room-m1-2", status: "excellent" },
    { id: "student-6501", code: "6501", name: "กมลชนก พรหมมา", classroomId: "room-m2-1", status: "active" },
    { id: "student-6502", code: "6502", name: "พีรพัฒน์ วงศ์ดี", classroomId: "room-m2-1", status: "watch" },
    { id: "student-6401", code: "6401", name: "ปวริศา ศรีสวัสดิ์", classroomId: "room-m3-1", status: "excellent" },
    { id: "student-6402", code: "6402", name: "ชยพล แสงทอง", classroomId: "room-m3-1", status: "active" }
  ];

  const subjectTemplates = [
    ["th", "ภาษาไทย", 1.5],
    ["ma", "คณิตศาสตร์", 1.5],
    ["sc", "วิทยาศาสตร์", 1.5],
    ["en", "ภาษาอังกฤษ", 1.0],
    ["so", "สังคมศึกษา", 0.5],
    ["hi", "ประวัติศาสตร์", 0.5],
    ["he", "สุขศึกษา", 0.5],
    ["ar", "ศิลปะ", 0.5],
    ["co", "คอมพิวเตอร์", 0.5],
    ["ca", "การงานอาชีพ", 0.5],
    ["fo", "ภาษาอังกฤษพื้นฐาน", 1.5],
    ["club", "ชุมนุม 1", 0.5]
  ];

  const subjects = subjectTemplates.map(([id, name, credit], index) => ({
    id: `subject-${id}`,
    code: `${id.toUpperCase()}${21101 + index}`,
    name,
    credit
  }));

  const scoreRecords = [];
  students.forEach((student, studentIndex) => {
    academicYears.forEach((year, yearIndex) => {
      semesters
        .filter((semester) => semester.academicYearId === year.id)
        .forEach((semester) => {
          subjects.forEach((subject, subjectIndex) => {
            const drift = yearIndex === 0 ? 2 : -2;
            const rawScore = 56 + ((studentIndex * 8) + (subjectIndex * 5) + (semester.term * 4) + drift) % 39;
            const statusPenalty = student.status === "watch" ? 7 : 0;
            const score = Math.max(45, Math.min(99, rawScore - statusPenalty));
            scoreRecords.push({
              studentId: student.id,
              academicYearId: year.id,
              semesterId: semester.id,
              subjectId: subject.id,
              score,
              gradePoint: scoreToGradePoint(score)
            });
          });
        });
    });
  });

  return { academicYears, semesters, grades, plans, classrooms, students, subjects, scoreRecords };
}

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function scoreToGradePoint(score) {
  if (score >= 80) return 4;
  if (score >= 75) return 3.5;
  if (score >= 70) return 3;
  if (score >= 65) return 2.5;
  if (score >= 60) return 2;
  if (score >= 55) return 1.5;
  if (score >= 50) return 1;
  return 0;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function setToast(message, variant = "info") {
  els.toast.className = `toast ${variant}`;
  els.toast.innerHTML = `<strong>${variant === "success" ? "สำเร็จ" : "แจ้งเตือน"}</strong><span>${message}</span>`;
  els.toast.classList.add("is-visible");
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2200);
}

function getCurrentAcademicYear() {
  return state.db.academicYears.find((item) => item.isCurrent) || state.db.academicYears[0];
}

function populateAcademicYears() {
  els.academicYear.innerHTML = state.db.academicYears
    .map((year) => `<option value="${year.id}">${year.name}</option>`)
    .join("");
  els.academicYear.value = getCurrentAcademicYear().id;
}

function populateSemesters() {
  const semesters = state.db.semesters.filter((semester) => semester.academicYearId === els.academicYear.value);
  els.semester.innerHTML = `<option value="all">ทุกภาคเรียน</option>${semesters
    .map((semester) => `<option value="${semester.id}">ภาคเรียนที่ ${semester.term}</option>`)
    .join("")}`;
}

function populateGrades() {
  els.grade.innerHTML = `<option value="">เลือกระดับชั้น</option>${state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("")}`;
}

function populatePlans() {
  els.plan.innerHTML = `<option value="all">ทุกแผนการเรียน</option>${state.db.plans
    .map((plan) => `<option value="${plan.id}">${plan.name}</option>`)
    .join("")}`;
}

function syncClassrooms() {
  const selectedPlan = els.plan.value;
  const classrooms = state.db.classrooms.filter((classroom) => {
    const matchesGrade = classroom.gradeId === els.grade.value;
    const matchesPlan = selectedPlan === "all" || classroom.planId === selectedPlan;
    return matchesGrade && matchesPlan;
  });
  els.classroom.innerHTML = `<option value="">เลือกชั้นเรียน</option>${classrooms
    .map((classroom) => `<option value="${classroom.id}">${classroom.name}</option>`)
    .join("")}`;
  els.classroom.disabled = !els.grade.value;
}

function syncSearchButton() {
  els.searchBtn.disabled = !(els.academicYear.value && els.grade.value && els.classroom.value);
}

function getFormValues() {
  return {
    academicYearId: els.academicYear.value,
    semesterId: els.semester.value,
    gradeId: els.grade.value,
    classroomId: els.classroom.value,
    planId: els.plan.value,
    status: els.status.value,
    keyword: els.keyword.value.trim()
  };
}

function saveLastSearch() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormValues()));
}

function restoreLastSearch() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved.academicYearId) els.academicYear.value = saved.academicYearId;
    populateSemesters();
    if (saved.semesterId) els.semester.value = saved.semesterId;
    if (saved.planId) els.plan.value = saved.planId;
    if (saved.gradeId) els.grade.value = saved.gradeId;
    syncClassrooms();
    if (saved.classroomId) els.classroom.value = saved.classroomId;
    if (saved.status) els.status.value = saved.status;
    if (saved.keyword) els.keyword.value = saved.keyword;
  } catch (error) {
    console.error(error);
  }
}

function getSubjectAverage(records) {
  if (!records.length) return null;
  return records.reduce((sum, record) => sum + record.score, 0) / records.length;
}

function buildResultRows() {
  const values = getFormValues();
  const keyword = values.keyword.toLowerCase();
  const scoreRecords = state.db.scoreRecords.filter((record) => {
    const matchesYear = record.academicYearId === values.academicYearId;
    const matchesSemester = values.semesterId === "all" || record.semesterId === values.semesterId;
    return matchesYear && matchesSemester;
  });

  const students = state.db.students
    .filter((student) => student.classroomId === values.classroomId)
    .filter((student) => values.status === "all" || student.status === values.status)
    .filter((student) => !keyword || `${student.code} ${student.name}`.toLowerCase().includes(keyword))
    .sort((a, b) => a.code.localeCompare(b.code, "en"));

  state.subjects = [...state.db.subjects];
  state.rows = students.map((student) => {
    const valuesBySubject = Object.fromEntries(state.subjects.map((subject) => {
      const records = scoreRecords.filter((record) => record.studentId === student.id && record.subjectId === subject.id);
      return [subject.id, getSubjectAverage(records)];
    }));
    const subjectScores = Object.values(valuesBySubject).filter((value) => value !== null);
    const average = subjectScores.length
      ? subjectScores.reduce((sum, value) => sum + value, 0) / subjectScores.length
      : 0;
    const gradePointRecords = scoreRecords.filter((record) => record.studentId === student.id);
    const gpax = gradePointRecords.length
      ? gradePointRecords.reduce((sum, record) => sum + record.gradePoint, 0) / gradePointRecords.length
      : 0;
    return {
      student,
      subjectScores: valuesBySubject,
      average,
      gpax,
      rank: 0
    };
  }).sort((a, b) => b.average - a.average);

  state.rows.forEach((row, index) => {
    row.rank = index + 1;
  });
}

function renderSummary() {
  const values = getFormValues();
  const classroom = state.maps.classrooms.get(values.classroomId);
  const grade = state.maps.grades.get(values.gradeId);
  const year = state.maps.academicYears.get(values.academicYearId);
  const semesterLabel = values.semesterId === "all" ? "ทุกภาคเรียน" : state.maps.semesters.get(values.semesterId)?.name || "ทุกภาคเรียน";
  const averages = state.rows.map((row) => row.average);
  const gpaxValues = state.rows.map((row) => row.gpax);
  const average = averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : 0;
  const gpax = gpaxValues.length ? gpaxValues.reduce((sum, value) => sum + value, 0) / gpaxValues.length : 0;

  els.studentCount.textContent = String(state.rows.length);
  els.averageScore.textContent = formatNumber(average);
  els.highestScore.textContent = formatNumber(averages.length ? Math.max(...averages) : 0);
  els.lowestScore.textContent = formatNumber(averages.length ? Math.min(...averages) : 0);
  els.gpaxAverage.textContent = formatNumber(gpax);
  els.summaryScope.textContent = state.rows.length
    ? `${year.name} | ${semesterLabel} | ${grade.name} ${classroom.name} | ${state.rows.length} คน`
    : "ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก";
  els.scopeMeta.textContent = semesterLabel;
}

function getScoreTone(score) {
  if (score >= 80) return "excellent";
  if (score >= 70) return "active";
  return "watch";
}

function renderTable() {
  if (!state.rows.length) {
    els.thead.innerHTML = `
      <tr>
        <th class="sticky-top">ลำดับ</th>
        <th class="sticky-top">รหัสนักเรียน</th>
        <th class="sticky-top">ชื่อ-สกุล</th>
        <th class="sticky-top">คะแนนเฉลี่ย</th>
      </tr>
    `;
    els.tbody.innerHTML = `
      <tr>
        <td colspan="4"><div class="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td>
      </tr>
    `;
    return;
  }

  els.thead.innerHTML = `
    <tr>
      <th class="sticky-col sticky-col-score-no sticky-top">ลำดับ</th>
      <th class="sticky-col sticky-col-score-id sticky-top">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-score-name sticky-top">ชื่อ-สกุล</th>
      <th class="sticky-top">รวมคะแนน</th>
      <th class="sticky-top">คะแนนเฉลี่ย</th>
      <th class="sticky-top">GPAX</th>
      <th class="sticky-top">อันดับ</th>
      <th class="sticky-top">สถานะ</th>
      ${state.subjects.map((subject) => `
        <th class="sticky-top average-year-subject-head" title="${subject.code} - ${subject.name}">
          <div class="score-subject-title">
            <strong>${subject.name}</strong>
            <span>${subject.credit} หน่วยกิต</span>
          </div>
        </th>
      `).join("")}
    </tr>
  `;

  els.tbody.innerHTML = state.rows.map((row, index) => {
    const subjectValues = Object.values(row.subjectScores).filter((value) => value !== null);
    const totalScore = subjectValues.reduce((sum, value) => sum + value, 0);
    const tone = getScoreTone(row.average);
    return `
      <tr>
        <td class="sticky-col sticky-col-score-no">${index + 1}</td>
        <td class="sticky-col sticky-col-score-id">${row.student.code}</td>
        <td class="sticky-col sticky-col-score-name average-year-student-name">${row.student.name}</td>
        <td>${formatNumber(totalScore)}</td>
        <td><strong>${formatNumber(row.average)}</strong></td>
        <td>${formatNumber(row.gpax)}</td>
        <td><span class="average-year-rank-chip">อันดับ ${row.rank}</span></td>
        <td><span class="average-year-status-chip" data-tone="${row.student.status}">${statusLabels[row.student.status]}</span></td>
        ${state.subjects.map((subject) => {
          const score = row.subjectScores[subject.id];
          return `
            <td>
              <div class="average-year-score-cell">
                <span class="average-year-score-main">${score === null ? "-" : formatNumber(score)}</span>
                <span class="average-year-score-sub">${score === null ? "ไม่มีข้อมูล" : scoreToneLabels[getScoreTone(score)]}</span>
              </div>
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");
}

function buildAveragePreviewTable(limitRows = 6, limitSubjects = 4) {
  const subjects = state.subjects.slice(0, limitSubjects);
  return `
    <table class="pdf-preview-table pdf-preview-table-report">
      <thead>
        <tr>
          <th>อันดับ</th>
          <th>รหัส</th>
          <th>ชื่อ-สกุล</th>
          <th>เฉลี่ย</th>
          <th>GPAX</th>
          ${subjects.map((subject) => `<th>${subject.name}<br><span>${subject.credit} นก.</span></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${state.rows.slice(0, limitRows).map((row) => `
          <tr>
            <td>${row.rank}</td>
            <td>${row.student.code}</td>
            <td class="pdf-name-cell">${row.student.name}</td>
            <td>${formatNumber(row.average)}</td>
            <td>${formatNumber(row.gpax)}</td>
            ${subjects.map((subject) => {
              const score = row.subjectScores[subject.id];
              return `<td>${score === null ? "-" : formatNumber(score)}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function updatePreviewSummary() {
  const templateText = els.template.options[els.template.selectedIndex].text;
  const languageText = els.language.options[els.language.selectedIndex].text;
  const scopeText = els.exportScope.options[els.exportScope.selectedIndex].text;
  els.previewSummary.innerHTML = `
    <strong>ตัวอย่างรายงานคะแนนเฉลี่ยรายปี</strong>
    <span>Template: ${templateText} | ภาษา ${languageText} | ${scopeText} | จำนวน ${state.rows.length} คน</span>
    ${buildAveragePreviewTable(6, 4)}
  `;
}

function setActionState(enabled) {
  els.exportBtn.disabled = !enabled;
  els.previewBtn.disabled = !enabled;
  els.printBtn.disabled = !enabled;
}

function runSearch() {
  buildResultRows();
  renderSummary();
  renderTable();
  saveLastSearch();
  setActionState(state.rows.length > 0);
  els.previewPanel.classList.add("hidden");
  setToast("แสดงรายงานคะแนนเฉลี่ยรายปีแล้ว", "success");
}

function resetFilters() {
  populateAcademicYears();
  populateSemesters();
  populateGrades();
  populatePlans();
  els.grade.value = "";
  els.classroom.innerHTML = `<option value="">เลือกชั้นเรียน</option>`;
  els.classroom.disabled = true;
  els.plan.value = "all";
  els.status.value = "active";
  els.keyword.value = "";
  state.rows = [];
  state.subjects = [];
  els.summaryScope.textContent = "ยังไม่มีผลการค้นหา";
  els.scopeMeta.textContent = "ทุกภาคเรียน";
  els.studentCount.textContent = "0";
  els.averageScore.textContent = "0.00";
  els.highestScore.textContent = "0.00";
  els.lowestScore.textContent = "0.00";
  els.gpaxAverage.textContent = "0.00";
  setActionState(false);
  els.previewPanel.classList.add("hidden");
  els.thead.innerHTML = `
    <tr>
      <th class="sticky-top">ลำดับ</th>
      <th class="sticky-top">รหัสนักเรียน</th>
      <th class="sticky-top">ชื่อ-สกุล</th>
      <th class="sticky-top">คะแนนเฉลี่ย</th>
    </tr>
  `;
  els.tbody.innerHTML = `
    <tr>
      <td colspan="4"><div class="empty-state">กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน</div></td>
    </tr>
  `;
  syncSearchButton();
  setToast("รีเซ็ตตัวกรองรายงานคะแนนเฉลี่ยรายปีแล้ว", "info");
}

function attachEvents() {
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });
  els.searchBtn.addEventListener("click", runSearch);
  els.academicYear.addEventListener("change", () => {
    populateSemesters();
    syncSearchButton();
  });
  els.grade.addEventListener("change", () => {
    syncClassrooms();
    syncSearchButton();
  });
  els.plan.addEventListener("change", () => {
    syncClassrooms();
    syncSearchButton();
  });
  els.classroom.addEventListener("change", syncSearchButton);
  els.resetBtn.addEventListener("click", resetFilters);
  els.exportBtn.addEventListener("click", () => {
    els.exportMenu.classList.toggle("hidden");
    els.exportBtn.setAttribute("aria-expanded", String(!els.exportMenu.classList.contains("hidden")));
  });
  els.exportMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export]");
    if (!button) return;
    els.exportMenu.classList.add("hidden");
    els.exportBtn.setAttribute("aria-expanded", "false");
    updatePreviewSummary();
    els.previewPanel.classList.remove("hidden");
    setToast(`เตรียมส่งออกรายงานคะแนนเฉลี่ยรายปีเป็น ${exportLabels[button.dataset.export]}`, "info");
  });
  els.previewBtn.addEventListener("click", () => {
    updatePreviewSummary();
    els.previewPanel.classList.toggle("hidden");
    setToast("สร้าง Preview รายงานคะแนนเฉลี่ยรายปีเรียบร้อย", "info");
  });
  els.printBtn.addEventListener("click", () => {
    updatePreviewSummary();
    els.previewPanel.classList.remove("hidden");
    setToast("เตรียมพิมพ์รายงานคะแนนเฉลี่ยรายปีจากผลลัพธ์ปัจจุบัน", "info");
  });
  [els.template, els.language, els.exportScope].forEach((select) => {
    select.addEventListener("change", updatePreviewSummary);
  });
  document.addEventListener("click", (event) => {
    if (!els.exportDropdown.contains(event.target)) {
      els.exportMenu.classList.add("hidden");
      els.exportBtn.setAttribute("aria-expanded", "false");
    }
  });
}

function init() {
  state.db = buildInlineMockDatabase();
  state.maps = {
    academicYears: buildMap(state.db.academicYears),
    semesters: buildMap(state.db.semesters),
    grades: buildMap(state.db.grades),
    classrooms: buildMap(state.db.classrooms)
  };

  populateAcademicYears();
  populateSemesters();
  populateGrades();
  populatePlans();
  restoreLastSearch();
  syncClassrooms();
  syncSearchButton();
  attachEvents();

  const currentYear = getCurrentAcademicYear();
  els.currentAcademicLabel.textContent = `${currentYear.name} / ทุกภาคเรียน`;
}

init();
})();
