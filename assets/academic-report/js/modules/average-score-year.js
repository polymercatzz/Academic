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
  const statusLabels = { active: "กำลังศึกษา", watch: "ต้องติดตาม", excellent: "ผลการเรียนดีเด่น" };
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $("averageYearFiltersForm"), academicYear: $("averageYearAcademicYear"), semester: $("averageYearSemester"),
    grade: $("averageYearGrade"), plan: $("averageYearPlan"), classroom: $("averageYearClassroom"), status: $("averageYearStatus"), keyword: $("averageYearKeyword"),
    search: $("averageYearSearchBtn"), reset: $("averageYearResetFiltersBtn"), current: $("averageYearCurrentAcademicLabel"), scope: $("averageYearSummaryScope"),
    summary: $("averageYearSummaryGrid"), tableTitle: $("averageYearTableTitle"), thead: $("averageYearThead"), tbody: $("averageYearTbody"), subjectBtn: $("averageYearSubjectBtn"), subjectPanel: $("averageYearSubjectPanel"), export: $("averageYearExportBtn"), print: $("averageYearPrintBtn"),
    dialog: $("averageYearPrintDialog"), buildPreview: $("averageYearBuildPreviewBtn"), printPreview: $("averageYearPrintPreview"),
    visualizationPanel: document.querySelector(".average-year-visualization-panel"), comparisonTitle: $("averageYearComparisonTitle"),
    thresholdLabel: document.querySelector(".average-year-comparison-panel .score-threshold-label"), subjectLegend: $("averageYearSubjectLegend"), backOverview: $("averageYearBackOverviewBtn"),
    comparisonCanvas: $("averageYearComparisonChart"), comparisonEmpty: $("averageYearComparisonEmpty"),
    distributionCanvas: $("averageYearDistributionChart"), distributionEmpty: $("averageYearDistributionEmpty"),
    rangeFilter: $("averageYearRangeFilter"), rangeFilterLabel: $("averageYearRangeFilterLabel"), clearRangeFilter: $("averageYearClearRangeFilterBtn")
  };
  if (!els.form) return;

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

  function buildInlineMockDatabase() {
    const academicYears = [{ id: "ay-2568", name: "2568", isCurrent: true }, { id: "ay-2567", name: "2567", isCurrent: false }];
    const semesters = academicYears.flatMap((year) => [1, 2].map((term) => ({ id: `${year.id}-${term}`, academicYearId: year.id, term, name: `ภาคเรียนที่ ${term}/${year.name}` })));
    const grades = [{ id: "grade-m1", name: "ม.1", order: 1 }, { id: "grade-m2", name: "ม.2", order: 2 }, { id: "grade-m3", name: "ม.3", order: 3 }];
    const plans = [{ id: "general", name: "แผนทั่วไป" }, { id: "science", name: "วิทย์-คณิต" }, { id: "language", name: "ภาษา" }];
    const classrooms = [
      { id: "room-m1-1", gradeId: "grade-m1", name: "ม.1/1", planId: "general" }, { id: "room-m1-2", gradeId: "grade-m1", name: "ม.1/2", planId: "language" },
      { id: "room-m2-1", gradeId: "grade-m2", name: "ม.2/1", planId: "science" }, { id: "room-m3-1", gradeId: "grade-m3", name: "ม.3/1", planId: "science" }
    ];
    const names = ["ณัฐกานต์ ศรีสุข", "พิมพ์ชนก วงศ์ดี", "ภาคิน แสงทอง", "มนัสนันท์ ใจมั่น", "ศุภวิชญ์ เจริญผล", "อริสรา พูลทรัพย์", "กมลชนก พรหมมา", "พีรพัฒน์ วงศ์ดี", "ปวริศา ศรีสวัสดิ์", "ชยพล แสงทอง"];
    const roomStudentCounts = [4, 2, 2, 2];
    const students = []; let nameIndex = 0;
    classrooms.forEach((room, roomIndex) => { for (let i = 0; i < roomStudentCounts[roomIndex]; i += 1) { students.push({ id: `student-${5104 + nameIndex}`, code: `${5104 + nameIndex}`, name: names[nameIndex], classroomId: room.id, status: nameIndex === 3 || nameIndex === 7 ? "watch" : nameIndex === 1 || nameIndex === 5 || nameIndex === 8 ? "excellent" : "active" }); nameIndex += 1; } });
    const subjectNames = [["th", "ภาษาไทย", 1.5], ["ma", "คณิตศาสตร์", 1.5], ["sc", "วิทยาศาสตร์", 1.5], ["en", "ภาษาอังกฤษ", 1], ["so", "สังคมศึกษา", .5], ["hi", "ประวัติศาสตร์", .5], ["he", "สุขศึกษา", .5], ["ar", "ศิลปะ", .5], ["co", "คอมพิวเตอร์", .5], ["ca", "การงานอาชีพ", .5], ["fo", "ภาษาอังกฤษพื้นฐาน", 1.5], ["club", "ชุมนุม 1", .5]];
    const subjects = subjectNames.map(([id, name, credit], index) => ({ id: `subject-${id}`, code: `${id.toUpperCase()}${21101 + index}`, name, credit, semester1MaxScore: 100, semester2MaxScore: 100 }));
    const scoreRecords = [];
    students.forEach((student, studentIndex) => academicYears.forEach((year, yearIndex) => semesters.filter((semester) => semester.academicYearId === year.id).forEach((semester) => subjects.forEach((subject, subjectIndex) => {
      const missing = (studentIndex + subjectIndex + semester.term + yearIndex) % 19 === 0;
      const raw = 57 + ((studentIndex * 8) + (subjectIndex * 5) + (semester.term * 4) + (yearIndex ? -2 : 2)) % 39;
      const score = Math.max(45, Math.min(99, raw - (student.status === "watch" ? 7 : 0)));
      scoreRecords.push({ academicYearId: year.id, semesterId: semester.id, studentId: student.id, subjectId: subject.id, score: missing ? null : score, maxScore: 100, status: missing ? "missing" : "complete" });
    }))));
    return { academicYears, semesters, grades, plans, classrooms, students, subjects, scoreRecords };
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
  function buildSubjectAnnualResult(studentId, subject) { const semesters = selectedSemesters(); const records = state.db.scoreRecords.filter((record) => record.academicYearId === state.filters.academicYear && record.studentId === studentId && record.subjectId === subject.id && semesters.some((semester) => semester.id === record.semesterId)); const first = records.find((record) => state.maps.semesters.get(record.semesterId).term === 1); const second = records.find((record) => state.maps.semesters.get(record.semesterId).term === 2); const useFirst = state.filters.semester === "all" || state.maps.semesters.get(state.filters.semester)?.term === 1; const useSecond = state.filters.semester === "all" || state.maps.semesters.get(state.filters.semester)?.term === 2; const semester1Score = useFirst ? first?.score ?? null : null; const semester2Score = useSecond ? second?.score ?? null : null; const semester1MaxScore = useFirst ? (first?.maxScore ?? subject.semester1MaxScore) : 0; const semester2MaxScore = useSecond ? (second?.maxScore ?? subject.semester2MaxScore) : 0; const totalMaxScore = semester1MaxScore + semester2MaxScore; const totalScore = sum([semester1Score, semester2Score]); const isComplete = (!useFirst || Number.isFinite(semester1Score)) && (!useSecond || Number.isFinite(semester2Score)); const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : null; return { subjectId: subject.id, subjectCode: subject.code, subjectName: subject.name, credit: subject.credit, semester1Score, semester1MaxScore, semester2Score, semester2MaxScore, totalScore, totalMaxScore, averageScore, gradePoint: convertScoreToGradePoint(averageScore), isComplete }; }
  function calculateStudentAnnualSummary(student, subjectResults) { const totalScore = sum(subjectResults.map((item) => item.totalScore)); const totalMaxScore = sum(subjectResults.map((item) => item.totalMaxScore)); const valid = subjectResults.filter((item) => Number.isFinite(item.gradePoint)); const creditTotal = sum(valid.map((item) => item.credit)); const averageGradePoint = creditTotal ? sum(valid.map((item) => item.gradePoint * item.credit)) / creditTotal : average(valid.map((item) => item.gradePoint)) || 0; return { totalScore, totalMaxScore, averageScore: totalMaxScore ? totalScore / totalMaxScore * 100 : null, averageGradePoint, rank: 0, incompleteCount: subjectResults.filter((item) => !item.isComplete).length, expectedCount: subjectResults.length * selectedSemesters().length, recordedCount: subjectResults.reduce((count, item) => count + [item.semester1Score, item.semester2Score].filter(Number.isFinite).length, 0) }; }
  function assignCompetitionRanks(rows) { let previous = null; let rank = 0; rows.forEach((row, index) => { if (row.summary.averageScore !== previous) rank = index + 1; row.summary.rank = rank; previous = row.summary.averageScore; }); return rows; }
  function buildStudentAnnualRows(students) { const subjects = state.db.subjects; const rows = students.map((student) => { const subjectResults = subjects.map((subject) => buildSubjectAnnualResult(student.id, subject)); return { student, subjectResults, summary: calculateStudentAnnualSummary(student, subjectResults) }; }).sort((a, b) => (b.summary.averageScore || 0) - (a.summary.averageScore || 0) || a.student.code.localeCompare(b.student.code)); return assignCompetitionRanks(rows); }
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

  function renderMetric(label, value, tone = "") {
    return `<article class="metric${tone ? ` ${tone}` : ""}"><p class="metric-label">${label}</p><p class="metric-value">${value}</p></article>`;
  }

  function renderSummary() {
    const students = state.mode === "detail" ? state.rows : state.overviewRows.flatMap((item) => item.rows);
    const expected = students.reduce((count, row) => count + row.summary.expectedCount, 0);
    const recorded = students.reduce((count, row) => count + row.summary.recordedCount, 0);
    const missing = Math.max(0, expected - recorded);
    const lowCount = students.filter((row) => Number.isFinite(row.summary.averageScore) && row.summary.averageScore < PASS_SCORE).length;
    const averagePoint = average(students.map((row) => row.summary.averageGradePoint));
    els.summary.classList.toggle("is-overview", state.mode === "overview");
    els.summary.classList.toggle("is-detail", state.mode === "detail");
    els.backOverview?.classList.toggle("hidden", state.mode !== "detail" || !state.overviewReturnFilters);
    els.summary.innerHTML = [
      renderMetric("นักเรียนทั้งหมด", students.length, "metric-total"),
      renderMetric("เกรดเฉลี่ยรวม", format(averagePoint), "metric-total"),
      renderMetric("นักเรียนต่ำกว่าเกณฑ์", lowCount, lowCount > 0 ? "metric-warning" : ""),
      renderMetric("ความครบถ้วนการกรอกคะแนน", expected ? `${format(recorded / expected * 100)}%` : "-"),
      renderMetric("คะแนนที่ยังไม่บันทึก", missing)
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
    const styles = getComputedStyle(document.documentElement);
    return {
      primary: styles.getPropertyValue("--primary").trim() || "#315d7d",
      warning: styles.getPropertyValue("--warning").trim() || "#a56625",
      muted: styles.getPropertyValue("--muted").trim() || "#64748b",
      border: styles.getPropertyValue("--border-soft").trim() || "#dce3ea",
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
          chart.ctx.fillStyle = item.median < PASS_SCORE ? "rgba(165, 102, 37, .16)" : palette.fill;
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
    const filters = state.overviewReturnFilters;
    if (!filters) return;
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
      return `<span class="average-year-legend-item"><span class="average-year-legend-swatch" style="background:${color}"></span>${escapeHtml(item.name)}</span>`;
    }).join("");
  }

  function focusSubjectColumns(subjectId) {
    if (!state.visibleSubjectIds.has(subjectId)) {
      state.visibleSubjectIds.add(subjectId);
      renderTable();
      renderSubjectPanel();
    }
    requestAnimationFrame(() => {
      const cells = [...els.thead.closest("table").querySelectorAll(`[data-subject-id="${subjectId}"]`)];
      const header = cells[0];
      if (!header) return;
      const wrapper = header.closest(".average-year-table-wrap");
      wrapper?.scrollTo({ left: Math.max(0, header.offsetLeft - 820), behavior: "smooth" });
      els.thead.closest("table").querySelectorAll(".is-subject-highlighted").forEach((cell) => cell.classList.remove("is-subject-highlighted"));
      cells.forEach((cell) => cell.classList.add("is-subject-highlighted"));
      clearTimeout(state.subjectHighlightTimer);
      state.subjectHighlightTimer = setTimeout(() => cells.forEach((cell) => cell.classList.remove("is-subject-highlighted")), 2200);
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
    els.visualizationPanel.classList.toggle("is-detail", state.mode === "detail");
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
  function studentCell(row) { return `<td class="sticky-col-score-no">${row.index}</td><td class="sticky-col-score-id">${escapeHtml(row.student.code)}</td><td class="sticky-col-score-name average-year-student-name">${escapeHtml(row.student.name)}</td>`; }
  function renderOverviewTable() { els.tableTitle.textContent = "ภาพรวมรายห้อง"; els.thead.innerHTML = `<tr><th>ระดับชั้น</th><th>ห้องเรียน</th><th>แผนการเรียน</th><th>จำนวนนักเรียน</th><th>คะแนนเต็มรวม</th><th>คะแนนเฉลี่ยของห้อง</th><th>ระดับผลการเรียนเฉลี่ย</th><th>คะแนนสูงสุด</th><th>คะแนนต่ำสุด</th><th>ต่ำกว่าเกณฑ์</th><th>คะแนนไม่ครบ</th><th>การดำเนินการ</th></tr>`; els.tbody.innerHTML = state.overviewRows?.length ? state.overviewRows.map((row) => { const grade = state.maps.grades.get(row.room.gradeId); const plan = state.maps.plans.get(row.room.planId); return `<tr><td>${grade.name}</td><td>${row.room.name}</td><td>${plan.name}</td><td>${row.count}</td><td>${format(row.totalMaxScore)}</td><td>${format(row.averageScore)}</td><td>${getGradeLabel(row.averageScore)} (${format(row.gradePoint)})</td><td>${format(row.highestScore)}</td><td>${format(row.lowestScore)}</td><td>${row.belowCount}</td><td>${row.incompleteCount}</td><td><button class="btn btn-secondary btn-small" type="button" data-view-room="${row.room.id}">ดูรายละเอียด</button></td></tr>`; }).join("") : `<tr><td colspan="12"><div class="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td></tr>`; }
  function subjectHeader(subject) { return `<th colspan="5" class="average-year-subject-head" data-subject-id="${subject.id}"><span>${escapeHtml(subject.name)}</span><small>${escapeHtml(subject.code)} | ${subject.credit} หน่วยกิต</small></th>`; }
  function cell(value, max, missingTitle = "ยังไม่ได้บันทึกคะแนน") { return Number.isFinite(value) ? `<span>${format(value)}</span><small>[${format(max)}]</small>` : `<span title="${missingTitle}">-</span><small>ไม่มีข้อมูล</small>`; }
  function renderDetailTable() { els.tableTitle.textContent = "รายละเอียดคะแนนรายนักเรียน"; const subjects = state.db.subjects.filter((subject) => state.visibleSubjectIds.has(subject.id)); const subjectGroups = subjects.map(subjectHeader).join(""); els.thead.innerHTML = `<tr><th rowspan="3" class="sticky-col-score-no">ลำดับ</th><th rowspan="3" class="sticky-col-score-id">รหัสนักเรียน</th><th rowspan="3" class="sticky-col-score-name">ชื่อ-สกุล</th><th rowspan="3" class="sticky-score-total">คะแนนรวม</th><th rowspan="3" class="sticky-score-average">คะแนนเฉลี่ย</th><th rowspan="3" class="sticky-score-grade">ระดับเฉลี่ย</th><th rowspan="3" class="sticky-score-rank">อันดับ</th>${subjectGroups}</tr><tr>${subjects.map((subject) => `<th data-subject-id="${subject.id}">ภาค 1</th><th data-subject-id="${subject.id}">ภาค 2</th><th data-subject-id="${subject.id}">รวมปี</th><th data-subject-id="${subject.id}">เฉลี่ย</th><th data-subject-id="${subject.id}">ระดับ</th>`).join("")}</tr><tr>${subjects.map((subject) => `<th class="average-year-max-score" data-subject-id="${subject.id}">เต็ม ${subject.semester1MaxScore}</th><th class="average-year-max-score" data-subject-id="${subject.id}">เต็ม ${subject.semester2MaxScore}</th><th class="average-year-max-score" data-subject-id="${subject.id}">เต็ม ${subject.semester1MaxScore + subject.semester2MaxScore}</th><th class="average-year-max-score" data-subject-id="${subject.id}">เต็ม 100</th><th class="average-year-max-score" data-subject-id="${subject.id}">เต็ม 4.0</th>`).join("")}</tr>`; els.tbody.innerHTML = state.rows.length ? state.rows.map((row, index) => { row.index = index + 1; const subjectCells = subjects.map((subject) => { const result = row.subjectResults.find((item) => item.subjectId === subject.id); const attr = `data-subject-id="${subject.id}"`; return `<td class="average-year-number-cell" ${attr}><div class="average-year-score-cell">${cell(result.semester1Score, result.semester1MaxScore)}</div></td><td class="average-year-number-cell" ${attr}><div class="average-year-score-cell">${cell(result.semester2Score, result.semester2MaxScore)}</div></td><td class="average-year-number-cell" ${attr}>${cell(result.totalScore, result.totalMaxScore)}</td><td class="average-year-number-cell" ${attr}>${format(result.averageScore)}</td><td class="average-year-grade-cell" ${attr}><span class="score-grade-chip score-grade-chip-${scoreTone(result.averageScore)}">${getGradeLabel(result.averageScore)}<small>${format(result.gradePoint)}</small></span></td>`; }).join(""); return `<tr>${studentCell(row)}<td class="sticky-score-total">${format(row.summary.totalScore)}<small>[${format(row.summary.totalMaxScore)}]</small></td><td class="sticky-score-average">${format(row.summary.averageScore)}</td><td class="sticky-score-grade"><span class="score-grade-chip score-grade-chip-${scoreTone(row.summary.averageScore)}">${getGradeLabel(row.summary.averageScore)}<small>${format(row.summary.averageGradePoint)}</small></span></td><td class="sticky-score-rank"><span class="average-year-rank-chip">${row.summary.rank}</span></td>${subjectCells}</tr>`; }).join("") : `<tr><td colspan="${7 + subjects.length * 5}"><div class="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div></td></tr>`; }
  function renderTable() { const table = els.thead.closest("table"); table.classList.toggle("is-detail", state.mode === "detail"); table.classList.toggle("is-overview", state.mode === "overview"); state.mode === "detail" ? renderDetailTable() : renderOverviewTable(); }
  function renderSubjectPanel() { els.subjectPanel.innerHTML = `<div class="subject-panel-header"><strong>เลือกวิชา</strong><div><button class="btn btn-small btn-secondary" type="button" data-subject-action="all">เลือกทั้งหมด</button><button class="btn btn-small btn-secondary" type="button" data-subject-action="none">ล้างการเลือก</button><button class="btn btn-small btn-primary" type="button" data-subject-action="apply">ใช้งาน</button></div></div><input class="subject-search" type="search" placeholder="ค้นหารหัสวิชาหรือชื่อวิชา" aria-label="ค้นหารายวิชา" /><div class="subject-check-list">${state.db.subjects.map((subject) => `<label><input type="checkbox" value="${subject.id}" ${state.visibleSubjectIds.has(subject.id) ? "checked" : ""} /> ${escapeHtml(subject.code)} ${escapeHtml(subject.name)}</label>`).join("")}</div>`; }
  function updateKeywordResults() { if (!state.initialized) return; state.filters.keyword = els.keyword.value.trim().toLowerCase(); state.scoreRangeFilter = null; if (state.mode === "overview") state.overviewBaseRows = buildOverviewRows(state.eligibleStudents); applyCurrentScoreRange(); renderSummary(); renderVisualization(); renderTable(); }
  function runSearch() { els.tbody.innerHTML = `<tr><td><div class="empty-state">กำลังประมวลผลคะแนนเฉลี่ยรายปี...</div></td></tr>`; state.filters = getFilters(); state.eligibleStudents = getEligibleStudents(); state.mode = state.filters.classroom === "all" ? "overview" : "detail"; if (state.mode === "overview") state.overviewReturnFilters = null; state.scoreRangeFilter = null; if (state.mode === "detail") { state.baseRows = buildStudentAnnualRows(state.eligibleStudents); } else { state.overviewBaseRows = buildOverviewRows(state.eligibleStudents); } applyCurrentScoreRange(); state.initialized = true; renderSummary(); renderVisualization(); renderTable(); renderSubjectPanel(); saveLastSearch(); [els.subjectBtn, els.export, els.print].forEach((button) => { button.disabled = !state.eligibleStudents.length; }); }
  function resetFilters() { const saved = {}; els.academicYear.value = getCurrentYear().id; syncFilterDependencies(saved); els.status.value = "active"; els.keyword.value = ""; runSearch(); }
  function showPrintDialog() { if (typeof els.dialog.showModal === "function") els.dialog.showModal(); else els.dialog.removeAttribute("open"); els.printPreview.innerHTML = ""; }
  function buildPrintPreview() { const individual = $("averageYearPrintType").value === "individual"; const source = state.mode === "detail" ? state.rows : (state.overviewRows || []).flatMap((item) => item.rows); const rows = individual ? source.slice(0, 1) : source.slice(0, 5); els.printPreview.innerHTML = `<div class="score-print-preview"><strong>${individual ? "ตัวอย่างรายงานรายบุคคล" : "ตัวอย่างรายงานทั้งห้อง"}</strong><span>${escapeHtml(els.scope.textContent)}</span><div class="print-preview-table">${rows.map((row, index) => `<div>${index + 1}. ${escapeHtml(row.student.code)} ${escapeHtml(row.student.name)} | ${format(row.summary.averageScore)} | ${getGradeLabel(row.summary.averageScore)}</div>`).join("") || "ไม่พบข้อมูลตามเงื่อนไขที่เลือก"}</div></div>`; }
  function attachEvents() { els.form.addEventListener("submit", (event) => { event.preventDefault(); state.overviewReturnFilters = null; runSearch(); }); els.reset.addEventListener("click", resetFilters); els.backOverview?.addEventListener("click", returnToOverview); els.clearRangeFilter.addEventListener("click", () => clearVisualizationFilter()); document.querySelector('[data-system="average-score-year"]')?.addEventListener("click", () => setTimeout(renderVisualization, 0)); els.academicYear.addEventListener("change", () => { populateSemesters("all"); syncSearchButton(); }); els.grade.addEventListener("change", () => { populatePlans("all"); syncClassrooms("all"); }); els.plan.addEventListener("change", () => syncClassrooms("all")); let keywordTimer; els.keyword.addEventListener("input", () => { clearTimeout(keywordTimer); keywordTimer = setTimeout(updateKeywordResults, 250); }); els.subjectBtn.addEventListener("click", () => els.subjectPanel.classList.toggle("hidden")); els.subjectPanel.addEventListener("input", (event) => { if (!event.target.matches(".subject-search")) return; const keyword = event.target.value.trim().toLowerCase(); els.subjectPanel.querySelectorAll(".subject-check-list label").forEach((label) => { label.hidden = !label.textContent.toLowerCase().includes(keyword); }); }); els.subjectPanel.addEventListener("click", (event) => { const action = event.target.closest("[data-subject-action]")?.dataset.subjectAction; if (!action) return; if (action === "all") els.subjectPanel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = true; }); if (action === "none") els.subjectPanel.querySelectorAll("input[type=checkbox]").forEach((input) => { input.checked = false; }); if (action === "apply") { state.visibleSubjectIds = new Set([...els.subjectPanel.querySelectorAll("input:checked")].map((input) => input.value)); els.subjectPanel.classList.add("hidden"); renderTable(); } }); els.tbody.addEventListener("click", (event) => { const button = event.target.closest("[data-view-room]"); if (!button) return; viewRoom(button.dataset.viewRoom); }); els.print.addEventListener("click", showPrintDialog); els.export.addEventListener("click", () => { showPrintDialog(); setTimeout(buildPrintPreview, 0); }); els.buildPreview.addEventListener("click", buildPrintPreview); }
  function initializeAverageScoreYearPage() { state.db = buildInlineMockDatabase(); state.maps = { academicYears: mapById(state.db.academicYears), semesters: mapById(state.db.semesters), grades: mapById(state.db.grades), plans: mapById(state.db.plans), classrooms: mapById(state.db.classrooms), subjects: mapById(state.db.subjects) }; const saved = loadSavedFilters(); populateAcademicYears(saved); syncFilterDependencies(saved); state.subjects = state.db.subjects; state.visibleSubjectIds = new Set(state.db.subjects.map((subject) => subject.id)); els.current.textContent = `${state.maps.academicYears.get(els.academicYear.value).name} / ทั้งปีการศึกษา`; attachEvents(); syncSearchButton(); runSearch(); }
  initializeAverageScoreYearPage();
})();
