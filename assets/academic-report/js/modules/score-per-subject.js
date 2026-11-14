(() => {
const STORAGE_KEY = "scorePerSubject:lastSearch";
const LOW_SCORE_THRESHOLD = 60;

const exportLabels = {
  excel: "Excel",
  csv: "CSV",
  pdf: "PDF"
};

// Tailwind classes of the markup this script builds (the CDN only sees complete literal names)
const UI = {
  empty: "rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400",
  rowButton: "whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50",
  barFill: { normal: "block h-full rounded bg-blue-600", low: "block h-full rounded bg-amber-600" },
  barValue: { normal: "text-right text-sm font-semibold text-slate-900", low: "text-right text-sm font-semibold text-amber-600" },
  headCell: "sticky top-0 z-10",
  // the three frozen columns: fixed widths so the left offsets line up
  stickyHead: {
    no: "sticky left-0 top-0 z-30 w-[88px] min-w-[88px]",
    id: "sticky left-[88px] top-0 z-30 w-[130px] min-w-[130px]",
    name: "sticky left-[218px] top-0 z-30 w-[220px] min-w-[220px] shadow-[1px_0_0_#e2e8f0]"
  },
  stickyCell: {
    no: "sticky left-0 z-20 w-[88px] min-w-[88px] bg-white group-hover:bg-slate-50 group-data-[focused=true]:bg-blue-50",
    id: "sticky left-[88px] z-20 w-[130px] min-w-[130px] bg-white group-hover:bg-slate-50 group-data-[focused=true]:bg-blue-50",
    name: "sticky left-[218px] z-20 w-[220px] min-w-[220px] bg-white shadow-[1px_0_0_#e2e8f0] group-hover:bg-slate-50 group-data-[focused=true]:bg-blue-50"
  },
  scoreRow: "group hover:bg-slate-50 data-[focused=true]:bg-blue-50",
  chip: {
    none: "inline-flex min-w-[76px] justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-400",
    pass: "inline-flex min-w-[76px] justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800",
    warn: "inline-flex min-w-[76px] justify-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
  },
  previewTable: "w-full border-collapse text-xs text-slate-800 [&_td]:border [&_td]:border-slate-300 [&_td]:px-1.5 [&_td]:py-1.5 [&_td]:text-center [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-1.5 [&_th]:py-1.5 [&_th]:text-center [&_th]:font-bold [&_th_span]:font-medium [&_th_span]:text-slate-500",
  previewNameCell: "min-w-[150px] !text-left"
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
  completionDesc: document.getElementById("scoreCompletionDesc"),
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

// rooms, subjects, students and scores come from the shared report data set (report-data.js)
function buildInlineMockDatabase() {
  const data = window.ReportData;
  return {
    academicYears: data.academicYears,
    semesters: data.semesters,
    grades: data.grades,
    classrooms: data.classrooms,
    students: data.students,
    subjects: data.subjects,
    scoreRecords: data.scoreRecords
  };
}

// scores already entered for the semester picked in the filter
function getSemesterScores() {
  const semesterId = els.semester.value;
  if (state.semesterScores?.semesterId !== semesterId) {
    state.semesterScores = {
      semesterId,
      scores: state.db.scoreRecords
        .filter((record) => record.semesterId === semesterId && record.score !== null)
        .map((record) => ({
          studentId: record.studentId,
          subjectId: record.subjectId,
          score: record.score,
          fullScore: record.maxScore,
          gradeLabel: getGradeLabel(record.score, record.maxScore)
        }))
    };
  }
  return state.semesterScores.scores;
}

function getSelectedGradeId() {
  return state.maps.classrooms.get(els.classroom.value)?.gradeId || (els.grade.value === "all" ? "" : els.grade.value);
}

function subjectCodeText(subject) {
  return window.ReportData.subjectCode(subject, getSelectedGradeId());
}

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function setToast(message, variant = "info") {
  const toast = els.toast;
  toast.className = toast.dataset.baseClass;
  toast.innerHTML = `<strong class="font-semibold">${variant === "success" ? "สำเร็จ" : "แจ้งเตือน"}</strong><span class="text-slate-200">${message}</span>`;
  const visible = toast.dataset.visibleClass.split(" ");
  toast.classList.add(...visible);
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    toast.classList.remove(...visible);
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
    .map((subject) => `<option value="${subject.id}">${subject.name}</option>`)
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
  document.querySelectorAll("[data-score-detail-only]")
    .forEach((element) => element.classList.toggle("hidden", isOverview));
  els.viewMeta.textContent = isOverview ? "ภาพรวมรายห้อง" : "ตารางแนวนอน";
}

function buildOverviewRows() {
  const classrooms = getSelectedClassrooms();
  const subjects = getSelectedSubjects();
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const selectedStudents = state.db.students.filter((student) => classrooms.some((room) => room.id === student.classroomId));
  const selectedStudentIds = new Set(selectedStudents.map((student) => student.id));
  const selectedScores = getSemesterScores().filter((score) => selectedStudentIds.has(score.studentId) && subjectIds.has(score.subjectId));

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
  const scoreMap = new Map(getSemesterScores()
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
  els.completionRate.textContent = `${recordedScores.length}/${expectedScoreCount}`;
  els.completionDesc.textContent = `ช่องคะแนน (${completionRate.toFixed(1)}%)`;
}

function renderSubjectAverageChart() {
  if (!state.subjectAverages.length) {
    els.subjectAverageChart.innerHTML = `<div class="col-span-full ${UI.empty}">ไม่พบข้อมูลคะแนนรายวิชา</div>`;
    return;
  }

  els.subjectAverageChart.innerHTML = `
    <div class="pointer-events-none absolute inset-y-0 left-[200px] right-[68px] z-[2]" aria-hidden="true"><span class="absolute inset-y-0 border-l-2 border-dashed border-amber-500" style="left: ${LOW_SCORE_THRESHOLD}%"></span></div>
    ${state.subjectAverages.map((subject) => {
    const average = subject.average;
    const width = average === null ? 0 : Math.max(0, Math.min(100, average));
    const tone = average !== null && average < LOW_SCORE_THRESHOLD ? "low" : "normal";
    return `
      <div class="flex min-w-0 items-baseline gap-1.5" title="${subjectCodeText(subject)} - ${subject.name}">
        <strong class="truncate text-sm font-semibold text-slate-800">${subject.name}</strong>
        <span class="truncate text-xs text-slate-500">${subjectCodeText(subject)}</span>
      </div>
      <div class="relative z-[1] h-2 overflow-hidden rounded bg-slate-100" aria-hidden="true">
        <span class="${UI.barFill[tone]}" style="width: ${width}%"></span>
      </div>
      <strong class="${UI.barValue[tone]}">${average === null ? "-" : `${average.toFixed(1)}%`}</strong>
    `;
  }).join("")}
  `;
}

function renderFollowUpTable() {
  if (!state.followUpRows.length) {
    els.followUpTbody.innerHTML = `<tr><td colspan="3"><div class="${UI.empty}">ไม่มีนักเรียนที่มีคะแนนต่ำกว่าเกณฑ์</div></td></tr>`;
    return;
  }

  els.followUpTbody.innerHTML = state.followUpRows.map((row) => {
    const subjectNames = row.lowSubjects.map(({ subject }) => subject.name).join(", ");
    return `
      <tr>
        <td><strong class="font-semibold text-slate-900">${row.studentName}</strong><span class="mt-0.5 block text-xs text-slate-500">${row.studentId}</span></td>
        <td>${subjectNames}</td>
        <td><button class="${UI.rowButton}" type="button" data-score-student="${row.studentId}">ดูรายละเอียด</button></td>
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
    const matchesKeyword = !keyword || `${subjectCodeText(subject)} ${subject.name}`.toLowerCase().includes(keyword);
    return matchesVisibility && matchesKeyword;
  });
}

function renderColumnChooser() {
  const keyword = state.subjectKeyword.trim().toLowerCase();
  const filteredSubjects = state.subjects.filter((subject) => (
    !keyword || `${subjectCodeText(subject)} ${subject.name}`.toLowerCase().includes(keyword)
  ));
  els.columnChooserPanel.innerHTML = `
    <div class="mb-3 grid gap-1.5">
      <label class="text-sm font-medium text-slate-500" for="scoreColumnSearchInput">ค้นหาวิชา</label>
      <input class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-blue-100" id="scoreColumnSearchInput" type="text" value="${state.subjectKeyword}" placeholder="พิมพ์ชื่อหรือรหัสวิชา" />
    </div>
    <div class="grid gap-2">
      ${filteredSubjects.map((subject) => `
        <label class="flex items-start gap-2 text-sm text-slate-700">
          <input class="mt-1 h-4 w-4 flex-none accent-blue-600" type="checkbox" value="${subject.id}" ${state.visibleSubjectIds.includes(subject.id) ? "checked" : ""} />
          <span>${subjectCodeText(subject)} - ${subject.name}</span>
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
        <th class="${UI.headCell}">ลำดับ</th>
        <th class="${UI.headCell}">รหัสนักเรียน</th>
        <th class="${UI.headCell}">ชื่อ</th>
      </tr>
    `;
    els.scoreTbody.innerHTML = `
      <tr>
        <td colspan="3"><div class="${UI.empty}">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td>
      </tr>
    `;
    return;
  }

  els.scoreThead.innerHTML = `
    <tr>
      <th class="${UI.stickyHead.no}">ลำดับ</th>
      <th class="${UI.stickyHead.id}">รหัสนักเรียน</th>
      <th class="${UI.stickyHead.name}">ชื่อ</th>
      ${visibleSubjects.map((subject) => `
        <th class="${UI.headCell} min-w-[116px] !text-center" title="${subjectCodeText(subject)} - ${subject.name}">
          <div class="grid gap-0.5">
            <strong class="text-xs font-semibold text-slate-700">${subject.name}</strong>
            <span class="text-xs font-medium text-slate-400">${subject.fullScore} คะแนน</span>
          </div>
        </th>
      `).join("")}
    </tr>
  `;

  els.scoreTbody.innerHTML = state.rows.map((row) => `
    <tr class="${UI.scoreRow}" data-score-row="${row.studentId}">
      <td class="${UI.stickyCell.no}">${row.no}</td>
      <td class="${UI.stickyCell.id}">${row.studentId}</td>
      <td class="${UI.stickyCell.name}">${row.studentName}</td>
      ${visibleSubjects.map((subject) => {
        const scoreItem = row.values[subject.id];
        if (!scoreItem) {
          return `<td class="text-center"><span class="${UI.chip.none}">-</span></td>`;
        }
        const scorePercent = Math.round((scoreItem.score / scoreItem.fullScore) * 100);
        // only a score under the threshold is coloured, as before
        const tone = scorePercent >= LOW_SCORE_THRESHOLD ? "pass" : "warn";
        return `
          <td class="text-center">
            <span class="${UI.chip[tone]}" title="${scoreItem.gradeLabel}">
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
    els.overviewTbody.innerHTML = `<tr><td colspan="7"><div class="${UI.empty}">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td></tr>`;
    return;
  }

  els.overviewTbody.innerHTML = state.overviewRows.map((row) => `
    <tr>
      <td>${row.gradeName}</td>
      <td><strong class="font-semibold text-slate-900">${row.classroomName}</strong></td>
      <td>${row.studentCount} คน</td>
      <td>${row.followUpCount} คน</td>
      <td>${row.missingCount} รายการ</td>
      <td><button class="${UI.rowButton}" type="button" data-score-grade="${row.gradeId}" data-score-classroom="${row.classroomId}">ดูรายละเอียด</button></td>
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
    <table class="${UI.previewTable}">
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
            <td class="${UI.previewNameCell}">${row.studentName}</td>
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
    <strong class="mb-1 block font-semibold text-slate-900">ตัวอย่างพิมพ์รายงานคะแนนรายวิชา</strong>
    <span class="block">Template: ${templateText} | ภาษา ${languageText} | ${studentText}</span>
    <div class="mt-3">${buildPreviewTableHtml(state.printMode === "student" ? 1 : 5, 4)}</div>
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
      <div class="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
        <div>
          <p class="text-xs text-slate-500">ระบบรายงานคะแนน</p>
          <h3 class="mt-1 text-xl font-semibold text-slate-900">รายงานคะแนนรายวิชา</h3>
        </div>
        <span class="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold">PDF</span>
      </div>
      <div class="my-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <span>${els.summaryScope.textContent}</span>
        <span>วิชาที่แสดง: ${getFilteredSubjects().length} วิชา</span>
      </div>
      ${buildPreviewTableHtml(7, 6)}
      <p class="mt-3 text-right text-xs text-slate-500">ตัวอย่างนี้แสดงบางรายการเพื่อดูรูปแบบตารางก่อนดาวน์โหลดจริง</p>
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
    els.scoreTbody.querySelectorAll('[data-focused="true"]').forEach((row) => { delete row.dataset.focused; });
    targetRow.dataset.focused = "true";
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
    if (!event.target.closest("#scoreColumnChooser")) {
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
