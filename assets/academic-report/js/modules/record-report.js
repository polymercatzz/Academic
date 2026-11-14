(function () {
  "use strict";

  const STORAGE_KEY = "recordReport:lastSearch";
  const ACADEMIC_STATUS_RULES = {
    warningGpax: 2.00,
    minimumGraduationGpax: 2.00
  };
  const REPORT_LABELS = {
    record: "ระเบียนสะสม",
    gpax: "GPAX และหน่วยกิต"
  };
  const STATUS_LABELS = {
    active: "กำลังศึกษา",
    transferred: "ย้ายสถานศึกษา",
    graduated: "สำเร็จการศึกษา"
  };
  const GPAX_BINS = [
    { label: "<1.50", min: 0, max: 1.5 },
    { label: "1.50-1.99", min: 1.5, max: 2 },
    { label: "2.00-2.49", min: 2, max: 2.5 },
    { label: "2.50-2.99", min: 2.5, max: 3 },
    { label: "3.00-3.49", min: 3, max: 3.5 },
    { label: "3.50-4.00", min: 3.5, max: 4.01 }
  ];

  // Tailwind classes for the markup this script writes (complete literal strings: the CDN build only sees whole class names)
  const UI = {
    tabActive: ["bg-white", "text-blue-700", "shadow-sm"],
    tabIdle: ["text-slate-500", "hover:text-slate-700"],
    metric: "min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5",
    metricWarning: "min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-5",
    metricLabel: "text-sm font-medium text-slate-500",
    metricLabelWarning: "text-sm font-medium text-amber-700",
    metricValue: "mt-2 text-3xl font-semibold tracking-tight text-slate-900",
    statusBase: "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ",
    statusTone: {
      normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      warning: "bg-amber-50 text-amber-700 ring-amber-200",
      credits: "bg-amber-50 text-amber-700 ring-amber-200",
      failed: "bg-rose-50 text-rose-700 ring-rose-200",
      incomplete: "bg-slate-100 text-slate-600 ring-slate-200"
    },
    warnText: "font-bold text-amber-600",
    rowAction: "whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50",
    // first three columns of the per-student tables stay in place while the table scrolls sideways
    headNo: "left-0 !z-30 w-[72px] min-w-[72px] max-w-[72px] !px-3 text-center",
    headId: "left-[72px] !z-30 w-[128px] min-w-[128px] max-w-[128px] !px-3",
    headName: "left-[200px] !z-30 w-[224px] min-w-[224px] max-w-[224px] !px-3 shadow-[2px_0_0_#e2e8f0]",
    cellNo: "sticky left-0 z-10 w-[72px] min-w-[72px] max-w-[72px] bg-white !px-3 text-center",
    cellId: "sticky left-[72px] z-10 w-[128px] min-w-[128px] max-w-[128px] bg-white !px-3",
    cellName: "sticky left-[200px] z-10 w-[224px] min-w-[224px] max-w-[224px] overflow-hidden text-ellipsis bg-white !px-3 shadow-[2px_0_0_#e2e8f0]",
    headGroup: "!text-center !text-blue-700",
    facts: "grid grid-cols-2 gap-3 md:grid-cols-3 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-slate-900 [&_div]:rounded-2xl [&_div]:border [&_div]:border-slate-200 [&_div]:bg-slate-50 [&_div]:px-4 [&_div]:py-3 [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:text-slate-500",
    dialogHeading: "text-base font-semibold text-slate-900",
    dialogTableWrap: "overflow-x-auto rounded-2xl border border-slate-200",
    dialogTable: "w-full min-w-[620px] text-left text-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-slate-100 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-slate-700 [&_th]:whitespace-nowrap [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-500",
    previewTitle: "font-semibold text-slate-900",
    previewLine: "mt-1.5"
  };

  const els = {
    page: document.querySelector('[data-page="record-report"]'),
    year: document.getElementById("recordAcademicYear"),
    grade: document.getElementById("recordGrade"),
    plan: document.getElementById("recordPlan"),
    classroom: document.getElementById("recordClassroom"),
    studentStatus: document.getElementById("recordStudentStatus"),
    keyword: document.getElementById("recordKeyword"),
    form: document.getElementById("recordFiltersForm"),
    searchBtn: document.getElementById("recordSearchBtn"),
    resetBtn: document.getElementById("recordResetFiltersBtn"),
    currentAcademicLabel: document.getElementById("recordCurrentAcademicLabel"),
    summaryScope: document.getElementById("recordSummaryScope"),
    viewMeta: document.getElementById("recordViewMeta"),
    resultsTitle: document.getElementById("recordResultsTitle"),
    summaryGrid: document.getElementById("recordSummaryGrid"),
    toolbarTitle: document.getElementById("recordToolbarTitle"),
    resultCount: document.getElementById("recordResultCount"),
    tableWrap: document.getElementById("recordTableWrap"),
    tableState: document.getElementById("recordTableState"),
    thead: document.getElementById("recordThead"),
    tbody: document.getElementById("recordTbody"),
    chartOne: document.getElementById("recordChartOne"),
    chartTwo: document.getElementById("recordChartTwo"),
    chartOneTitle: document.getElementById("recordChartOneTitle"),
    chartTwoTitle: document.getElementById("recordChartTwoTitle"),
    chartGrid: document.getElementById("recordChartGrid"),
    reportTabs: document.querySelectorAll("#recordReportTabs [data-report-type]"),
    exportDropdown: document.getElementById("recordExportDropdown"),
    exportBtn: document.getElementById("recordExportBtn"),
    exportMenu: document.getElementById("recordExportMenu"),
    printBtn: document.getElementById("recordPrintBtn"),
    studentDialog: document.getElementById("recordStudentDialog"),
    studentDialogTitle: document.getElementById("recordStudentDialogTitle"),
    studentDialogBody: document.getElementById("recordStudentDialogBody"),
    printDialog: document.getElementById("recordPrintDialog"),
    printType: document.getElementById("recordPrintType"),
    printScope: document.getElementById("recordPrintScope"),
    printStudentWrap: document.getElementById("recordPrintStudentWrap"),
    printStudent: document.getElementById("recordPrintStudent"),
    printPaper: document.getElementById("recordPrintPaper"),
    printOrientation: document.getElementById("recordPrintOrientation"),
    printPreview: document.getElementById("recordPrintPreview"),
    buildPrintPreviewBtn: document.getElementById("recordBuildPrintPreviewBtn")
  };

  if (!els.page) return;

  const state = {
    db: null,
    activeReportType: "record",
    mode: "overview",
    baseResults: [],
    visibleResults: [],
    isInitializing: false,
    initialized: false,
    keywordTimer: null
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function round(value, digits) {
    if (value == null || Number.isNaN(value)) return null;
    const factor = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(value * factor) / factor;
  }

  function average(values) {
    const valid = values.filter(function (value) { return value != null && !Number.isNaN(value); });
    return valid.length ? valid.reduce(function (sum, value) { return sum + value; }, 0) / valid.length : null;
  }

  function formatNumber(value, digits) {
    if (value == null) return incompleteCell();
    return Number(value).toFixed(digits == null ? 2 : digits);
  }

  function incompleteCell() {
    return '<span class="' + UI.warnText + '" title="ข้อมูลผลการเรียนยังไม่ครบ">-</span>';
  }

  // rooms, students and results come from the shared report data set (report-data.js);
  // ids are shortened to the form this module has always used ("2569", "m1", "m1-1")
  function buildInlineMockDatabase() {
    const data = window.ReportData;
    const shortId = function (id) { return id.replace(/^(ay|grade|room)-/, ""); };
    const subjectsById = new Map(data.subjects.map(function (subject) { return [subject.id, subject]; }));
    const academicYears = data.academicYears.map(function (year) { return { id: shortId(year.id), name: year.name, isLatest: year.isCurrent }; });
    const grades = data.grades.map(function (grade) { return { id: shortId(grade.id), name: grade.fullName }; });
    const classrooms = data.classrooms.map(function (room) {
      return { id: shortId(room.id), name: room.name, gradeId: shortId(room.gradeId), planId: room.planId };
    });
    const plans = data.plans.map(function (plan) {
      return {
        id: plan.id,
        name: plan.name,
        gradeIds: grades.filter(function (grade) {
          return classrooms.some(function (room) { return room.gradeId === grade.id && room.planId === plan.id; });
        }).map(function (grade) { return grade.id; })
      };
    });
    const students = data.students.map(function (student) {
      return {
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
        gradeId: shortId(student.gradeId),
        planId: student.planId,
        classroomId: shortId(student.classroomId),
        enrollmentStatus: student.enrollmentStatus
      };
    });
    const records = data.scoreRecords.map(function (record) {
      const subject = subjectsById.get(record.subjectId);
      const point = data.gradePoint(record.score);
      return {
        academicYear: String(record.year),
        semester: record.term,
        studentId: record.studentId,
        subjectId: subject.id + "-" + record.year + "-" + record.term,
        subjectName: subject.name,
        subjectGroupId: subject.subjectGroupId,
        credit: subject.credit,
        grade: point == null ? null : String(point),
        gradePoint: point,
        status: record.status !== "complete" ? record.status : point === 0 ? "failed" : "passed"
      };
    });

    return { academicYears: academicYears, grades: grades, plans: plans, classrooms: classrooms, subjectGroups: data.subjectGroups, students: students, records: records };
  }

  function calculateWeightedGpa(records) {
    const eligible = records.filter(function (record) {
      return record.gradePoint != null && record.status !== "pending" && record.status !== "missing";
    });
    const credits = eligible.reduce(function (sum, record) { return sum + record.credit; }, 0);
    if (!credits) return null;
    return round(eligible.reduce(function (sum, record) { return sum + record.gradePoint * record.credit; }, 0) / credits, 2);
  }

  function calculateCumulativeGpax(records, endAcademicYear) {
    return calculateWeightedGpa(records.filter(function (record) {
      return Number(record.academicYear) <= Number(endAcademicYear);
    }));
  }

  function calculateEarnedCredits(records) {
    return round(records.filter(function (record) {
      return record.gradePoint != null && record.gradePoint >= 1 && record.status === "passed";
    }).reduce(function (sum, record) { return sum + record.credit; }, 0), 1);
  }

  function calculateRegisteredCredits(records) {
    return round(records.filter(function (record) {
      return record.status !== "missing";
    }).reduce(function (sum, record) { return sum + record.credit; }, 0), 1);
  }

  function calculateFailedSubjectCount(records) {
    return records.filter(function (record) {
      return record.status === "failed" || record.gradePoint === 0;
    }).length;
  }

  function calculateCreditsBySubjectGroup(records) {
    return state.db.subjectGroups.reduce(function (result, group) {
      result[group.id] = calculateEarnedCredits(records.filter(function (record) {
        return record.subjectGroupId === group.id;
      }));
      return result;
    }, {});
  }

  function evaluateAcademicStatus(result) {
    if (result.isIncomplete) return { label: "ข้อมูลผลการเรียนไม่ครบ", tone: "incomplete" };
    if (result.failedSubjects > 0) return { label: "มีรายวิชาไม่ผ่าน", tone: "failed" };
    if (result.missingCredits > 0) return { label: "หน่วยกิตไม่ครบ", tone: "credits" };
    if (result.gpax != null && result.gpax < ACADEMIC_STATUS_RULES.warningGpax) return { label: "ผลสะสมต่ำกว่า " + ACADEMIC_STATUS_RULES.warningGpax.toFixed(2), tone: "warning" };
    return { label: "ปกติ", tone: "normal" };
  }

  function buildStudentResult(student, endAcademicYear, index) {
    const studentRecords = state.db.records.filter(function (record) {
      return record.studentId === student.id && Number(record.academicYear) <= Number(endAcademicYear);
    });
    const selectedYearRecords = studentRecords.filter(function (record) { return record.academicYear === endAcademicYear; });
    const semesterRows = [1, 2].map(function (semester) {
      const records = selectedYearRecords.filter(function (record) { return record.semester === semester; });
      return {
        academicYear: endAcademicYear,
        semester: semester,
        gpa: calculateWeightedGpa(records),
        registeredCredits: calculateRegisteredCredits(records),
        earnedCredits: calculateEarnedCredits(records),
        failedSubjects: calculateFailedSubjectCount(records),
        isIncomplete: records.some(function (record) { return record.gradePoint == null || record.status === "pending" || record.status === "missing"; })
      };
    });
    const gpax = calculateCumulativeGpax(studentRecords, endAcademicYear);
    const registeredCredits = calculateRegisteredCredits(studentRecords);
    const earnedCredits = calculateEarnedCredits(studentRecords);
    const failedSubjects = calculateFailedSubjectCount(studentRecords);
    const totalRequiredCredits = state.db.subjectGroups.reduce(function (sum, group) { return sum + group.requiredCredits; }, 0);
    const result = {
      index: index + 1,
      student: student,
      records: studentRecords,
      semesters: semesterRows,
      gpax: gpax,
      latestGpa: semesterRows[1].gpa != null ? semesterRows[1].gpa : semesterRows[0].gpa,
      registeredCredits: registeredCredits,
      earnedCredits: earnedCredits,
      failedSubjects: failedSubjects,
      creditsByGroup: calculateCreditsBySubjectGroup(studentRecords),
      missingCredits: Math.max(0, round(totalRequiredCredits - earnedCredits, 1)),
      isIncomplete: studentRecords.some(function (record) { return record.gradePoint == null || record.status === "pending" || record.status === "missing"; })
    };
    result.academicStatus = evaluateAcademicStatus(result);
    return result;
  }

  function optionMarkup(value, label) {
    return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + "</option>";
  }

  function populateBaseFilters() {
    els.year.innerHTML = state.db.academicYears.map(function (year) { return optionMarkup(year.id, year.name); }).join("");
    els.grade.innerHTML = optionMarkup("all", "ทุกระดับชั้น") + state.db.grades.map(function (grade) { return optionMarkup(grade.id, grade.name); }).join("");
  }

  function syncFilterDependencies(preferred) {
    const gradeId = els.grade.value || "all";
    const validPlans = state.db.plans.filter(function (plan) { return gradeId === "all" || plan.gradeIds.indexOf(gradeId) >= 0; });
    const preferredPlan = preferred && preferred.plan != null ? preferred.plan : els.plan.value;
    els.plan.innerHTML = optionMarkup("all", "ทุกแผนการเรียน") + validPlans.map(function (plan) { return optionMarkup(plan.id, plan.name); }).join("");
    els.plan.value = validPlans.some(function (plan) { return plan.id === preferredPlan; }) ? preferredPlan : "all";

    const planId = els.plan.value || "all";
    const validRooms = state.db.classrooms.filter(function (room) {
      return (gradeId === "all" || room.gradeId === gradeId) && (planId === "all" || room.planId === planId);
    });
    const preferredRoom = preferred && preferred.classroom != null ? preferred.classroom : els.classroom.value;
    els.classroom.innerHTML = optionMarkup("all", "ทุกห้องเรียน") + validRooms.map(function (room) { return optionMarkup(room.id, room.name); }).join("");
    els.classroom.value = validRooms.some(function (room) { return room.id === preferredRoom; }) ? preferredRoom : "all";
  }

  function getDefaultFilters() {
    const latest = state.db.academicYears.find(function (year) { return year.isLatest; }) || state.db.academicYears[state.db.academicYears.length - 1];
    return {
      academicYear: latest.id,
      grade: "all",
      plan: "all",
      classroom: "all",
      studentStatus: "active",
      reportType: "record",
      keyword: ""
    };
  }

  function loadSavedFilters() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function applyFilters(filters) {
    els.year.value = state.db.academicYears.some(function (year) { return year.id === filters.academicYear; }) ? filters.academicYear : getDefaultFilters().academicYear;
    els.grade.value = state.db.grades.some(function (grade) { return grade.id === filters.grade; }) || filters.grade === "all" ? filters.grade : "all";
    syncFilterDependencies({ plan: filters.plan, classroom: filters.classroom });
    els.studentStatus.value = STATUS_LABELS[filters.studentStatus] || filters.studentStatus === "all" ? filters.studentStatus : "active";
    els.keyword.value = filters.keyword || "";
    setActiveReportType(filters.reportType === "gpax" ? "gpax" : "record", false);
  }

  function saveLastSearch() {
    const filters = {
      academicYear: els.year.value,
      grade: els.grade.value,
      plan: els.plan.value,
      classroom: els.classroom.value,
      studentStatus: els.studentStatus.value,
      reportType: state.activeReportType,
      keyword: els.keyword.value.trim()
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }

  function getName(collection, id, allLabel) {
    if (id === "all") return allLabel;
    const item = collection.find(function (entry) { return entry.id === id; });
    return item ? item.name : allLabel;
  }

  function buildRecordRows(students) {
    return students.map(function (student, index) { return buildStudentResult(student, els.year.value, index); });
  }

  function buildGpaxRows(students) {
    return students.map(function (student, index) { return buildStudentResult(student, els.year.value, index); });
  }

  function filterCurrentResults() {
    const query = els.keyword.value.trim().toLocaleLowerCase("th");
    state.visibleResults = !query ? state.baseResults.slice() : state.baseResults.filter(function (result) {
      const student = result.student;
      const text = [student.studentCode, student.firstName, student.lastName, student.firstName + " " + student.lastName].join(" ").toLocaleLowerCase("th");
      return text.indexOf(query) >= 0;
    });
  }

  function statusChip(status) {
    return '<span class="' + UI.statusBase + (UI.statusTone[status.tone] || UI.statusTone.incomplete) + '" data-tone="' + status.tone + '">' + escapeHtml(status.label) + "</span>";
  }

  function metricCard(label, value, warning) {
    return '<article class="' + (warning ? UI.metricWarning : UI.metric) + '"><p class="' + (warning ? UI.metricLabelWarning : UI.metricLabel) + '">' + escapeHtml(label) + '</p><p class="' + UI.metricValue + '">' + escapeHtml(value) + "</p></article>";
  }

  function summaryData(results) {
    const incomplete = results.filter(function (result) { return result.isIncomplete; }).length;
    return {
      total: results.length,
      avgGpax: average(results.map(function (result) { return result.gpax; })),
      maxGpax: results.length ? Math.max.apply(null, results.map(function (result) { return result.gpax == null ? 0 : result.gpax; })) : null,
      minGpax: results.filter(function (result) { return result.gpax != null; }).length ? Math.min.apply(null, results.filter(function (result) { return result.gpax != null; }).map(function (result) { return result.gpax; })) : null,
      avgLatestGpa: average(results.map(function (result) { return result.latestGpa; })),
      avgEarnedCredits: average(results.map(function (result) { return result.earnedCredits; })),
      belowThreshold: results.filter(function (result) { return result.gpax != null && result.gpax < ACADEMIC_STATUS_RULES.warningGpax; }).length,
      failed: results.filter(function (result) { return result.failedSubjects > 0; }).length,
      missingCredits: results.filter(function (result) { return result.missingCredits > 0; }).length,
      watch: results.filter(function (result) { return result.academicStatus.tone !== "normal"; }).length,
      incomplete: incomplete,
      completeness: results.length ? Math.round(((results.length - incomplete) / results.length) * 100) : 0
    };
  }

  function renderRecordSummary() {
    const data = summaryData(state.baseResults);
    els.summaryGrid.innerHTML = [
      metricCard("นักเรียนทั้งหมด", data.total),
      metricCard("ผลการเรียนสะสมเฉลี่ย", data.avgGpax == null ? "-" : data.avgGpax.toFixed(2)),
      metricCard("GPA เฉลี่ยภาคเรียนล่าสุด", data.avgLatestGpa == null ? "-" : data.avgLatestGpa.toFixed(2)),
      metricCard("หน่วยกิตผ่านเฉลี่ย", data.avgEarnedCredits == null ? "-" : data.avgEarnedCredits.toFixed(1)),
      metricCard("มีวิชาไม่ผ่าน", data.failed, data.failed > 0),
      metricCard("ผลสะสมต่ำกว่า " + ACADEMIC_STATUS_RULES.warningGpax.toFixed(2), data.belowThreshold, data.belowThreshold > 0),
      metricCard("มีผลการเรียนครบทุกภาค", (data.total - data.incomplete) + "/" + data.total + " คน", data.incomplete > 0)
    ].join("");
  }

  function renderGpaxSummary() {
    const data = summaryData(state.baseResults);
    els.summaryGrid.innerHTML = [
      metricCard("นักเรียนทั้งหมด", data.total),
      metricCard("GPAX เฉลี่ย", data.avgGpax == null ? "-" : data.avgGpax.toFixed(2)),
      metricCard("GPAX สูงสุด", data.maxGpax == null ? "-" : data.maxGpax.toFixed(2)),
      metricCard("GPAX ต่ำสุด", data.minGpax == null ? "-" : data.minGpax.toFixed(2)),
      metricCard("GPAX ต่ำกว่า " + ACADEMIC_STATUS_RULES.warningGpax.toFixed(2), data.belowThreshold, data.belowThreshold > 0),
      metricCard("มีวิชาไม่ผ่าน", data.failed, data.failed > 0),
      metricCard("หน่วยกิตไม่ครบ", data.missingCredits, data.missingCredits > 0),
      metricCard("มีผลการเรียนครบทุกภาค", (data.total - data.incomplete) + "/" + data.total + " คน", data.incomplete > 0)
    ].join("");
  }

  function setupCanvas(canvas, height) {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, canvas.parentElement.clientWidth || 520);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = '12px "Noto Sans Thai", sans-serif';
    return { context: context, width: width, height: height };
  }

  function drawBarChart(canvas, labels, values, options) {
    const chart = setupCanvas(canvas, 260);
    const context = chart.context;
    const padding = { top: 20, right: 16, bottom: 48, left: 38 };
    const innerWidth = chart.width - padding.left - padding.right;
    const innerHeight = chart.height - padding.top - padding.bottom;
    const max = Math.max(options && options.max ? options.max : 0, Math.max.apply(null, values.concat([1])));
    context.strokeStyle = "#e2e8f0";
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, padding.top + innerHeight);
    context.lineTo(padding.left + innerWidth, padding.top + innerHeight);
    context.stroke();
    const slot = innerWidth / Math.max(values.length, 1);
    values.forEach(function (value, index) {
      const barWidth = Math.min(44, slot * 0.58);
      const height = value / max * innerHeight;
      const x = padding.left + slot * index + (slot - barWidth) / 2;
      const y = padding.top + innerHeight - height;
      context.fillStyle = options && options.color ? options.color : "#2563eb";
      context.fillRect(x, y, barWidth, height);
      context.fillStyle = "#334155";
      context.textAlign = "center";
      context.fillText(String(value), x + barWidth / 2, Math.max(13, y - 6));
      context.fillText(labels[index], x + barWidth / 2, chart.height - 20);
    });
  }

  function drawLineChart(canvas, labels, datasets) {
    const chart = setupCanvas(canvas, 260);
    const context = chart.context;
    const series = Array.isArray(datasets) && datasets.length && typeof datasets[0] === "object" && Array.isArray(datasets[0].values)
      ? datasets
      : [{ label: "", values: datasets, color: "#2563eb" }];
    const padding = { top: series.length > 1 ? 42 : 20, right: 18, bottom: 46, left: 40 };
    const innerWidth = chart.width - padding.left - padding.right;
    const innerHeight = chart.height - padding.top - padding.bottom;
    if (series.length > 1) {
      let legendX = padding.left;
      series.forEach(function (item) {
        context.strokeStyle = item.color || "#2563eb";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(legendX, 20);
        context.lineTo(legendX + 22, 20);
        context.stroke();
        context.fillStyle = item.color || "#2563eb";
        context.beginPath();
        context.arc(legendX + 11, 20, 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#475569";
        context.textAlign = "left";
        context.fillText(item.label, legendX + 30, 24);
        legendX += context.measureText(item.label).width + 58;
      });
    }
    context.strokeStyle = "#e2e8f0";
    for (let line = 0; line <= 4; line += 1) {
      const y = padding.top + innerHeight - (line / 4) * innerHeight;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(padding.left + innerWidth, y);
      context.stroke();
      context.fillStyle = "#64748b";
      context.textAlign = "right";
      context.fillText(String(line), padding.left - 8, y + 4);
    }
    series.forEach(function (item) {
      const points = item.values.map(function (value, index) {
        return {
          x: padding.left + (labels.length === 1 ? innerWidth / 2 : index * innerWidth / (labels.length - 1)),
          y: value == null ? null : padding.top + innerHeight - (value / 4) * innerHeight
        };
      });
      context.strokeStyle = item.color || "#2563eb";
      context.lineWidth = 2;
      context.beginPath();
      let started = false;
      points.forEach(function (point) {
        if (point.y == null) return;
        if (!started) { context.moveTo(point.x, point.y); started = true; } else context.lineTo(point.x, point.y);
      });
      context.stroke();
      points.forEach(function (point) {
        if (point.y == null) return;
        context.fillStyle = item.color || "#2563eb";
        context.beginPath();
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        context.fill();
      });
    });
    labels.forEach(function (label, index) {
      const x = padding.left + (labels.length === 1 ? innerWidth / 2 : index * innerWidth / (labels.length - 1));
      context.fillStyle = "#475569";
      context.textAlign = "center";
      context.fillText(label, x, chart.height - 20);
    });
  }

  function drawHorizontalBars(canvas, labels, values) {
    const height = Math.max(280, labels.length * 34 + 38);
    const chart = setupCanvas(canvas, height);
    const context = chart.context;
    const labelWidth = Math.min(150, chart.width * 0.34);
    const barWidth = chart.width - labelWidth - 55;
    labels.forEach(function (label, index) {
      const y = 20 + index * 34;
      context.fillStyle = "#475569";
      context.textAlign = "right";
      context.fillText(label, labelWidth - 10, y + 13);
      context.fillStyle = "#f1f5f9";
      context.fillRect(labelWidth, y, barWidth, 16);
      context.fillStyle = values[index] >= 100 ? "#1f9d68" : "#d97706";
      context.fillRect(labelWidth, y, Math.min(100, values[index]) / 100 * barWidth, 16);
      context.fillStyle = "#334155";
      context.textAlign = "left";
      context.fillText(values[index] + "%", labelWidth + barWidth + 7, y + 13);
    });
  }

  function renderVisualization() {
    const values = GPAX_BINS.map(function (bin) {
      return state.baseResults.filter(function (result) {
        return result.gpax != null && result.gpax >= bin.min && result.gpax < bin.max;
      }).length;
    });
    if (state.activeReportType === "record") {
      els.chartOneTitle.textContent = "แนวโน้ม GPA เฉลี่ยรายภาคเรียน";
      els.chartTwoTitle.textContent = "การกระจายผลการเรียนสะสม";
      const trendYears = state.db.academicYears.filter(function (year) { return Number(year.id) <= Number(els.year.value); });
      const labels = trendYears.map(function (year) { return year.id; });
      const semesterOneTrend = [];
      const semesterTwoTrend = [];
      trendYears.forEach(function (year) {
        semesterOneTrend.push(average(state.baseResults.map(function (result) {
          return calculateWeightedGpa(result.records.filter(function (record) { return record.academicYear === year.id && record.semester === 1; }));
        })));
        semesterTwoTrend.push(average(state.baseResults.map(function (result) {
          return calculateWeightedGpa(result.records.filter(function (record) { return record.academicYear === year.id && record.semester === 2; }));
        })));
      });
      drawLineChart(els.chartOne, labels, [
        { label: "ภาคเรียน 1", values: semesterOneTrend, color: "#2563eb" },
        { label: "ภาคเรียน 2", values: semesterTwoTrend, color: "#1f9d68" }
      ]);
      drawBarChart(els.chartTwo, GPAX_BINS.map(function (bin) { return bin.label; }), values);
    } else {
      els.chartOneTitle.textContent = "การกระจาย GPAX";
      els.chartTwoTitle.textContent = "หน่วยกิตที่ได้แล้วเทียบกับที่ต้องได้ ตามกลุ่มสาระ (%)";
      drawBarChart(els.chartOne, GPAX_BINS.map(function (bin) { return bin.label; }), values);
      const groupValues = state.db.subjectGroups.map(function (group) {
        const earned = state.baseResults.reduce(function (sum, result) { return sum + result.creditsByGroup[group.id]; }, 0);
        const required = group.requiredCredits * state.baseResults.length;
        return required ? Math.round(earned / required * 100) : 0;
      });
      drawHorizontalBars(els.chartTwo, state.db.subjectGroups.map(function (group) { return group.shortName; }), groupValues);
    }
  }

  function buildOverviewRows(results) {
    const groups = {};
    results.forEach(function (result) {
      const roomId = result.student.classroomId;
      if (!groups[roomId]) groups[roomId] = [];
      groups[roomId].push(result);
    });
    return Object.keys(groups).map(function (roomId) {
      const classroom = state.db.classrooms.find(function (room) { return room.id === roomId; });
      const grade = state.db.grades.find(function (item) { return item.id === classroom.gradeId; });
      const plan = state.db.plans.find(function (item) { return item.id === classroom.planId; });
      const resultsInRoom = groups[roomId];
      const data = summaryData(resultsInRoom);
      return {
        classroom: classroom,
        grade: grade,
        plan: plan,
        count: resultsInRoom.length,
        avgGpax: data.avgGpax,
        avgLatestGpa: data.avgLatestGpa,
        avgEarnedCredits: data.avgEarnedCredits,
        belowThreshold: data.belowThreshold,
        failed: data.failed,
        missingCredits: data.missingCredits,
        incomplete: data.incomplete
      };
    }).sort(function (a, b) { return a.classroom.name.localeCompare(b.classroom.name, "th"); });
  }

  function showTableState(message) {
    els.tableState.textContent = message;
    els.tableState.classList.remove("hidden");
    els.tableWrap.classList.add("hidden");
  }

  function showTable() {
    els.tableState.classList.add("hidden");
    els.tableWrap.classList.remove("hidden");
  }

  function renderOverviewTable() {
    const rows = buildOverviewRows(state.visibleResults);
    els.toolbarTitle.textContent = "สรุปผลรายห้อง";
    els.resultCount.textContent = rows.length + " ห้อง";
    els.thead.innerHTML = '<tr><th>ระดับชั้น</th><th>ห้องเรียน</th><th>แผนการเรียน</th><th>นักเรียน</th><th>' + (state.activeReportType === "record" ? "ผลสะสมเฉลี่ย" : "GPAX เฉลี่ย") + '</th><th>GPA ล่าสุดเฉลี่ย</th><th>หน่วยกิตผ่านเฉลี่ย</th><th>ผลสะสมต่ำกว่า 2.00</th><th>มีวิชาไม่ผ่าน</th><th>หน่วยกิตไม่ครบ</th><th>ข้อมูลไม่ครบ</th><th>การดำเนินการ</th></tr>';
    els.tbody.innerHTML = rows.map(function (row) {
      return '<tr><td>' + escapeHtml(row.grade.name) + '</td><td><strong>' + escapeHtml(row.classroom.name) + '</strong></td><td>' + escapeHtml(row.plan.name) + '</td><td>' + row.count + '</td><td>' + (row.avgGpax == null ? incompleteCell() : row.avgGpax.toFixed(2)) + '</td><td>' + (row.avgLatestGpa == null ? incompleteCell() : row.avgLatestGpa.toFixed(2)) + '</td><td>' + (row.avgEarnedCredits == null ? incompleteCell() : row.avgEarnedCredits.toFixed(1)) + '</td><td>' + row.belowThreshold + '</td><td>' + row.failed + '</td><td>' + row.missingCredits + '</td><td>' + row.incomplete + '</td><td><button class="' + UI.rowAction + '" type="button" data-room-detail="' + row.classroom.id + '">ดูรายละเอียด</button></td></tr>';
    }).join("");
  }

  function renderRecordTable() {
    const year = escapeHtml(els.year.value);
    els.toolbarTitle.textContent = "ระเบียนสะสมรายนักเรียน";
    els.resultCount.textContent = state.visibleResults.length + " คน";
    els.thead.innerHTML = '<tr><th class="' + UI.headNo + '" rowspan="2">ลำดับ</th><th class="' + UI.headId + '" rowspan="2">รหัสนักเรียน</th><th class="' + UI.headName + '" rowspan="2">ชื่อ-สกุล</th><th class="' + UI.headGroup + '" colspan="3">ภาคเรียน 1</th><th class="' + UI.headGroup + '" colspan="3">ภาคเรียน 2</th><th class="' + UI.headGroup + '" colspan="7">ผลสะสมถึงปีการศึกษา ' + year + '</th></tr><tr><th>GPA</th><th>ลงทะเบียน</th><th>ผ่าน</th><th>GPA</th><th>ลงทะเบียน</th><th>ผ่าน</th><th>ผลการเรียนสะสม</th><th>ลงทะเบียนสะสม</th><th>ผ่านสะสม</th><th>วิชาไม่ผ่าน</th><th>สถานะ</th><th>หมายเหตุ</th><th>การดำเนินการ</th></tr>';
    els.tbody.innerHTML = state.visibleResults.map(function (result) {
      const student = result.student;
      const note = result.isIncomplete ? "ข้อมูลบางรายวิชายังไม่ครบ" : result.failedSubjects ? "ตรวจสอบรายวิชาไม่ผ่าน" : "-";
      return '<tr><td class="' + UI.cellNo + '">' + result.index + '</td><td class="' + UI.cellId + '">' + student.studentCode + '</td><td class="' + UI.cellName + '">' + escapeHtml(student.firstName + " " + student.lastName) + '</td><td>' + formatNumber(result.semesters[0].gpa, 2) + '</td><td>' + result.semesters[0].registeredCredits.toFixed(1) + '</td><td>' + result.semesters[0].earnedCredits.toFixed(1) + '</td><td>' + formatNumber(result.semesters[1].gpa, 2) + '</td><td>' + result.semesters[1].registeredCredits.toFixed(1) + '</td><td>' + result.semesters[1].earnedCredits.toFixed(1) + '</td><td><strong>' + formatNumber(result.gpax, 2) + '</strong></td><td>' + result.registeredCredits.toFixed(1) + '</td><td>' + result.earnedCredits.toFixed(1) + '</td><td>' + result.failedSubjects + '</td><td>' + statusChip(result.academicStatus) + '</td><td>' + escapeHtml(note) + '</td><td><button class="' + UI.rowAction + '" type="button" data-student-detail="' + student.id + '">ดูรายละเอียด</button></td></tr>';
    }).join("");
  }

  function renderGpaxTable() {
    els.toolbarTitle.textContent = "GPAX และหน่วยกิตรายนักเรียน";
    els.resultCount.textContent = state.visibleResults.length + " คน";
    const groupHeaders = state.db.subjectGroups.map(function (group) { return "<th>" + escapeHtml(group.shortName) + "</th>"; }).join("");
    els.thead.innerHTML = '<tr><th class="' + UI.headNo + '" rowspan="2">ลำดับ</th><th class="' + UI.headId + '" rowspan="2">รหัสนักเรียน</th><th class="' + UI.headName + '" rowspan="2">ชื่อ-สกุล</th><th rowspan="2">GPAX</th><th rowspan="2">GPA ล่าสุด</th><th rowspan="2">ลงทะเบียนสะสม</th><th rowspan="2">ผ่านสะสม</th><th rowspan="2">วิชาไม่ผ่าน</th><th rowspan="2">หน่วยกิตที่ยังขาด</th><th class="' + UI.headGroup + '" colspan="' + state.db.subjectGroups.length + '">หน่วยกิตตามกลุ่มสาระ</th><th rowspan="2">สถานะการศึกษา</th><th rowspan="2">การดำเนินการ</th></tr><tr>' + groupHeaders + "</tr>";
    els.tbody.innerHTML = state.visibleResults.map(function (result) {
      const student = result.student;
      const groupCells = state.db.subjectGroups.map(function (group) {
        const earned = result.creditsByGroup[group.id];
        return '<td class="' + (earned < group.requiredCredits ? UI.warnText : "") + '">' + earned.toFixed(1) + "/" + group.requiredCredits + "</td>";
      }).join("");
      return '<tr><td class="' + UI.cellNo + '">' + result.index + '</td><td class="' + UI.cellId + '">' + student.studentCode + '</td><td class="' + UI.cellName + '">' + escapeHtml(student.firstName + " " + student.lastName) + '</td><td><strong>' + formatNumber(result.gpax, 2) + '</strong></td><td>' + formatNumber(result.latestGpa, 2) + '</td><td>' + result.registeredCredits.toFixed(1) + '</td><td>' + result.earnedCredits.toFixed(1) + '</td><td>' + result.failedSubjects + '</td><td>' + result.missingCredits.toFixed(1) + '</td>' + groupCells + '<td>' + statusChip(result.academicStatus) + '</td><td><button class="' + UI.rowAction + '" type="button" data-student-detail="' + student.id + '">ดูรายละเอียด</button></td></tr>';
    }).join("");
  }

  function renderTable() {
    if (!state.visibleResults.length) {
      els.thead.innerHTML = "";
      els.tbody.innerHTML = "";
      els.resultCount.textContent = "0 รายการ";
      showTableState("ไม่พบข้อมูลตามเงื่อนไขที่เลือก");
      return;
    }
    showTable();
    if (state.mode === "overview") renderOverviewTable();
    else if (state.activeReportType === "record") renderRecordTable();
    else renderGpaxTable();
  }

  function renderResults() {
    const gradeName = getName(state.db.grades, els.grade.value, "ทุกระดับชั้น");
    const planName = getName(state.db.plans, els.plan.value, "ทุกแผนการเรียน");
    const classroomName = getName(state.db.classrooms, els.classroom.value, "ทุกห้องเรียน");
    els.resultsTitle.textContent = state.activeReportType === "record" ? "รายงานผลการเรียนระเบียนสะสม" : "รายงาน GPAX และหน่วยกิตสะสม";
    els.summaryScope.textContent = "ปีการศึกษา " + els.year.value + " | " + gradeName + " | " + planName + " | " + classroomName;
    els.currentAcademicLabel.textContent = els.year.value + " / " + REPORT_LABELS[state.activeReportType];
    els.viewMeta.textContent = state.mode === "overview" ? "ภาพรวมรายห้อง" : "รายละเอียดรายนักเรียน";
    if (state.activeReportType === "record") renderRecordSummary();
    else renderGpaxSummary();
    renderVisualization();
    renderTable();
    populatePrintStudents();
    els.exportBtn.disabled = !state.visibleResults.length;
    els.printBtn.disabled = !state.visibleResults.length;
  }

  function runSearch(options) {
    const settings = options || {};
    if (!els.year.value) {
      els.searchBtn.disabled = true;
      return;
    }
    els.searchBtn.disabled = false;
    showTableState("กำลังประมวลผลข้อมูลผลการเรียนสะสม...");
    try {
      const students = state.db.students.filter(function (student) {
        return (els.grade.value === "all" || student.gradeId === els.grade.value)
          && (els.plan.value === "all" || student.planId === els.plan.value)
          && (els.classroom.value === "all" || student.classroomId === els.classroom.value)
          && (els.studentStatus.value === "all" || student.enrollmentStatus === els.studentStatus.value);
      });
      state.baseResults = state.activeReportType === "record" ? buildRecordRows(students) : buildGpaxRows(students);
      filterCurrentResults();
      const roomCount = new Set(state.baseResults.map(function (result) { return result.student.classroomId; })).size;
      state.mode = els.classroom.value !== "all" && roomCount === 1 ? "detail" : "overview";
      if (!settings.skipSave) saveLastSearch();
      renderResults();
    } catch (error) {
      state.baseResults = [];
      state.visibleResults = [];
      showTableState("ไม่สามารถประมวลผลรายงานได้ กรุณาลองค้นหาอีกครั้ง");
    }
  }

  function setActiveReportType(type, shouldSearch) {
    state.activeReportType = type === "gpax" ? "gpax" : "record";
    els.reportTabs.forEach(function (tab) {
      const isActive = tab.dataset.reportType === state.activeReportType;
      tab.classList.remove.apply(tab.classList, isActive ? UI.tabIdle : UI.tabActive);
      tab.classList.add.apply(tab.classList, isActive ? UI.tabActive : UI.tabIdle);
      tab.setAttribute("aria-selected", String(isActive));
    });
    if (shouldSearch && state.initialized && !state.isInitializing) runSearch();
  }

  function openRoomDetail(roomId) {
    const room = state.db.classrooms.find(function (item) { return item.id === roomId; });
    if (!room) return;
    els.grade.value = room.gradeId;
    syncFilterDependencies({ plan: room.planId, classroom: room.id });
    runSearch();
    els.tableWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function semesterDetailRows(result) {
    const groups = {};
    result.records.forEach(function (record) {
      const key = record.academicYear + "-" + record.semester;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    return Object.keys(groups).sort().map(function (key) {
      const records = groups[key];
      return '<tr><td>' + records[0].academicYear + '</td><td>' + records[0].semester + '</td><td>' + formatNumber(calculateWeightedGpa(records), 2) + '</td><td>' + calculateRegisteredCredits(records).toFixed(1) + '</td><td>' + calculateEarnedCredits(records).toFixed(1) + '</td><td>' + calculateFailedSubjectCount(records) + "</td></tr>";
    }).join("");
  }

  function openStudentDetail(studentId) {
    const result = state.baseResults.find(function (item) { return item.student.id === studentId; });
    if (!result) return;
    const student = result.student;
    const grade = getName(state.db.grades, student.gradeId, "-");
    const plan = getName(state.db.plans, student.planId, "-");
    const classroom = getName(state.db.classrooms, student.classroomId, "-");
    els.studentDialogTitle.textContent = student.studentCode + " " + student.firstName + " " + student.lastName;
    let groupTable = "";
    if (state.activeReportType === "gpax") {
      groupTable = '<h3 class="' + UI.dialogHeading + '">หน่วยกิตตามกลุ่มสาระ</h3><div class="' + UI.dialogTableWrap + '"><table class="' + UI.dialogTable + '"><thead><tr><th>กลุ่มสาระ</th><th>หน่วยกิตที่ได้</th><th>หน่วยกิตที่กำหนด</th></tr></thead><tbody>' + state.db.subjectGroups.map(function (group) {
        return "<tr><td>" + escapeHtml(group.name) + "</td><td>" + result.creditsByGroup[group.id].toFixed(1) + "</td><td>" + group.requiredCredits + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    }
    els.studentDialogBody.innerHTML = '<dl class="' + UI.facts + '"><div><dt>รหัส</dt><dd>' + student.studentCode + '</dd></div><div><dt>ชื่อ-สกุล</dt><dd>' + escapeHtml(student.firstName + " " + student.lastName) + '</dd></div><div><dt>ระดับชั้น</dt><dd>' + escapeHtml(grade) + '</dd></div><div><dt>ห้องเรียน</dt><dd>' + escapeHtml(classroom) + '</dd></div><div><dt>แผนการเรียน</dt><dd>' + escapeHtml(plan) + '</dd></div></dl><h3 class="' + UI.dialogHeading + '">ผลการเรียนรายภาค</h3><div class="' + UI.dialogTableWrap + '"><table class="' + UI.dialogTable + '"><thead><tr><th>ปีการศึกษา</th><th>ภาคเรียน</th><th>GPA</th><th>ลงทะเบียน</th><th>ผ่าน</th><th>วิชาไม่ผ่าน</th></tr></thead><tbody>' + semesterDetailRows(result) + '</tbody></table></div><h3 class="' + UI.dialogHeading + '">ผลสะสม</h3><dl class="' + UI.facts + '"><div><dt>GPAX</dt><dd>' + (result.gpax == null ? "-" : result.gpax.toFixed(2)) + '</dd></div><div><dt>ลงทะเบียนสะสม</dt><dd>' + result.registeredCredits.toFixed(1) + '</dd></div><div><dt>ผ่านสะสม</dt><dd>' + result.earnedCredits.toFixed(1) + '</dd></div><div><dt>หน่วยกิตที่ยังขาด</dt><dd>' + result.missingCredits.toFixed(1) + '</dd></div><div><dt>สถานะ</dt><dd>' + statusChip(result.academicStatus) + "</dd></div></dl>" + groupTable;
    els.studentDialog.showModal();
  }

  function populatePrintStudents() {
    els.printStudent.innerHTML = state.visibleResults.map(function (result) {
      return optionMarkup(result.student.id, result.student.studentCode + " - " + result.student.firstName + " " + result.student.lastName);
    }).join("");
  }

  function syncPrintScope() {
    const isStudent = els.printScope.value === "student";
    els.printStudentWrap.classList.toggle("hidden", !isStudent);
    els.printPaper.value = isStudent ? "a4" : "a3";
    els.printOrientation.value = isStudent ? "portrait" : "landscape";
    els.printPreview.classList.add("hidden");
  }

  function renderPrintSettingsModal() {
    els.printType.value = state.activeReportType;
    els.printScope.value = state.mode === "detail" ? "class" : "class";
    els.printPreview.innerHTML = "";
    els.printPreview.classList.add("hidden");
    syncPrintScope();
    els.printDialog.showModal();
  }

  function buildRecordPrintPreview() {
    const scope = els.printScope.value === "student" ? "รายงานรายบุคคล" : "รายงานทั้งห้อง";
    const selected = state.visibleResults.find(function (result) { return result.student.id === els.printStudent.value; });
    return '<strong class="' + UI.previewTitle + '">ตัวอย่างรายงานระเบียนสะสม</strong><p class="' + UI.previewLine + '">' + scope + ' | ปีการศึกษา ' + escapeHtml(els.year.value) + (selected ? " | " + escapeHtml(selected.student.firstName + " " + selected.student.lastName) : "") + '</p><p class="' + UI.previewLine + '">A' + (els.printPaper.value === "a3" ? "3" : "4") + " " + (els.printOrientation.value === "landscape" ? "แนวนอน" : "แนวตั้ง") + "</p>";
  }

  function buildGpaxPrintPreview() {
    const scope = els.printScope.value === "student" ? "รายงานรายบุคคล" : "รายงานทั้งห้อง";
    const selected = state.visibleResults.find(function (result) { return result.student.id === els.printStudent.value; });
    return '<strong class="' + UI.previewTitle + '">ตัวอย่างรายงาน GPAX และหน่วยกิต</strong><p class="' + UI.previewLine + '">' + scope + ' | ปีการศึกษา ' + escapeHtml(els.year.value) + (selected ? " | " + escapeHtml(selected.student.firstName + " " + selected.student.lastName) : "") + '</p><p class="' + UI.previewLine + '">A' + (els.printPaper.value === "a3" ? "3" : "4") + " " + (els.printOrientation.value === "landscape" ? "แนวนอน" : "แนวตั้ง") + "</p>";
  }

  function buildPrintPreview() {
    els.printPreview.innerHTML = els.printType.value === "gpax" ? buildGpaxPrintPreview() : buildRecordPrintPreview();
    els.printPreview.classList.remove("hidden");
  }

  function closeExportMenu() {
    els.exportMenu.classList.add("hidden");
    els.exportBtn.setAttribute("aria-expanded", "false");
  }

  function resetFilters() {
    window.localStorage.removeItem(STORAGE_KEY);
    applyFilters(getDefaultFilters());
    runSearch();
  }

  function attachEvents() {
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      runSearch();
    });
    els.resetBtn.addEventListener("click", resetFilters);
    els.year.addEventListener("change", function () { els.searchBtn.disabled = !els.year.value; });
    els.grade.addEventListener("change", function () { syncFilterDependencies({ plan: "all", classroom: "all" }); });
    els.plan.addEventListener("change", function () { syncFilterDependencies({ plan: els.plan.value, classroom: "all" }); });
    els.keyword.addEventListener("input", function () {
      window.clearTimeout(state.keywordTimer);
      state.keywordTimer = window.setTimeout(function () {
        filterCurrentResults();
        saveLastSearch();
        renderTable();
        populatePrintStudents();
      }, 250);
    });
    els.reportTabs.forEach(function (tab) {
      tab.addEventListener("click", function () { setActiveReportType(tab.dataset.reportType, true); });
    });
    els.tbody.addEventListener("click", function (event) {
      const roomButton = event.target.closest("[data-room-detail]");
      const studentButton = event.target.closest("[data-student-detail]");
      if (roomButton) openRoomDetail(roomButton.dataset.roomDetail);
      if (studentButton) openStudentDetail(studentButton.dataset.studentDetail);
    });
    els.exportBtn.addEventListener("click", function () {
      const willOpen = els.exportMenu.classList.contains("hidden");
      closeExportMenu();
      if (willOpen && !els.exportBtn.disabled) {
        els.exportMenu.classList.remove("hidden");
        els.exportBtn.setAttribute("aria-expanded", "true");
      }
    });
    els.exportMenu.addEventListener("click", function (event) {
      const button = event.target.closest("[data-export]");
      if (!button) return;
      closeExportMenu();
      window.alert("เตรียมส่งออกรายงาน " + REPORT_LABELS[state.activeReportType] + " เป็น " + button.dataset.export.toUpperCase());
    });
    document.addEventListener("click", function (event) {
      if (!els.exportDropdown.contains(event.target)) closeExportMenu();
    });
    els.printBtn.addEventListener("click", renderPrintSettingsModal);
    els.printScope.addEventListener("change", syncPrintScope);
    [els.printType, els.printStudent, els.printPaper, els.printOrientation].forEach(function (element) {
      element.addEventListener("change", function () { els.printPreview.classList.add("hidden"); });
    });
    els.buildPrintPreviewBtn.addEventListener("click", buildPrintPreview);
    document.querySelectorAll("[data-record-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.dataset.recordClose === "student") els.studentDialog.close();
        else els.printDialog.close();
      });
    });
    window.addEventListener("resize", function () {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(renderVisualization, 120);
    });
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(function (entries) {
        if (entries.some(function (entry) { return entry.contentRect.width > 0; }) && state.baseResults.length) renderVisualization();
      });
      observer.observe(els.chartGrid);
    }
  }

  function initializeRecordReportPage() {
    if (state.initialized || state.isInitializing) return;
    state.isInitializing = true;
    state.db = buildInlineMockDatabase();
    populateBaseFilters();
    const saved = loadSavedFilters();
    applyFilters(Object.assign(getDefaultFilters(), saved || {}));
    attachEvents();
    state.initialized = true;
    state.isInitializing = false;
    runSearch({ skipSave: false });
  }

  initializeRecordReportPage();
})();
