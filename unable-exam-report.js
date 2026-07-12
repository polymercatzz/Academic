(() => {
const STORAGE_KEY = "unableExamReport:index:lastSearch";

const statusProfiles = {
  steady: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
  late: ["สาย", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา"],
  absence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา"],
  leave: ["ลากิจ", "ตรงเวลา", "ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ลากิจ", "ตรงเวลา", "ตรงเวลา"],
  activity: ["กิจกรรม", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา"]
};

const statusNotes = {
  unable: "ต่ำกว่าเกณฑ์สิทธิ์สอบ",
  risk: "ใกล้ต่ำกว่าเกณฑ์",
  eligible: "ยังคงสิทธิ์สอบ"
};

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
  searchBtn: document.getElementById("unableSearchBtn"),
  resetFiltersBtn: document.getElementById("unableResetFiltersBtn"),
  advancedToggleBtn: document.getElementById("unableAdvancedToggleBtn"),
  advancedFilters: document.getElementById("unableAdvancedFilters"),
  validationBanner: document.getElementById("unableValidationBanner"),
  emptyNotice: document.getElementById("unableEmptyNotice"),
  tablePlaceholder: document.getElementById("unableTablePlaceholder"),
  currentAcademicLabel: document.getElementById("unableCurrentAcademicLabel"),
  summaryScope: document.getElementById("unableSummaryScope"),
  statusMeta: document.getElementById("unableStatusMeta"),
  scheduleMeta: document.getElementById("unableScheduleMeta"),
  studentsFound: document.getElementById("unableStudentsFound"),
  unablePercentage: document.getElementById("unableUnablePercentage"),
  thresholdValue: document.getElementById("unableThresholdValue"),
  selectedSubject: document.getElementById("unableSelectedSubject"),
  selectedClassroom: document.getElementById("unableSelectedClassroom"),
  totalRecords: document.getElementById("unableTotalRecords"),
  unableThead: document.getElementById("unableThead"),
  unableTbody: document.getElementById("unableTbody"),
  pageSize: document.getElementById("unablePageSize"),
  paginationBar: document.getElementById("unablePaginationBar"),
  paginationStatus: document.getElementById("unablePaginationStatus"),
  prevPageBtn: document.getElementById("unablePrevPageBtn"),
  nextPageBtn: document.getElementById("unableNextPageBtn"),
  exportBtn: document.getElementById("unableExportBtn"),
  exportDropdown: document.getElementById("unableExportDropdown"),
  exportMenu: document.getElementById("unableExportMenu"),
  toast: document.getElementById("toast")
};

const state = {
  db: null,
  maps: null,
  filteredRows: [],
  totalStudentsInScope: 0,
  currentPage: 1,
  sort: {
    key: "attendancePercent",
    dir: "asc"
  }
};

function buildInlineMockDatabase() {
  const academicYears = [
    { id: "ay-2569", name: "2569", startDate: "2026-05-01", endDate: "2027-03-31", isCurrent: true }
  ];

  const semesters = [
    { id: "sem-2569-1", academicYearId: "ay-2569", term: 1, name: "ภาคเรียนที่ 1/2569", startDate: "2026-05-01", endDate: "2026-10-31" },
    { id: "sem-2569-2", academicYearId: "ay-2569", term: 2, name: "ภาคเรียนที่ 2/2569", startDate: "2026-11-01", endDate: "2027-03-31" }
  ];

  const grades = [
    { id: "grade-m1", code: "m1", name: "ม.1", order: 1 },
    { id: "grade-m2", code: "m2", name: "ม.2", order: 2 },
    { id: "grade-m3", code: "m3", name: "ม.3", order: 3 }
  ];

  const classrooms = [
    { id: "room-m1-1", gradeId: "grade-m1", code: "m1-1", name: "ม.1/1", homeroomTeacherId: "teacher-anong" },
    { id: "room-m1-2", gradeId: "grade-m1", code: "m1-2", name: "ม.1/2", homeroomTeacherId: "teacher-krit" },
    { id: "room-m2-1", gradeId: "grade-m2", code: "m2-1", name: "ม.2/1", homeroomTeacherId: "teacher-sunee" },
    { id: "room-m3-1", gradeId: "grade-m3", code: "m3-1", name: "ม.3/1", homeroomTeacherId: "teacher-preecha" }
  ];

  const teachers = [
    { id: "teacher-anong", name: "อ.อนงค์นาถ ศรีสวัสดิ์", shortName: "อ.อนงค์นาถ" },
    { id: "teacher-krit", name: "อ.กฤตภาส วัฒนชัย", shortName: "อ.กฤตภาส" },
    { id: "teacher-sunee", name: "อ.สุนีย์ พิพัฒน์ผล", shortName: "อ.สุนีย์" },
    { id: "teacher-preecha", name: "อ.ปรีชา ธรรมวงศ์", shortName: "อ.ปรีชา" },
    { id: "teacher-mali", name: "อ.มะลิ กาญจนกิจ", shortName: "อ.มะลิ" },
    { id: "teacher-niran", name: "อ.นิรันดร์ บุญมาก", shortName: "อ.นิรันดร์" }
  ];

  const subjects = [
    { id: "subject-math", code: "ma21101", name: "คณิตศาสตร์", shortName: "คณิต" },
    { id: "subject-thai", code: "th21102", name: "ภาษาไทย", shortName: "ไทย" },
    { id: "subject-english", code: "en21101", name: "ภาษาอังกฤษ", shortName: "อังกฤษ" },
    { id: "subject-science", code: "sc21103", name: "วิทยาศาสตร์", shortName: "วิทย์" },
    { id: "subject-social", code: "so21104", name: "สังคมศึกษา", shortName: "สังคม" }
  ];

  const schedules = [
    { id: "schedule-m11-math", classroomId: "room-m1-1", subjectId: "subject-math", teacherId: "teacher-anong", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 1 }, { dayOfWeek: 3, period: 4 }, { dayOfWeek: 5, period: 2 }] },
    { id: "schedule-m11-thai", classroomId: "room-m1-1", subjectId: "subject-thai", teacherId: "teacher-sunee", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 2 }, { dayOfWeek: 4, period: 1 }] },
    { id: "schedule-m11-english", classroomId: "room-m1-1", subjectId: "subject-english", teacherId: "teacher-mali", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 5 }, { dayOfWeek: 4, period: 6 }] },
    { id: "schedule-m12-math", classroomId: "room-m1-2", subjectId: "subject-math", teacherId: "teacher-krit", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 2 }, { dayOfWeek: 3, period: 1 }, { dayOfWeek: 5, period: 3 }] },
    { id: "schedule-m12-thai", classroomId: "room-m1-2", subjectId: "subject-thai", teacherId: "teacher-sunee", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 4 }, { dayOfWeek: 4, period: 2 }] },
    { id: "schedule-m12-english", classroomId: "room-m1-2", subjectId: "subject-english", teacherId: "teacher-preecha", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 3, period: 5 }, { dayOfWeek: 5, period: 5 }] },
    { id: "schedule-m21-science", classroomId: "room-m2-1", subjectId: "subject-science", teacherId: "teacher-niran", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 3 }, { dayOfWeek: 5, period: 4 }] },
    { id: "schedule-m21-social", classroomId: "room-m2-1", subjectId: "subject-social", teacherId: "teacher-preecha", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 4 }, { dayOfWeek: 4, period: 3 }] },
    { id: "schedule-m21-math", classroomId: "room-m2-1", subjectId: "subject-math", teacherId: "teacher-krit", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 3, period: 2 }, { dayOfWeek: 5, period: 1 }] },
    { id: "schedule-m31-math", classroomId: "room-m3-1", subjectId: "subject-math", teacherId: "teacher-anong", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 1 }, { dayOfWeek: 3, period: 3 }, { dayOfWeek: 5, period: 2 }] },
    { id: "schedule-m31-thai", classroomId: "room-m3-1", subjectId: "subject-thai", teacherId: "teacher-sunee", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 1 }, { dayOfWeek: 4, period: 2 }] },
    { id: "schedule-m31-science", classroomId: "room-m3-1", subjectId: "subject-science", teacherId: "teacher-niran", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 5 }, { dayOfWeek: 4, period: 5 }] }
  ];

  const students = [
    { id: "student-66001", studentCode: "66001", name: "กานต์ธิดา สุขผล", classroomId: "room-m1-1", profile: "steady" },
    { id: "student-66002", studentCode: "66002", name: "ธนกฤต แซ่ตั้ง", classroomId: "room-m1-1", profile: "late" },
    { id: "student-66003", studentCode: "66003", name: "ปวีณ์นุช อินทรา", classroomId: "room-m1-1", profile: "leave" },
    { id: "student-66004", studentCode: "66004", name: "ภูริณัฐ ขยันดี", classroomId: "room-m1-1", profile: "activity" },
    { id: "student-66005", studentCode: "66005", name: "ศุภวิชญ์ เจริญผล", classroomId: "room-m1-2", profile: "steady" },
    { id: "student-66006", studentCode: "66006", name: "ณิชกานต์ พูลทรัพย์", classroomId: "room-m1-2", profile: "late" },
    { id: "student-66007", studentCode: "66007", name: "พชรพล สุขใจ", classroomId: "room-m1-2", profile: "absence" },
    { id: "student-66008", studentCode: "66008", name: "อริศรา วงศ์อรุณ", classroomId: "room-m1-2", profile: "steady" },
    { id: "student-65001", studentCode: "65001", name: "กมลชนก พรหมมา", classroomId: "room-m2-1", profile: "steady" },
    { id: "student-65002", studentCode: "65002", name: "พีรพัฒน์ วงศ์ดี", classroomId: "room-m2-1", profile: "late" },
    { id: "student-65003", studentCode: "65003", name: "ณัฐวรา แซ่ลี้", classroomId: "room-m2-1", profile: "absence" },
    { id: "student-65004", studentCode: "65004", name: "ธนโชติ อินทร์รักษ์", classroomId: "room-m2-1", profile: "leave" },
    { id: "student-64001", studentCode: "64001", name: "ปวริศา ศรีสวัสดิ์", classroomId: "room-m3-1", profile: "activity" },
    { id: "student-64002", studentCode: "64002", name: "ชยพล แสงทอง", classroomId: "room-m3-1", profile: "steady" },
    { id: "student-64003", studentCode: "64003", name: "รวิภา ตั้งเจริญ", classroomId: "room-m3-1", profile: "leave" },
    { id: "student-64004", studentCode: "64004", name: "กิตติพงษ์ สุขสำราญ", classroomId: "room-m3-1", profile: "late" }
  ];

  const attendance = [];
  let recordIndex = 1;

  const studentsByRoom = new Map();
  students.forEach((student) => {
    if (!studentsByRoom.has(student.classroomId)) {
      studentsByRoom.set(student.classroomId, []);
    }
    studentsByRoom.get(student.classroomId).push(student);
  });

  schedules.forEach((schedule) => {
    const sessions = buildScheduleSessions(schedule.weeklySlots, 2026, 7);
    const roomStudents = studentsByRoom.get(schedule.classroomId) || [];
    roomStudents.forEach((student) => {
      const pattern = statusProfiles[student.profile] || statusProfiles.steady;
      sessions.forEach((session, index) => {
        attendance.push({
          id: `att-${String(recordIndex).padStart(4, "0")}`,
          scheduleId: schedule.id,
          studentId: student.id,
          date: session.date,
          period: session.period,
          status: pattern[index % pattern.length]
        });
        recordIndex += 1;
      });
    });
  });

  return { academicYears, semesters, grades, classrooms, teachers, subjects, schedules, students, attendance };
}

function buildScheduleSessions(weeklySlots, year, month) {
  const sessions = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    const current = new Date(year, month - 1, day);
    const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
    weeklySlots.forEach((slot) => {
      if (slot.dayOfWeek === dayOfWeek) {
        sessions.push({
          date: current.toISOString().slice(0, 10),
          period: slot.period
        });
      }
    });
  }
  return sessions;
}

function buildMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function getCurrentAcademicYear() {
  return state.db.academicYears.find((item) => item.isCurrent) || state.db.academicYears[0];
}

function getCurrentSemester() {
  const today = new Date().toISOString().slice(0, 10);
  return state.db.semesters.find((semester) => semester.startDate <= today && semester.endDate >= today)
    || state.db.semesters[0];
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
  const currentSemester = getCurrentSemester();
  els.semester.value = semesters.some((item) => item.id === currentSemester.id) ? currentSemester.id : semesters[0]?.id || "";
}

function populateGrades() {
  const gradeOptions = state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("");
  els.grade.innerHTML = `<option value="">เลือกระดับชั้น</option>${gradeOptions}`;
}

function syncClassrooms() {
  const gradeId = els.grade.value;
  const classrooms = state.db.classrooms
    .filter((room) => room.gradeId === gradeId)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
  els.classroom.innerHTML = `<option value="">เลือกห้องเรียน</option>${classrooms
    .map((room) => `<option value="${room.id}">${room.name}</option>`)
    .join("")}`;
  els.classroom.disabled = !gradeId;
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
  const semesterIds = getScheduleScopeIds();
  const scheduleSubjectIds = new Set(
    state.db.schedules
      .filter((schedule) => schedule.classroomId === classroomId)
      .filter((schedule) => semesterIds.has(schedule.semesterId))
      .map((schedule) => schedule.subjectId)
  );
  const subjects = state.db.subjects
    .filter((subject) => scheduleSubjectIds.has(subject.id))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
  els.subject.innerHTML = `<option value="">เลือกรายวิชา</option>${subjects
    .map((subject) => `<option value="${subject.id}">${subject.code} - ${subject.name}</option>`)
    .join("")}`;
  els.subject.disabled = !classroomId;
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

function isMinimumFiltersComplete() {
  const values = getFormValues();
  return Boolean(values.academicYear && values.semester && values.grade && values.classroom && values.subject);
}

function syncSearchState() {
  els.searchBtn.disabled = !isMinimumFiltersComplete();
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
  if (attendancePercent < threshold + 5) return "risk";
  return "eligible";
}

function getAttendanceCredit(status) {
  return ["ตรงเวลา", "สาย", "กิจกรรม"].includes(status) ? 1 : 0;
}

function getRemark(studentSummary, threshold) {
  if (studentSummary.statusKey === "unable") {
    return `ต่ำกว่าเกณฑ์ ${threshold}% และขาด ${studentSummary.absentCount} ครั้ง`;
  }
  if (studentSummary.statusKey === "risk") {
    return `ควรติดตามต่อเนื่องก่อนต่ำกว่าเกณฑ์ ${threshold}%`;
  }
  return `ผ่านเกณฑ์ปัจจุบัน ${threshold}%`;
}

function buildReportRows(filters) {
  const classroom = state.maps.classrooms.get(filters.classroom);
  const grade = state.maps.grades.get(classroom.gradeId);
  const subject = state.maps.subjects.get(filters.subject);
  const semesterIds = getScheduleScopeIds();
  const selectedSchedules = state.db.schedules.filter((schedule) => (
    schedule.classroomId === filters.classroom
    && schedule.subjectId === filters.subject
    && semesterIds.has(schedule.semesterId)
  ));

  const scheduleIds = new Set(selectedSchedules.map((schedule) => schedule.id));
  const teacherNames = [...new Set(selectedSchedules.map((schedule) => state.maps.teachers.get(schedule.teacherId)?.shortName).filter(Boolean))];
  const students = state.db.students.filter((student) => student.classroomId === filters.classroom);
  const studentIds = new Set(students.map((student) => student.id));
  const records = state.db.attendance.filter((record) => scheduleIds.has(record.scheduleId) && studentIds.has(record.studentId));

  const recordsByStudent = new Map(students.map((student) => [student.id, []]));
  records.forEach((record) => {
    recordsByStudent.get(record.studentId).push(record);
  });

  const rows = students.map((student) => {
    const studentRecords = recordsByStudent.get(student.id) || [];
    const totalSessions = studentRecords.length;
    const presentCredits = studentRecords.reduce((sum, record) => sum + getAttendanceCredit(record.status), 0);
    const absentCount = studentRecords.filter((record) => record.status === "ขาด").length;
    const lateCount = studentRecords.filter((record) => record.status === "สาย").length;
    const attendancePercent = totalSessions ? Math.round((presentCredits / totalSessions) * 100) : 0;
    const statusKey = classifyStudent(attendancePercent, filters.threshold);
    const statusLabel = statusKey === "unable" ? "ไม่มีสิทธิ์สอบ" : statusKey === "risk" ? "กลุ่มเสี่ยง" : "ยังมีสิทธิ์สอบ";
    const teacherRemark = getRemark({ statusKey, absentCount }, filters.threshold);

    return {
      studentId: student.studentCode,
      studentName: student.name,
      gradeClass: `${grade.name} / ${classroom.name}`,
      attendancePercent,
      absentCount,
      lateCount,
      statusKey,
      statusLabel,
      teacherRemark,
      searchText: `${student.studentCode} ${student.name}`.toLowerCase(),
      teacherNames,
      totalSessions,
      subjectLabel: `${subject.code} - ${subject.name}`
    };
  });

  const keyword = filters.keyword.toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (filters.status !== "all" && row.statusKey !== filters.status) return false;
    if (keyword && !row.searchText.includes(keyword)) return false;
    return true;
  });

  state.totalStudentsInScope = rows.length;
  return filteredRows;
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
  const subjectText = subject?.code || "วิชา";
  return `UnableExam_${gradeText}_${roomText}_${subjectText}_${date}`;
}

function updateSummary() {
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const subject = state.maps.subjects.get(els.subject.value);
  const unableCount = state.filteredRows.filter((row) => row.statusKey === "unable").length;
  const unablePercentage = state.totalStudentsInScope
    ? Math.round((unableCount / state.totalStudentsInScope) * 100)
    : 0;

  els.studentsFound.textContent = String(state.filteredRows.length);
  els.unablePercentage.textContent = `${unablePercentage}%`;
  els.thresholdValue.textContent = `${normalizeThreshold(els.threshold.value)}%`;
  els.selectedSubject.textContent = subject ? `${subject.code} - ${subject.name}` : "-";
  els.selectedClassroom.textContent = classroom ? classroom.name : "-";
  els.totalRecords.textContent = String(state.filteredRows.length);
  els.statusMeta.textContent = els.status.options[els.status.selectedIndex].text;
  els.scheduleMeta.textContent = els.scheduleScope.options[els.scheduleScope.selectedIndex].text;
  els.summaryScope.textContent = classroom && subject
    ? `${classroom.name} | ${subject.code} - ${subject.name} | ไฟล์ส่งออก ${getFilenameBase()}`
    : "ยังไม่มีผลการค้นหา";
}

function renderTableHeader() {
  const columns = [
    { key: "index", label: "No.", sortable: false },
    { key: "studentId", label: "รหัสนักเรียน", sortable: true },
    { key: "studentName", label: "ชื่อ-สกุล", sortable: true },
    { key: "gradeClass", label: "ชั้น/ห้อง", sortable: true },
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
          return `<th class="sticky-top">${column.label}</th>`;
        }
        const isActive = state.sort.key === column.key;
        const sortIcon = isActive ? (state.sort.dir === "asc" ? "↑" : "↓") : "↕";
        const ariaSort = isActive ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none";
        const title = column.tooltip ? ` title="${column.tooltip}"` : "";
        return `
          <th class="sticky-top" aria-sort="${ariaSort}">
            <button class="sort-button ${isActive ? "is-active" : ""}" type="button" data-sort-key="${column.key}"${title}>
              <span>${column.label}</span>
              <span aria-hidden="true">${sortIcon}</span>
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
        <div class="unable-empty-state">
          <div class="unable-empty-illustration" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p class="unable-empty-title">ไม่พบนักเรียนตามเงื่อนไข</p>
          <p class="unable-empty-text">ลองปรับห้องเรียน รายวิชา หรือขยายเงื่อนไขในตัวกรองเพิ่มเติมแล้วค้นหาอีกครั้ง</p>
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
          <div class="student-cell">
            <strong>${row.studentName}</strong>
            <span>${row.subjectLabel}</span>
          </div>
        </td>
        <td>${row.gradeClass}</td>
        <td>
          <span class="rate-chip ${lowAttendance ? "rate-chip-danger" : ""}" title="จาก ${row.totalSessions} คาบเรียนจริง">
            ${row.attendancePercent}%
          </span>
        </td>
        <td>${row.absentCount}</td>
        <td>${row.lateCount}</td>
        <td>
          <span class="status-chip unable-status-chip" data-tone="${row.statusKey}" title="${statusNotes[row.statusKey]}">
            ${row.statusLabel}
          </span>
        </td>
        <td>${row.teacherRemark}</td>
      </tr>
    `;
  }).join("");

  els.paginationBar.classList.toggle("hidden", sortedRows.length <= pageSize);
  els.paginationStatus.textContent = `หน้า ${state.currentPage} จาก ${totalPages}`;
  els.prevPageBtn.disabled = state.currentPage === 1;
  els.nextPageBtn.disabled = state.currentPage === totalPages;
}

function renderSearchResults() {
  renderTableHeader();
  updateSummary();
  renderRows();
  els.tablePlaceholder.hidden = true;
  els.exportBtn.disabled = !state.filteredRows.length;
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
    if (saved.status) els.status.value = saved.status;
    if (saved.threshold) els.threshold.value = saved.threshold;
    if (saved.keyword) els.keyword.value = saved.keyword;
    if (saved.status !== "unable" || saved.scheduleScope !== "current" || saved.keyword || Number(saved.threshold) !== 80) {
      toggleAdvancedPanel(true);
    }
  } catch (error) {
    console.error(error);
  }
}

function resetFilters() {
  populateAcademicYears();
  populateSemesters();
  populateGrades();
  els.grade.value = "";
  syncClassrooms();
  syncSubjects();
  els.scheduleScope.value = "current";
  els.status.value = "unable";
  els.threshold.value = "80";
  els.keyword.value = "";
  toggleAdvancedPanel(false);
  syncSearchState();
  setBanner(els.validationBanner, "");
  setBanner(els.emptyNotice, "");
  state.filteredRows = [];
  state.currentPage = 1;
  els.tablePlaceholder.hidden = false;
  els.exportBtn.disabled = true;
  renderTableHeader();
  els.unableTbody.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="empty-state">กดค้นหาข้อมูลเพื่อเริ่มแสดงรายงาน</div>
      </td>
    </tr>
  `;
  els.paginationBar.classList.add("hidden");
}

function runSearch(event) {
  event.preventDefault();
  if (!isMinimumFiltersComplete()) {
    setBanner(els.validationBanner, "กรุณาเลือกตัวกรองที่จำเป็นให้ครบก่อนค้นหา");
    return;
  }

  const filters = getFormValues();
  els.threshold.value = String(filters.threshold);
  setBanner(els.validationBanner, "");
  setBanner(els.emptyNotice, "");

  state.filteredRows = buildReportRows(filters);
  state.currentPage = 1;
  saveLastSearch();
  renderSearchResults();

  if (!state.filteredRows.length) {
    setBanner(els.emptyNotice, "ไม่พบข้อมูลตามเงื่อนไขที่เลือก กรุณาปรับตัวกรองแล้วลองใหม่อีกครั้ง");
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

function handleExport(type) {
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
    syncSearchState();
  });

  els.semester.addEventListener("change", () => {
    syncSubjects();
    syncSearchState();
  });

  els.grade.addEventListener("change", () => {
    syncClassrooms();
    syncSubjects();
    syncSearchState();
  });

  els.classroom.addEventListener("change", () => {
    syncSubjects();
    syncSearchState();
  });

  els.subject.addEventListener("change", syncSearchState);
  els.scheduleScope.addEventListener("change", () => {
    syncSubjects();
    syncSearchState();
  });

  els.threshold.addEventListener("change", () => {
    els.threshold.value = String(normalizeThreshold(els.threshold.value));
  });

  els.advancedToggleBtn.addEventListener("click", () => toggleAdvancedPanel());
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.filtersForm.addEventListener("submit", runSearch);
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

  els.exportBtn.addEventListener("click", () => {
    if (els.exportBtn.disabled) return;
    toggleExportMenu();
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

function init() {
  if (!els.filtersForm) {
    return;
  }
  state.db = buildInlineMockDatabase();
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
  syncSearchState();
  renderTableHeader();
  attachEvents();

  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / ภาคเรียนที่ ${currentSemester.term}`;
}

init();
})();
