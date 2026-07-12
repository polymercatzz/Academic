(() => {
const STORAGE_KEY = "scorePerSubject:lastSearch";

const exportLabels = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF"
};

const els = {
  academicYear: document.getElementById("scoreAcademicYear"),
  semester: document.getElementById("scoreSemester"),
  grade: document.getElementById("scoreGrade"),
  classroom: document.getElementById("scoreClassroom"),
  searchBtn: document.getElementById("scoreSearchBtn"),
  resetBtn: document.getElementById("scoreResetFiltersBtn"),
  currentAcademicLabel: document.getElementById("scoreCurrentAcademicLabel"),
  summaryScope: document.getElementById("scoreSummaryScope"),
  totalRecords: document.getElementById("scoreTotalRecords"),
  subjectCount: document.getElementById("scoreSubjectCount"),
  studentCount: document.getElementById("scoreStudentCount"),
  columnToggleBtn: document.getElementById("scoreColumnToggleBtn"),
  columnChooserPanel: document.getElementById("scoreColumnChooserPanel"),
  showAllSubjectsBtn: document.getElementById("scoreShowAllSubjectsBtn"),
  exportBtn: document.getElementById("scoreExportBtn"),
  exportDropdown: document.getElementById("scoreExportDropdown"),
  exportMenu: document.getElementById("scoreExportMenu"),
  printAllBtn: document.getElementById("scorePrintAllBtn"),
  printStudentBtn: document.getElementById("scorePrintStudentBtn"),
  printPanel: document.getElementById("scorePrintPanel"),
  printTemplate: document.getElementById("scorePrintTemplate"),
  printLanguage: document.getElementById("scorePrintLanguage"),
  previewBtn: document.getElementById("scorePreviewBtn"),
  confirmPrintBtn: document.getElementById("scoreConfirmPrintBtn"),
  printPreview: document.getElementById("scorePrintPreview"),
  studentPickerWrap: document.getElementById("scoreStudentPickerWrap"),
  studentPicker: document.getElementById("scoreStudentPicker"),
  tablePlaceholder: document.getElementById("scoreTablePlaceholder"),
  scoreThead: document.getElementById("scoreThead"),
  scoreTbody: document.getElementById("scoreTbody"),
  toast: document.getElementById("toast")
};

const state = {
  db: null,
  maps: null,
  rows: [],
  subjects: [],
  visibleSubjectIds: [],
  subjectKeyword: "",
  printMode: "all"
};

function buildInlineMockDatabase() {
  const academicYears = [
    { id: "ay-2569", name: "2569", isCurrent: true }
  ];

  const semesters = [
    { id: "sem-2569-1", academicYearId: "ay-2569", term: 1, name: "ภาคเรียนที่ 1/2569", isCurrent: true },
    { id: "sem-2569-2", academicYearId: "ay-2569", term: 2, name: "ภาคเรียนที่ 2/2569", isCurrent: false }
  ];

  const grades = [
    { id: "grade-m1", code: "m1", name: "ม.1", order: 1 },
    { id: "grade-m2", code: "m2", name: "ม.2", order: 2 },
    { id: "grade-m3", code: "m3", name: "ม.3", order: 3 }
  ];

  const classrooms = [
    { id: "room-m1-1", gradeId: "grade-m1", name: "ม.1/1" },
    { id: "room-m1-2", gradeId: "grade-m1", name: "ม.1/2" },
    { id: "room-m2-1", gradeId: "grade-m2", name: "ม.2/1" },
    { id: "room-m3-1", gradeId: "grade-m3", name: "ม.3/1" }
  ];

  const students = [
    { id: "student-66001", studentCode: "66001", name: "กานต์ธิดา สุขผล", classroomId: "room-m1-1" },
    { id: "student-66002", studentCode: "66002", name: "ธนกฤต แซ่ตั้ง", classroomId: "room-m1-1" },
    { id: "student-66003", studentCode: "66003", name: "ปวีณ์นุช อินทรา", classroomId: "room-m1-1" },
    { id: "student-66004", studentCode: "66004", name: "ภูริณัฐ ขยันดี", classroomId: "room-m1-1" },
    { id: "student-66005", studentCode: "66005", name: "ศุภวิชญ์ เจริญผล", classroomId: "room-m1-2" },
    { id: "student-66006", studentCode: "66006", name: "ณิชกานต์ พูลทรัพย์", classroomId: "room-m1-2" },
    { id: "student-65001", studentCode: "65001", name: "กมลชนก พรหมมา", classroomId: "room-m2-1" },
    { id: "student-65002", studentCode: "65002", name: "พีรพัฒน์ วงศ์ดี", classroomId: "room-m2-1" },
    { id: "student-64001", studentCode: "64001", name: "ปวริศา ศรีสวัสดิ์", classroomId: "room-m3-1" },
    { id: "student-64002", studentCode: "64002", name: "ชยพล แสงทอง", classroomId: "room-m3-1" }
  ];

  const subjectTemplates = [
    ["th21102", "ภาษาไทย", 100],
    ["ma21101", "คณิตศาสตร์", 100],
    ["en21101", "ภาษาอังกฤษ", 100],
    ["sc21103", "วิทยาศาสตร์", 100],
    ["so21104", "สังคมศึกษา", 100],
    ["he21101", "สุขศึกษา", 100],
    ["ar21101", "ศิลปะ", 100],
    ["pe21101", "พลศึกษา", 100],
    ["co21101", "คอมพิวเตอร์", 100],
    ["ho21101", "การงานอาชีพ", 100],
    ["th21103", "การอ่านวิเคราะห์", 50],
    ["ma21102", "คณิตเพิ่มเติม", 50]
  ];

  const subjects = subjectTemplates.map(([code, name, fullScore], index) => ({
    id: `subject-${index + 1}`,
    code,
    name,
    fullScore
  }));

  const subjectScores = [];
  students.forEach((student, studentIndex) => {
    subjects.forEach((subject, subjectIndex) => {
      const baseScore = 54 + ((studentIndex * 9) + (subjectIndex * 7)) % 42;
      const adjustedScore = subject.fullScore === 50
        ? Math.min(subject.fullScore, Math.max(20, Math.round(baseScore / 2)))
        : baseScore;
      subjectScores.push({
        studentId: student.id,
        subjectId: subject.id,
        score: adjustedScore,
        fullScore: subject.fullScore,
        gradeLabel: getGradeLabel(adjustedScore, subject.fullScore)
      });
    });
  });

  return { academicYears, semesters, grades, classrooms, students, subjects, subjectScores };
}

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
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

function getGradeLabel(score, fullScore) {
  const percent = Math.round((score / fullScore) * 100);
  if (percent >= 80) return "ดีมาก";
  if (percent >= 70) return "ดี";
  if (percent >= 60) return "พอใช้";
  return "ควรเสริม";
}

function getCurrentAcademicYear() {
  return state.db.academicYears.find((item) => item.isCurrent) || state.db.academicYears[0];
}

function getCurrentSemester() {
  return state.db.semesters.find((item) => item.isCurrent) || state.db.semesters[0];
}

function populateAcademicYears() {
  els.academicYear.innerHTML = state.db.academicYears.map((year) => `<option value="${year.id}">${year.name}</option>`).join("");
  els.academicYear.value = getCurrentAcademicYear().id;
}

function populateSemesters() {
  const options = state.db.semesters
    .filter((semester) => semester.academicYearId === els.academicYear.value)
    .map((semester) => `<option value="${semester.id}">เทอม ${semester.term}</option>`)
    .join("");
  els.semester.innerHTML = options;
  els.semester.value = getCurrentSemester().id;
}

function populateGrades() {
  els.grade.innerHTML = `<option value="">เลือกระดับชั้น</option>${state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("")}`;
}

function syncClassrooms() {
  const classrooms = state.db.classrooms
    .filter((classroom) => classroom.gradeId === els.grade.value)
    .map((classroom) => `<option value="${classroom.id}">${classroom.name}</option>`)
    .join("");
  els.classroom.innerHTML = `<option value="">เลือกชั้นเรียน</option>${classrooms}`;
  els.classroom.disabled = !els.grade.value;
}

function syncSearchButton() {
  els.searchBtn.disabled = !(els.academicYear.value && els.semester.value && els.grade.value && els.classroom.value);
}

function getFormValues() {
  return {
    academicYearId: els.academicYear.value,
    semesterId: els.semester.value,
    gradeId: els.grade.value,
    classroomId: els.classroom.value
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
    if (saved.gradeId) els.grade.value = saved.gradeId;
    syncClassrooms();
    if (saved.classroomId) els.classroom.value = saved.classroomId;
  } catch (error) {
    console.error(error);
  }
}

function buildResultRows() {
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const students = state.db.students
    .filter((student) => student.classroomId === classroom.id)
    .sort((a, b) => a.studentCode.localeCompare(b.studentCode, "en"));

  const scoreMap = new Map(state.db.subjectScores.map((item) => [`${item.studentId}|${item.subjectId}`, item]));
  const subjects = [...state.db.subjects];

  state.subjects = subjects;
  state.visibleSubjectIds = subjects.map((subject) => subject.id);
  state.rows = students.map((student, index) => ({
    no: index + 1,
    studentId: student.studentCode,
    studentName: student.name,
    values: Object.fromEntries(subjects.map((subject) => [subject.id, scoreMap.get(`${student.id}|${subject.id}`) || null]))
  }));

  els.totalRecords.textContent = String(students.length);
  els.subjectCount.textContent = String(subjects.length);
  els.studentCount.textContent = String(students.length);
  els.summaryScope.textContent = `${classroom.name} | ${subjects.length} วิชา | ${students.length} คน`;
  els.exportBtn.disabled = students.length === 0;
  populateStudentPicker(students);
}

function populateStudentPicker(students) {
  els.studentPicker.innerHTML = students.map((student) => `<option value="${student.studentCode}">${student.studentCode} - ${student.name}</option>`).join("");
}

function getFilteredSubjects() {
  const keyword = state.subjectKeyword.trim().toLowerCase();
  const visibleSet = new Set(state.visibleSubjectIds);
  return state.subjects.filter((subject) => {
    const matchesVisibility = visibleSet.has(subject.id);
    const matchesKeyword = !keyword || `${subject.code} ${subject.name}`.toLowerCase().includes(keyword);
    return matchesVisibility && matchesKeyword;
  });
}

function renderColumnChooser() {
  const keyword = state.subjectKeyword.trim().toLowerCase();
  const filteredSubjects = state.subjects.filter((subject) => (
    !keyword || `${subject.code} ${subject.name}`.toLowerCase().includes(keyword)
  ));
  els.columnChooserPanel.innerHTML = `
    <div class="score-column-search">
      <label class="score-column-search-label" for="scoreColumnSearchInput">ค้นหาวิชา</label>
      <input id="scoreColumnSearchInput" type="text" value="${state.subjectKeyword}" placeholder="พิมพ์ชื่อหรือรหัสวิชา" />
    </div>
    <div class="score-column-list">
      ${filteredSubjects.map((subject) => `
        <label class="score-column-item">
          <input type="checkbox" value="${subject.id}" ${state.visibleSubjectIds.includes(subject.id) ? "checked" : ""} />
          <span>${subject.code} - ${subject.name}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderTable() {
  const visibleSubjects = getFilteredSubjects();

  if (!state.rows.length) {
    els.scoreThead.innerHTML = `
      <tr>
        <th class="sticky-top">ลำดับ</th>
        <th class="sticky-top">รหัสนักเรียน</th>
        <th class="sticky-top">ชื่อ</th>
      </tr>
    `;
    els.scoreTbody.innerHTML = `
      <tr>
        <td colspan="3"><div class="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td>
      </tr>
    `;
    return;
  }

  els.scoreThead.innerHTML = `
    <tr>
      <th class="sticky-col sticky-col-score-no sticky-top">ลำดับ</th>
      <th class="sticky-col sticky-col-score-id sticky-top">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-score-name sticky-top">ชื่อ</th>
      ${visibleSubjects.map((subject) => `
        <th class="sticky-top score-subject-head" title="${subject.code} - ${subject.name}">
          <div class="score-subject-title">
            <strong>${subject.name}</strong>
            <span>${subject.fullScore} คะแนน</span>
          </div>
        </th>
      `).join("")}
    </tr>
  `;

  els.scoreTbody.innerHTML = state.rows.map((row) => `
    <tr>
      <td class="sticky-col sticky-col-score-no">${row.no}</td>
      <td class="sticky-col sticky-col-score-id">${row.studentId}</td>
      <td class="sticky-col sticky-col-score-name">${row.studentName}</td>
      ${visibleSubjects.map((subject) => {
        const scoreItem = row.values[subject.id];
        if (!scoreItem) {
          return `<td><span class="score-grade-chip">-</span></td>`;
        }
        const scorePercent = Math.round((scoreItem.score / scoreItem.fullScore) * 100);
        const tone = scorePercent >= 80 ? "excellent" : scorePercent >= 70 ? "good" : scorePercent >= 60 ? "fair" : "warn";
        return `
          <td>
            <span class="score-grade-chip score-grade-chip-${tone}" title="${scoreItem.gradeLabel}">
              ${scoreItem.score}/${scoreItem.fullScore}
            </span>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
}

function runSearch() {
  buildResultRows();
  renderColumnChooser();
  renderTable();
  saveLastSearch();
  els.tablePlaceholder.hidden = true;
  setToast("แสดงรายงานผลพัฒนาผู้เรียนรายวิชาแล้ว", "success");
}

function resetFilters() {
  populateAcademicYears();
  populateSemesters();
  populateGrades();
  els.grade.value = "";
  syncClassrooms();
  state.subjectKeyword = "";
  state.rows = [];
  state.subjects = [];
  state.visibleSubjectIds = [];
  els.tablePlaceholder.hidden = false;
  els.exportBtn.disabled = true;
  els.printPanel.classList.add("hidden");
  els.summaryScope.textContent = "ยังไม่มีผลการค้นหา";
  els.totalRecords.textContent = "0";
  els.subjectCount.textContent = "0";
  els.studentCount.textContent = "0";
  els.scoreThead.innerHTML = `
    <tr>
      <th class="sticky-top">ลำดับ</th>
      <th class="sticky-top">รหัสนักเรียน</th>
      <th class="sticky-top">ชื่อ</th>
      <th class="sticky-top">วิชา</th>
    </tr>
  `;
  els.scoreTbody.innerHTML = `
    <tr>
      <td colspan="4"><div class="empty-state">กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน</div></td>
    </tr>
  `;
  syncSearchButton();
}

function toggleColumnPanel(force) {
  const shouldShow = typeof force === "boolean" ? force : els.columnChooserPanel.classList.contains("hidden");
  els.columnChooserPanel.classList.toggle("hidden", !shouldShow);
  els.columnToggleBtn.setAttribute("aria-expanded", String(shouldShow));
}

function updatePrintPreview() {
  const templateText = els.printTemplate.options[els.printTemplate.selectedIndex].text;
  const languageText = els.printLanguage.options[els.printLanguage.selectedIndex].text;
  const studentText = state.printMode === "student" ? els.studentPicker.options[els.studentPicker.selectedIndex]?.text || "-" : "นักเรียนทั้งหมด";
  els.printPreview.textContent = `ตัวอย่างพิมพ์: ${templateText} | ภาษา ${languageText} | ${studentText}`;
}

function openPrintPanel(mode) {
  state.printMode = mode;
  els.studentPickerWrap.classList.toggle("hidden", mode !== "student");
  els.printPanel.classList.remove("hidden");
  updatePrintPreview();
}

function attachEvents() {
  els.academicYear.addEventListener("change", () => {
    populateSemesters();
    syncSearchButton();
  });
  els.semester.addEventListener("change", syncSearchButton);
  els.grade.addEventListener("change", () => {
    syncClassrooms();
    syncSearchButton();
  });
  els.classroom.addEventListener("change", syncSearchButton);
  els.searchBtn.addEventListener("click", runSearch);
  els.resetBtn.addEventListener("click", resetFilters);
  els.columnToggleBtn.addEventListener("click", () => toggleColumnPanel());
  els.showAllSubjectsBtn.addEventListener("click", () => {
    state.visibleSubjectIds = state.subjects.map((subject) => subject.id);
    state.subjectKeyword = "";
    renderColumnChooser();
    renderTable();
  });
  els.columnChooserPanel.addEventListener("input", (event) => {
    if (event.target.id === "scoreColumnSearchInput") {
      state.subjectKeyword = event.target.value;
      renderColumnChooser();
      renderTable();
    }
  });
  els.columnChooserPanel.addEventListener("change", (event) => {
    if (event.target.matches('input[type="checkbox"]')) {
      const checkedIds = [...els.columnChooserPanel.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
      state.visibleSubjectIds = checkedIds;
      renderTable();
    }
  });
  els.exportBtn.addEventListener("click", () => toggleColumnPanel(false) || els.exportMenu.classList.toggle("hidden"));
  els.exportMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export]");
    if (!button) return;
    els.exportMenu.classList.add("hidden");
    setToast(`เตรียมส่งออกรายงาน ${exportLabels[button.dataset.export]} จากตารางรายวิชาปัจจุบัน`, "info");
  });
  els.printAllBtn.addEventListener("click", () => openPrintPanel("all"));
  els.printStudentBtn.addEventListener("click", () => openPrintPanel("student"));
  els.previewBtn.addEventListener("click", () => {
    updatePrintPreview();
    setToast("สร้างตัวอย่างก่อนพิมพ์เรียบร้อย", "info");
  });
  els.confirmPrintBtn.addEventListener("click", () => {
    updatePrintPreview();
    setToast(`เตรียมพิมพ์${state.printMode === "student" ? "รายบุคคล" : "ทั้งหมด"}จาก template ที่เลือก`, "info");
  });
  els.printTemplate.addEventListener("change", updatePrintPreview);
  els.printLanguage.addEventListener("change", updatePrintPreview);
  els.studentPicker.addEventListener("change", updatePrintPreview);
  document.addEventListener("click", (event) => {
    if (!els.exportDropdown.contains(event.target)) {
      els.exportMenu.classList.add("hidden");
    }
    if (!event.target.closest(".score-column-chooser")) {
      toggleColumnPanel(false);
    }
  });
}

function init() {
  if (!els.academicYear) return;
  state.db = buildInlineMockDatabase();
  state.maps = {
    classrooms: buildMap(state.db.classrooms)
  };

  populateAcademicYears();
  populateSemesters();
  populateGrades();
  restoreLastSearch();
  syncClassrooms();
  syncSearchButton();
  attachEvents();

  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / เทอม ${currentSemester.term}`;
}

init();
})();
