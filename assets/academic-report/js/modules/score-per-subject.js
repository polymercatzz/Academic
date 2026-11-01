(() => {
const STORAGE_KEY = "scorePerSubject:lastSearch";
const LOW_SCORE_THRESHOLD = 60;

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
  subject: document.getElementById("scoreSubject"),
  searchBtn: document.getElementById("scoreSearchBtn"),
  resetBtn: document.getElementById("scoreResetFiltersBtn"),
  currentAcademicLabel: document.getElementById("scoreCurrentAcademicLabel"),
  summaryPeriod: document.getElementById("scoreSummaryPeriod"),
  summaryScope: document.getElementById("scoreSummaryScope"),
  matrixMeta: document.getElementById("scoreMatrixMeta"),
  viewMeta: document.getElementById("scoreViewMeta"),
  backOverviewBtn: document.getElementById("scoreBackOverviewBtn"),
  detailSummaryGrid: document.getElementById("scoreDetailSummaryGrid"),
  overviewSummaryGrid: document.getElementById("scoreOverviewSummaryGrid"),
  overviewPanel: document.getElementById("scoreOverviewPanel"),
  overviewTbody: document.getElementById("scoreOverviewTbody"),
  overviewStudentCount: document.getElementById("scoreOverviewStudentCount"),
  overviewRoomCount: document.getElementById("scoreOverviewRoomCount"),
  overviewSubjectCount: document.getElementById("scoreOverviewSubjectCount"),
  overviewFollowUpCount: document.getElementById("scoreOverviewFollowUpCount"),
  overviewMissingCount: document.getElementById("scoreOverviewMissingCount"),
  followUpCount: document.getElementById("scoreFollowUpCount"),
  lowSubjectCount: document.getElementById("scoreLowSubjectCount"),
  completionRate: document.getElementById("scoreCompletionRate"),
  subjectAverageChart: document.getElementById("scoreSubjectAverageChart"),
  followUpTbody: document.getElementById("scoreFollowUpTbody"),
  columnToggleBtn: document.getElementById("scoreColumnToggleBtn"),
  columnChooserPanel: document.getElementById("scoreColumnChooserPanel"),
  showAllSubjectsBtn: document.getElementById("scoreShowAllSubjectsBtn"),
  exportBtn: document.getElementById("scoreExportBtn"),
  exportDropdown: document.getElementById("scoreExportDropdown"),
  exportMenu: document.getElementById("scoreExportMenu"),
  printBtn: document.getElementById("scorePrintBtn"),
  printModal: document.getElementById("scorePrintModal"),
  printCloseBtn: document.getElementById("scorePrintCloseBtn"),
  printMode: document.getElementById("scorePrintMode"),
  printTemplate: document.getElementById("scorePrintTemplate"),
  printLanguage: document.getElementById("scorePrintLanguage"),
  previewBtn: document.getElementById("scorePreviewBtn"),
  confirmPrintBtn: document.getElementById("scoreConfirmPrintBtn"),
  printPreview: document.getElementById("scorePrintPreview"),
  studentPickerWrap: document.getElementById("scoreStudentPickerWrap"),
  studentPicker: document.getElementById("scoreStudentPicker"),
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
  printMode: "all",
  resultMode: "overview",
  overviewRows: [],
  subjectAverages: [],
  followUpRows: []
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
      if ((studentIndex * subjects.length + subjectIndex) % 23 === 0) return;
      const recordedScore = subjectIndex === 3
        ? Math.max(0, adjustedScore - Math.round(subject.fullScore * 0.18))
        : adjustedScore;
      subjectScores.push({
        studentId: student.id,
        subjectId: subject.id,
        score: recordedScore,
        fullScore: subject.fullScore,
        gradeLabel: getGradeLabel(recordedScore, subject.fullScore)
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
  els.grade.innerHTML = `<option value="all">ทุกระดับชั้น</option>${state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("")}`;
  els.grade.value = "all";
}

function populateSubjects() {
  els.subject.innerHTML = `<option value="all">ทุกวิชา</option>${state.db.subjects
    .map((subject) => `<option value="${subject.id}">${subject.code} - ${subject.name}</option>`)
    .join("")}`;
  els.subject.value = "all";
}

function syncClassrooms(preferredValue = "all") {
  const classrooms = state.db.classrooms
    .filter((classroom) => els.grade.value === "all" || classroom.gradeId === els.grade.value)
    .map((classroom) => `<option value="${classroom.id}">${classroom.name}</option>`)
    .join("");
  els.classroom.innerHTML = `<option value="all">ทุกห้องเรียน</option>${classrooms}`;
  els.classroom.value = [...els.classroom.options].some((option) => option.value === preferredValue)
    ? preferredValue
    : "all";
}

function syncSearchButton() {
  els.searchBtn.disabled = !(els.academicYear.value && els.semester.value);
}

function getFormValues() {
  return {
    academicYearId: els.academicYear.value,
    semesterId: els.semester.value,
    gradeId: els.grade.value,
    classroomId: els.classroom.value,
    subjectId: els.subject.value
  };
}

function saveLastSearch() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormValues()));
}

function restoreLastSearch() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    if ([...els.academicYear.options].some((option) => option.value === saved.academicYearId)) {
      els.academicYear.value = saved.academicYearId;
    }
    populateSemesters();
    if ([...els.semester.options].some((option) => option.value === saved.semesterId)) {
      els.semester.value = saved.semesterId;
    }
    els.grade.value = [...els.grade.options].some((option) => option.value === saved.gradeId)
      ? saved.gradeId
      : "all";
    syncClassrooms(saved.classroomId || "all");
    els.subject.value = [...els.subject.options].some((option) => option.value === saved.subjectId)
      ? saved.subjectId
      : "all";
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function getSelectedSubjects() {
  return els.subject.value === "all"
    ? [...state.db.subjects]
    : state.db.subjects.filter((subject) => subject.id === els.subject.value);
}

function getSelectedClassrooms() {
  return state.db.classrooms.filter((classroom) => {
    const matchesGrade = els.grade.value === "all" || classroom.gradeId === els.grade.value;
    const matchesClassroom = els.classroom.value === "all" || classroom.id === els.classroom.value;
    return matchesGrade && matchesClassroom;
  });
}

function updateResultScope() {
  const year = state.maps.academicYears.get(els.academicYear.value);
  const semester = state.maps.semesters.get(els.semester.value);
  const grade = state.maps.grades.get(els.grade.value);
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const subject = state.maps.subjects.get(els.subject.value);
  const gradeText = grade ? grade.name : "ทุกระดับชั้น";
  const classroomText = classroom ? `ห้อง ${classroom.name}` : "ทุกห้องเรียน";
  const subjectText = subject ? subject.name : "ทุกวิชา";

  els.summaryPeriod.textContent = `ปีการศึกษา ${year?.name || "-"} ภาคเรียน ${semester?.term || "-"}`;
  els.summaryScope.textContent = `${gradeText} · ${classroomText} · ${subjectText}`;
}

function setResultMode(mode) {
  state.resultMode = mode;
  const isOverview = mode === "overview";
  els.overviewSummaryGrid.classList.toggle("hidden", !isOverview);
  els.overviewPanel.classList.toggle("hidden", !isOverview);
  els.detailSummaryGrid.classList.toggle("hidden", isOverview);
  els.backOverviewBtn.classList.toggle("hidden", isOverview);
  document.querySelectorAll('[data-page="score-subject"] .score-detail-only')
    .forEach((element) => element.classList.toggle("hidden", isOverview));
  els.viewMeta.textContent = isOverview ? "ภาพรวมรายห้อง" : "ตารางแนวนอน";
}

function buildOverviewRows() {
  const classrooms = getSelectedClassrooms();
  const subjects = getSelectedSubjects();
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const selectedStudents = state.db.students.filter((student) => classrooms.some((room) => room.id === student.classroomId));
  const selectedStudentIds = new Set(selectedStudents.map((student) => student.id));
  const selectedScores = state.db.subjectScores.filter((score) => selectedStudentIds.has(score.studentId) && subjectIds.has(score.subjectId));

  state.subjects = subjects;
  state.rows = [];
  state.visibleSubjectIds = subjects.map((subject) => subject.id);
  state.overviewRows = classrooms.map((classroom) => {
    const students = selectedStudents.filter((student) => student.classroomId === classroom.id);
    const studentIds = new Set(students.map((student) => student.id));
    const scores = selectedScores.filter((score) => studentIds.has(score.studentId));
    const followUpStudentIds = new Set(scores
      .filter((score) => getScorePercent(score) < LOW_SCORE_THRESHOLD)
      .map((score) => score.studentId));
    const expectedCount = students.length * subjects.length;
    return {
      classroomId: classroom.id,
      gradeId: classroom.gradeId,
      gradeName: state.maps.grades.get(classroom.gradeId)?.name || "-",
      classroomName: classroom.name,
      studentCount: students.length,
      followUpCount: followUpStudentIds.size,
      missingCount: Math.max(0, expectedCount - scores.length)
    };
  });

  const allFollowUpStudentIds = new Set(selectedScores
    .filter((score) => getScorePercent(score) < LOW_SCORE_THRESHOLD)
    .map((score) => score.studentId));
  const expectedCount = selectedStudents.length * subjects.length;
  els.overviewStudentCount.textContent = `${selectedStudents.length} คน`;
  els.overviewRoomCount.textContent = `${classrooms.length} ห้อง`;
  els.overviewSubjectCount.textContent = `${subjects.length} วิชา`;
  els.overviewFollowUpCount.textContent = `${allFollowUpStudentIds.size} คน`;
  els.overviewMissingCount.textContent = `${Math.max(0, expectedCount - selectedScores.length)} รายการ`;
  els.matrixMeta.textContent = subjects.length > 8 ? `กำลังแสดง ${subjects.length} รายวิชา` : `${subjects.length} รายวิชา`;
  els.exportBtn.disabled = true;
  els.printBtn.disabled = true;
}

function buildStudentScoreRows() {
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const students = state.db.students
    .filter((student) => student.classroomId === classroom.id)
    .sort((a, b) => a.studentCode.localeCompare(b.studentCode, "en"));
  const subjects = getSelectedSubjects();
  const studentIds = new Set(students.map((student) => student.id));
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const scoreMap = new Map(state.db.subjectScores
    .filter((item) => studentIds.has(item.studentId) && subjectIds.has(item.subjectId))
    .map((item) => [`${item.studentId}|${item.subjectId}`, item]));

  state.subjects = subjects;
  state.visibleSubjectIds = subjects.map((subject) => subject.id);
  state.rows = students.map((student, index) => ({
    no: index + 1,
    sourceStudentId: student.id,
    studentId: student.studentCode,
    studentName: student.name,
    values: Object.fromEntries(subjects.map((subject) => [subject.id, scoreMap.get(`${student.id}|${subject.id}`) || null]))
  }));

  els.matrixMeta.textContent = subjects.length > 8 ? `กำลังแสดง ${subjects.length} รายวิชา` : `${subjects.length} รายวิชา`;
  els.exportBtn.disabled = students.length === 0;
  els.printBtn.disabled = students.length === 0;
  populateStudentPicker(students);
  buildScoreSummary();
}

function getScorePercent(scoreItem) {
  return scoreItem ? (scoreItem.score / scoreItem.fullScore) * 100 : null;
}

function buildScoreSummary() {
  const recordedScores = [];
  let expectedScoreCount = 0;

  state.subjectAverages = state.subjects.map((subject) => {
    const subjectScores = state.rows
      .map((row) => getScorePercent(row.values[subject.id]))
      .filter((score) => score !== null);
    recordedScores.push(...subjectScores);
    expectedScoreCount += state.rows.length;
    const average = subjectScores.length
      ? subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length
      : null;
    return { ...subject, average };
  });

  state.followUpRows = state.rows.map((row) => {
    const lowSubjects = state.subjects.map((subject) => {
      const percent = getScorePercent(row.values[subject.id]);
      return percent !== null && percent < LOW_SCORE_THRESHOLD ? { subject, percent } : null;
    }).filter(Boolean);
    return { ...row, lowSubjects };
  }).filter((row) => row.lowSubjects.length > 0);

  const lowSubjectCount = state.subjectAverages.filter(({ average }) => average !== null && average < LOW_SCORE_THRESHOLD).length;
  const completionRate = expectedScoreCount ? (recordedScores.length / expectedScoreCount) * 100 : 0;

  els.followUpCount.textContent = `${state.followUpRows.length} คน`;
  els.lowSubjectCount.textContent = `${lowSubjectCount} วิชา`;
  els.completionRate.textContent = `${completionRate.toFixed(1)}%`;
}

function renderSubjectAverageChart() {
  if (!state.subjectAverages.length) {
    els.subjectAverageChart.innerHTML = `<div class="empty-state">ไม่พบข้อมูลคะแนนรายวิชา</div>`;
    return;
  }

  els.subjectAverageChart.style.setProperty("--score-threshold", `${LOW_SCORE_THRESHOLD}%`);
  els.subjectAverageChart.innerHTML = `
    <div class="score-threshold-overlay" aria-hidden="true"><span></span></div>
    ${state.subjectAverages.map((subject) => {
    const average = subject.average;
    const width = average === null ? 0 : Math.max(0, Math.min(100, average));
    const tone = average !== null && average < LOW_SCORE_THRESHOLD ? " is-low" : "";
    return `
      <div class="score-bar-label" title="${subject.code} - ${subject.name}">
        <strong>${subject.name}</strong>
        <span>${subject.code}</span>
      </div>
      <div class="score-bar-track" aria-hidden="true">
        <span class="score-bar-fill${tone}" style="width: ${width}%"></span>
      </div>
      <strong class="score-bar-value${tone}">${average === null ? "-" : `${average.toFixed(1)}%`}</strong>
    `;
  }).join("")}
  `;
}

function renderFollowUpTable() {
  if (!state.followUpRows.length) {
    els.followUpTbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">ไม่มีนักเรียนที่มีคะแนนต่ำกว่าเกณฑ์</div></td></tr>`;
    return;
  }

  els.followUpTbody.innerHTML = state.followUpRows.map((row) => {
    const subjectNames = row.lowSubjects.map(({ subject }) => subject.name).join(", ");
    return `
      <tr>
        <td><strong>${row.studentName}</strong><span class="score-student-code">${row.studentId}</span></td>
        <td>${subjectNames}</td>
        <td><button class="btn btn-secondary score-detail-btn" type="button" data-score-student="${row.studentId}">ดูรายละเอียด</button></td>
      </tr>
    `;
  }).join("");
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
    <tr data-score-row="${row.studentId}">
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

function renderOverviewTable() {
  if (!state.overviewRows.length) {
    els.overviewTbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td></tr>`;
    return;
  }

  els.overviewTbody.innerHTML = state.overviewRows.map((row) => `
    <tr>
      <td>${row.gradeName}</td>
      <td><strong>${row.classroomName}</strong></td>
      <td>${row.studentCount} คน</td>
      <td>${row.followUpCount} คน</td>
      <td>${row.missingCount} รายการ</td>
      <td><button class="btn btn-secondary score-overview-detail-btn" type="button" data-score-grade="${row.gradeId}" data-score-classroom="${row.classroomId}">ดูรายละเอียด</button></td>
    </tr>
  `).join("");
}

function runSearch({ silent = false } = {}) {
  updateResultScope();
  state.subjectKeyword = "";

  if (els.classroom.value === "all") {
    setResultMode("overview");
    buildOverviewRows();
    renderOverviewTable();
  } else {
    setResultMode("detail");
    buildStudentScoreRows();
    renderColumnChooser();
    renderSubjectAverageChart();
    renderFollowUpTable();
    renderTable();
  }

  saveLastSearch();
  if (!silent) setToast("แสดงรายงานคะแนนรายวิชาแล้ว", "success");
}

function resetFilters() {
  populateAcademicYears();
  populateSemesters();
  populateGrades();
  populateSubjects();
  els.grade.value = "all";
  syncClassrooms("all");
  els.subject.value = "all";
  state.subjectKeyword = "";
  closePrintModal();
  syncSearchButton();
  runSearch();
}

function showOverviewFromDetail() {
  els.grade.value = "all";
  syncClassrooms("all");
  els.subject.value = "all";
  state.subjectKeyword = "";
  closePrintModal();
  syncSearchButton();
  runSearch();
}

function toggleColumnPanel(force) {
  const shouldShow = typeof force === "boolean" ? force : els.columnChooserPanel.classList.contains("hidden");
  els.columnChooserPanel.classList.toggle("hidden", !shouldShow);
  els.columnToggleBtn.setAttribute("aria-expanded", String(shouldShow));
}

function buildPreviewTableHtml(limitRows = 6, limitSubjects = 5) {
  const subjects = getFilteredSubjects().slice(0, limitSubjects);
  const rows = state.rows
    .filter((row) => state.printMode !== "student" || row.studentId === els.studentPicker.value)
    .slice(0, limitRows);

  return `
    <table class="pdf-preview-table pdf-preview-table-report">
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>รหัส</th>
          <th>ชื่อ-สกุล</th>
          ${subjects.map((subject) => `<th>${subject.name}<br><span>${subject.fullScore} คะแนน</span></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.no}</td>
            <td>${row.studentId}</td>
            <td class="pdf-name-cell">${row.studentName}</td>
            ${subjects.map((subject) => {
              const scoreItem = row.values[subject.id];
              return `<td>${scoreItem ? `${scoreItem.score}/${scoreItem.fullScore}` : "-"}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function updatePrintPreview() {
  const templateText = els.printTemplate.options[els.printTemplate.selectedIndex].text;
  const languageText = els.printLanguage.options[els.printLanguage.selectedIndex].text;
  const studentText = state.printMode === "student" ? els.studentPicker.options[els.studentPicker.selectedIndex]?.text || "-" : "นักเรียนทั้งหมด";
  els.printPreview.innerHTML = `
    <strong>ตัวอย่างพิมพ์รายงานคะแนนรายวิชา</strong>
    <span>Template: ${templateText} | ภาษา ${languageText} | ${studentText}</span>
    ${buildPreviewTableHtml(state.printMode === "student" ? 1 : 5, 4)}
  `;
  els.printPreview.classList.remove("hidden");
  els.confirmPrintBtn.disabled = false;
}

function invalidatePrintPreview() {
  els.printPreview.classList.add("hidden");
  els.printPreview.innerHTML = "";
  els.confirmPrintBtn.disabled = true;
}

function openScoreExportPreview(format) {
  if (format !== "pdf" || typeof window.openReportPreviewModal !== "function") {
    setToast(`เตรียมส่งออกรายงาน ${exportLabels[format]} จากตารางรายวิชาปัจจุบัน`, "info");
    return;
  }

  window.openReportPreviewModal({
    title: "รายงานคะแนนรายวิชา",
    scope: `${els.summaryScope.textContent} | แสดงตัวอย่าง ${Math.min(state.rows.length, 6)} คน`,
    confirmText: "ดาวน์โหลด PDF",
    mockMessage: "Mockup: ดาวน์โหลด PDF รายงานคะแนนรายวิชายังไม่ถูกเชื่อมต่อ",
    sheetHtml: `
      <div class="pdf-document-head">
        <div>
          <p>ระบบรายงานคะแนน</p>
          <h3>รายงานคะแนนรายวิชา</h3>
        </div>
        <span>PDF</span>
      </div>
      <div class="pdf-document-meta">
        <span>${els.summaryScope.textContent}</span>
        <span>วิชาที่แสดง: ${getFilteredSubjects().length} วิชา</span>
      </div>
      ${buildPreviewTableHtml(7, 6)}
      <p class="pdf-preview-note">ตัวอย่างนี้แสดงบางรายการเพื่อดูรูปแบบตารางก่อนดาวน์โหลดจริง</p>
    `
  });
}

function openPrintModal() {
  state.printMode = els.printMode.value;
  els.studentPickerWrap.classList.toggle("hidden", state.printMode !== "student");
  invalidatePrintPreview();
  els.printModal.hidden = false;
  document.body.classList.add("modal-open");
  els.printMode.focus();
}

function closePrintModal() {
  if (!els.printModal) return;
  els.printModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function printPreviewDocument() {
  const templateText = els.printTemplate.options[els.printTemplate.selectedIndex].text;
  const languageText = els.printLanguage.options[els.printLanguage.selectedIndex].text;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setToast("เบราว์เซอร์ปิดกั้นหน้าต่างพิมพ์", "info");
    return;
  }
  printWindow.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>รายงานคะแนนรายวิชา</title><style>body{font-family:Tahoma,sans-serif;color:#172033;padding:24px}h1{font-size:20px;margin:0 0 8px}p{font-size:12px;color:#5e6b7d;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center}th{background:#f1f5f9}td:nth-child(3),th:nth-child(3){text-align:left}@media print{body{padding:0}}</style></head><body><h1>รายงานคะแนนรายวิชา</h1><p>${els.summaryScope.textContent} | ${templateText} | ${languageText}</p>${buildPreviewTableHtml(Infinity, Infinity)}<script>window.addEventListener('load',()=>window.print());<\/script></body></html>`);
  printWindow.document.close();
}

function attachEvents() {
  els.academicYear.addEventListener("change", () => {
    populateSemesters();
    syncSearchButton();
  });
  els.semester.addEventListener("change", syncSearchButton);
  els.grade.addEventListener("change", () => {
    syncClassrooms("all");
    syncSearchButton();
  });
  els.classroom.addEventListener("change", syncSearchButton);
  els.subject.addEventListener("change", syncSearchButton);
  els.searchBtn.addEventListener("click", () => runSearch());
  els.resetBtn.addEventListener("click", resetFilters);
  els.backOverviewBtn.addEventListener("click", showOverviewFromDetail);
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
    openScoreExportPreview(button.dataset.export);
  });
  els.printBtn.addEventListener("click", openPrintModal);
  els.printCloseBtn.addEventListener("click", closePrintModal);
  els.printModal.querySelectorAll("[data-score-print-close]").forEach((button) => button.addEventListener("click", closePrintModal));
  els.printMode.addEventListener("change", () => {
    state.printMode = els.printMode.value;
    els.studentPickerWrap.classList.toggle("hidden", state.printMode !== "student");
    invalidatePrintPreview();
  });
  els.previewBtn.addEventListener("click", () => {
    updatePrintPreview();
    setToast("สร้างตัวอย่างก่อนพิมพ์เรียบร้อย", "info");
  });
  els.confirmPrintBtn.addEventListener("click", () => {
    printPreviewDocument();
  });
  els.printTemplate.addEventListener("change", invalidatePrintPreview);
  els.printLanguage.addEventListener("change", invalidatePrintPreview);
  els.studentPicker.addEventListener("change", invalidatePrintPreview);
  els.followUpTbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-score-student]");
    if (!button) return;
    const targetRow = els.scoreTbody.querySelector(`[data-score-row="${button.dataset.scoreStudent}"]`);
    if (!targetRow) return;
    els.scoreTbody.querySelectorAll(".is-focused").forEach((row) => row.classList.remove("is-focused"));
    targetRow.classList.add("is-focused");
    targetRow.scrollIntoView({ block: "center", inline: "start" });
  });
  els.overviewTbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-score-classroom]");
    if (!button) return;
    els.grade.value = button.dataset.scoreGrade;
    syncClassrooms(button.dataset.scoreClassroom);
    els.classroom.value = button.dataset.scoreClassroom;
    runSearch();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.printModal.hidden) closePrintModal();
  });
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
    academicYears: buildMap(state.db.academicYears),
    semesters: buildMap(state.db.semesters),
    grades: buildMap(state.db.grades),
    classrooms: buildMap(state.db.classrooms),
    subjects: buildMap(state.db.subjects)
  };

  populateAcademicYears();
  populateSemesters();
  populateGrades();
  populateSubjects();
  const restoredLastSearch = restoreLastSearch();
  if (!restoredLastSearch) syncClassrooms("all");
  syncSearchButton();
  attachEvents();

  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / เทอม ${currentSemester.term}`;
  runSearch({ silent: true });
}

init();
})();
