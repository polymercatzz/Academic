const attendanceOptions = [
  "ตรงเวลา",
  "สาย",
  "ขาด",
  "ลากิจ",
  "ลาป่วย",
  "กิจกรรม",
  "วันหยุด"
];

const viewModeDetails = {
  report: {
    label: "รายละเอียดรายคาบ",
    summaryTitle: "สรุปผลการเข้าเรียน",
    tableTitle: "รายละเอียดการเข้าเรียนรายคาบ"
  },
  // used when the per-period matrix would be too large to draw (see MAX_MATRIX_CELLS)
  quick: {
    label: "สรุปรายคน",
    summaryTitle: "สรุปผลการเข้าเรียน",
    tableTitle: "สรุปการเข้าเรียนรายคน · เลือกห้องเรียนเพื่อดูรายคาบ"
  }
};

// students × periods the per-period table can show before the browser slows down
const MAX_MATRIX_CELLS = 40000;

const els = {
  room: document.getElementById("room"),
  subject: document.getElementById("subject"),
  statusFilter: document.getElementById("statusFilter"),
  searchType: document.getElementById("searchType"),
  monthlyGroup: document.getElementById("monthlyGroup"),
  semesterGroup: document.getElementById("semesterGroup"),
  customGroup: document.getElementById("customGroup"),
  monthlyYear: document.getElementById("monthlyYear"),
  monthlyMonth: document.getElementById("monthlyMonth"),
  semesterYear: document.getElementById("semesterYear"),
  semesterTerm: document.getElementById("semesterTerm"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  timeFilterSummary: document.getElementById("timeFilterSummary"),
  resultsSection: document.getElementById("resultsSection"),
  tableSection: document.getElementById("tableSection"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryScope: document.getElementById("summaryScope"),
  periodLabel: document.getElementById("periodLabel"),
  modeLabel: document.getElementById("modeLabel"),
  tablePlaceholder: document.getElementById("tablePlaceholder"),
  tableTitle: document.getElementById("tableTitle"),
  attendanceThead: document.getElementById("attendanceThead"),
  attendanceTbody: document.getElementById("attendanceTbody"),
  tableWrap: document.getElementById("attendanceTableWrap"),
  totalStudents: document.getElementById("totalStudents"),
  absentRate: document.getElementById("absentRate"),
  lateCount: document.getElementById("lateCount"),
  absentCount: document.getElementById("absentCount"),
  priorityInsightCount: document.getElementById("priorityInsightCount"),
  priorityList: document.getElementById("priorityList"),
  priorityThresholdNote: document.getElementById("priorityThresholdNote"),
  priorityThresholdBtn: document.getElementById("priorityThresholdBtn"),
  tableThresholdBtn: document.getElementById("tableThresholdBtn"),
  attendanceThresholdModal: document.getElementById("attendanceThresholdModal"),
  attendanceThresholdInput: document.getElementById("attendanceThresholdInput"),
  attendanceThresholdCloseBtn: document.getElementById("attendanceThresholdCloseBtn"),
  attendanceThresholdApplyBtn: document.getElementById("attendanceThresholdApplyBtn"),
  absentRateDesc: document.getElementById("absentRateDesc"),
  absentDesc: document.getElementById("absentDesc"),
  lateDesc: document.getElementById("lateDesc"),
  trendAverage: document.getElementById("trendAverage"),
  trendMax: document.getElementById("trendMax"),
  trendMin: document.getElementById("trendMin"),
  attendanceTrendTitle: document.getElementById("attendanceTrendTitle"),
  attendanceTrendChart: document.getElementById("attendanceTrendChart"),
  trendTooltip: document.getElementById("trendTooltip"),
  trendZoomOutBtn: document.getElementById("trendZoomOutBtn"),
  bulkEditBtn: document.getElementById("bulkEditBtn"),
  saveBtn: document.getElementById("saveBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  currentAcademicLabel: document.getElementById("currentAcademicLabel"),
  toast: document.getElementById("toast")
};

const state = {
  db: null,
  maps: null,
  viewMode: "report",
  editMode: false,
  bulkEditMode: false,
  activeModule: "attendance",
  currentScopeText: "-",
  visibleSessions: [],
  visibleStudents: [],
  hoveredColumnKey: null,
  trendDrilldown: null,
  attendanceThreshold: 80
};

const trendSeries = [
  { key: "presentRate", countKey: "presentPeriods", label: "เข้าเรียน", stroke: "stroke-blue-600" },
  { key: "absentRate", countKey: "absentPeriods", label: "ขาดเรียน", stroke: "stroke-red-600" },
  { key: "lateRate", countKey: "lateTimes", label: "มาสาย", stroke: "stroke-amber-600" }
];

// Tailwind classes for the pieces this script draws; the page (attendance-report.html) has no stylesheet of its own.
// Shared cell styling (padding, borders, the round status dot, sticky header) sits on the <table> there,
// so a matrix cell only carries what differs from its neighbours.
const UI = {
  btnIdle: ["border-slate-200", "bg-white", "text-slate-700", "hover:bg-slate-50"],
  btnActive: ["border-blue-300", "bg-blue-50", "text-blue-700"],
  empty: "py-10 text-center text-sm text-slate-400",
  // status dot and cell tint, by tone
  dot: { present: "bg-emerald-600", late: "bg-amber-600", absent: "bg-rose-600", leave: "bg-blue-600", empty: "bg-slate-400" },
  highlight: { late: "!bg-amber-50", absent: "!bg-rose-50", leave: "!bg-blue-50" },
  mutedCell: "bg-slate-50",
  statusChip: "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
  statusTone: {
    present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    late: "bg-amber-50 text-amber-700 ring-amber-200",
    absent: "bg-rose-50 text-rose-700 ring-rose-200",
    leave: "bg-blue-50 text-blue-700 ring-blue-200",
    empty: "bg-slate-100 text-slate-500 ring-slate-200"
  },
  rateChip: "inline-flex min-w-[58px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
  rateTone: {
    normal: "bg-slate-100 text-slate-700 ring-slate-200",
    alert: "bg-amber-50 text-amber-700 ring-amber-300",
    danger: "bg-rose-50 text-rose-700 ring-rose-200"
  },
  // coloured left edge of an at-risk row, drawn on its first cell
  riskEdge: { normal: "", alert: "shadow-[inset_3px_0_0_#d97706]", danger: "shadow-[inset_3px_0_0_#e11d48]" },
  // sticky columns: explicit widths so the offsets add up
  headId: "left-0 !z-[6] w-[120px] min-w-[120px] max-w-[120px]",
  headName: "left-[120px] !z-[6] min-w-[230px] shadow-[1px_0_0_#e2e8f0]",
  cellId: "sticky left-0 z-[3] w-[120px] min-w-[120px] max-w-[120px] bg-white",
  cellName: "sticky left-[120px] z-[3] min-w-[230px] bg-white shadow-[1px_0_0_#e2e8f0]",
  headSummary: {
    present: "right-[274px] !z-[6] w-[62px] min-w-[62px] text-center shadow-[-1px_0_0_#e2e8f0]",
    late: "right-[212px] !z-[6] w-[62px] min-w-[62px] text-center",
    absent: "right-[150px] !z-[6] w-[62px] min-w-[62px] text-center",
    leave: "right-[88px] !z-[6] w-[62px] min-w-[62px] text-center",
    rate: "right-0 !z-[6] w-[88px] min-w-[88px] text-center"
  },
  cellSummary: {
    present: "sticky right-[274px] z-[3] w-[62px] min-w-[62px] bg-white text-center font-semibold shadow-[-1px_0_0_#e2e8f0]",
    late: "sticky right-[212px] z-[3] w-[62px] min-w-[62px] bg-white text-center font-semibold",
    absent: "sticky right-[150px] z-[3] w-[62px] min-w-[62px] bg-white text-center font-semibold",
    leave: "sticky right-[88px] z-[3] w-[62px] min-w-[62px] bg-white text-center font-semibold",
    rate: "sticky right-0 z-[3] w-[88px] min-w-[88px] bg-white text-center"
  },
  studentCell: "flex flex-col whitespace-nowrap",
  studentName: "font-semibold text-slate-900",
  studentMeta: "text-xs text-slate-400",
  // trend chart (SVG)
  axisLabel: "fill-slate-500 text-[11px]",
  xLabel: "fill-slate-500 text-[10px]",
  xLabelSelected: "fill-blue-600 text-[10px] font-bold",
  pdfTable: "mt-4 w-full text-left text-sm [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-2 [&_td]:py-2 [&_td]:text-slate-700 [&_th]:border-b [&_th]:border-slate-300 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-500 [&_th_span]:font-normal",
  pdfStatus: {
    present: "font-semibold text-emerald-700",
    late: "font-semibold text-amber-700",
    absent: "font-semibold text-rose-700",
    leave: "font-semibold text-blue-700",
    empty: "font-semibold text-slate-400"
  }
};

// rooms, subjects, students and attendance come from the shared report data set (report-data.js)
function buildInlineMockDatabase() {
  const data = window.ReportData;
  return {
    // attendance is kept for the current academic year only
    academicYears: data.academicYears.filter((year) => year.isCurrent),
    semesters: data.semesters.filter((semester) => semester.academicYearId === data.currentYear().id),
    grades: data.grades,
    classrooms: data.classrooms,
    teachers: data.teachers,
    subjects: data.subjects,
    schedules: data.schedules,
    students: data.students,
    attendance: data.attendance
  };
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

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function loadMockDatabase() {
  const db = buildInlineMockDatabase();
  const maps = {
    academicYears: buildMap(db.academicYears),
    semesters: buildMap(db.semesters),
    grades: buildMap(db.grades),
    classrooms: buildMap(db.classrooms),
    teachers: buildMap(db.teachers),
    subjects: buildMap(db.subjects),
    schedules: buildMap(db.schedules),
    students: buildMap(db.students),
    attendance: buildMap(db.attendance)
  };

  state.db = db;
  state.maps = maps;
}

function updateFieldVisibility() {
  const type = els.searchType.value;
  els.monthlyGroup.classList.toggle("hidden", type !== "monthly");
  els.semesterGroup.classList.toggle("hidden", type !== "semester");
  els.customGroup.classList.toggle("hidden", type !== "custom");
}

function getCurrentAcademicYear() {
  return state.db.academicYears.find((year) => year.isCurrent) || state.db.academicYears[0];
}

function getCurrentSemester() {
  return window.ReportData.currentSemester() || state.db.semesters[0];
}

// Filters open on the current semester only when it has attendance records;
// otherwise on the semester of the latest record, so the report never opens empty.
function getDefaultSemester() {
  const current = getCurrentSemester();
  const records = state.db.attendance;
  if (!records.length || records.some((record) => record.date >= current.startDate && record.date <= current.endDate)) return current;
  const latest = records.reduce((max, record) => (record.date > max ? record.date : max), "");
  return state.db.semesters.find((semester) => semester.startDate <= latest && semester.endDate >= latest) || current;
}

function populateAcademicYears() {
  const options = state.db.academicYears.map((year) => `<option value="${year.id}">${year.name}</option>`).join("");
  els.monthlyYear.innerHTML = options;
  els.semesterYear.innerHTML = options;

  const currentYear = getCurrentAcademicYear();
  els.monthlyYear.value = currentYear.id;
  els.semesterYear.value = currentYear.id;
}

function populateMonths() {
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  els.monthlyMonth.innerHTML = months
    .map((month, index) => `<option value="${index + 1}">${month}</option>`)
    .join("");
  const latestAttendance = state.db.attendance
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const defaultMonth = latestAttendance
    ? String(Number(latestAttendance.date.slice(5, 7)))
    : String(new Date().getMonth() + 1);
  els.monthlyMonth.value = defaultMonth;
}

function populateSemesterTerms() {
  const currentYearId = els.semesterYear.value;
  const semesters = state.db.semesters.filter((semester) => semester.academicYearId === currentYearId);
  els.semesterTerm.innerHTML = semesters
    .map((semester) => `<option value="${semester.id}">ภาคเรียนที่ ${semester.term}</option>`)
    .join("");
  const currentSemester = getDefaultSemester();
  const fallback = semesters[0] ? semesters[0].id : "";
  els.semesterTerm.value = semesters.some((semester) => semester.id === currentSemester.id) ? currentSemester.id : fallback;
}

// one room picker grouped by grade; the room name already carries the grade (ม.1/1)
function syncRoomOptions() {
  const previous = els.room.value;
  const groups = state.db.grades
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((grade) => {
      const rooms = state.db.classrooms
        .filter((classroom) => classroom.gradeId === grade.id)
        .sort((a, b) => a.name.localeCompare(b.name, "th", { numeric: true }));
      return rooms.length
        ? `<optgroup label="${grade.name}">${rooms.map((classroom) => `<option value="${classroom.id}">${classroom.name}</option>`).join("")}</optgroup>`
        : "";
    })
    .join("");

  els.room.innerHTML = `<option value="all">ทุกห้อง</option>${groups}`;
  els.room.value = state.db.classrooms.some((classroom) => classroom.id === previous) ? previous : "all";
}

function syncSubjectOptions() {
  const previous = els.subject.value;
  const selectedRoom = els.room.value;
  const classroomIds = new Set(
    state.db.classrooms
      .filter((classroom) => selectedRoom === "all" || classroom.id === selectedRoom)
      .map((classroom) => classroom.id)
  );

  const subjectIds = new Set(
    state.db.schedules
      .filter((schedule) => classroomIds.size === 0 || classroomIds.has(schedule.classroomId))
      .map((schedule) => schedule.subjectId)
  );

  const subjects = state.db.subjects
    .filter((subject) => subjectIds.size === 0 || subjectIds.has(subject.id))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  els.subject.innerHTML = `<option value="all">ทุกวิชา</option>${subjects
    .map((subject) => `<option value="${subject.id}">${window.ReportData.subjectLabel(subject, state.maps.classrooms.get(selectedRoom)?.gradeId)}</option>`)
    .join("")}`;

  els.subject.value = subjects.some((subject) => subject.id === previous) ? previous : "all";
}

function populateDateDefaults() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  els.startDate.value = formatDateInput(start);
  els.endDate.value = formatDateInput(today);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function syncCurrentAcademicLabel() {
  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / ภาคเรียนที่ ${currentSemester.term}`;
}

const ATTENDANCE_LAST_SEARCH_KEY = "attendanceReport:lastSearch";
// order matters on restore: each select's options depend on the ones before it
const ATTENDANCE_SEARCH_FIELDS = ["searchType", "monthlyYear", "monthlyMonth", "semesterYear", "semesterTerm", "startDate", "endDate", "room", "subject"];

function saveAttendanceSearch() {
  AcademicLayout.lastSearch(ATTENDANCE_LAST_SEARCH_KEY, Object.fromEntries(ATTENDANCE_SEARCH_FIELDS.map((key) => [key, els[key].value])));
}

function restoreAttendanceSearch() {
  const saved = AcademicLayout.lastSearch(ATTENDANCE_LAST_SEARCH_KEY);
  if (!saved) return;
  ATTENDANCE_SEARCH_FIELDS.forEach((key) => {
    const control = els[key];
    const value = saved[key];
    if (!value || (control.tagName === "SELECT" && ![...control.options].some((option) => option.value === value))) return;
    control.value = value;
    if (key === "semesterYear") populateSemesterTerms();
    if (key === "room") syncSubjectOptions();
  });
}

function populateFilters() {
  const currentSemester = getDefaultSemester();
  els.searchType.value = "semester";
  populateAcademicYears();
  els.semesterYear.value = currentSemester.academicYearId;
  populateMonths();
  syncRoomOptions();
  syncSubjectOptions();
  populateSemesterTerms();
  populateDateDefaults();
  restoreAttendanceSearch();
  syncCurrentAcademicLabel();
}

function getDateRangeForType() {
  const type = els.searchType.value;

  if (type === "custom") {
    return {
      start: els.startDate.value,
      end: els.endDate.value
    };
  }

  if (type === "semester") {
    const semester = state.maps.semesters.get(els.semesterTerm.value);
    return {
      start: semester.startDate,
      end: semester.endDate
    };
  }

  const academicYear = state.maps.academicYears.get(els.monthlyYear.value);
  const gregorianYear = Number(academicYear.name) - 543;
  const month = Number(els.monthlyMonth.value);
  const start = new Date(gregorianYear, month - 1, 1);
  const end = new Date(gregorianYear, month, 0);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end)
  };
}

function buildScopeText() {
  const type = els.searchType.value;
  if (type === "monthly") {
    const academicYear = state.maps.academicYears.get(els.monthlyYear.value);
    const monthText = els.monthlyMonth.options[els.monthlyMonth.selectedIndex].text;
    return `รายเดือน: ${monthText} ${academicYear.name}`;
  }
  if (type === "semester") {
    const semester = state.maps.semesters.get(els.semesterTerm.value);
    const academicYear = state.maps.academicYears.get(semester.academicYearId);
    return `รายภาคเรียน: ปี ${academicYear.name} / ภาคเรียนที่ ${semester.term}`;
  }
  return `ช่วงเวลา: ${els.startDate.value} ถึง ${els.endDate.value}`;
}

function intersectsDateRange(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function getRelevantSemesterIds(dateRange) {
  if (els.searchType.value === "semester") {
    return new Set([els.semesterTerm.value]);
  }

  return new Set(
    state.db.semesters
      .filter((semester) => intersectsDateRange(semester.startDate, semester.endDate, dateRange.start, dateRange.end))
      .map((semester) => semester.id)
  );
}

function normalizeStatusCategory(status) {
  if (["ตรงเวลา", "กิจกรรม"].includes(status)) return "present";
  if (status === "สาย") return "late";
  if (status === "ขาด") return "absent";
  return "leave";
}

function getStatusTone(status) {
  if (status === "-") return "empty";
  return normalizeStatusCategory(status);
}

function getStatusAbbr(status) {
  const map = {
    "ตรงเวลา": "ม",
    "กิจกรรม": "ม",
    "สาย": "ส",
    "ขาด": "ข",
    "ลากิจ": "ล",
    "ลาป่วย": "ล",
    "วันหยุด": "ล",
    "-": "-"
  };
  return map[status] || status;
}

// toLocaleDateString builds a new formatter on every call, which is slow over thousands of cells:
// keep one formatter per format and remember each date's text
const thaiWeekdayFormat = new Intl.DateTimeFormat("th-TH", { weekday: "short" });
const thaiShortDateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
const thaiDateCache = new Map();
function cachedThaiDate(kind, format, dateString) {
  const key = `${kind}|${dateString}`;
  let text = thaiDateCache.get(key);
  if (text === undefined) {
    text = format.format(new Date(`${dateString}T00:00:00`));
    thaiDateCache.set(key, text);
  }
  return text;
}

function getThaiWeekday(dateString) {
  return cachedThaiDate("weekday", thaiWeekdayFormat, dateString);
}

function formatThaiShortDate(dateString) {
  return cachedThaiDate("short", thaiShortDateFormat, dateString);
}

function buildSearchResult(dateRange = getDateRangeForType()) {
  const semesterIds = getRelevantSemesterIds(dateRange);
  const selectedRoomId = els.room.value;
  const selectedSubjectId = els.subject.value;

  const classroomIds = new Set(
    state.db.classrooms
      .filter((classroom) => selectedRoomId === "all" || classroom.id === selectedRoomId)
      .map((classroom) => classroom.id)
  );

  const students = state.db.students
    .filter((student) => classroomIds.has(student.classroomId))
    .sort((a, b) => a.studentCode.localeCompare(b.studentCode, "en"));

  const studentIds = new Set(students.map((student) => student.id));
  const schedules = state.db.schedules
    .filter((schedule) => classroomIds.has(schedule.classroomId))
    .filter((schedule) => semesterIds.has(schedule.semesterId))
    .filter((schedule) => selectedSubjectId === "all" || schedule.subjectId === selectedSubjectId);

  const scheduleIds = new Set(schedules.map((schedule) => schedule.id));
  const records = state.db.attendance
    .filter((record) => studentIds.has(record.studentId))
    .filter((record) => scheduleIds.has(record.scheduleId))
    .filter((record) => record.date >= dateRange.start && record.date <= dateRange.end);

  const sessionMap = new Map();
  records.forEach((record) => {
    const key = record.key;
    if (sessionMap.has(key)) return;
    const schedule = state.maps.schedules.get(record.scheduleId);
    const subject = state.maps.subjects.get(schedule.subjectId);
    const teacher = state.maps.teachers.get(schedule.teacherId);
    sessionMap.set(key, {
      key,
      scheduleId: record.scheduleId,
      date: record.date,
      period: record.period,
      subjectName: subject.name,
      subjectCode: schedule.subjectCode,
      teacherName: teacher.shortName,
      classroomId: schedule.classroomId
    });
  });

  const sessions = [...sessionMap.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.period - b.period;
  });

  const recordsByStudent = new Map(students.map((student) => [student.id, []]));
  records.forEach((record) => {
    if (!recordsByStudent.has(record.studentId)) {
      recordsByStudent.set(record.studentId, []);
    }
    recordsByStudent.get(record.studentId).push(record);
  });

  const viewStudents = students
    .map((student) => {
      const classroom = state.maps.classrooms.get(student.classroomId);
      const grade = state.maps.grades.get(classroom.gradeId);
      const studentRecords = (recordsByStudent.get(student.id) || []).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.period - b.period;
      });
      const latestRecord = [...studentRecords].reverse()[0] || null;
      const counts = { present: 0, late: 0, absent: 0, leave: 0 };
      const statusCounts = { personalLeave: 0, sickLeave: 0 };
      studentRecords.forEach((record) => {
        counts[normalizeStatusCategory(record.status)] += 1;
        if (record.status === "ลากิจ") statusCounts.personalLeave += 1;
        if (record.status === "ลาป่วย") statusCounts.sickLeave += 1;
      });

      const applicableSessions = sessions.filter((session) => session.classroomId === student.classroomId);
      const totalPeriods = studentRecords.length;
      const absentRate = totalPeriods ? Math.round((counts.absent / totalPeriods) * 100) : 0;
      const absenceLimit = getAbsenceLimit(totalPeriods);
      const riskThreshold = getAbsenceRiskThreshold(absenceLimit);
      const needsAttention = isAbsenceRisk(counts.absent, absenceLimit, riskThreshold);
      const examBlocked = isExamBlocked(counts.absent, absenceLimit);
      const sessionStatusMap = new Map(studentRecords.map((record) => [record.key, record]));
      const scheduleLabels = [...new Set(studentRecords.map((record) => {
        const schedule = state.maps.schedules.get(record.scheduleId);
        const subject = state.maps.subjects.get(schedule.subjectId);
        return `${schedule.subjectCode} - ${subject.name}`;
      }))];

      return {
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        number: student.number,
        classroomId: classroom.id,
        classroomName: classroom.name,
        gradeName: grade.name,
        gradeOrder: grade.order,
        latestRecord,
        counts,
        statusCounts,
        totalPeriods,
        absentRate,
        absenceLimit,
        riskThreshold,
        needsAttention,
        examBlocked,
        sessionStatusMap,
        studentRecords,
        applicableSessions,
        scheduleLabels
      };
    })
    .filter((student) => student.studentRecords.length > 0)
    .sort((a, b) => {
      if (a.gradeOrder !== b.gradeOrder) return a.gradeOrder - b.gradeOrder;
      if (a.classroomName !== b.classroomName) return a.classroomName.localeCompare(b.classroomName, "th", { numeric: true });
      if (a.number !== b.number) return a.number - b.number;
      return a.studentCode.localeCompare(b.studentCode, "en");
    });

  return {
    dateRange,
    sessions,
    students: viewStudents,
    schedules
  };
}

function summarizeData(students) {
  const dashboard = buildAttendanceDashboardData(students);
  const summary = dashboard.summary;

  els.totalStudents.textContent = `${summary.totalStudents} คน`;
  els.absentRate.textContent = `${formatRate(Math.round(summary.absentRate * 10) / 10)}%`;
  els.absentRateDesc.textContent = `${summary.absentPeriods} จาก ${summary.totalPeriods} คาบ`;
  els.absentCount.textContent = `${summary.absentStudents} คน`;
  els.lateCount.textContent = `${summary.lateStudents} คน`;
  els.absentDesc.textContent = `${summary.absentPeriods} คาบ`;
  els.lateDesc.textContent = `${summary.lateTimes} ครั้ง`;
  els.summaryScope.textContent = buildSummaryHeaderText(summary.totalSessions);
  syncAttendanceThresholdControls();

  renderAttendanceTrend(dashboard.chartPoints);
  renderAttendanceInsights(dashboard.riskStudents);
}

function formatRate(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getAbsenceAlertThreshold() {
  return Math.max(0, 100 - state.attendanceThreshold);
}

function getAbsenceLimit(totalPeriods) {
  return Math.floor((totalPeriods * getAbsenceAlertThreshold()) / 100);
}

function getAbsenceRiskThreshold(absenceLimit) {
  return Math.ceil(absenceLimit * 0.5);
}

function isAbsenceRisk(absentPeriods, absenceLimit, riskThreshold) {
  return absenceLimit > 0 && absentPeriods >= riskThreshold && absentPeriods <= absenceLimit;
}

function isExamBlocked(absentPeriods, absenceLimit) {
  return absenceLimit >= 0 && absentPeriods > absenceLimit;
}

function isRiskStudent(student) {
  return isAbsenceRisk(student.absentPeriods, student.absenceLimit, student.riskThreshold);
}

function buildAttendanceDashboardData(students) {
  const chartPoints = buildTrendDataset(students);
  const totalStudents = students.length;
  const totalSessions = state.visibleSessions.length;
  const allRecords = students.flatMap((student) => student.studentRecords);
  const totals = countAttendanceRecords(allRecords);
  const sourceStudents = students.map(buildStudentRiskProfile);
  const riskStudents = sourceStudents.filter(isRiskStudent);

  return {
    summary: {
      totalStudents,
      totalSessions,
      absentRate: totals.totalPeriods ? (totals.absentPeriods / totals.totalPeriods) * 100 : 0,
      totalPeriods: totals.totalPeriods,
      presentStudents: sourceStudents.filter((student) => student.presentPeriods > 0).length,
      presentPeriods: totals.presentPeriods,
      absentStudents: sourceStudents.filter((student) => student.absentPeriods > 0).length,
      absentPeriods: totals.absentPeriods,
      lateStudents: sourceStudents.filter((student) => student.lateCount > 0).length,
      lateTimes: totals.lateTimes,
      leaveStudents: sourceStudents.filter((student) => student.personalLeave + student.sickLeave > 0).length,
      personalLeave: totals.personalLeave,
      sickLeave: totals.sickLeave
    },
    chartPoints,
    riskStudents
  };
}

function countAttendanceRecords(records) {
  return records.reduce((totals, record) => {
    const category = normalizeStatusCategory(record.status);
    totals.totalPeriods += 1;
    if (category === "present") totals.presentPeriods += 1;
    if (category === "late") totals.lateTimes += 1;
    if (category === "absent") totals.absentPeriods += 1;
    if (record.status === "ลากิจ") totals.personalLeave += 1;
    if (record.status === "ลาป่วย") totals.sickLeave += 1;
    if (category !== "absent") totals.attendedPeriods += 1;
    return totals;
  }, {
    totalPeriods: 0,
    presentPeriods: 0,
    attendedPeriods: 0,
    absentPeriods: 0,
    lateTimes: 0,
    personalLeave: 0,
    sickLeave: 0
  });
}

function buildStudentRiskProfile(student) {
  return {
    id: student.id,
    name: student.name,
    classroomName: student.classroomName,
    number: student.number,
    totalPeriods: student.totalPeriods,
    absentRate: student.absentRate,
    absenceLimit: student.absenceLimit,
    riskThreshold: student.riskThreshold,
    examBlocked: student.examBlocked,
    presentPeriods: student.counts.present,
    absentPeriods: student.counts.absent,
    lateCount: student.counts.late,
    personalLeave: student.statusCounts.personalLeave,
    sickLeave: student.statusCounts.sickLeave
  };
}

// monthly mode still charts the whole term so every month shows; the picked month is highlighted
function getTrendSource(students) {
  if (els.searchType.value !== "monthly") {
    return {
      students,
      sessions: state.visibleSessions,
      semester: state.maps.semesters.get(els.semesterTerm.value) || getCurrentSemester(),
      selectedMonthKey: null
    };
  }
  const monthStart = getDateRangeForType().start;
  const semester = state.db.semesters.find((item) => monthStart >= item.startDate && monthStart <= item.endDate) || getCurrentSemester();
  const result = buildSearchResult({ start: semester.startDate, end: semester.endDate });
  const visibleIds = new Set(students.map((student) => student.id));
  return {
    students: result.students.filter((student) => visibleIds.has(student.id)),
    sessions: result.sessions,
    semester,
    selectedMonthKey: monthStart.slice(5, 7)
  };
}

function buildTrendDataset(students) {
  const source = getTrendSource(students);
  if (state.trendDrilldown) return buildDailyTrendDataset(source, state.trendDrilldown);
  if (els.searchType.value === "custom") return buildDateRangeTrendDataset(source);
  return buildSemesterTrendDataset(source);
}

function buildDateRangeTrendDataset({ students, sessions }) {
  const dates = [...new Set(sessions.map((session) => session.date))]
    .sort((a, b) => a.localeCompare(b));

  return dates.map((date) => {
    const dateSessions = sessions.filter((session) => session.date === date);
    return buildTrendPointFromSessions(formatThaiShortDate(date), dateSessions, students, {
      dateStart: date,
      dateEnd: date
    });
  });
}

function buildSemesterTrendDataset({ students, sessions, semester, selectedMonthKey }) {
  const months = [];
  for (let cursor = new Date(`${semester.startDate.slice(0, 7)}-01T00:00:00`); formatDateInput(cursor) <= semester.endDate; cursor.setMonth(cursor.getMonth() + 1)) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
  }

  const points = months.map(({ year, month }) => {
    const monthText = new Date(year, month - 1, 1).toLocaleDateString("th-TH", { month: "short" });
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthSessions = sessions.filter((session) => session.date.startsWith(monthKey));
    return {
      ...buildTrendPointFromSessions(monthText, monthSessions, students, {
        drilldownLabel: `${new Date(year, month - 1, 1).toLocaleDateString("th-TH", { month: "long" })} ${year + 543}`
      }),
      isSelected: selectedMonthKey === monthKey.slice(5, 7)
    };
  });
  return points.filter((point) => point.sessionCount > 0);
}

function buildDailyTrendDataset({ students, sessions }, drilldown) {
  const rangeSessions = sessions.filter((session) => {
    return session.date >= drilldown.dateStart && session.date <= drilldown.dateEnd;
  });
  const dates = [...new Set(rangeSessions.map((session) => session.date))]
    .sort((a, b) => a.localeCompare(b));

  return dates.map((date) => {
    const dateSessions = rangeSessions.filter((session) => session.date === date);
    return buildTrendPointFromSessions(formatThaiShortDate(date), dateSessions, students, {
      dateStart: date,
      dateEnd: date
    });
  });
}

function getSessionDateRange(sessions) {
  const dates = sessions.map((session) => session.date).sort((a, b) => a.localeCompare(b));
  return {
    dateStart: dates[0] || "",
    dateEnd: dates[dates.length - 1] || ""
  };
}

// records of the given students grouped by period, built once per student list:
// the trend chart asks for one month (or one day) at a time, so scanning every record each time was slow
const recordsBySessionCache = new WeakMap();
function getRecordsBySession(students) {
  let index = recordsBySessionCache.get(students);
  if (!index) {
    index = new Map();
    students.forEach((student) => student.studentRecords.forEach((record) => {
      const list = index.get(record.key);
      if (list) list.push(record);
      else index.set(record.key, [record]);
    }));
    recordsBySessionCache.set(students, index);
  }
  return index;
}

function getRecordsForSessions(students, sessions) {
  const index = getRecordsBySession(students);
  return sessions.flatMap((session) => index.get(session.key) || []);
}

function buildTrendPointFromSessions(label, sessions, students, options = {}) {
  const range = getSessionDateRange(sessions);
  const point = buildTrendPoint(label, sessions.length, getRecordsForSessions(students, sessions));
  const dateStart = options.dateStart || range.dateStart;
  const dateEnd = options.dateEnd || range.dateEnd;
  const isDaily = dateStart && dateStart === dateEnd;

  return {
    ...point,
    dateStart,
    dateEnd,
    drilldownLabel: options.drilldownLabel || label,
    isDrillable: !state.trendDrilldown && !isDaily && sessions.length > 0
  };
}

function buildTrendPoint(label, sessionCount, records) {
  const totals = countAttendanceRecords(records);
  const totalPeriods = totals.totalPeriods;
  return {
    label,
    sessionCount,
    totalPeriods,
    presentPeriods: totals.presentPeriods,
    attendedPeriods: totals.attendedPeriods,
    absentPeriods: totals.absentPeriods,
    lateTimes: totals.lateTimes,
    presentRate: totalPeriods ? (totals.presentPeriods / totalPeriods) * 100 : 0,
    absentRate: totalPeriods ? (totals.absentPeriods / totalPeriods) * 100 : 0,
    lateRate: totalPeriods ? (totals.lateTimes / totalPeriods) * 100 : 0
  };
}

function getSelectedOptionText(element, fallback) {
  return element.options[element.selectedIndex]?.text || fallback;
}

function getSummarySubjectLabel() {
  const subjectText = getSelectedOptionText(els.subject, "ทุกวิชา");
  return subjectText.includes(" - ") ? subjectText.split(" - ").slice(1).join(" - ") : subjectText;
}

function getSummaryRoomLabel() {
  return getSelectedOptionText(els.room, "ทุกห้อง");
}

function buildSummaryPeriodLabel() {
  if (els.searchType.value === "monthly") {
    const academicYear = state.maps.academicYears.get(els.monthlyYear.value);
    const monthText = els.monthlyMonth.options[els.monthlyMonth.selectedIndex]?.text || "กรกฎาคม";
    return `${monthText} ${academicYear.name}`;
  }

  if (els.searchType.value === "semester") {
    const semester = state.maps.semesters.get(els.semesterTerm.value);
    const academicYear = state.maps.academicYears.get(semester.academicYearId);
    return `ภาคเรียนที่ ${semester.term}/${academicYear.name}`;
  }

  const start = formatThaiShortDate(els.startDate.value);
  const end = formatThaiShortDate(els.endDate.value);
  return `${start} - ${end}`;
}

function buildSummaryHeaderText(totalSessions) {
  return `${getSummarySubjectLabel()} · ${getSummaryRoomLabel()} · ${buildSummaryPeriodLabel()} · ${totalSessions} คาบเรียน`;
}

// absent and late rates sit far below the attendance rate, so they get their own panel and scale
const trendPanels = [
  { title: "เข้าเรียน", seriesKeys: ["presentRate"], fixedMax: 100, top: 52, height: 108 },
  { title: "ขาดเรียน และมาสาย", seriesKeys: ["absentRate", "lateRate"], top: 204, height: 96 }
];

function getNiceRateMax(value) {
  return [5, 10, 20, 25, 40, 50, 75, 100].find((step) => step >= value * 1.15) || 100;
}

function renderAttendanceTrend(points) {
  hideTrendTooltip();
  syncTrendDrilldownControls();

  if (!points.length) {
    els.attendanceTrendChart.innerHTML = `<text class="${UI.axisLabel}" x="360" y="172" text-anchor="middle">ไม่มีข้อมูลคาบเรียนในเงื่อนไขที่เลือก</text>`;
    els.trendAverage.textContent = "-";
    els.trendMax.textContent = "-";
    els.trendMin.textContent = "-";
    return;
  }

  const totalPeriods = points.reduce((sum, point) => sum + point.totalPeriods, 0);
  const totalPresent = points.reduce((sum, point) => sum + point.presentPeriods, 0);
  const totalAbsent = points.reduce((sum, point) => sum + point.absentPeriods, 0);
  const totalLate = points.reduce((sum, point) => sum + point.lateTimes, 0);
  const presentAverage = totalPeriods ? (totalPresent / totalPeriods) * 100 : 0;
  const absentAverage = totalPeriods ? (totalAbsent / totalPeriods) * 100 : 0;
  const lateAverage = totalPeriods ? (totalLate / totalPeriods) * 100 : 0;

  els.trendAverage.textContent = `${formatRate(Math.round(presentAverage * 10) / 10)}%`;
  els.trendMax.textContent = `${formatRate(Math.round(absentAverage * 10) / 10)}%`;
  els.trendMin.textContent = `${formatRate(Math.round(lateAverage * 10) / 10)}%`;

  const width = Math.max(720, Math.round(els.attendanceTrendChart.clientWidth || 720));
  const height = 344;
  const padding = { right: 28, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const seriesByKey = new Map(trendSeries.map((series) => [series.key, series]));
  const panels = trendPanels.map((panel) => {
    const max = panel.fixedMax || getNiceRateMax(Math.max(...points.flatMap((point) => panel.seriesKeys.map((key) => point[key]))));
    return {
      ...panel,
      max,
      series: panel.seriesKeys.map((key) => seriesByKey.get(key)),
      yFor: (rate) => panel.top + panel.height - ((Math.min(rate, max) / max) * panel.height)
    };
  });
  const panelOf = new Map(panels.flatMap((panel) => panel.seriesKeys.map((key) => [key, panel])));
  const pointCoords = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length > 1 ? index * xStep : chartWidth / 2),
    series: trendSeries.reduce((seriesData, series) => {
      seriesData[series.key] = {
        ...series,
        value: point[series.key],
        count: point[series.countKey],
        y: panelOf.get(series.key).yFor(point[series.key])
      };
      return seriesData;
    }, {})
  }));
  pointCoords.forEach((point) => {
    point.y = point.series.presentRate.y;
  });
  const buildPath = (series) => pointCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.series[series.key].y.toFixed(2)}`)
    .join(" ");
  const chartTop = panels[0].top;
  const chartBottom = panels[panels.length - 1].top + panels[panels.length - 1].height;
  const bandWidth = Math.max(Math.min(xStep, 96), 40);

  els.attendanceTrendChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.attendanceTrendChart.innerHTML = `
    <g transform="translate(${padding.left}, 14)">
      ${trendSeries.map((series, index) => `
        <g transform="translate(${index * 104}, 0)">
          <line class="stroke-[3] ${series.stroke}" stroke-linecap="round" x1="0" y1="0" x2="18" y2="0"></line>
          <text class="${UI.axisLabel}" x="25" y="4">${series.label}</text>
        </g>
      `).join("")}
    </g>
    ${pointCoords.filter((point) => point.isSelected).map((point) => `
      <rect class="fill-blue-50" x="${point.x - bandWidth / 2}" y="${chartTop - 8}" width="${bandWidth}" height="${chartBottom - chartTop + 16}" rx="6"></rect>
    `).join("")}
    ${panels.map((panel) => `
      <text class="fill-slate-800 text-xs font-bold" x="${padding.left}" y="${panel.top - 12}">${panel.title} (%)</text>
      ${[0, panel.max / 2, panel.max].map((tick) => {
        const y = panel.yFor(tick);
        return `
          <line class="stroke-slate-200" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
          <text class="${UI.axisLabel}" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${formatRate(tick)}%</text>
        `;
      }).join("")}
      ${panel.series.map((series) => `<path class="fill-none stroke-[3] ${series.stroke}" stroke-linecap="round" stroke-linejoin="round" d="${buildPath(series)}"></path>`).join("")}
    `).join("")}
    ${pointCoords.map((point, index) => `
      <g class="group touch-manipulation outline-none ${point.isDrillable ? "cursor-zoom-in" : ""}" data-index="${index}" ${point.isDrillable ? `tabindex="0" role="button" aria-label="ดูรายวัน ${point.drilldownLabel}"` : ""}>
        <rect class="fill-transparent" x="${point.x - Math.max(xStep / 2, 24)}" y="${chartTop}" width="${Math.max(xStep, 48)}" height="${chartBottom - chartTop}"></rect>
        ${trendSeries.map((series) => `
          <circle class="fill-white stroke-[2.5] group-hover:stroke-[3.5] group-focus:stroke-[3.5] ${series.stroke}" cx="${point.x}" cy="${point.series[series.key].y}" r="5"></circle>
        `).join("")}
        <text class="${point.isSelected ? UI.xLabelSelected : UI.xLabel}" x="${point.x}" y="${height - 16}" text-anchor="middle">${point.label}</text>
      </g>
    `).join("")}
  `;

  els.attendanceTrendChart.querySelectorAll("g[data-index]").forEach((node) => {
    const point = { ...pointCoords[Number(node.dataset.index)], chartWidth: width };
    node.addEventListener("pointerenter", () => showTrendTooltip(point));
    node.addEventListener("pointermove", () => showTrendTooltip(point));
    node.addEventListener("pointerleave", hideTrendTooltip);
    node.addEventListener("pointercancel", hideTrendTooltip);
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      showTrendTooltip(point);
      drillDownTrend(point);
      window.clearTimeout(showTrendTooltip.timer);
      showTrendTooltip.timer = window.setTimeout(hideTrendTooltip, 1400);
    });
    node.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      drillDownTrend(point);
    });
  });
}

function syncTrendDrilldownControls() {
  els.trendZoomOutBtn.hidden = !state.trendDrilldown;
  els.attendanceTrendTitle.textContent = state.trendDrilldown
    ? `แนวโน้มรายวัน: ${state.trendDrilldown.label}`
    : els.searchType.value === "custom" ? "แนวโน้มการเข้าเรียน" : "แนวโน้มการเข้าเรียนรายเดือน ทั้งภาคเรียน";
}

function drillDownTrend(point) {
  if (!point.isDrillable) return;
  state.trendDrilldown = {
    label: point.drilldownLabel,
    dateStart: point.dateStart,
    dateEnd: point.dateEnd
  };
  summarizeData(state.visibleStudents);
}

function resetTrendDrilldown() {
  if (!state.trendDrilldown) return;
  state.trendDrilldown = null;
  summarizeData(state.visibleStudents);
}

function clearTrendDrilldown() {
  state.trendDrilldown = null;
}

function hideTrendTooltip() {
  window.clearTimeout(showTrendTooltip.timer);
  els.trendTooltip.hidden = true;
}

function showTrendTooltip(point) {
  window.clearTimeout(showTrendTooltip.timer);
  els.trendTooltip.innerHTML = `
    <strong>${point.label}</strong>
    <span>เข้าเรียน ${formatRate(point.presentRate)}% · ${point.presentPeriods} คาบ</span>
    <span>ขาดเรียน ${formatRate(point.absentRate)}% · ${point.absentPeriods} คาบ</span>
    <span>มาสาย ${formatRate(point.lateRate)}% · ${point.lateTimes} ครั้ง</span>
    ${point.isDrillable ? "<span>คลิกเพื่อดูรายวัน</span>" : ""}
  `;
  els.trendTooltip.style.left = `${Math.min(Math.max((point.x / point.chartWidth) * 100, 12), 88)}%`;
  els.trendTooltip.style.top = `${Math.max(point.y - 12, 24)}px`;
  els.trendTooltip.hidden = false;
}

function renderAttendanceInsights(priorityStudents) {
  els.priorityInsightCount.textContent = `${priorityStudents.length} คน`;

  if (!priorityStudents.length) {
    els.priorityList.innerHTML = `<div class="py-4 text-sm text-slate-400">ไม่พบนักเรียนกลุ่มเสี่ยง</div>`;
    return;
  }

  els.priorityList.innerHTML = priorityStudents.map((student) => {
    return `
      <a class="grid items-center gap-3 border-b border-slate-100 px-2 py-3 text-sm text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 md:grid-cols-[minmax(190px,1fr)_auto_minmax(96px,auto)] md:gap-5" href="#attendance-student-${student.id}" data-student-id="${student.id}">
        <div class="min-w-0">
          <strong class="block truncate font-semibold text-slate-900">${student.name}</strong>
          <span class="block text-xs text-slate-500">${student.classroomName} · เลขที่ ${student.number}</span>
        </div>
        <div class="grid grid-cols-3 gap-4 [&_small]:block [&_small]:text-xs [&_small]:text-slate-400 [&_strong]:block [&_strong]:whitespace-nowrap [&_strong]:font-semibold" aria-label="ข้อมูลการเข้าเรียนของ ${student.name}">
          <span class="min-w-[72px]"><small>ขาด</small><strong class="text-base text-rose-600">${student.absentPeriods}/${student.absenceLimit} คาบ</strong></span>
          <span class="min-w-[72px]"><small>ทั้งหมด</small><strong>${student.totalPeriods} คาบ</strong></span>
          <span class="min-w-[72px]"><small>เริ่มเสี่ยง</small><strong>${student.riskThreshold} คาบ</strong></span>
        </div>
        <span class="whitespace-nowrap text-xs font-semibold text-brand md:justify-self-end">ดูในตาราง <span aria-hidden="true">→</span></span>
      </a>
    `;
  }).join("");
}

function jumpToAttendanceStudent(event) {
  const link = event.target.closest("[data-student-id]");
  if (!link) return;
  event.preventDefault();

  if (els.statusFilter.value !== "all") {
    els.statusFilter.value = "all";
    renderTable();
  }

  const row = document.getElementById(`attendance-student-${link.dataset.studentId}`);
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  row.classList.add("is-jump-target");
  window.clearTimeout(jumpToAttendanceStudent.timer);
  jumpToAttendanceStudent.timer = window.setTimeout(() => {
    row.classList.remove("is-jump-target");
  }, 1800);
}

function getViewScopeLabel() {
  return state.viewMode === "quick" ? "สถานะล่าสุด" : "รายงานรายวัน";
}

function syncResultsMeta() {
  els.periodLabel.textContent = state.currentScopeText;
  els.timeFilterSummary.textContent = state.currentScopeText;
}

function renderQuickHeader() {
  els.attendanceThead.innerHTML = `
    <tr>
      <th class="${UI.headId}">รหัสนักเรียน</th>
      <th class="${UI.headName}">ชื่อ-สกุล</th>
      <th>ห้อง</th>
      <th>วิชาที่พบ</th>
      <th>วันที่/คาบล่าสุด</th>
      <th>สถานะล่าสุด</th>
      <th>มาเรียน</th>
      <th>สาย</th>
      <th>ขาด</th>
      <th>ลา/อื่นๆ</th>
      <th>% ขาดเรียน</th>
    </tr>
  `;
}

function renderReportHeader() {
  const sessionHeaders = state.visibleSessions.map((session, index) => `
    <th class="!border-b-0" data-col-key="session-${index}">
      <strong class="block text-slate-700">${formatThaiShortDate(session.date)}</strong>
      <span class="block font-medium text-slate-400">${getThaiWeekday(session.date)}</span>
    </th>
  `).join("");
  const sessionDetailHeaders = state.visibleSessions.map((session, index) => `
    <th class="!top-12" data-col-key="session-${index}" title="${session.subjectCode} ${session.subjectName} / ${session.teacherName}">
      <strong class="block text-slate-700">คาบ ${session.period}</strong>
      <span class="block font-medium text-slate-400">${session.subjectCode}</span>
    </th>
  `).join("");

  els.attendanceThead.innerHTML = `
    <tr>
      <th class="${UI.headId}" rowspan="2">รหัสนักเรียน</th>
      <th class="${UI.headName}" rowspan="2">ชื่อ-สกุล</th>
      <th class="min-w-[96px]" rowspan="2">ห้อง</th>
      ${sessionHeaders}
      <th class="${UI.headSummary.present}" rowspan="2">มา</th>
      <th class="${UI.headSummary.late}" rowspan="2">สาย</th>
      <th class="${UI.headSummary.absent}" rowspan="2">ขาด</th>
      <th class="${UI.headSummary.leave}" rowspan="2">ลา</th>
      <th class="${UI.headSummary.rate}" rowspan="2">% ขาดเรียน</th>
    </tr>
    <tr>
      ${sessionDetailHeaders}
    </tr>
  `;
}

function renderEmptyState(message, colSpan) {
  els.attendanceTbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}">
        <div class="${UI.empty}">${message}</div>
      </td>
    </tr>
  `;
}

function getTableStudents() {
  const status = els.statusFilter.value;
  if (status === "all") return state.visibleStudents;
  return state.visibleStudents.filter((student) => student.counts[status] > 0);
}

function getStudentAttendanceHighlights(student) {
  const totalPeriods = student.studentRecords.length;
  const absentRate = totalPeriods ? (student.counts.absent / totalPeriods) * 100 : 0;
  return {
    absent: absentRate > getAbsenceAlertThreshold(),
    late: student.counts.late > 0,
    leave: student.counts.leave > 0
  };
}

// tone of the absence-rate chip: over the limit, close to it, or fine
function getAbsenceRateTone(student) {
  if (student.examBlocked) return "danger";
  if (student.needsAttention) return "alert";
  return "normal";
}

function renderQuickRows() {
  const tableStudents = getTableStudents();
  if (!tableStudents.length) {
    renderEmptyState("ไม่พบรายการที่ตรงกับสถานะที่เลือก", 11);
    return;
  }

  els.attendanceTbody.innerHTML = tableStudents.map((student) => {
    const index = state.visibleStudents.indexOf(student);
    const highlights = getStudentAttendanceHighlights(student);
    const rateTone = getAbsenceRateTone(student);
    const latestStatus = student.latestRecord ? student.latestRecord.status : "-";
    const latestLabel = student.latestRecord
      ? `${formatThaiShortDate(student.latestRecord.date)} / คาบ ${student.latestRecord.period}`
      : "-";

    const statusCell = state.editMode
      ? `<select data-index="${index}" aria-label="เปลี่ยนสถานะล่าสุดของ ${student.name}">
          ${attendanceOptions.map((status) => `<option value="${status}" ${status === latestStatus ? "selected" : ""}>${status}</option>`).join("")}
        </select>`
      : `<span class="${UI.statusChip} ${UI.statusTone[getStatusTone(latestStatus)]}" data-status="${latestStatus}">${latestStatus}</span>`;

    return `
      <tr id="attendance-student-${student.id}">
        <td class="${UI.cellId} ${UI.riskEdge[rateTone]}">${student.studentCode}</td>
        <td class="${UI.cellName}">
          <div class="${UI.studentCell}">
            <strong class="${UI.studentName}">${student.name}</strong>
            <span class="${UI.studentMeta}">${student.gradeName}</span>
          </div>
        </td>
        <td>${student.classroomName}</td>
        <td>${student.scheduleLabels.length > 3 ? `${student.scheduleLabels.length} วิชา` : student.scheduleLabels.join("<br />")}</td>
        <td>${latestLabel}</td>
        <td>${statusCell}</td>
        <td>${student.counts.present}</td>
        <td class="${highlights.late ? UI.highlight.late : ""}">${student.counts.late}</td>
        <td class="${highlights.absent ? UI.highlight.absent : ""}">${student.counts.absent}</td>
        <td class="${highlights.leave ? UI.highlight.leave : ""}">${student.counts.leave}</td>
        <td><span class="${UI.rateChip} ${UI.rateTone[rateTone]}" data-rate-tone="${rateTone}">${student.absentRate}%</span></td>
      </tr>
    `;
  }).join("");
}

function renderReportRows() {
  const tableStudents = getTableStudents();
  if (!tableStudents.length) {
    renderEmptyState("ไม่พบข้อมูลที่ตรงกับเงื่อนไขและตารางเรียนจริง", 8 + state.visibleSessions.length);
    return;
  }

  // Thai date formatting is slow; a room with all subjects has ~14,000 cells but only ~400 periods, so format each period once
  const sessionLabels = state.visibleSessions.map((session) => `${formatThaiShortDate(session.date)} คาบ ${session.period}`);

  els.attendanceTbody.innerHTML = tableStudents.map((student) => {
    const highlights = getStudentAttendanceHighlights(student);
    const rateTone = getAbsenceRateTone(student);
    const sessionCells = state.visibleSessions.map((session, index) => {
      const record = student.sessionStatusMap.get(session.key);
      const isApplicable = session.classroomId === student.classroomId;
      const status = record ? record.status : "-";
      const displayTitle = record
        ? `${sessionLabels[index]}: ${record.status}`
        : isApplicable
          ? `${sessionLabels[index]}: ยังไม่มีข้อมูล`
          : "ไม่มีคาบเรียนของห้องนี้";

      if (state.bulkEditMode && record) {
        return `
          <td data-col-key="session-${index}">
            <select data-record-id="${record.id}" aria-label="เปลี่ยนสถานะ ${student.name} ${sessionLabels[index]}">
              ${attendanceOptions.map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </td>
        `;
      }

      const tone = getStatusTone(status);
      // only what differs per cell: the tint of a late / leave / over-limit absent cell, or the grey of a cell without a period
      const cellClass = tone === "late"
        ? UI.highlight.late
        : tone === "leave"
          ? UI.highlight.leave
          : tone === "absent" && highlights.absent ? UI.highlight.absent : isApplicable ? "" : UI.mutedCell;

      return `<td${cellClass ? ` class="${cellClass}"` : ""} data-col-key="session-${index}"><span class="${UI.dot[tone]}" title="${displayTitle}">${getStatusAbbr(status)}</span></td>`;
    }).join("");

    return `
      <tr id="attendance-student-${student.id}">
        <td class="${UI.cellId} ${UI.riskEdge[rateTone]}">${student.studentCode}</td>
        <td class="${UI.cellName}">
          <div class="${UI.studentCell}">
            <strong class="${UI.studentName}">${student.name}</strong>
            <span class="${UI.studentMeta}">${student.classroomName}</span>
          </div>
        </td>
        <td>${student.classroomName}</td>
        ${sessionCells}
        <td class="${UI.cellSummary.present}">${student.counts.present}</td>
        <td class="${UI.cellSummary.late} ${highlights.late ? UI.highlight.late : ""}">${student.counts.late}</td>
        <td class="${UI.cellSummary.absent} ${highlights.absent ? UI.highlight.absent : ""}">${student.counts.absent}</td>
        <td class="${UI.cellSummary.leave} ${highlights.leave ? UI.highlight.leave : ""}">${student.counts.leave}</td>
        <td class="${UI.cellSummary.rate}"><span class="${UI.rateChip} ${UI.rateTone[rateTone]}" data-rate-tone="${rateTone}">${student.absentRate}%</span></td>
      </tr>
    `;
  }).join("");
}

function renderTable() {
  els.tableWrap.dataset.view = state.viewMode;
  els.tableWrap.dataset.bulkEdit = String(state.bulkEditMode);

  if (!state.visibleSessions.length) {
    els.attendanceThead.innerHTML = `
      <tr>
        <th>ไม่พบคาบเรียนจริงในช่วงเวลาที่เลือก</th>
      </tr>
    `;
    renderEmptyState("ช่วงเวลานี้ยังไม่มีคาบเรียนของห้องและวิชาที่เลือก", 1);
    return;
  }

  if (state.viewMode === "quick") {
    renderQuickHeader();
    renderQuickRows();
    return;
  }

  renderReportHeader();
  renderReportRows();
}

function syncModeControls() {
  const modeMeta = viewModeDetails[state.viewMode];
  els.modeLabel.textContent = state.bulkEditMode ? "แก้ไขแบบกลุ่ม" : modeMeta.label;
  els.summaryTitle.textContent = modeMeta.summaryTitle;
  els.tableTitle.textContent = modeMeta.tableTitle;
  els.saveBtn.hidden = !state.bulkEditMode;
  els.bulkEditBtn.disabled = state.viewMode !== "report";
  els.bulkEditBtn.textContent = state.bulkEditMode ? "ยกเลิกแก้ไขกลุ่ม" : "แก้ไขแบบกลุ่ม";
  UI.btnActive.forEach((name) => els.bulkEditBtn.classList.toggle(name, state.bulkEditMode));
  UI.btnIdle.forEach((name) => els.bulkEditBtn.classList.toggle(name, !state.bulkEditMode));
}

function searchData() {
  saveAttendanceSearch();
  const result = buildSearchResult();
  state.visibleSessions = result.sessions;
  state.visibleStudents = result.students;
  state.viewMode = result.students.length * result.sessions.length > MAX_MATRIX_CELLS ? "quick" : "report";
  state.currentScopeText = buildScopeText();
  state.editMode = false;
  state.bulkEditMode = false;
  syncResultsMeta();
  summarizeData(state.visibleStudents);
  renderTable();
  syncModeControls();
  els.resultsSection.hidden = false;
  els.tableSection.hidden = false;
  if (els.tablePlaceholder) {
    els.tablePlaceholder.hidden = true;
  }
}

function refreshAttendanceResults() {
  if (state.activeModule === "attendance" && state.db) {
    searchData();
  }
}

function toggleEditMode(force) {
  if (state.viewMode !== "quick") {
    setToast("แก้ไขรายบุคคลได้ใน Quick View เท่านั้น", "info");
    return;
  }

  if (!state.visibleStudents.length) {
    setToast("กรุณากดค้นหาก่อนเพื่อโหลดข้อมูลจริงจาก mock relation", "info");
    return;
  }

  state.editMode = typeof force === "boolean" ? force : !state.editMode;
  state.bulkEditMode = false;
  renderTable();
  syncModeControls();
  if (state.editMode) {
    setToast("เปิดโหมดแก้ไขรายบุคคลแล้ว", "info");
  }
}

function saveChanges() {
  if (state.bulkEditMode) {
    const selects = els.attendanceTbody.querySelectorAll("select[data-record-id]");
    let updatedCount = 0;
    selects.forEach((select) => {
      const sourceRecord = state.maps.attendance.get(select.dataset.recordId);
      if (!sourceRecord || sourceRecord.status === select.value) return;
      sourceRecord.status = select.value;
      sourceRecord.remark = `แก้ไขแบบกลุ่มเป็น ${select.value}`;
      updatedCount += 1;
    });

    state.bulkEditMode = false;
    searchData();
    setToast(updatedCount ? `บันทึกการแก้ไขแบบกลุ่ม ${updatedCount} รายการเรียบร้อย` : "ไม่มีรายการที่เปลี่ยนแปลง", updatedCount ? "success" : "info");
    return;
  }

  const selects = els.attendanceTbody.querySelectorAll("select[data-index]");
  selects.forEach((select) => {
    const index = Number(select.dataset.index);
    const student = state.visibleStudents[index];
    if (!student || !student.latestRecord) return;
    student.latestRecord.status = select.value;
    student.latestRecord.remark = `แก้ไขสถานะเป็น ${select.value}`;
    const sourceRecord = state.maps.attendance.get(student.latestRecord.id);
    if (sourceRecord) {
      sourceRecord.status = select.value;
      sourceRecord.remark = `แก้ไขสถานะเป็น ${select.value}`;
    }
  });

  state.editMode = false;
  searchData();
  setToast("บันทึกสถานะล่าสุดเรียบร้อย", "success");
}

function openBulkEdit() {
  if (state.viewMode !== "report") {
    setToast("แก้ไขแบบกลุ่มเหมาะกับ Report View เพื่อดูหลายวันพร้อมกัน", "info");
    return;
  }
  if (!state.visibleStudents.length) {
    setToast("กรุณากดค้นหาก่อนเพื่อโหลดข้อมูลสำหรับแก้ไขแบบกลุ่ม", "info");
    return;
  }

  state.bulkEditMode = !state.bulkEditMode;
  state.editMode = false;
  renderTable();
  syncModeControls();
  setToast(state.bulkEditMode ? "เลือกสถานะในตาราง Report View แล้วกดบันทึก" : "ยกเลิกโหมดแก้ไขแบบกลุ่มแล้ว", "info");
}

function mockExport(type) {
  setToast(`เตรียมส่งออกรายงาน ${type === "excel" ? "Excel" : "PDF"} จากผลการค้นหาจริง`, "info");
}

function buildPdfPreviewRows() {
  const previewStudents = state.visibleStudents.slice(0, 8);

  if (state.viewMode === "report") {
    const previewSessions = state.visibleSessions.slice(0, 8);
    const sessionHeads = previewSessions
      .map((session) => `<th>${formatThaiShortDate(session.date)}<br><span>คาบ ${session.period}</span></th>`)
      .join("");
    const rows = previewStudents.map((student, index) => {
      const cells = previewSessions.map((session) => {
        const record = student.sessionStatusMap.get(session.key);
        const status = record ? record.status : "-";
        return `<td><span class="${UI.pdfStatus[getStatusTone(status)]}">${getStatusAbbr(status)}</span></td>`;
      }).join("");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.studentCode}</td>
          <td class="font-medium text-slate-900">${student.name}</td>
          <td>${student.classroomName}</td>
          ${cells}
          <td>${student.absentRate}%</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="overflow-x-auto"><table class="${UI.pdfTable} [&_td]:whitespace-nowrap">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รหัส</th>
            <th>ชื่อ-สกุล</th>
            <th>ห้อง</th>
            ${sessionHeads}
            <th>% ขาดเรียน</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table></div>
    `;
  }

  const rows = previewStudents.map((student, index) => {
    const latestStatus = student.latestRecord ? student.latestRecord.status : "-";
    const latestLabel = student.latestRecord ? `${formatThaiShortDate(student.latestRecord.date)} / คาบ ${student.latestRecord.period}` : "-";
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${student.studentCode}</td>
        <td class="font-medium text-slate-900">${student.name}</td>
        <td>${student.classroomName}</td>
        <td>${latestLabel}</td>
        <td><span class="${UI.pdfStatus[getStatusTone(latestStatus)]}">${latestStatus}</span></td>
        <td>${student.absentRate}%</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="${UI.pdfTable}">
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>รหัส</th>
          <th>ชื่อ-สกุล</th>
          <th>ห้อง</th>
          <th>วันที่/คาบล่าสุด</th>
          <th>สถานะ</th>
          <th>% ขาดเรียน</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openAttendancePdfPreview() {
  if (!state.visibleStudents.length) {
    setToast("กรุณาค้นหาข้อมูลก่อนดูตัวอย่าง PDF", "info");
    return;
  }

  const modeLabel = state.viewMode === "report" ? "Report View" : "Quick View";
  openReportPreviewModal({
    title: "รายงานการเข้าเรียน PDF",
    scope: `${state.currentScopeText} | ${state.visibleStudents.length} คน | ${modeLabel}`,
    confirmText: "ดาวน์โหลด PDF",
    mockMessage: "Mockup: ขั้นตอนดาวน์โหลด PDF จะถูกเชื่อมต่อภายหลัง",
    sheetHtml: `
    <div class="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">ระบบรายงานการเข้าเรียน</p>
        <h3 class="mt-1 text-lg font-semibold text-slate-900">รายงานการเข้าเรียนของนักเรียน</h3>
      </div>
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${modeLabel}</span>
    </div>
    <div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
      <span>ช่วงข้อมูล: ${state.currentScopeText}</span>
      <span>คาบเรียนจริง: ${state.visibleSessions.length} คาบ</span>
      <span>นักเรียน: ${state.visibleStudents.length} คน</span>
    </div>
    <div class="mt-3 flex flex-wrap gap-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 [&_strong]:font-semibold [&_strong]:text-slate-900">
      <span>นักเรียนทั้งหมด <strong>${els.totalStudents.textContent}</strong></span>
      <span>% ขาดเรียน <strong>${els.absentRate.textContent}</strong></span>
      <span>ขาดเรียน <strong>${els.absentCount.textContent}</strong></span>
      <span>มาสาย <strong>${els.lateCount.textContent}</strong></span>
    </div>
    ${buildPdfPreviewRows()}
    <p class="mt-4 text-xs text-slate-400">ตัวอย่างนี้แสดงบางรายการเพื่อดูรูปแบบตารางก่อนดาวน์โหลดจริง</p>
    `
  });
}

function syncAttendanceThresholdControls() {
  const absenceLabel = `${formatRate(getAbsenceAlertThreshold())}%`;
  els.priorityThresholdNote.textContent = `ขาดถึง 50% ของเพดาน ${absenceLabel}`;
  els.priorityThresholdBtn.textContent = "ตั้งค่าเกณฑ์แจ้งเตือน";
  els.tableThresholdBtn.textContent = `ตั้งค่าเกณฑ์แจ้งเตือน · เพดานขาด ${absenceLabel}`;
}

function openAttendanceThresholdSettings() {
  els.attendanceThresholdInput.value = String(state.attendanceThreshold);
  els.attendanceThresholdModal.hidden = false;
  document.body.classList.add("modal-open");
  els.attendanceThresholdInput.focus();
  els.attendanceThresholdInput.select();
}

function closeAttendanceThresholdSettings() {
  els.attendanceThresholdModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function applyAttendanceThreshold() {
  const threshold = Number(els.attendanceThresholdInput.value);
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
    setToast("กรุณาระบุเกณฑ์ตั้งแต่ 1 ถึง 100%", "info");
    els.attendanceThresholdInput.focus();
    return;
  }

  state.attendanceThreshold = Math.round(threshold);
  closeAttendanceThresholdSettings();
  searchData();
  setToast(`ปรับเกณฑ์การเข้าเรียนเป็น ${state.attendanceThreshold}% แล้ว`, "info");
}

function setViewMode(viewMode) {
  state.viewMode = viewMode;
  state.editMode = false;
  state.bulkEditMode = false;
  if (state.visibleSessions.length) {
    syncResultsMeta();
    summarizeData(state.visibleStudents);
    renderTable();
  }
  syncModeControls();
}

function bindMatrixHover() {
  els.tableWrap.addEventListener("mouseover", (event) => {
    const cell = event.target.closest("[data-col-key]");
    if (!cell) return;
    const key = cell.dataset.colKey;
    if (!key || key === state.hoveredColumnKey) return;
    state.hoveredColumnKey = key;
    document.querySelectorAll(`[data-col-key="${key}"]`).forEach((node) => {
      node.classList.add("is-column-active");
    });
  });

  els.tableWrap.addEventListener("mouseout", (event) => {
    const cell = event.target.closest("[data-col-key]");
    if (!cell) return;
    const key = cell.dataset.colKey;
    if (!key) return;
    document.querySelectorAll(`[data-col-key="${key}"]`).forEach((node) => {
      node.classList.remove("is-column-active");
    });
    state.hoveredColumnKey = null;
  });
}

function attachEvents() {
  els.room.addEventListener("change", () => {
    clearTrendDrilldown();
    syncSubjectOptions();
    refreshAttendanceResults();
  });

  els.subject.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.statusFilter.addEventListener("change", renderTable);
  els.priorityList.addEventListener("click", jumpToAttendanceStudent);
  els.trendZoomOutBtn.addEventListener("click", resetTrendDrilldown);
  els.monthlyYear.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.monthlyMonth.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.semesterTerm.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.startDate.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.endDate.addEventListener("change", () => {
    clearTrendDrilldown();
    refreshAttendanceResults();
  });
  els.semesterYear.addEventListener("change", () => {
    clearTrendDrilldown();
    populateSemesterTerms();
    refreshAttendanceResults();
  });
  els.searchType.addEventListener("change", () => {
    clearTrendDrilldown();
    updateFieldVisibility();
    refreshAttendanceResults();
  });
  els.priorityThresholdBtn.addEventListener("click", openAttendanceThresholdSettings);
  els.tableThresholdBtn.addEventListener("click", openAttendanceThresholdSettings);
  els.attendanceThresholdApplyBtn.addEventListener("click", applyAttendanceThreshold);
  els.attendanceThresholdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyAttendanceThreshold();
  });
  els.attendanceThresholdModal.querySelectorAll("[data-threshold-close]").forEach((node) => {
    node.addEventListener("click", closeAttendanceThresholdSettings);
  });
  els.attendanceThresholdCloseBtn.addEventListener("click", closeAttendanceThresholdSettings);
  els.bulkEditBtn.addEventListener("click", openBulkEdit);
  els.saveBtn.addEventListener("click", saveChanges);
  els.exportExcelBtn.addEventListener("click", () => mockExport("excel"));
  els.exportPdfBtn.addEventListener("click", openAttendancePdfPreview);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.attendanceThresholdModal.hidden) closeAttendanceThresholdSettings();
  });
}

async function init() {
  try {
    await loadMockDatabase();
    populateFilters();
    updateFieldVisibility();
    syncModeControls();
    // wait for one paint so the sidebar and empty cards show first; the timer covers background tabs, where frames do not run
    await new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
      setTimeout(resolve, 100);
    });
    searchData();
    bindMatrixHover();
    attachEvents();
  } catch (error) {
    console.error(error);
    setToast("ไม่สามารถเตรียม mock data สำหรับการค้นหาได้", "info");
    els.currentAcademicLabel.textContent = "โหลดข้อมูลไม่สำเร็จ";
  }
}

init();
