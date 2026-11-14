(() => {
const STORAGE_KEY = "unableExamReport:index:lastSearch";

const statusNotes = {
  unable: "ต่ำกว่าเกณฑ์สิทธิ์สอบ",
  eligible: "ยังคงสิทธิ์สอบ"
};

const learningAreas = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "สังคมศึกษา ศาสนา และวัฒนธรรม",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "ภาษาต่างประเทศ",
  "กิจกรรมพัฒนาผู้เรียน"
];

const exportLabels = {
  excel: "Excel",
  pdf: "PDF",
  print: "พิมพ์"
};

const els = {
  academicYear: document.getElementById("unableAcademicYear"),
  semester: document.getElementById("unableSemester"),
  grade: document.getElementById("unableGrade"),
  classroom: document.getElementById("unableClassroom"),
  subject: document.getElementById("unableSubject"),
  scheduleScope: document.getElementById("unableScheduleScope"),
  status: document.getElementById("unableStatus"),
  threshold: document.getElementById("unableThreshold"),
  keyword: document.getElementById("unableKeyword"),
  filtersForm: document.getElementById("unableFiltersForm"),
  advancedToggleBtn: document.getElementById("unableAdvancedToggleBtn"),
  advancedFilters: document.getElementById("unableAdvancedFilters"),
  validationBanner: document.getElementById("unableValidationBanner"),
  emptyNotice: document.getElementById("unableEmptyNotice"),
  tablePlaceholder: document.getElementById("unableTablePlaceholder"),
  detailPanel: document.getElementById("unableDetailPanel"),
  detailScope: document.getElementById("unableDetailScope"),
  currentAcademicLabel: document.getElementById("unableCurrentAcademicLabel"),
  summaryScope: document.getElementById("unableSummaryScope"),
  studentsFound: document.getElementById("unableStudentsFound"),
  caseMetric: document.getElementById("unableCaseMetric"),
  attendanceAverage: document.getElementById("unableAttendanceAverage"),
  thresholdValue: document.getElementById("unableThresholdValue"),
  caseTotal: document.getElementById("unableCaseTotal"),
  statusChart: document.getElementById("unableStatusChart"),
  gradeRoomBreakdown: document.getElementById("unableGradeRoomBreakdown"),
  subjectBreakdown: document.getElementById("unableSubjectBreakdown"),
  totalRecords: document.getElementById("unableTotalRecords"),
  unableThead: document.getElementById("unableThead"),
  unableTbody: document.getElementById("unableTbody"),
  pageSize: document.getElementById("unablePageSize"),
  paginationBar: document.getElementById("unablePaginationBar"),
  paginationStatus: document.getElementById("unablePaginationStatus"),
  prevPageBtn: document.getElementById("unablePrevPageBtn"),
  nextPageBtn: document.getElementById("unableNextPageBtn"),
  exportBtn: document.getElementById("unableExportBtn"),
  pdfPreviewBtn: document.getElementById("unablePdfPreviewBtn"),
  exportDropdown: document.getElementById("unableExportDropdown"),
  exportMenu: document.getElementById("unableExportMenu"),
  toast: document.getElementById("toast")
};

const state = {
  teacherId: null,
  db: null,
  maps: null,
  allRows: [],
  filteredRows: [],
  totalStudentsInScope: 0,
  currentPage: 1,
  sort: {
    key: "attendancePercent",
    dir: "asc"
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

// the code of a subject depends on the grade; without a grade or room picked only the name is shown
function getSelectedGradeId() {
  return state.maps.classrooms.get(els.classroom.value)?.gradeId || els.grade.value || "";
}

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function getCurrentAcademicYear() {
  return state.db.academicYears.find((item) => item.isCurrent) || state.db.academicYears[0];
}

// the term the whole system treats as "now" (AcademicLayout.currentTerm), not today's date
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

// Tailwind classes for the pieces this script draws; the page (unable-exam-report.html) has no stylesheet of its own
const UI = {
  tabActive: ["bg-white", "text-blue-700", "shadow-sm"],
  tabIdle: ["text-slate-500", "hover:text-slate-700"],
  barTone: { danger: "bg-rose-500", success: "bg-emerald-500" },
  statusChip: { unable: "bg-rose-50 text-rose-700 ring-rose-200", eligible: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  groupHeading: "flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400",
  empty: "rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400"
};

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

function setBanner(element, message) {
  if (!message) {
    element.textContent = "";
    element.classList.add("hidden");
    return;
  }
  element.textContent = message;
  element.classList.remove("hidden");
}

function populateAcademicYears() {
  els.academicYear.innerHTML = state.db.academicYears
    .map((year) => `<option value="${year.id}">${year.name}</option>`)
    .join("");
  els.academicYear.value = getCurrentAcademicYear().id;
}

function populateSemesters() {
  const semesters = state.db.semesters.filter((item) => item.academicYearId === els.academicYear.value);
  els.semester.innerHTML = semesters
    .map((semester) => `<option value="${semester.id}">ภาคเรียนที่ ${semester.term}</option>`)
    .join("");
  const currentSemester = getDefaultSemester();
  els.semester.value = semesters.some((item) => item.id === currentSemester.id) ? currentSemester.id : semesters[0]?.id || "";
}

// a teacher only sees the sections they teach; admin sees the whole school
const TEACHER_PERSONA_ID = window.ReportData.teacherPersona.id;

function getScopedSchedules() {
  return state.teacherId
    ? state.db.schedules.filter((schedule) => schedule.teacherId === state.teacherId)
    : state.db.schedules;
}

function getScopedClassroomIds() {
  return new Set(getScopedSchedules().map((schedule) => schedule.classroomId));
}

function populateGrades() {
  const roomIds = getScopedClassroomIds();
  const gradeOptions = state.db.grades
    .filter((grade) => state.db.classrooms.some((room) => room.gradeId === grade.id && roomIds.has(room.id)))
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("");
  els.grade.innerHTML = `<option value="">ทุกระดับชั้น</option>${gradeOptions}`;
}

function syncClassrooms() {
  const gradeId = els.grade.value;
  const roomIds = getScopedClassroomIds();
  const classrooms = state.db.classrooms
    .filter((room) => roomIds.has(room.id))
    .filter((room) => !gradeId || room.gradeId === gradeId)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
  els.classroom.innerHTML = `<option value="">ทุกห้อง</option>${classrooms
    .map((room) => `<option value="${room.id}">${room.name}</option>`)
    .join("")}`;
  els.classroom.disabled = false;
  if (!classrooms.some((room) => room.id === els.classroom.value)) {
    els.classroom.value = "";
  }
}

function getScheduleScopeIds() {
  if (els.scheduleScope.value === "current") {
    return new Set([els.semester.value]);
  }
  const semester = state.maps.semesters.get(els.semester.value);
  const semesters = state.db.semesters.filter((item) => item.academicYearId === semester.academicYearId);
  return new Set(semesters.map((item) => item.id));
}

function syncSubjects() {
  const classroomId = els.classroom.value;
  const gradeId = els.grade.value;
  const semesterIds = getScheduleScopeIds();
  const roomIds = new Set(state.db.classrooms
    .filter((room) => (!gradeId || room.gradeId === gradeId) && (!classroomId || room.id === classroomId))
    .map((room) => room.id));
  const scheduleSubjectIds = new Set(
    getScopedSchedules()
      .filter((schedule) => roomIds.has(schedule.classroomId))
      .filter((schedule) => semesterIds.has(schedule.semesterId))
      .map((schedule) => schedule.subjectId)
  );
  const subjects = state.db.subjects
    .filter((subject) => scheduleSubjectIds.has(subject.id))
    .sort((a, b) => {
      const areaOrder = learningAreas.indexOf(a.learningArea) - learningAreas.indexOf(b.learningArea);
      return areaOrder || a.name.localeCompare(b.name, "th");
    });
  const groupedSubjectOptions = learningAreas
    .map((area) => {
      const areaSubjects = subjects.filter((subject) => subject.learningArea === area);
      if (!areaSubjects.length) return "";
      return `<optgroup label="${area}">${areaSubjects
        .map((subject) => `<option value="${subject.id}">${window.ReportData.subjectLabel(subject, getSelectedGradeId())}</option>`)
        .join("")}</optgroup>`;
    })
    .join("");
  els.subject.innerHTML = `<option value="">ทุกวิชา</option>${groupedSubjectOptions}`;
  els.subject.disabled = false;
  if (!subjects.some((subject) => subject.id === els.subject.value)) {
    els.subject.value = "";
  }
}

function getFormValues() {
  return {
    academicYear: els.academicYear.value,
    semester: els.semester.value,
    grade: els.grade.value,
    classroom: els.classroom.value,
    subject: els.subject.value,
    scheduleScope: els.scheduleScope.value,
    status: els.status.value,
    threshold: normalizeThreshold(els.threshold.value),
    keyword: els.keyword.value.trim()
  };
}

function normalizeThreshold(value) {
  const threshold = Number(value);
  if (Number.isNaN(threshold)) return 80;
  return Math.min(100, Math.max(1, threshold));
}

function syncSearchState() {
  renderDashboard();
}

function toggleAdvancedPanel(force) {
  const shouldShow = typeof force === "boolean"
    ? force
    : els.advancedFilters.classList.contains("hidden");
  els.advancedFilters.classList.toggle("hidden", !shouldShow);
  els.advancedToggleBtn.setAttribute("aria-expanded", String(shouldShow));
  els.advancedToggleBtn.textContent = shouldShow ? "ซ่อนตัวกรองเพิ่มเติม" : "แสดงตัวกรองเพิ่มเติม";
}

function classifyStudent(attendancePercent, threshold) {
  if (attendancePercent < threshold) return "unable";
  return "eligible";
}

function getAttendanceCredit(status) {
  return ["ตรงเวลา", "สาย", "กิจกรรม"].includes(status) ? 1 : 0;
}

function getRemark(studentSummary, threshold) {
  if (studentSummary.statusKey === "unable") {
    return `ต่ำกว่าเกณฑ์ ${threshold}% และขาด ${studentSummary.absentCount} ครั้ง`;
  }
  return `ผ่านเกณฑ์ปัจจุบัน ${threshold}%`;
}

function buildReportRows(filters) {
  const semesterIds = getScheduleScopeIds();
  const selectedSchedules = getScopedSchedules().filter((schedule) => (
    (!filters.classroom || schedule.classroomId === filters.classroom)
    && (!filters.subject || schedule.subjectId === filters.subject)
    && semesterIds.has(schedule.semesterId)
    && (!filters.grade || state.maps.classrooms.get(schedule.classroomId)?.gradeId === filters.grade)
  ));
  const rows = [];

  selectedSchedules.forEach((schedule) => {
    const classroom = state.maps.classrooms.get(schedule.classroomId);
    const grade = state.maps.grades.get(classroom.gradeId);
    const subject = state.maps.subjects.get(schedule.subjectId);
    const students = state.db.students.filter((student) => student.classroomId === classroom.id);
    const scheduleRecords = window.ReportData.attendanceOf(schedule.id);
    const recordsByStudent = new Map(students.map((student) => [student.id, []]));
    scheduleRecords.forEach((record) => recordsByStudent.get(record.studentId)?.push(record));

    students.forEach((student) => {
      const studentRecords = recordsByStudent.get(student.id) || [];
      const totalSessions = studentRecords.length;
      const presentCredits = studentRecords.reduce((sum, record) => sum + getAttendanceCredit(record.status), 0);
      const absentCount = studentRecords.filter((record) => record.status === "ขาด").length;
      const lateCount = studentRecords.filter((record) => record.status === "สาย").length;
      const attendancePercent = totalSessions ? Math.round((presentCredits / totalSessions) * 100) : 0;
      const statusKey = classifyStudent(attendancePercent, filters.threshold);
      const statusLabel = statusKey === "unable" ? "ไม่มีสิทธิ์สอบ" : "ยังมีสิทธิ์สอบ";

      rows.push({
        studentId: student.studentCode,
        studentName: student.name,
        gradeId: grade.id,
        gradeName: grade.name,
        classroomId: classroom.id,
        classroomName: classroom.name,
        subjectId: subject.id,
        subjectName: subject.name,
        gradeClass: classroom.name,
        attendancePercent,
        absentCount,
        lateCount,
        statusKey,
        statusLabel,
        teacherRemark: getRemark({ statusKey, absentCount }, filters.threshold),
        searchText: `${student.studentCode} ${student.name}`.toLowerCase(),
        totalSessions,
        subjectLabel: `${schedule.subjectCode} - ${subject.name}`
      });
    });
  });

  state.totalStudentsInScope = rows.length;
  return rows;
}

function sortRows(rows) {
  const { key, dir } = state.sort;
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (typeof a[key] === "number" && typeof b[key] === "number") {
      return (a[key] - b[key]) * factor;
    }
    return String(a[key]).localeCompare(String(b[key]), "th") * factor;
  });
}

function getFilenameBase() {
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const grade = state.maps.grades.get(els.grade.value);
  const subject = state.maps.subjects.get(els.subject.value);
  const date = new Date().toISOString().slice(0, 10);
  const gradeText = grade?.name.replace(/\./g, "") || "ระดับชั้น";
  const roomText = classroom?.name.replace(/[/.]/g, "_") || "ห้อง";
  const subjectText = subject ? window.ReportData.subjectCode(subject, getSelectedGradeId()) : "วิชา";
  return `UnableExam_${gradeText}_${roomText}_${subjectText}_${date}`;
}

function getScopeLabel() {
  const grade = state.maps.grades.get(els.grade.value);
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const subject = state.maps.subjects.get(els.subject.value);
  const allSubjects = state.teacherId ? "ทุกวิชาที่สอน" : "ทุกวิชา";
  return [grade?.name || "ทุกระดับชั้น", classroom?.name || "ทุกห้อง", subject ? window.ReportData.subjectLabel(subject, getSelectedGradeId()) : allSubjects].join(" | ");
}

function getUniqueStudentCount(rows, statusKey) {
  return new Set(rows.filter((row) => row.statusKey === statusKey).map((row) => row.studentId)).size;
}

function renderStatusChart(rows) {
  const items = [
    { key: "unable", label: "ไม่มีสิทธิ์สอบ", tone: "danger" },
    { key: "eligible", label: "ยังมีสิทธิ์สอบ", tone: "success" }
  ];
  const max = Math.max(1, ...items.map((item) => rows.filter((row) => row.statusKey === item.key).length));
  els.statusChart.innerHTML = items.map((item) => {
    const count = rows.filter((row) => row.statusKey === item.key).length;
    return `<div class="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span class="text-slate-600">${item.label}</span>
      <div class="h-3 overflow-hidden rounded-full bg-slate-100"><span class="block h-full rounded-full ${UI.barTone[item.tone]}" style="width:${Math.round((count / max) * 100)}%"></span></div>
      <strong class="text-right font-semibold text-slate-900">${count}</strong>
    </div>`;
  }).join("");
}

function renderBreakdown(element, rows, key, labelKey, drillType) {
  const grouped = new Map();
  rows.forEach((row) => {
    const id = row[key];
    if (!grouped.has(id)) grouped.set(id, { id, label: row[labelKey], rows: [] });
    grouped.get(id).rows.push(row);
  });
  // only subjects that actually have มส, grouped in learning-area order
  const items = [...grouped.values()]
    .map((item) => ({ ...item, unable: item.rows.filter((row) => row.statusKey === "unable").length, subject: state.maps.subjects.get(item.id) }))
    .filter((item) => item.unable > 0)
    .sort((a, b) => learningAreas.indexOf(a.subject.learningArea) - learningAreas.indexOf(b.subject.learningArea) || a.subject.code.localeCompare(b.subject.code));
  const areas = learningAreas
    .map((area) => ({ area, items: items.filter((item) => item.subject.learningArea === area) }))
    .filter((group) => group.items.length);

  element.innerHTML = areas.length ? areas.map((group) => `
    <section>
      <div class="${UI.groupHeading}">
        <span>${group.area}</span>
        <strong class="text-slate-600">${group.items.reduce((sum, item) => sum + item.unable, 0)}</strong>
      </div>
      <div class="mt-2 space-y-1">
      ${group.items.map((item) => `
        <button class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700" type="button" data-drill-type="${drillType}" data-drill-id="${item.id}">
          <span class="flex-1">${item.label}</span>
          <span class="text-slate-500"><strong class="font-semibold text-rose-600">${item.unable}</strong> ไม่มีสิทธิ์</span>
          <span class="text-slate-300" aria-hidden="true">›</span>
        </button>
      `).join("")}
      </div>
    </section>
  `).join("") : `<div class="${UI.empty}">ไม่มีนักเรียนที่ไม่มีสิทธิ์สอบ</div>`;
}

function renderGradeRoomBreakdown(rows) {
  const grades = state.db.grades
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((grade) => {
      const rooms = state.db.classrooms
        .filter((room) => room.gradeId === grade.id)
        .map((room) => {
          const roomRows = rows.filter((row) => row.classroomId === room.id);
          return {
            id: room.id,
            label: room.name,
            total: roomRows.length,
            unable: roomRows.filter((row) => row.statusKey === "unable").length
          };
        })
        .filter((room) => room.unable > 0)
        .sort((a, b) => a.label.localeCompare(b.label, "th"));
      return { ...grade, rooms };
    })
    .filter((grade) => grade.rooms.length);

  els.gradeRoomBreakdown.innerHTML = grades.length ? grades.map((grade) => `
    <section>
      <div class="${UI.groupHeading}">
        <span>${grade.name}</span>
        <strong class="text-slate-600">${grade.rooms.reduce((sum, room) => sum + room.unable, 0)}</strong>
      </div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${grade.rooms.map((room) => `
          <button class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" type="button" data-drill-type="classroom" data-drill-id="${room.id}">
            <span>${room.label}</span>
            <strong class="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">${room.unable}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("") : `<div class="${UI.empty}">ไม่มีนักเรียนที่ไม่มีสิทธิ์สอบ</div>`;
}

function setBreakdownTab(tabKey) {
  document.querySelectorAll("[data-breakdown-tab]").forEach((button) => {
    const isActive = button.dataset.breakdownTab === tabKey;
    UI.tabActive.forEach((name) => button.classList.toggle(name, isActive));
    UI.tabIdle.forEach((name) => button.classList.toggle(name, !isActive));
    button.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll("[data-breakdown-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.breakdownPanel !== tabKey);
  });
  document.getElementById("unableBreakdownViewport").scrollTop = 0;
}

function renderOverview(rows) {
  const attendanceAverage = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.attendancePercent, 0) / rows.length)
    : 0;
  els.studentsFound.textContent = String(getUniqueStudentCount(rows, "unable"));
  els.caseMetric.textContent = String(rows.length);
  els.attendanceAverage.textContent = `${attendanceAverage}%`;
  els.thresholdValue.textContent = `${normalizeThreshold(els.threshold.value)}%`;
  els.caseTotal.textContent = `${rows.length} รายการ`;
  els.summaryScope.textContent = getScopeLabel();
  renderStatusChart(rows);
  renderGradeRoomBreakdown(rows);
  renderBreakdown(els.subjectBreakdown, rows, "subjectId", "subjectName", "subject");
}

function renderTableHeader() {
  const columns = [
    { key: "index", label: "No.", sortable: false },
    { key: "studentId", label: "รหัสนักเรียน", sortable: true },
    { key: "studentName", label: "ชื่อ-สกุล", sortable: true },
    { key: "gradeClass", label: "ห้อง", sortable: true },
    { key: "attendancePercent", label: "การเข้าเรียน %", sortable: true, tooltip: "เปอร์เซ็นต์การเข้าเรียนเทียบกับคาบเรียนจริงของวิชาที่เลือก" },
    { key: "absentCount", label: "ขาด", sortable: true },
    { key: "lateCount", label: "สาย", sortable: true },
    { key: "statusLabel", label: "สถานะ", sortable: true },
    { key: "teacherRemark", label: "หมายเหตุครู", sortable: true }
  ];

  els.unableThead.innerHTML = `
    <tr>
      ${columns.map((column) => {
        if (!column.sortable) {
          return `<th>${column.label}</th>`;
        }
        const isActive = state.sort.key === column.key;
        const sortIcon = isActive ? (state.sort.dir === "asc" ? "↑" : "↓") : "↕";
        const ariaSort = isActive ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none";
        const title = column.tooltip ? ` title="${column.tooltip}"` : "";
        return `
          <th aria-sort="${ariaSort}">
            <button class="inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:text-blue-700 ${isActive ? "text-blue-700" : ""}" type="button" data-sort-key="${column.key}"${title}>
              <span>${column.label}</span>
              <span class="${isActive ? "" : "text-slate-300"}" aria-hidden="true">${sortIcon}</span>
            </button>
          </th>
        `;
      }).join("")}
    </tr>
  `;
}

function renderEmptyState() {
  els.unableTbody.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="py-12 text-center">
          <p class="text-base font-semibold text-slate-700">ไม่พบนักเรียนตามเงื่อนไข</p>
          <p class="mt-1 text-sm text-slate-400">ลองปรับห้องเรียน รายวิชา หรือขยายเงื่อนไขในตัวกรองเพิ่มเติมแล้วค้นหาอีกครั้ง</p>
        </div>
      </td>
    </tr>
  `;
}

function renderRows() {
  const sortedRows = sortRows(state.filteredRows);
  const pageSize = Number(els.pageSize.value);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  state.currentPage = Math.min(state.currentPage, totalPages);
  const startIndex = (state.currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);

  if (!pageRows.length) {
    renderEmptyState();
    els.paginationBar.classList.add("hidden");
    return;
  }

  els.unableTbody.innerHTML = pageRows.map((row, index) => {
    const rowNumber = startIndex + index + 1;
    const lowAttendance = row.attendancePercent < normalizeThreshold(els.threshold.value);
    return `
      <tr>
        <td>${rowNumber}</td>
        <td>${row.studentId}</td>
        <td>
          <div class="flex flex-col whitespace-nowrap">
            <strong class="font-semibold text-slate-900">${row.studentName}</strong>
            <span class="text-xs text-slate-400">${row.subjectLabel}</span>
          </div>
        </td>
        <td>${row.gradeClass}</td>
        <td>
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${lowAttendance ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}" title="จาก ${row.totalSessions} คาบเรียนจริง">
            ${row.attendancePercent}%
          </span>
        </td>
        <td>${row.absentCount}</td>
        <td>${row.lateCount}</td>
        <td>
          <span class="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${UI.statusChip[row.statusKey]}" title="${statusNotes[row.statusKey]}">
            ${row.statusLabel}
          </span>
        </td>
        <td class="min-w-[16rem]">${row.teacherRemark}</td>
      </tr>
    `;
  }).join("");

  els.paginationBar.classList.toggle("hidden", !sortedRows.length);
  els.paginationStatus.textContent = `หน้า ${state.currentPage} จาก ${totalPages}`;
  els.prevPageBtn.disabled = state.currentPage === 1;
  els.nextPageBtn.disabled = state.currentPage === totalPages;
}

function renderSearchResults() {
  renderTableHeader();
  renderRows();
  els.exportBtn.disabled = !state.filteredRows.length;
  els.pdfPreviewBtn.disabled = !state.filteredRows.length;
}

function renderDashboard() {
  if (!state.db) return;
  const filters = getFormValues();
  els.threshold.value = String(filters.threshold);
  saveLastSearch();
  state.allRows = buildReportRows(filters);
  renderOverview(state.allRows);

  const showDetail = Boolean(filters.classroom || filters.subject);
  els.detailPanel.classList.toggle("hidden", !showDetail);
  if (!showDetail) {
    state.filteredRows = [];
    els.exportBtn.disabled = true;
    els.pdfPreviewBtn.disabled = true;
    toggleExportMenu(false);
    return;
  }

  const keyword = filters.keyword.toLowerCase();
  state.filteredRows = state.allRows.filter((row) => {
    if (filters.status !== "all" && row.statusKey !== filters.status) return false;
    return !keyword || row.searchText.includes(keyword);
  });
  state.currentPage = 1;
  els.detailScope.textContent = getScopeLabel();
  els.totalRecords.textContent = String(state.filteredRows.length);
  setBanner(els.emptyNotice, state.filteredRows.length ? "" : "ไม่พบข้อมูลตามเงื่อนไขที่เลือก");
  renderSearchResults();
}

function saveLastSearch() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormValues()));
}

function restoreLastSearch() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved.academicYear) els.academicYear.value = saved.academicYear;
    populateSemesters();
    if (saved.semester) els.semester.value = saved.semester;
    if (saved.grade) els.grade.value = saved.grade;
    syncClassrooms();
    if (saved.classroom) els.classroom.value = saved.classroom;
    if (saved.scheduleScope) els.scheduleScope.value = saved.scheduleScope;
    syncSubjects();
    if (saved.subject) els.subject.value = saved.subject;
    if (saved.status) els.status.value = saved.status === "risk" ? "unable" : saved.status;
    if (saved.threshold) els.threshold.value = saved.threshold;
    if (saved.keyword) els.keyword.value = saved.keyword;
    if (saved.status !== "unable" || saved.scheduleScope !== "current" || saved.keyword || Number(saved.threshold) !== 80) {
      toggleAdvancedPanel(true);
    }
  } catch (error) {
    console.error(error);
  }
}

function toggleSort(sortKey) {
  if (state.sort.key === sortKey) {
    state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
  } else {
    state.sort.key = sortKey;
    state.sort.dir = sortKey === "attendancePercent" || sortKey === "absentCount" || sortKey === "lateCount" ? "desc" : "asc";
  }
  renderSearchResults();
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function openUnablePreview(options) {
  if (typeof window.openReportPreviewModal === "function") {
    window.openReportPreviewModal(options);
    return;
  }
  const modal = document.getElementById("attendancePdfModal");
  const closeBtn = document.getElementById("attendancePdfCloseBtn");
  document.getElementById("attendancePdfTitle").textContent = options.title;
  document.getElementById("attendancePdfScope").textContent = options.scope;
  document.getElementById("attendancePdfSheet").innerHTML = options.sheetHtml;
  const confirmBtn = document.getElementById("attendancePdfDownloadBtn");
  confirmBtn.textContent = options.confirmText;
  confirmBtn.dataset.mockMessage = options.mockMessage;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  closeBtn.focus();
}

function handleExport(type) {
  if (type === "pdf" || type === "print") {
    const rows = sortRows(state.filteredRows).slice(0, 8);
    openUnablePreview({
      title: type === "print" ? "พิมพ์รายงานผู้ไม่มีสิทธิ์สอบ" : "รายงานผู้ไม่มีสิทธิ์สอบ PDF",
      scope: `${els.detailScope.textContent} | พบ ${state.filteredRows.length} รายการ`,
      confirmText: type === "print" ? "พิมพ์รายงาน" : "ดาวน์โหลด PDF",
      mockMessage: type === "print"
        ? "Mockup: พิมพ์รายงานผู้ไม่มีสิทธิ์สอบยังไม่ถูกเชื่อมต่อ"
        : "Mockup: ดาวน์โหลด PDF รายงานผู้ไม่มีสิทธิ์สอบยังไม่ถูกเชื่อมต่อ",
      sheetHtml: `
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">ระบบติดตามสิทธิ์สอบ</p>
            <h3 class="mt-1 text-lg font-semibold text-slate-900">รายงานผู้ไม่มีสิทธิ์สอบ</h3>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${type === "print" ? "Print" : "PDF"}</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>${els.detailScope.textContent}</span>
          <span>เกณฑ์เข้าเรียน: ${normalizeThreshold(els.threshold.value)}%</span>
          <span>สถานะ: ${els.status.options[els.status.selectedIndex].text}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 [&_strong]:font-semibold [&_strong]:text-slate-900">
          <span>พบทั้งหมด <strong>${state.filteredRows.length}</strong></span>
          <span>ไม่มีสิทธิ์สอบ <strong>${getUniqueStudentCount(state.filteredRows, "unable")}</strong></span>
        </div>
        <table class="mt-4 w-full text-left text-sm [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-2 [&_td]:py-2 [&_td]:text-slate-700 [&_th]:border-b [&_th]:border-slate-300 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-slate-500">
          <thead>
            <tr>
              <th>No.</th>
              <th>รหัส</th>
              <th>ชื่อ-สกุล</th>
              <th>ห้อง</th>
              <th>เข้าเรียน</th>
              <th>ขาด</th>
              <th>สาย</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${row.studentId}</td>
                <td class="font-medium text-slate-900">${row.studentName}</td>
                <td>${row.gradeClass}</td>
                <td>${row.attendancePercent}%</td>
                <td>${row.absentCount}</td>
                <td>${row.lateCount}</td>
                <td>${row.statusLabel}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `
    });
    return;
  }

  setToast(`เตรียมส่งออกรายงาน ${exportLabels[type] || type} จากผลการค้นหาปัจจุบัน`, "info");
}

function toggleExportMenu(force) {
  const shouldShow = typeof force === "boolean" ? force : els.exportMenu.classList.contains("hidden");
  els.exportMenu.classList.toggle("hidden", !shouldShow);
  els.exportBtn.setAttribute("aria-expanded", String(shouldShow));
}

function attachEvents() {
  els.academicYear.addEventListener("change", () => {
    populateSemesters();
    syncSubjects();
    renderDashboard();
  });

  els.semester.addEventListener("change", () => {
    syncSubjects();
    renderDashboard();
  });

  els.grade.addEventListener("change", () => {
    syncClassrooms();
    syncSubjects();
    renderDashboard();
  });

  els.classroom.addEventListener("change", () => {
    const classroomId = els.classroom.value;
    if (classroomId) {
      const room = state.maps.classrooms.get(classroomId);
      if (room && els.grade.value !== room.gradeId) {
        els.grade.value = room.gradeId;
        syncClassrooms();
        els.classroom.value = classroomId;
      }
    }
    syncSubjects();
    renderDashboard();
  });

  els.subject.addEventListener("change", renderDashboard);
  els.scheduleScope.addEventListener("change", () => {
    syncSubjects();
    renderDashboard();
  });

  els.threshold.addEventListener("change", () => {
    els.threshold.value = String(normalizeThreshold(els.threshold.value));
    renderDashboard();
  });

  els.advancedToggleBtn.addEventListener("click", () => toggleAdvancedPanel());
  els.status.addEventListener("change", renderDashboard);
  els.keyword.addEventListener("input", renderDashboard);
  els.filtersForm.addEventListener("submit", (event) => event.preventDefault());
  els.pageSize.addEventListener("change", () => {
    state.currentPage = 1;
    renderRows();
  });

  els.prevPageBtn.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      renderRows();
    }
  });

  els.nextPageBtn.addEventListener("click", () => {
    state.currentPage += 1;
    renderRows();
  });

  els.unableThead.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort-key]");
    if (!button) return;
    toggleSort(button.dataset.sortKey);
  });

  document.getElementById("unableOverviewGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-drill-type]");
    if (!button) return;
    const { drillType, drillId } = button.dataset;
    if (drillType === "grade") {
      els.grade.value = drillId;
      syncClassrooms();
      syncSubjects();
    } else if (drillType === "classroom") {
      const room = state.maps.classrooms.get(drillId);
      els.grade.value = room.gradeId;
      syncClassrooms();
      els.classroom.value = drillId;
      syncSubjects();
    } else if (drillType === "subject") {
      els.subject.value = drillId;
    }
    renderDashboard();
    const target = els.detailPanel.classList.contains("hidden") ? document.getElementById("unableFilterTitle") : els.detailPanel;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("unableBreakdownTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-breakdown-tab]");
    if (button) setBreakdownTab(button.dataset.breakdownTab);
  });

  els.exportBtn.addEventListener("click", () => {
    if (els.exportBtn.disabled) return;
    toggleExportMenu();
  });

  els.pdfPreviewBtn.addEventListener("click", () => {
    if (!els.pdfPreviewBtn.disabled) handleExport("pdf");
  });

  els.exportMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export]");
    if (!button) return;
    toggleExportMenu(false);
    handleExport(button.dataset.export);
  });

  document.addEventListener("click", (event) => {
    if (!els.exportDropdown.contains(event.target)) {
      toggleExportMenu(false);
    }
  });
}

function applyTeacherScopeText() {
  document.getElementById("unablePageSubtitle").textContent = "นักเรียนที่เวลาเรียนไม่ถึงเกณฑ์ เฉพาะรายวิชาและห้องที่คุณสอน";
  const breadcrumbHome = document.getElementById("unableBreadcrumbHome");
  if (breadcrumbHome) {
    breadcrumbHome.textContent = "งานของฉัน";
    breadcrumbHome.href = "../timetable/my-timetable.html";
  }
}

function init() {
  if (!els.filtersForm) {
    return;
  }
  state.db = buildInlineMockDatabase();
  state.teacherId = window.AcademicLayout?.role() === "teacher" ? TEACHER_PERSONA_ID : null;
  if (state.teacherId) applyTeacherScopeText();
  state.maps = {
    semesters: buildMap(state.db.semesters),
    grades: buildMap(state.db.grades),
    classrooms: buildMap(state.db.classrooms),
    teachers: buildMap(state.db.teachers),
    subjects: buildMap(state.db.subjects)
  };

  populateAcademicYears();
  populateSemesters();
  populateGrades();
  els.scheduleScope.value = "current";
  els.status.value = "unable";
  els.threshold.value = "80";
  syncClassrooms();
  syncSubjects();
  restoreLastSearch();
  renderTableHeader();
  attachEvents();
  setBreakdownTab("gradeRoom");

  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / ภาคเรียนที่ ${currentSemester.term}`;
  renderDashboard();
}

init();
})();
