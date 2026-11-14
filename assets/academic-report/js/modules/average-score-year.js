(() => {
  const STORAGE_KEY = "averageScoreYear:lastSearch";
  const PASS_SCORE = 60;
  const SCORE_RANGES = [
    { min: 0, max: 49.99, label: "ต่ำกว่า 50" },
    { min: 50, max: 59.99, label: "50–59" },
    { min: 60, max: 69.99, label: "60–69" },
    { min: 70, max: 79.99, label: "70–79" },
    { min: 80, max: 89.99, label: "80–89" },
    { min: 90, max: 100, label: "90–100" }
  ];
  const GRADE_SCALE = [
    { min: 80, gradePoint: 4, label: "ดีเยี่ยม" }, { min: 75, gradePoint: 3.5, label: "ดีมาก" },
    { min: 70, gradePoint: 3, label: "ดี" }, { min: 65, gradePoint: 2.5, label: "ค่อนข้างดี" },
    { min: 60, gradePoint: 2, label: "พอใช้" }, { min: 55, gradePoint: 1.5, label: "อ่อน" },
    { min: 50, gradePoint: 1, label: "ผ่านขั้นต่ำ" }, { min: 0, gradePoint: 0, label: "ไม่ผ่าน" }
  ];
  const statusLabels = { active: "กำลังศึกษา", watch: "คะแนนต่ำกว่าเกณฑ์", excellent: "ผลการเรียนดีเด่น" };
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $("averageYearFiltersForm"), academicYear: $("averageYearAcademicYear"), semester: $("averageYearSemester"),
    grade: $("averageYearGrade"), plan: $("averageYearPlan"), classroom: $("averageYearClassroom"), status: $("averageYearStatus"), keyword: $("averageYearKeyword"),
    search: $("averageYearSearchBtn"), reset: $("averageYearResetFiltersBtn"), current: $("averageYearCurrentAcademicLabel"), scope: $("averageYearSummaryScope"),
    summary: $("averageYearSummaryGrid"), tableTitle: $("averageYearTableTitle"), thead: $("averageYearThead"), tbody: $("averageYearTbody"), subjectBtn: $("averageYearSubjectBtn"), subjectPanel: $("averageYearSubjectPanel"), export: $("averageYearExportBtn"), print: $("averageYearPrintBtn"),
    dialog: $("averageYearPrintDialog"), buildPreview: $("averageYearBuildPreviewBtn"), printPreview: $("averageYearPrintPreview"),
    comparisonWrap: $("averageYearComparisonWrap"), table: $("averageYearTable"), tableWrap: $("averageYearTableWrap"), comparisonTitle: $("averageYearComparisonTitle"),
    thresholdLabel: $("averageYearThresholdLabel"), subjectLegend: $("averageYearSubjectLegend"), backOverview: $("averageYearBackOverviewBtn"),
    comparisonCanvas: $("averageYearComparisonChart"), comparisonEmpty: $("averageYearComparisonEmpty"),
    distributionCanvas: $("averageYearDistributionChart"), distributionEmpty: $("averageYearDistributionEmpty"),
    rangeFilter: $("averageYearRangeFilter"), rangeFilterLabel: $("averageYearRangeFilterLabel"), clearRangeFilter: $("averageYearClearRangeFilterBtn")
  };
  if (!els.form) return;

  // Tailwind classes of the markup this script builds. Always whole literal strings:
  // the Tailwind CDN only generates CSS for class names it can read in the DOM.
  const CHIP = "inline-flex min-w-[76px] items-baseline justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold";
  const STICKY = "sticky z-10 !px-2";
  const UI = {
    metric: "rounded-2xl border border-slate-200 bg-slate-50 p-5",
    metricWarning: "rounded-2xl border border-amber-200 bg-amber-50/70 p-5",
    metricLabel: "text-sm font-medium text-slate-500",
    metricLabelWarning: "text-sm font-medium text-amber-700",
    metricValue: "mt-2 text-4xl font-semibold tracking-tight text-slate-900",
    metricValueWarning: "mt-2 text-4xl font-semibold tracking-tight text-amber-700",
    empty: "py-10 text-center text-sm text-slate-400",
    btnPrimarySmall: "rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700",
    btnSecondarySmall: "whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50",
    legendItem: "inline-flex items-center gap-1.5 text-xs font-bold leading-snug text-slate-500",
    legendSwatch: "h-2.5 w-2.5 flex-none rounded-sm ring-1 ring-inset ring-slate-900/10",
    // sticky first columns of the detail table (number / id / name / grade / rank)
    colNo: `${STICKY} left-0 w-[64px] min-w-[64px]`,
    colId: `${STICKY} left-[64px] w-[116px] min-w-[116px]`,
    colName: `${STICKY} left-[180px] w-[200px] min-w-[200px] !text-left`,
    colGrade: `${STICKY} left-[380px] w-[110px] min-w-[110px]`,
    colRank: `${STICKY} left-[490px] w-[84px] min-w-[84px] shadow-[1px_0_0_#e2e8f0]`,
    stickyBody: "bg-white",
    groupStart: "border-l-2 !border-l-slate-300",
    subjectHead: "min-w-[450px] border-l-2 !border-l-slate-300 !bg-slate-100",
    subjectHeadName: "block text-slate-900",
    maxScore: "!py-1.5 !font-medium",
    numberCell: "w-[82px] min-w-[82px] tabular-nums",
    gradeCell: "w-[118px] min-w-[118px]",
    scoreCell: "grid justify-items-center gap-0.5",
    gradeChip: {
      excellent: `${CHIP} border-emerald-200 bg-emerald-50 text-emerald-700`,
      active: `${CHIP} border-slate-200 bg-slate-100 text-slate-700`,
      watch: `${CHIP} border-amber-200 bg-amber-50 text-amber-700`
    },
    rankChip: "inline-flex min-w-[44px] justify-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand",
    subjectHighlight: "!bg-blue-100",
    overviewText: "!text-left",
    overviewNumber: "tabular-nums",
    overviewAction: "!text-right",
    subjectPanelHeader: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
    subjectPanelTitle: "text-sm font-semibold text-slate-900",
    subjectPanelActions: "flex flex-wrap gap-2",
    subjectSearch: "my-3 block w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-blue-100",
    subjectList: "flex flex-wrap items-start gap-2.5",
    subjectOption: "inline-flex min-w-[210px] items-center gap-2 text-sm text-slate-700",
    subjectCheckbox: "h-4 w-4 accent-blue-600",
    printPreview: "rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500",
    printPreviewTitle: "mb-1 block text-slate-900",
    printPreviewScope: "block",
    printPreviewRows: "mt-3 text-slate-800"
  };
  const emptyState = (text) => `<div class="${UI.empty}">${text}</div>`;

  const state = {
    db: null, maps: null, filters: null, baseRows: [], rows: [], eligibleStudents: [], overviewBaseRows: [], overviewRows: [],
    subjects: [], visibleSubjectIds: new Set(), scoreRangeFilter: null, averageComparisonChart: null,
    scoreDistributionChart: null, subjectHighlightTimer: null, mode: "overview", initialized: false, overviewReturnFilters: null
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const format = (value) => Number.isFinite(value) ? value.toFixed(2) : "-";
  const sum = (values) => values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
  const average = (values) => { const valid = values.filter(Number.isFinite); return valid.length ? sum(valid) / valid.length : null; };
  function convertScoreToGradePoint(score) { if (!Number.isFinite(score)) return null; return GRADE_SCALE.find((item) => score >= item.min).gradePoint; }
  function getGradeLabel(score) { if (!Number.isFinite(score)) return "ไม่มีข้อมูล"; return GRADE_SCALE.find((item) => score >= item.min).label; }
  function scoreTone(score) { return score >= 80 ? "excellent" : score >= 60 ? "active" : "watch"; }

  // rooms, subjects, students and scores come from the shared report data set (report-data.js)
  function buildInlineMockDatabase() {
    const data = window.ReportData;
    const currentYearId = data.currentYear().id;
    const scoresByStudent = new Map();
    data.scoreRecords.forEach((record) => {
      if (record.academicYearId !== currentYearId || record.score === null) return;
      if (!scoresByStudent.has(record.studentId)) scoresByStudent.set(record.studentId, []);
      scoresByStudent.get(record.studentId).push(record.score);
    });
    // "watch" and "excellent" follow the student's average this year
    const students = data.students.map((student) => {
      const yearAverage = average(scoresByStudent.get(student.id) || []);
      return { id: student.id, code: student.code, name: student.name, classroomId: student.classroomId, status: yearAverage === null ? "active" : yearAverage < PASS_SCORE ? "watch" : yearAverage >= 80 ? "excellent" : "active" };
    });
    const subjects = data.subjects.map((subject) => ({ id: subject.id, code: subject.code, name: subject.name, credit: subject.credit, semester1MaxScore: subject.fullScore, semester2MaxScore: subject.fullScore }));
    return { academicYears: data.academicYears, semesters: data.semesters, grades: data.grades, plans: data.plans, classrooms: data.classrooms, students, subjects, scoreRecords: data.scoreRecords };
  }
  // score records of one student in one subject, across years
  function scoreRecordsOf(studentId, subjectId) {
    if (!state.scoreIndex) {
      state.scoreIndex = new Map();
      state.db.scoreRecords.forEach((record) => {
        const key = `${record.studentId}|${record.subjectId}`;
        if (!state.scoreIndex.has(key)) state.scoreIndex.set(key, []);
        state.scoreIndex.get(key).push(record);
      });
    }
    return state.scoreIndex.get(`${studentId}|${subjectId}`) || [];
  }
  const mapById = (items) => new Map(items.map((item) => [item.id, item]));
  function getCurrentYear() { return state.db.academicYears.find((year) => year.isCurrent) || state.db.academicYears[0]; }
  function getFilters() { return { academicYear: els.academicYear.value, semester: els.semester.value, grade: els.grade.value, plan: els.plan.value, classroom: els.classroom.value, status: els.status.value, keyword: els.keyword.value.trim().toLowerCase() }; }
  function saveLastSearch() { localStorage.setItem(STORAGE_KEY, JSON.stringify(getFilters())); }
  function loadSavedFilters() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {}; } catch { return {}; } }

  function populateAcademicYears(saved) { els.academicYear.innerHTML = state.db.academicYears.map((year) => `<option value="${year.id}">${year.name}</option>`).join(""); els.academicYear.value = saved.academicYear || getCurrentYear().id; if (!state.db.academicYears.some((item) => item.id === els.academicYear.value)) els.academicYear.value = getCurrentYear().id; }
  function populateSemesters(savedValue = "all") { const semesters = state.db.semesters.filter((item) => item.academicYearId === els.academicYear.value); els.semester.innerHTML = `<option value="all">ทั้งปีการศึกษา</option>${semesters.map((item) => `<option value="${item.id}">ภาคเรียน ${item.term}</option>`).join("")}`; els.semester.value = semesters.some((item) => item.id === savedValue) ? savedValue : "all"; }
  function populateGrades(savedValue = "all") { els.grade.innerHTML = `<option value="all">ทุกระดับชั้น</option>${state.db.grades.slice().sort((a, b) => a.order - b.order).map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}`; els.grade.value = state.db.grades.some((item) => item.id === savedValue) ? savedValue : "all"; }
  function populatePlans(savedValue = "all") { const gradeId = els.grade.value; const allowed = state.db.classrooms.filter((room) => gradeId === "all" || room.gradeId === gradeId).map((room) => room.planId); const plans = state.db.plans.filter((plan) => allowed.includes(plan.id)); els.plan.innerHTML = `<option value="all">ทุกแผนการเรียน</option>${plans.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}`; els.plan.value = plans.some((item) => item.id === savedValue) ? savedValue : "all"; }
  function syncClassrooms(savedValue = "all") { const gradeId = els.grade.value; const planId = els.plan.value; const rooms = state.db.classrooms.filter((room) => (gradeId === "all" || room.gradeId === gradeId) && (planId === "all" || room.planId === planId)); els.classroom.innerHTML = `<option value="all">ทุกห้องเรียน</option>${rooms.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}`; els.classroom.value = rooms.some((item) => item.id === savedValue) ? savedValue : "all"; els.classroom.disabled = false; }
  function syncFilterDependencies(saved = {}) { populateSemesters(saved.semester || "all"); populateGrades(saved.grade || "all"); populatePlans(saved.plan || "all"); syncClassrooms(saved.classroom || "all"); els.status.value = ["active", "all", "watch", "excellent"].includes(saved.status) ? saved.status : "active"; els.keyword.value = saved.keyword || ""; }
  function syncSearchButton() { els.search.disabled = !els.academicYear.value; }

  function selectedSemesters() { return state.db.semesters.filter((item) => item.academicYearId === state.filters.academicYear && (state.filters.semester === "all" || item.id === state.filters.semester)); }
  function getEligibleStudents() { const f = state.filters; return state.db.students.filter((student) => { const room = state.maps.classrooms.get(student.classroomId); return (f.grade === "all" || room.gradeId === f.grade) && (f.plan === "all" || room.planId === f.plan) && (f.classroom === "all" || room.id === f.classroom) && (f.status === "all" || student.status === f.status); }); }
  function buildSubjectAnnualResult(studentId, subject) { const semesters = selectedSemesters(); const records = scoreRecordsOf(studentId, subject.id).filter((record) => record.academicYearId === state.filters.academicYear && semesters.some((semester) => semester.id === record.semesterId)); const first = records.find((record) => state.maps.semesters.get(record.semesterId).term === 1); const second = records.find((record) => state.maps.semesters.get(record.semesterId).term === 2); const useFirst = state.filters.semester === "all" || state.maps.semesters.get(state.filters.semester)?.term === 1; const useSecond = state.filters.semester === "all" || state.maps.semesters.get(state.filters.semester)?.term === 2; const semester1Score = useFirst ? first?.score ?? null : null; const semester2Score = useSecond ? second?.score ?? null : null; const semester1MaxScore = useFirst ? (first?.maxScore ?? subject.semester1MaxScore) : 0; const semester2MaxScore = useSecond ? (second?.maxScore ?? subject.semester2MaxScore) : 0; const totalMaxScore = semester1MaxScore + semester2MaxScore; const totalScore = sum([semester1Score, semester2Score]); const isComplete = (!useFirst || Number.isFinite(semester1Score)) && (!useSecond || Number.isFinite(semester2Score)); const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : null; return { subjectId: subject.id, subjectCode: subject.code, subjectName: subject.name, credit: subject.credit, semester1Score, semester1MaxScore, semester2Score, semester2MaxScore, totalScore, totalMaxScore, averageScore, gradePoint: convertScoreToGradePoint(averageScore), isComplete }; }
  function calculateStudentAnnualSummary(student, subjectResults) { const totalScore = sum(subjectResults.map((item) => item.totalScore)); const totalMaxScore = sum(subjectResults.map((item) => item.totalMaxScore)); const valid = subjectResults.filter((item) => Number.isFinite(item.gradePoint)); const creditTotal = sum(valid.map((item) => item.credit)); const averageGradePoint = creditTotal ? sum(valid.map((item) => item.gradePoint * item.credit)) / creditTotal : average(valid.map((item) => item.gradePoint)) || 0; return { totalScore, totalMaxScore, averageScore: totalMaxScore ? totalScore / totalMaxScore * 100 : null, averageGradePoint, rank: 0, incompleteCount: subjectResults.filter((item) => !item.isComplete).length, expectedCount: subjectResults.length * selectedSemesters().length, recordedCount: subjectResults.reduce((count, item) => count + [item.semester1Score, item.semester2Score].filter(Number.isFinite).length, 0) }; }
  function assignCompetitionRanks(rows) { let previous = null; let rank = 0; rows.forEach((row, index) => { if (row.summary.averageGradePoint !== previous) rank = index + 1; row.summary.rank = rank; previous = row.summary.averageGradePoint; }); return rows; }
  function buildStudentAnnualRows(students) { const subjects = state.db.subjects; const rows = students.map((student) => { const subjectResults = subjects.map((subject) => buildSubjectAnnualResult(student.id, subject)); return { student, subjectResults, summary: calculateStudentAnnualSummary(student, subjectResults) }; }).sort((a, b) => (b.summary.averageGradePoint || 0) - (a.summary.averageGradePoint || 0) || a.student.code.localeCompare(b.student.code)); return assignCompetitionRanks(rows); }
  function applyKeyword(rows) {
    const keyword = state.filters.keyword;
    if (!keyword) return rows;
    return rows.filter((row) => `${row.student.code} ${row.student.name}`.toLowerCase().includes(keyword));
  }

  function averageGradePoint(subjectResults) {
    const valid = subjectResults.filter((item) => Number.isFinite(item.averageScore));
    const credits = sum(valid.map((item) => item.credit));
    return credits ? sum(valid.map((item) => convertScoreToGradePoint(item.averageScore) * item.credit)) / credits : 0;
  }

  function summarizeOverviewRoom(room, rows) {
    const scores = rows.map((row) => row.summary.averageScore).filter(Number.isFinite);
    const subjectResults = state.db.subjects.map((subject) => ({
      averageScore: average(rows.map((row) => row.subjectResults.find((item) => item.subjectId === subject.id)?.averageScore).filter(Number.isFinite)),
      credit: subject.credit
    }));
    return {
      room,
      rows,
      count: rows.length,
      totalMaxScore: sum(rows.map((row) => row.summary.totalMaxScore)),
      averageScore: average(scores),
      gradePoint: averageGradePoint(subjectResults),
      highestScore: scores.length ? Math.max(...scores) : null,
      lowestScore: scores.length ? Math.min(...scores) : null,
      belowCount: rows.filter((row) => Number.isFinite(row.summary.averageScore) && row.summary.averageScore < PASS_SCORE).length,
      incompleteCount: rows.reduce((count, row) => count + row.summary.incompleteCount, 0)
    };
  }

  function buildOverviewRows(students) {
    const groups = new Map();
    students.forEach((student) => {
      if (!groups.has(student.classroomId)) groups.set(student.classroomId, []);
      groups.get(student.classroomId).push(student);
    });
    return [...groups.entries()].map(([roomId, roomStudents]) => {
      const rows = applyKeyword(buildStudentAnnualRows(roomStudents));
      return summarizeOverviewRoom(state.maps.classrooms.get(roomId), rows);
    }).filter((item) => item.count > 0);
  }

  function scoreInRange(score, range) {
    if (!Number.isFinite(score)) return false;
    const rounded = Number(score.toFixed(2));
    return rounded >= range.min && rounded <= range.max;
  }

  function sourceStudentRows() {
    return state.mode === "detail" ? applyKeyword(state.baseRows) : state.overviewBaseRows.flatMap((item) => item.rows);
  }

  function updateVisualizationFilterChip() {
    const range = state.scoreRangeFilter;
    els.rangeFilter.classList.toggle("hidden", !range);
    els.rangeFilterLabel.textContent = range ? `คะแนนเฉลี่ย ${range.label}` : "";
  }

  function applyCurrentScoreRange() {
    const range = state.scoreRangeFilter;
    if (state.mode === "detail") {
      const rows = applyKeyword(state.baseRows);
      state.rows = range ? rows.filter((row) => scoreInRange(row.summary.averageScore, range)) : rows;
    } else {
      state.overviewRows = state.overviewBaseRows.map((item) => {
        const rows = range ? item.rows.filter((row) => scoreInRange(row.summary.averageScore, range)) : item.rows;
        return summarizeOverviewRoom(item.room, rows);
      }).filter((item) => item.count > 0);
    }
    updateVisualizationFilterChip();
  }

  function applyScoreRangeFilter(range) {
    state.scoreRangeFilter = range;
    applyCurrentScoreRange();
    renderSummary();
    renderVisualization();
    renderTable();
  }

  function clearVisualizationFilter(shouldRender = true) {
    state.scoreRangeFilter = null;
    applyCurrentScoreRange();
    if (shouldRender) {
      renderSummary();
      renderVisualization();
      renderTable();
    }
  }

  function renderMetric(label, value, warning = false) {
    return `<article class="${warning ? UI.metricWarning : UI.metric}"><p class="${warning ? UI.metricLabelWarning : UI.metricLabel}">${label}</p><p class="${warning ? UI.metricValueWarning : UI.metricValue}">${value}</p></article>`;
  }

  function renderSummary() {
    const students = state.mode === "detail" ? state.rows : state.overviewRows.flatMap((item) => item.rows);
    const expected = students.reduce((count, row) => count + row.summary.expectedCount, 0);
    const recorded = students.reduce((count, row) => count + row.summary.recordedCount, 0);
    const missing = Math.max(0, expected - recorded);
    const lowCount = students.filter((row) => Number.isFinite(row.summary.averageScore) && row.summary.averageScore < PASS_SCORE).length;
    const averagePoint = average(students.map((row) => row.summary.averageGradePoint));
    els.backOverview?.classList.toggle("hidden", state.mode !== "detail");
    els.summary.innerHTML = [
      renderMetric("นักเรียนทั้งหมด", students.length),
      renderMetric("เกรดเฉลี่ยรวม", format(averagePoint)),
      renderMetric("นักเรียนต่ำกว่าเกณฑ์", lowCount, lowCount > 0),
      renderMetric("ครูกรอกคะแนนแล้ว", expected ? `${recorded}/${expected}` : "-", missing > 0)
    ].join("");

    const year = state.maps.academicYears.get(state.filters.academicYear)?.name || "-";
    const semester = state.filters.semester === "all" ? "ทั้งปีการศึกษา" : `ภาคเรียน ${state.maps.semesters.get(state.filters.semester)?.term}`;
    const grade = state.filters.grade === "all" ? "ทุกระดับชั้น" : state.maps.grades.get(state.filters.grade)?.name;
    const classroom = state.filters.classroom === "all" ? "ทุกห้องเรียน" : state.maps.classrooms.get(state.filters.classroom)?.name;
    els.scope.textContent = `ปีการศึกษา ${year} · ${semester} · ${grade} · ${classroom}`;
  }

  function buildClassAverageChartData() {
    return state.overviewBaseRows.map((item) => ({
      roomId: item.room.id,
      gradeId: item.room.gradeId,
      planId: item.room.planId,
      label: item.room.name,
      averageGradePoint: average(item.rows.map((row) => row.summary.averageGradePoint)),
      studentCount: item.count,
      belowCount: item.belowCount
    })).filter((item) => Number.isFinite(item.averageGradePoint)).sort((a, b) => a.averageGradePoint - b.averageGradePoint);
  }

  function percentile(sorted, ratio) {
    if (!sorted.length) return null;
    const index = (sorted.length - 1) * ratio;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
  }

  function buildSubjectBoxPlotData() {
    const rows = applyKeyword(state.baseRows);
    return state.db.subjects.map((subject) => {
      const results = rows.map((row) => row.subjectResults.find((item) => item.subjectId === subject.id)).filter(Boolean);
      const scores = results.map((item) => item.averageScore).filter(Number.isFinite).sort((a, b) => a - b);
      return {
        subjectId: subject.id,
        code: subject.code,
        name: subject.name,
        label: `${subject.code} · ${subject.name}`,
        min: scores[0] ?? null,
        q1: percentile(scores, .25),
        median: percentile(scores, .5),
        q3: percentile(scores, .75),
        max: scores[scores.length - 1] ?? null,
        completeCount: results.filter((item) => item.isComplete).length,
        missingCount: results.filter((item) => !item.isComplete).length,
        totalCount: results.length
      };
    }).filter((item) => Number.isFinite(item.median)).sort((a, b) => a.median - b.median);
  }

  function buildScoreDistributionData() {
    const rows = sourceStudentRows();
    const total = rows.filter((row) => Number.isFinite(row.summary.averageScore)).length;
    return SCORE_RANGES.map((range) => {
      const count = rows.filter((row) => scoreInRange(row.summary.averageScore, range)).length;
      return { range, label: range.label, count, percentage: total ? count / total * 100 : 0 };
    });
  }

  function destroyAverageScoreYearCharts() {
    state.averageComparisonChart?.destroy();
    state.scoreDistributionChart?.destroy();
    state.averageComparisonChart = null;
    state.scoreDistributionChart = null;
  }

  function chartColors() {
    // chart colours (the values the page used before it moved to Tailwind)
    return {
      primary: "#2563eb",
      warning: "#b45309",
      muted: "#64748b",
      border: "#e2e8f0",
      selected: "#1d4ed8",
      subjectPalette: [
        { stroke: "#315d7d", fill: "rgba(49, 93, 125, .16)" },
        { stroke: "#4f7f6b", fill: "rgba(79, 127, 107, .16)" },
        { stroke: "#7a6793", fill: "rgba(122, 103, 147, .16)" },
        { stroke: "#9a6a46", fill: "rgba(154, 106, 70, .16)" },
        { stroke: "#4f6f9b", fill: "rgba(79, 111, 155, .16)" },
        { stroke: "#8b5f73", fill: "rgba(139, 95, 115, .16)" },
        { stroke: "#6b7f45", fill: "rgba(107, 127, 69, .16)" },
        { stroke: "#517f8c", fill: "rgba(81, 127, 140, .16)" },
        { stroke: "#8a7353", fill: "rgba(138, 115, 83, .16)" },
        { stroke: "#6f6f9a", fill: "rgba(111, 111, 154, .16)" },
        { stroke: "#7f5f50", fill: "rgba(127, 95, 80, .16)" },
        { stroke: "#486f58", fill: "rgba(72, 111, 88, .16)" },
        { stroke: "#7b607d", fill: "rgba(123, 96, 125, .16)" },
        { stroke: "#5a7890", fill: "rgba(90, 120, 144, .16)" },
        { stroke: "#806b3f", fill: "rgba(128, 107, 63, .16)" },
        { stroke: "#6e7860", fill: "rgba(110, 120, 96, .16)" }
      ]
    };
  }

  function registerChartPlugins() {
    if (!window.Chart || Chart.registry.plugins.get("averageYearPassLine")) return;
    Chart.register({
      id: "averageYearPassLine",
      afterDraw(chart, args, options) {
        if (!options?.enabled || !chart.scales.x) return;
        const x = chart.scales.x.getPixelForValue(options.value ?? PASS_SCORE);
        const { top, bottom } = chart.chartArea;
        chart.ctx.save();
        chart.ctx.strokeStyle = options.color;
        chart.ctx.setLineDash([5, 4]);
        chart.ctx.lineWidth = 1;
        chart.ctx.beginPath();
        chart.ctx.moveTo(x, top);
        chart.ctx.lineTo(x, bottom);
        chart.ctx.stroke();
        chart.ctx.restore();
      }
    }, {
      id: "averageYearDistributionLabels",
      afterDatasetsDraw(chart, args, options) {
        if (!options?.enabled) return;
        const values = options.values || [];
        chart.ctx.save();
        chart.ctx.fillStyle = options.color;
        chart.ctx.font = '600 11px "Noto Sans Thai", system-ui, sans-serif';
        chart.ctx.textAlign = "center";
        chart.getDatasetMeta(0).data.forEach((bar, index) => {
          const item = values[index];
          if (!item) return;
          chart.ctx.fillText(`${item.count} (${item.percentage.toFixed(1)}%)`, bar.x, Math.max(chart.chartArea.top + 12, bar.y - 8));
        });
        chart.ctx.restore();
      }
    }, {
      id: "averageYearBoxPlot",
      afterDatasetsDraw(chart, args, options) {
        if (!options?.enabled) return;
        const values = options.values || [];
        const colors = chartColors();
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        if (!xScale || !yScale) return;
        chart.ctx.save();
        values.forEach((item, index) => {
          const palette = colors.subjectPalette[index % colors.subjectPalette.length];
          const y = yScale.getPixelForValue(index);
          const rowHeight = Math.abs(yScale.getPixelForValue(index + .5) - yScale.getPixelForValue(index - .5));
          const boxHeight = Math.min(26, Math.max(14, rowHeight * .55 || 18));
          const minX = xScale.getPixelForValue(item.min);
          const q1X = xScale.getPixelForValue(item.q1);
          const medianX = xScale.getPixelForValue(item.median);
          const q3X = xScale.getPixelForValue(item.q3);
          const maxX = xScale.getPixelForValue(item.max);
          chart.ctx.strokeStyle = item.median < PASS_SCORE ? colors.warning : palette.stroke;
          chart.ctx.fillStyle = item.median < PASS_SCORE ? "rgba(180, 83, 9, .16)" : palette.fill;
          chart.ctx.lineWidth = 1.5;
          chart.ctx.beginPath();
          chart.ctx.moveTo(minX, y);
          chart.ctx.lineTo(maxX, y);
          chart.ctx.moveTo(minX, y - boxHeight * .35);
          chart.ctx.lineTo(minX, y + boxHeight * .35);
          chart.ctx.moveTo(maxX, y - boxHeight * .35);
          chart.ctx.lineTo(maxX, y + boxHeight * .35);
          chart.ctx.stroke();
          chart.ctx.fillRect(q1X, y - boxHeight / 2, Math.max(1, q3X - q1X), boxHeight);
          chart.ctx.strokeRect(q1X, y - boxHeight / 2, Math.max(1, q3X - q1X), boxHeight);
          chart.ctx.beginPath();
          chart.ctx.moveTo(medianX, y - boxHeight / 2);
          chart.ctx.lineTo(medianX, y + boxHeight / 2);
          chart.ctx.stroke();
        });
        chart.ctx.restore();
      }
    });
  }

  function baseChartOptions(maxValue = 100) {
    const colors = chartColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", intersect: true },
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, max: maxValue, grid: { color: colors.border }, ticks: { color: colors.muted } },
        y: { grid: { display: false }, ticks: { color: colors.muted, autoSkip: false } }
      }
    };
  }

  function viewRoom(roomId) {
    if (state.mode === "overview") state.overviewReturnFilters = { ...state.filters };
    const room = state.maps.classrooms.get(roomId);
    if (!room) return;
    els.grade.value = room.gradeId;
    populatePlans(room.planId);
    syncClassrooms(roomId);
    runSearch();
  }

  function returnToOverview() {
    // without saved filters (searched a room directly) go back to every room of the same grade
    const filters = state.overviewReturnFilters || { academicYear: els.academicYear.value, semester: els.semester.value, grade: els.grade.value, plan: els.plan.value, classroom: "all", status: els.status.value, keyword: "" };
    els.academicYear.value = filters.academicYear;
    populateSemesters(filters.semester);
    populateGrades(filters.grade);
    populatePlans(filters.plan);
    syncClassrooms(filters.classroom);
    els.status.value = filters.status;
    els.keyword.value = filters.keyword || "";
    state.overviewReturnFilters = null;
    runSearch();
  }

  function renderClassAverageChart(data) {
    const colors = chartColors();
    const options = baseChartOptions(4);
    options.indexAxis = "y";
    options.plugins.averageYearPassLine = { enabled: true, value: 2, color: colors.warning };
    options.plugins.tooltip = {
      callbacks: {
        title: (items) => data[items[0].dataIndex].label,
        label: (context) => {
          const item = data[context.dataIndex];
          return [`เกรดเฉลี่ย ${format(item.averageGradePoint)}`, `นักเรียน ${item.studentCount} คน`, `ต่ำกว่าเกณฑ์ ${item.belowCount} คน`];
        }
      }
    };
    options.onClick = (event, elements) => {
      if (!elements.length) return;
      const item = data[elements[0].index];
      viewRoom(item.roomId);
    };
    state.averageComparisonChart = new Chart(els.comparisonCanvas, {
      type: "bar",
      data: { labels: data.map((item) => item.label), datasets: [{ data: data.map((item) => item.averageGradePoint), backgroundColor: data.map((item) => item.averageGradePoint < 2 ? colors.warning : colors.primary), borderRadius: 3, barThickness: 22 }] },
      options
    });
  }

  function renderSubjectLegend(data) {
    if (!els.subjectLegend) return;
    const colors = chartColors();
    els.subjectLegend.classList.toggle("hidden", state.mode !== "detail" || !data.length);
    els.subjectLegend.innerHTML = data.map((item, index) => {
      const color = item.median < PASS_SCORE ? colors.warning : colors.subjectPalette[index % colors.subjectPalette.length].stroke;
      return `<span class="${UI.legendItem}"><span class="${UI.legendSwatch}" style="background:${color}"></span>${escapeHtml(item.name)}</span>`;
    }).join("");
  }

  function focusSubjectColumns(subjectId) {
    if (!state.visibleSubjectIds.has(subjectId)) {
      state.visibleSubjectIds.add(subjectId);
      renderTable();
      renderSubjectPanel();
    }
    requestAnimationFrame(() => {
      const cells = [...els.table.querySelectorAll(`[data-subject-id="${subjectId}"]`)];
      const header = cells[0];
      if (!header) return;
      // 574px of sticky columns stay on the left: scroll the subject just past them
      els.tableWrap?.scrollTo({ left: Math.max(0, header.offsetLeft - 590), behavior: "smooth" });
      const setHighlight = (cell, on) => { cell.toggleAttribute("data-subject-highlighted", on); cell.classList.toggle(UI.subjectHighlight, on); };
      els.table.querySelectorAll("[data-subject-highlighted]").forEach((cell) => setHighlight(cell, false));
      cells.forEach((cell) => setHighlight(cell, true));
      clearTimeout(state.subjectHighlightTimer);
      state.subjectHighlightTimer = setTimeout(() => cells.forEach((cell) => setHighlight(cell, false)), 2200);
    });
  }

  function renderSubjectBoxPlotChart(data) {
    const colors = chartColors();
    const options = baseChartOptions();
    options.indexAxis = "y";
    options.scales.y.min = -.5;
    options.scales.y.max = data.length - .5;
    options.scales.y.ticks.stepSize = 1;
    options.scales.y.ticks.callback = (value) => data[value]?.label || "";
    options.plugins.averageYearPassLine = { enabled: true, value: PASS_SCORE, color: colors.warning };
    options.plugins.averageYearBoxPlot = { enabled: true, values: data };
    options.plugins.tooltip = {
      callbacks: {
        title: (items) => `${data[items[0].dataIndex].code} · ${data[items[0].dataIndex].name}`,
        label: (context) => {
          const item = data[context.dataIndex];
          return [`มัธยฐาน ${format(item.median)}`, `Q1 ${format(item.q1)} · Q3 ${format(item.q3)}`, `สูงสุด ${format(item.max)} · ต่ำสุด ${format(item.min)}`, `คะแนนครบ ${item.completeCount}/${item.totalCount} คน`, `คะแนนไม่ครบ ${item.missingCount} คน`];
        }
      }
    };
    options.onClick = (event, elements) => {
      if (elements.length) focusSubjectColumns(data[elements[0].index].subjectId);
    };
    state.averageComparisonChart = new Chart(els.comparisonCanvas, {
      type: "scatter",
      data: { labels: data.map((item) => item.label), datasets: [{ data: data.map((item, index) => ({ x: item.median, y: index })), pointRadius: 0, pointHitRadius: 12, pointHoverRadius: 0, showLine: false }] },
      options
    });
  }

  function smoothDistributionCounts(data) {
    return data.map((item, index) => {
      const previous = data[index - 1]?.count ?? item.count;
      const next = data[index + 1]?.count ?? item.count;
      return (previous + item.count * 2 + next) / 4;
    });
  }

  function renderScoreDistributionChart(data) {
    const colors = chartColors();
    const options = baseChartOptions();
    options.layout = { padding: { top: 24 } };
    options.plugins.averageYearDistributionLabels = { enabled: true, values: data, color: colors.muted };
    options.plugins.tooltip = { callbacks: { label: (context) => { const item = data[context.dataIndex]; return `${item.count} คน (${item.percentage.toFixed(1)}%)`; } } };
    options.scales.y.ticks.precision = 0;
    options.scales.y.title = { display: true, text: "จำนวนนักเรียน", color: colors.muted };
    options.scales.x = { grid: { display: false }, ticks: { color: colors.muted, autoSkip: false, maxRotation: 0 } };
    options.onClick = (event, elements) => {
      if (elements.length) applyScoreRangeFilter(data[elements[0].index].range);
    };
    state.scoreDistributionChart = new Chart(els.distributionCanvas, {
      type: "bar",
      data: {
        labels: data.map((item) => item.label),
        datasets: [
          { type: "bar", data: data.map((item) => item.count), backgroundColor: data.map((item) => state.scoreRangeFilter?.label === item.label ? colors.selected : colors.primary), borderRadius: 3, maxBarThickness: 44 },
          { type: "line", data: smoothDistributionCounts(data), borderColor: colors.warning, backgroundColor: "transparent", borderWidth: 2, tension: .35, pointRadius: 0, pointHitRadius: 0 }
        ]
      },
      options
    });
  }

  function toggleChartEmpty(canvas, empty, hasData) {
    canvas.classList.toggle("hidden", !hasData);
    empty.classList.toggle("hidden", hasData);
  }

  function renderVisualization() {
    destroyAverageScoreYearCharts();
    updateVisualizationFilterChip();
    els.comparisonWrap.dataset.mode = state.mode;
    els.comparisonTitle.textContent = state.mode === "detail" ? "การกระจายคะแนนรายวิชา" : "เกรดเฉลี่ยแยกตามห้องเรียน";
    if (els.thresholdLabel) els.thresholdLabel.textContent = state.mode === "detail" ? "เกณฑ์ 60 คะแนน" : "เกณฑ์ GPA 2";
    els.comparisonCanvas.setAttribute("aria-label", state.mode === "detail" ? "กราฟ box plot การกระจายคะแนนรายวิชา" : "กราฟเปรียบเทียบเกรดเฉลี่ยรายห้องเรียน");
    const comparisonData = state.mode === "detail" ? buildSubjectBoxPlotData() : buildClassAverageChartData();
    const distributionData = buildScoreDistributionData();
    const hasComparison = comparisonData.length > 0;
    const hasDistribution = distributionData.some((item) => item.count > 0);
    toggleChartEmpty(els.comparisonCanvas, els.comparisonEmpty, hasComparison);
    toggleChartEmpty(els.distributionCanvas, els.distributionEmpty, hasDistribution);
    renderSubjectLegend(state.mode === "detail" ? comparisonData : []);
    if (!window.Chart) return;
    registerChartPlugins();
    if (hasComparison) state.mode === "detail" ? renderSubjectBoxPlotChart(comparisonData) : renderClassAverageChart(comparisonData);
    if (hasDistribution) renderScoreDistributionChart(distributionData);
  }
  function studentCell(row) { return `<td class="${UI.colNo} ${UI.stickyBody}">${row.index}</td><td class="${UI.colId} ${UI.stickyBody}">${escapeHtml(row.student.code)}</td><td class="${UI.colName} ${UI.stickyBody}">${escapeHtml(row.student.name)}</td>`; }
  function renderOverviewTable() { els.tableTitle.textContent = "ภาพรวมรายห้อง"; els.thead.innerHTML = `<tr><th class="${UI.overviewText}">ระดับชั้น</th><th class="${UI.overviewText}">ห้องเรียน</th><th class="${UI.overviewText}">แผนการเรียน</th><th>จำนวนนักเรียน</th><th>เกรดเฉลี่ยของห้อง</th><th>นักเรียนต่ำกว่าเกณฑ์</th><th>ยังไม่กรอกคะแนน</th><th class="${UI.overviewAction}">การดำเนินการ</th></tr>`; els.tbody.innerHTML = state.overviewRows?.length ? state.overviewRows.map((row) => { const grade = state.maps.grades.get(row.room.gradeId); const plan = state.maps.plans.get(row.room.planId); return `<tr><td class="${UI.overviewText}">${grade.name}</td><td class="${UI.overviewText}">${row.room.name}</td><td class="${UI.overviewText}">${plan.name}</td><td class="${UI.overviewNumber}">${row.count}</td><td class="${UI.overviewNumber}">${format(average(row.rows.map((item) => item.summary.averageGradePoint)))}</td><td class="${UI.overviewNumber}">${row.belowCount}</td><td class="${UI.overviewNumber}">${row.incompleteCount}</td><td class="${UI.overviewAction}"><button class="${UI.btnSecondarySmall}" type="button" data-view-room="${row.room.id}">ดูรายละเอียด</button></td></tr>`; }).join("") : `<tr><td colspan="8">${emptyState("ไม่พบข้อมูลตามเงื่อนไขที่เลือก")}</td></tr>`; }
  function subjectHeader(subject) { return `<th colspan="5" class="${UI.subjectHead}" data-subject-id="${subject.id}"><span class="${UI.subjectHeadName}">${escapeHtml(subject.name)}</span><small>${escapeHtml(subject.code)} | ${subject.credit} หน่วยกิต</small></th>`; }
  function cell(value, max, missingTitle = "ยังไม่ได้บันทึกคะแนน") { return Number.isFinite(value) ? `<span>${format(value)}</span><small>[${format(max)}]</small>` : `<span title="${missingTitle}">-</span><small>ไม่มีข้อมูล</small>`; }
  function renderDetailTable() { els.tableTitle.textContent = "รายละเอียดคะแนนรายนักเรียน"; const subjects = state.db.subjects.filter((subject) => state.visibleSubjectIds.has(subject.id)); const subjectGroups = subjects.map(subjectHeader).join(""); els.thead.innerHTML = `<tr><th rowspan="3" class="${UI.colNo}">ลำดับ</th><th rowspan="3" class="${UI.colId}">รหัสนักเรียน</th><th rowspan="3" class="${UI.colName}">ชื่อ-สกุล</th><th rowspan="3" class="${UI.colGrade}">เกรดเฉลี่ย</th><th rowspan="3" class="${UI.colRank}">อันดับ</th>${subjectGroups}</tr><tr>${subjects.map((subject) => `<th class="${UI.groupStart}" data-subject-id="${subject.id}">ภาค 1</th><th data-subject-id="${subject.id}">ภาค 2</th><th data-subject-id="${subject.id}">รวมปี</th><th data-subject-id="${subject.id}">เฉลี่ย</th><th data-subject-id="${subject.id}">ระดับ</th>`).join("")}</tr><tr>${subjects.map((subject) => `<th class="${UI.maxScore} ${UI.groupStart}" data-subject-id="${subject.id}">เต็ม ${subject.semester1MaxScore}</th><th class="${UI.maxScore}" data-subject-id="${subject.id}">เต็ม ${subject.semester2MaxScore}</th><th class="${UI.maxScore}" data-subject-id="${subject.id}">เต็ม ${subject.semester1MaxScore + subject.semester2MaxScore}</th><th class="${UI.maxScore}" data-subject-id="${subject.id}">เต็ม 100</th><th class="${UI.maxScore}" data-subject-id="${subject.id}">เต็ม 4.0</th>`).join("")}</tr>`; els.tbody.innerHTML = state.rows.length ? state.rows.map((row, index) => { row.index = index + 1; const subjectCells = subjects.map((subject) => { const result = row.subjectResults.find((item) => item.subjectId === subject.id); const attr = `data-subject-id="${subject.id}"`; return `<td class="${UI.numberCell} ${UI.groupStart}" ${attr}><div class="${UI.scoreCell}">${cell(result.semester1Score, result.semester1MaxScore)}</div></td><td class="${UI.numberCell}" ${attr}><div class="${UI.scoreCell}">${cell(result.semester2Score, result.semester2MaxScore)}</div></td><td class="${UI.numberCell}" ${attr}>${cell(result.totalScore, result.totalMaxScore)}</td><td class="${UI.numberCell}" ${attr}>${format(result.averageScore)}</td><td class="${UI.gradeCell}" ${attr}><span class="${UI.gradeChip[scoreTone(result.averageScore)]}">${getGradeLabel(result.averageScore)}<small>${format(result.gradePoint)}</small></span></td>`; }).join(""); return `<tr>${studentCell(row)}<td class="${UI.colGrade} ${UI.stickyBody}"><span class="${UI.gradeChip[scoreTone(row.summary.averageScore)]}">${format(row.summary.averageGradePoint)}</span></td><td class="${UI.colRank} ${UI.stickyBody}"><span class="${UI.rankChip}">${row.summary.rank}</span></td>${subjectCells}</tr>`; }).join("") : `<tr><td colspan="${5 + subjects.length * 5}">${emptyState("ไม่พบข้อมูลตามเงื่อนไขที่เลือก")}</td></tr>`; }
  function renderTable() { els.table.dataset.mode = state.mode; state.mode === "detail" ? renderDetailTable() : renderOverviewTable(); }
  function renderSubjectPanel() { els.subjectPanel.innerHTML = `<div class="${UI.subjectPanelHeader}"><strong class="${UI.subjectPanelTitle}">เลือกวิชา</strong><div class="${UI.subjectPanelActions}"><button class="${UI.btnSecondarySmall}" type="button" data-subject-action="all">เลือกทั้งหมด</button><button class="${UI.btnSecondarySmall}" type="button" data-subject-action="none">ล้างการเลือก</button><button class="${UI.btnPrimarySmall}" type="button" data-subject-action="apply">ใช้งาน</button></div></div><input class="${UI.subjectSearch}" data-subject-search type="search" placeholder="ค้นหารหัสวิชาหรือชื่อวิชา" aria-label="ค้นหารายวิชา" /><div class="${UI.subjectList}" data-subject-list>${state.db.subjects.map((subject) => `<label class="${UI.subjectOption}"><input class="${UI.subjectCheckbox}" type="checkbox" value="${subject.id}" ${state.visibleSubjectIds.has(subject.id) ? "checked" : ""} /> ${escapeHtml(subject.code)} ${escapeHtml(subject.name)}</label>`).join("")}</div>`; }
  function updateKeywordResults() { if (!state.initialized) return; state.filters.keyword = els.keyword.value.trim().toLowerCase(); state.scoreRangeFilter = null; if (state.mode === "overview") state.overviewBaseRows = buildOverviewRows(state.eligibleStudents); applyCurrentScoreRange(); renderSummary(); renderVisualization(); renderTable(); }
  function runSearch() { els.tbody.innerHTML = `<tr><td>${emptyState("กำลังประมวลผลคะแนนเฉลี่ยรายปี...")}</td></tr>`; state.filters = getFilters(); state.eligibleStudents = getEligibleStudents(); state.mode = state.filters.classroom === "all" ? "overview" : "detail"; if (state.mode === "overview") state.overviewReturnFilters = null; state.scoreRangeFilter = null; if (state.mode === "detail") { state.baseRows = buildStudentAnnualRows(state.eligibleStudents); } else { state.overviewBaseRows = buildOverviewRows(state.eligibleStudents); } applyCurrentScoreRange(); state.initialized = true; renderSummary(); renderVisualization(); renderTable(); renderSubjectPanel(); saveLastSearch(); [els.subjectBtn, els.export, els.print].forEach((button) => { button.disabled = !state.eligibleStudents.length; }); }
  function resetFilters() { const saved = {}; els.academicYear.value = getCurrentYear().id; syncFilterDependencies(saved); els.status.value = "active"; els.keyword.value = ""; runSearch(); }
  function showPrintDialog() { if (typeof els.dialog.showModal === "function") els.dialog.showModal(); else els.dialog.removeAttribute("open"); els.printPreview.innerHTML = ""; }
  function buildPrintPreview() { const individual = $("averageYearPrintType").value === "individual"; const source = state.mode === "detail" ? state.rows : (state.overviewRows || []).flatMap((item) => item.rows); const rows = individual ? source.slice(0, 1) : source.slice(0, 5); els.printPreview.innerHTML = `<div class="${UI.printPreview}"><strong class="${UI.printPreviewTitle}">${individual ? "ตัวอย่างรายงานรายบุคคล" : "ตัวอย่างรายงานทั้งห้อง"}</strong><span class="${UI.printPreviewScope}">${escapeHtml(els.scope.textContent)}</span><div class="${UI.printPreviewRows}">${rows.map((row, index) => `<div>${index + 1}. ${escapeHtml(row.student.code)} ${escapeHtml(row.student.name)} | ${format(row.summary.averageScore)} | ${getGradeLabel(row.summary.averageScore)}</div>`).join("") || "ไม่พบข้อมูลตามเงื่อนไขที่เลือก"}</div></div>`; }
  function attachEvents() { els.form.addEventListener("submit", (event) => { event.preventDefault(); state.overviewReturnFilters = null; runSearch(); }); els.reset.addEventListener("click", resetFilters); els.backOverview?.addEventListener("click", returnToOverview); els.clearRangeFilter.addEventListener("click", () => clearVisualizationFilter()); document.querySelector('[data-system="average-score-year"]')?.addEventListener("click", () => setTimeout(renderVisualization, 0)); els.academicYear.addEventListener("change", () => { populateSemesters("all"); syncSearchButton(); }); els.grade.addEventListener("change", () => { populatePlans("all"); syncClassrooms("all"); }); els.plan.addEventListener("change", () => syncClassrooms("all")); let keywordTimer; els.keyword.addEventListener("input", () => { clearTimeout(keywordTimer); keywordTimer = setTimeout(updateKeywordResults, 250); }); els.subjectBtn.addEventListener("click", () => els.subjectPanel.classList.toggle("hidden")); els.subjectPanel.addEventListener("input", (event) => { if (!event.target.matches("[data-subject-search]")) return; const keyword = event.target.value.trim().toLowerCase(); els.subjectPanel.querySelectorAll("[data-subject-list] label").forEach((label) => { label.classList.toggle("hidden", !label.textContent.toLowerCase().includes(keyword)); }); }); els.subjectPanel.addEventListener("click", (event) => { const action = event.target.closest("[data-subject-action]")?.dataset.subjectAction; if (!action) return; if (action === "all") els.subjectPanel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = true; }); if (action === "none") els.subjectPanel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = false; }); if (action === "apply") { state.visibleSubjectIds = new Set([...els.subjectPanel.querySelectorAll("input:checked")].map((input) => input.value)); els.subjectPanel.classList.add("hidden"); renderTable(); } }); els.tbody.addEventListener("click", (event) => { const button = event.target.closest("[data-view-room]"); if (!button) return; viewRoom(button.dataset.viewRoom); }); els.print.addEventListener("click", showPrintDialog); els.export.addEventListener("click", () => { showPrintDialog(); setTimeout(buildPrintPreview, 0); }); els.buildPreview.addEventListener("click", buildPrintPreview); }
  function initializeAverageScoreYearPage() { state.db = buildInlineMockDatabase(); state.maps = { academicYears: mapById(state.db.academicYears), semesters: mapById(state.db.semesters), grades: mapById(state.db.grades), plans: mapById(state.db.plans), classrooms: mapById(state.db.classrooms), subjects: mapById(state.db.subjects) }; const saved = loadSavedFilters(); populateAcademicYears(saved); syncFilterDependencies(saved); state.subjects = state.db.subjects; state.visibleSubjectIds = new Set(state.db.subjects.map((subject) => subject.id)); els.current.textContent = `${state.maps.academicYears.get(els.academicYear.value).name} / ทั้งปีการศึกษา`; attachEvents(); syncSearchButton(); runSearch(); }
  initializeAverageScoreYearPage();
})();
