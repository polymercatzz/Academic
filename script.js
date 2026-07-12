const attendanceOptions = [
  "ตรงเวลา",
  "สาย",
  "ขาด",
  "ลากิจ",
  "ลาป่วย",
  "กิจกรรม",
  "วันหยุด"
];

const moduleLabels = {
  attendance: "รายงานการเข้าเรียน",
  "score-subject": "รายงานผลพัฒนาผู้เรียนรายวิชา",
  "record-report": "รายงานผลการเรียนระเบียนสะสม / GPAX",
  "unable-exam": "รายงานผู้ไม่มีสิทธิ์สอบ",
  grade: "ผลการเรียน",
  behavior: "บันทึกพฤติกรรม",
  schedule: "ตารางเรียน",
  settings: "ตั้งค่าระบบ"
};

const viewModeDetails = {
  quick: {
    label: "Quick View",
    note: "ดูสถานะล่าสุดของนักเรียนตามผลการค้นหาจริงจากตารางเรียนและการเช็กชื่อ"
  },
  report: {
    label: "Report View",
    note: "ดู attendance matrix ตามวันที่มีคาบเรียนจริง พร้อมสรุปและแนวโน้มรายคน"
  }
};

const els = {
  classLevel: document.getElementById("classLevel"),
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
  searchBtn: document.getElementById("searchBtn"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  resultsSection: document.getElementById("resultsSection"),
  tableSection: document.getElementById("tableSection"),
  summaryScope: document.getElementById("summaryScope"),
  periodLabel: document.getElementById("periodLabel"),
  modeLabel: document.getElementById("modeLabel"),
  viewModeNote: document.getElementById("viewModeNote"),
  quickViewBtn: document.getElementById("quickViewBtn"),
  reportViewBtn: document.getElementById("reportViewBtn"),
  tablePlaceholder: document.getElementById("tablePlaceholder"),
  attendanceThead: document.getElementById("attendanceThead"),
  attendanceTbody: document.getElementById("attendanceTbody"),
  tableWrap: document.querySelector(".table-wrap"),
  totalStudents: document.getElementById("totalStudents"),
  presentCount: document.getElementById("presentCount"),
  lateCount: document.getElementById("lateCount"),
  absentCount: document.getElementById("absentCount"),
  leaveCount: document.getElementById("leaveCount"),
  editBtn: document.getElementById("editBtn"),
  bulkEditBtn: document.getElementById("bulkEditBtn"),
  saveBtn: document.getElementById("saveBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  currentAcademicLabel: document.getElementById("currentAcademicLabel"),
  toast: document.getElementById("toast"),
  activeModuleLabel: document.getElementById("activeModuleLabel"),
  navItems: document.querySelectorAll(".nav-item"),
  appPages: document.querySelectorAll(".app-page"),
  placeholderPageTitle: document.getElementById("placeholderPageTitle"),
  placeholderPageSubtitle: document.getElementById("placeholderPageSubtitle"),
  placeholderModuleTitle: document.getElementById("placeholderModuleTitle"),
  placeholderModuleText: document.getElementById("placeholderModuleText")
};

const state = {
  db: null,
  maps: null,
  viewMode: "quick",
  editMode: false,
  activeModule: "attendance",
  currentScopeText: "-",
  visibleSessions: [],
  visibleStudents: [],
  hoveredColumnKey: null
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
    { id: "teacher-anong", name: "อ.อนงค์นาถ ศรีสวัสดิ์", shortName: "อ.อนงค์นาถ", subjectIds: ["subject-math", "subject-thai"] },
    { id: "teacher-krit", name: "อ.กฤตภาส วัฒนชัย", shortName: "อ.กฤตภาส", subjectIds: ["subject-math", "subject-science"] },
    { id: "teacher-sunee", name: "อ.สุนีย์ พิพัฒน์ผล", shortName: "อ.สุนีย์", subjectIds: ["subject-thai", "subject-social"] },
    { id: "teacher-preecha", name: "อ.ปรีชา ธรรมวงศ์", shortName: "อ.ปรีชา", subjectIds: ["subject-english", "subject-social"] },
    { id: "teacher-mali", name: "อ.มะลิ กาญจนกิจ", shortName: "อ.มะลิ", subjectIds: ["subject-english"] },
    { id: "teacher-niran", name: "อ.นิรันดร์ บุญมาก", shortName: "อ.นิรันดร์", subjectIds: ["subject-science"] }
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
    { id: "student-66001", studentCode: "66001", name: "กานต์ธิดา สุขผล", classroomId: "room-m1-1", number: 1, profile: "steady" },
    { id: "student-66002", studentCode: "66002", name: "ธนกฤต แซ่ตั้ง", classroomId: "room-m1-1", number: 2, profile: "late" },
    { id: "student-66003", studentCode: "66003", name: "ปวีณ์นุช อินทรา", classroomId: "room-m1-1", number: 3, profile: "leave" },
    { id: "student-66004", studentCode: "66004", name: "ภูริณัฐ ขยันดี", classroomId: "room-m1-1", number: 4, profile: "activity" },
    { id: "student-66005", studentCode: "66005", name: "ศุภวิชญ์ เจริญผล", classroomId: "room-m1-2", number: 1, profile: "steady" },
    { id: "student-66006", studentCode: "66006", name: "ณิชกานต์ พูลทรัพย์", classroomId: "room-m1-2", number: 2, profile: "late" },
    { id: "student-66007", studentCode: "66007", name: "พชรพล สุขใจ", classroomId: "room-m1-2", number: 3, profile: "absence" },
    { id: "student-66008", studentCode: "66008", name: "อริศรา วงศ์อรุณ", classroomId: "room-m1-2", number: 4, profile: "steady" },
    { id: "student-65001", studentCode: "65001", name: "กมลชนก พรหมมา", classroomId: "room-m2-1", number: 1, profile: "steady" },
    { id: "student-65002", studentCode: "65002", name: "พีรพัฒน์ วงศ์ดี", classroomId: "room-m2-1", number: 2, profile: "late" },
    { id: "student-65003", studentCode: "65003", name: "ณัฐวรา แซ่ลี้", classroomId: "room-m2-1", number: 3, profile: "absence" },
    { id: "student-65004", studentCode: "65004", name: "ธนโชติ อินทร์รักษ์", classroomId: "room-m2-1", number: 4, profile: "leave" },
    { id: "student-64001", studentCode: "64001", name: "ปวริศา ศรีสวัสดิ์", classroomId: "room-m3-1", number: 1, profile: "activity" },
    { id: "student-64002", studentCode: "64002", name: "ชยพล แสงทอง", classroomId: "room-m3-1", number: 2, profile: "steady" },
    { id: "student-64003", studentCode: "64003", name: "รวิภา ตั้งเจริญ", classroomId: "room-m3-1", number: 3, profile: "leave" },
    { id: "student-64004", studentCode: "64004", name: "กิตติพงษ์ สุขสำราญ", classroomId: "room-m3-1", number: 4, profile: "late" }
  ];

  const statusProfiles = {
    steady: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    late: ["สาย", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา"],
    absence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา"],
    leave: ["ลากิจ", "ตรงเวลา", "ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ลากิจ", "ตรงเวลา", "ตรงเวลา"],
    activity: ["กิจกรรม", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา"]
  };

  const statusRemarks = {
    "ตรงเวลา": "เข้าชั้นเรียนตามเวลา",
    "สาย": "เข้าชั้นเรียนช้ากว่ากำหนด",
    "ขาด": "ไม่พบการเข้าเรียนตามตาราง",
    "ลากิจ": "มีการยื่นใบลา",
    "ลาป่วย": "แจ้งลาป่วยกับครูประจำวิชา",
    "กิจกรรม": "เข้าร่วมกิจกรรมที่ได้รับมอบหมาย"
  };

  const studentsByClassroom = new Map();
  students.forEach((student) => {
    if (!studentsByClassroom.has(student.classroomId)) {
      studentsByClassroom.set(student.classroomId, []);
    }
    studentsByClassroom.get(student.classroomId).push(student);
  });

  const attendance = [];
  let recordIndex = 1;

  schedules.forEach((schedule) => {
    const scheduleStudents = studentsByClassroom.get(schedule.classroomId) || [];
    const sessions = buildScheduleSessions(schedule.weeklySlots, 2026, 7);

    scheduleStudents.forEach((student) => {
      const pattern = statusProfiles[student.profile] || statusProfiles.steady;
      sessions.forEach((session, index) => {
        const status = pattern[index % pattern.length];
        attendance.push({
          id: `att-${String(recordIndex).padStart(4, "0")}`,
          scheduleId: schedule.id,
          studentId: student.id,
          date: session.date,
          period: session.period,
          status,
          remark: statusRemarks[status]
        });
        recordIndex += 1;
      });
    });
  });

  return {
    academicYears,
    semesters,
    grades,
    classrooms,
    teachers,
    subjects,
    schedules,
    students,
    attendance
  };
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
          date: formatDateInput(current),
          period: slot.period
        });
      }
    });
  }

  return sessions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.period - b.period;
  });
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
  const today = new Date();
  const todayText = today.toISOString().slice(0, 10);
  return state.db.semesters.find((semester) => semester.startDate <= todayText && semester.endDate >= todayText)
    || state.db.semesters[0];
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
  els.monthlyMonth.value = String(new Date().getMonth() + 1);
}

function populateSemesterTerms() {
  const currentYearId = els.semesterYear.value;
  const semesters = state.db.semesters.filter((semester) => semester.academicYearId === currentYearId);
  els.semesterTerm.innerHTML = semesters
    .map((semester) => `<option value="${semester.id}">ภาคเรียนที่ ${semester.term}</option>`)
    .join("");
  const currentSemester = getCurrentSemester();
  const fallback = semesters[0] ? semesters[0].id : "";
  els.semesterTerm.value = semesters.some((semester) => semester.id === currentSemester.id) ? currentSemester.id : fallback;
}

function populateGradeOptions() {
  const options = state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("");
  els.classLevel.innerHTML = `<option value="all">ทุกระดับชั้น</option>${options}`;
}

function getFilteredClassroomsForControls() {
  const gradeId = els.classLevel.value;
  return state.db.classrooms.filter((classroom) => gradeId === "all" || classroom.gradeId === gradeId);
}

function syncRoomOptions() {
  const previous = els.room.value;
  const classrooms = getFilteredClassroomsForControls()
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  els.room.innerHTML = `<option value="all">ทุกห้อง</option>${classrooms
    .map((classroom) => `<option value="${classroom.id}">${classroom.name}</option>`)
    .join("")}`;

  const nextValue = classrooms.some((classroom) => classroom.id === previous) ? previous : "all";
  els.room.value = nextValue;
}

function syncSubjectOptions() {
  const previous = els.subject.value;
  const availableClassrooms = getFilteredClassroomsForControls();
  const selectedRoom = els.room.value;
  const classroomIds = new Set(
    availableClassrooms
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
    .map((subject) => `<option value="${subject.id}">${subject.code} - ${subject.name}</option>`)
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

function populateFilters() {
  populateAcademicYears();
  populateMonths();
  populateGradeOptions();
  syncRoomOptions();
  syncSubjectOptions();
  populateSemesterTerms();
  populateDateDefaults();
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
    "กิจกรรม": "ก",
    "สาย": "ส",
    "ขาด": "ข",
    "ลากิจ": "ล",
    "ลาป่วย": "ป",
    "วันหยุด": "ห",
    "-": "-"
  };
  return map[status] || status;
}

function formatThaiShortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short"
  });
}

function buildSearchResult() {
  const dateRange = getDateRangeForType();
  const semesterIds = getRelevantSemesterIds(dateRange);
  const selectedGradeId = els.classLevel.value;
  const selectedRoomId = els.room.value;
  const selectedSubjectId = els.subject.value;
  const statusFilter = els.statusFilter.value;

  const classroomIds = new Set(
    state.db.classrooms
      .filter((classroom) => selectedGradeId === "all" || classroom.gradeId === selectedGradeId)
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
    const key = `${record.scheduleId}|${record.date}|${record.period}`;
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
      subjectCode: subject.code,
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
      studentRecords.forEach((record) => {
        counts[normalizeStatusCategory(record.status)] += 1;
      });

      const applicableSessions = sessions.filter((session) => session.classroomId === student.classroomId);
      const attendanceRateBase = Math.max(studentRecords.length, 1);
      const attendanceRate = Math.round(((counts.present + counts.late) / attendanceRateBase) * 100);
      const sessionStatusMap = new Map(studentRecords.map((record) => [`${record.scheduleId}|${record.date}|${record.period}`, record]));
      const scheduleLabels = [...new Set(studentRecords.map((record) => {
        const schedule = state.maps.schedules.get(record.scheduleId);
        const subject = state.maps.subjects.get(schedule.subjectId);
        return `${subject.code} - ${subject.name}`;
      }))];

      return {
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        classroomId: classroom.id,
        classroomName: classroom.name,
        gradeName: grade.name,
        latestRecord,
        counts,
        attendanceRate,
        sessionStatusMap,
        studentRecords,
        applicableSessions,
        scheduleLabels
      };
    })
    .filter((student) => {
      if (statusFilter === "all") return student.studentRecords.length > 0;
      return student.counts[statusFilter] > 0;
    });

  return {
    dateRange,
    sessions,
    students: viewStudents,
    schedules
  };
}

function summarizeData(students) {
  const totals = { present: 0, late: 0, absent: 0, leave: 0 };

  students.forEach((student) => {
    if (state.viewMode === "quick") {
      if (student.latestRecord) {
        totals[normalizeStatusCategory(student.latestRecord.status)] += 1;
      }
      return;
    }
    totals.present += student.counts.present;
    totals.late += student.counts.late;
    totals.absent += student.counts.absent;
    totals.leave += student.counts.leave;
  });

  els.totalStudents.textContent = String(students.length);
  els.presentCount.textContent = String(totals.present);
  els.lateCount.textContent = String(totals.late);
  els.absentCount.textContent = String(totals.absent);
  els.leaveCount.textContent = String(totals.leave);
}

function getViewScopeLabel() {
  return state.viewMode === "quick" ? "สถานะล่าสุด" : "รายงานรายวัน";
}

function syncResultsMeta() {
  els.periodLabel.textContent = state.currentScopeText;
  els.summaryScope.textContent = `${state.currentScopeText} | ${state.visibleSessions.length} คาบเรียนจริง | ${getViewScopeLabel()}`;
}

function renderQuickHeader() {
  els.attendanceThead.innerHTML = `
    <tr>
      <th class="sticky-col sticky-col-id sticky-top">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-name sticky-top">ชื่อ-สกุล</th>
      <th class="sticky-top">ชั้น/ห้อง</th>
      <th class="sticky-top">วิชาที่พบ</th>
      <th class="sticky-top">วันที่/คาบล่าสุด</th>
      <th class="sticky-top">สถานะล่าสุด</th>
      <th class="sticky-top">มาเรียน</th>
      <th class="sticky-top">สาย</th>
      <th class="sticky-top">ขาด</th>
      <th class="sticky-top">ลา/อื่นๆ</th>
      <th class="sticky-top">% เข้าเรียน</th>
    </tr>
  `;
}

function renderReportHeader() {
  const sessionHeaders = state.visibleSessions.map((session, index) => `
    <th class="sticky-top matrix-date-head" data-col-key="session-${index}">
      <div class="session-head">
        <strong>${formatThaiShortDate(session.date)}</strong>
        <span>คาบ ${session.period}</span>
      </div>
    </th>
  `).join("");

  els.attendanceThead.innerHTML = `
    <tr>
      <th class="sticky-col sticky-col-id sticky-top">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-name sticky-top">ชื่อ-สกุล</th>
      <th class="sticky-top">ชั้น/ห้อง</th>
      ${sessionHeaders}
      <th class="sticky-top">มาเรียน</th>
      <th class="sticky-top">สาย</th>
      <th class="sticky-top">ขาด</th>
      <th class="sticky-top">ลา/อื่นๆ</th>
      <th class="sticky-top">% เข้าเรียน</th>
    </tr>
  `;
}

function renderEmptyState(message, colSpan) {
  els.attendanceTbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}">
        <div class="empty-state">${message}</div>
      </td>
    </tr>
  `;
}

function renderQuickRows() {
  if (!state.visibleStudents.length) {
    renderEmptyState("ไม่พบข้อมูลที่ตรงกับเงื่อนไขและตารางเรียนจริง", 11);
    return;
  }

  els.attendanceTbody.innerHTML = state.visibleStudents.map((student, index) => {
    const latestStatus = student.latestRecord ? student.latestRecord.status : "-";
    const latestLabel = student.latestRecord
      ? `${formatThaiShortDate(student.latestRecord.date)} / คาบ ${student.latestRecord.period}`
      : "-";

    const statusCell = state.editMode
      ? `<select class="status-select" data-index="${index}" aria-label="เปลี่ยนสถานะล่าสุดของ ${student.name}">
          ${attendanceOptions.map((status) => `<option value="${status}" ${status === latestStatus ? "selected" : ""}>${status}</option>`).join("")}
        </select>`
      : `<span class="status-chip" data-status="${latestStatus}">${latestStatus}</span>`;

    return `
      <tr>
        <td class="sticky-col sticky-col-id">${student.studentCode}</td>
        <td class="sticky-col sticky-col-name">
          <div class="student-cell">
            <strong>${student.name}</strong>
            <span>${student.gradeName}</span>
          </div>
        </td>
        <td>${student.classroomName}</td>
        <td>${student.scheduleLabels.join("<br />")}</td>
        <td>${latestLabel}</td>
        <td>${statusCell}</td>
        <td>${student.counts.present}</td>
        <td>${student.counts.late}</td>
        <td>${student.counts.absent}</td>
        <td>${student.counts.leave}</td>
        <td><span class="rate-chip">${student.attendanceRate}%</span></td>
      </tr>
    `;
  }).join("");
}

function renderReportRows() {
  if (!state.visibleStudents.length) {
    renderEmptyState("ไม่พบข้อมูลที่ตรงกับเงื่อนไขและตารางเรียนจริง", 8 + state.visibleSessions.length);
    return;
  }

  els.attendanceTbody.innerHTML = state.visibleStudents.map((student) => {
    const sessionCells = state.visibleSessions.map((session, index) => {
      const record = student.sessionStatusMap.get(session.key);
      const status = record ? record.status : "-";
      return `
        <td class="matrix-cell" data-col-key="session-${index}">
          <span class="status-dot status-dot-${getStatusTone(status)}" title="${status}">${getStatusAbbr(status)}</span>
        </td>
      `;
    }).join("");

    return `
      <tr>
        <td class="sticky-col sticky-col-id">${student.studentCode}</td>
        <td class="sticky-col sticky-col-name">
          <div class="student-cell">
            <strong>${student.name}</strong>
            <span>${student.classroomName}</span>
          </div>
        </td>
        <td>${student.gradeName} / ${student.classroomName}</td>
        ${sessionCells}
        <td>${student.counts.present}</td>
        <td>${student.counts.late}</td>
        <td>${student.counts.absent}</td>
        <td>${student.counts.leave}</td>
        <td><span class="rate-chip">${student.attendanceRate}%</span></td>
      </tr>
    `;
  }).join("");
}

function renderTable() {
  if (!state.visibleSessions.length) {
    els.attendanceThead.innerHTML = `
      <tr>
        <th class="sticky-top">ไม่พบคาบเรียนจริงในช่วงเวลาที่เลือก</th>
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
  els.modeLabel.textContent = state.editMode ? "แก้ไขรายบุคคล" : modeMeta.label;
  els.viewModeNote.textContent = modeMeta.note;
  els.quickViewBtn.classList.toggle("is-active", state.viewMode === "quick");
  els.reportViewBtn.classList.toggle("is-active", state.viewMode === "report");
  els.quickViewBtn.setAttribute("aria-pressed", String(state.viewMode === "quick"));
  els.reportViewBtn.setAttribute("aria-pressed", String(state.viewMode === "report"));
  els.editBtn.hidden = state.editMode;
  els.saveBtn.hidden = !state.editMode;
  els.editBtn.disabled = state.viewMode !== "quick";
  els.bulkEditBtn.disabled = state.viewMode !== "report";
}

function searchData() {
  const result = buildSearchResult();
  state.visibleSessions = result.sessions;
  state.visibleStudents = result.students;
  state.currentScopeText = buildScopeText();
  state.editMode = false;
  syncResultsMeta();
  summarizeData(state.visibleStudents);
  renderTable();
  syncModeControls();
  els.resultsSection.hidden = false;
  els.tableSection.hidden = false;
  els.tablePlaceholder.hidden = true;
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
  renderTable();
  syncModeControls();
  if (state.editMode) {
    setToast("เปิดโหมดแก้ไขรายบุคคลแล้ว", "info");
  }
}

function saveChanges() {
  const selects = els.attendanceTbody.querySelectorAll("select.status-select");
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
  setToast("ต้นแบบนี้เตรียม workflow แก้ไขแบบกลุ่มไว้ต่อยอดกับ API ในขั้นถัดไป", "info");
}

function mockExport(type) {
  setToast(`เตรียมส่งออกรายงาน ${type === "excel" ? "Excel" : "PDF"} จากผลการค้นหาจริง`, "info");
}

function resetFilters() {
  const currentYear = getCurrentAcademicYear();
  els.classLevel.value = "all";
  syncRoomOptions();
  syncSubjectOptions();
  els.room.value = "all";
  els.subject.value = "all";
  els.statusFilter.value = "all";
  els.searchType.value = "monthly";
  els.monthlyYear.value = currentYear.id;
  els.semesterYear.value = currentYear.id;
  populateSemesterTerms();
  els.monthlyMonth.value = String(new Date().getMonth() + 1);
  populateDateDefaults();
  updateFieldVisibility();
  setToast("รีเซ็ตตัวกรองเรียบร้อย", "info");
}

function setActiveModule(system) {
  state.activeModule = system;
  els.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.system === system);
  });
  els.activeModuleLabel.textContent = moduleLabels[system] || system;
  const targetPage = ["attendance", "score-subject", "record-report", "unable-exam"].includes(system) ? system : "placeholder";
  els.appPages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === targetPage);
  });

  if (targetPage === "placeholder") {
    els.placeholderPageTitle.textContent = moduleLabels[system] || "โมดูลอื่น";
    els.placeholderPageSubtitle.textContent = `หน้าสำหรับ ${moduleLabels[system] || system} ยังไม่ได้ถูกออกแบบใน prototype นี้`;
    els.placeholderModuleTitle.textContent = `${moduleLabels[system] || system} ยังไม่พร้อมใช้งาน`;
    els.placeholderModuleText.textContent = "ตอนนี้มีหน้ารายงานการเข้าเรียน รายงานผลพัฒนาผู้เรียนรายวิชา รายงานผลการเรียนระเบียนสะสม / GPAX และรายงานผู้ไม่มีสิทธิ์สอบที่ใช้งานได้ภายใน sidebar เดียวกัน";
  }
}

function setViewMode(viewMode) {
  state.viewMode = viewMode;
  state.editMode = false;
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
  els.classLevel.addEventListener("change", () => {
    syncRoomOptions();
    syncSubjectOptions();
  });

  els.room.addEventListener("change", () => {
    syncSubjectOptions();
  });

  els.semesterYear.addEventListener("change", populateSemesterTerms);
  els.searchType.addEventListener("change", updateFieldVisibility);
  els.searchBtn.addEventListener("click", searchData);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.quickViewBtn.addEventListener("click", () => setViewMode("quick"));
  els.reportViewBtn.addEventListener("click", () => setViewMode("report"));
  els.editBtn.addEventListener("click", () => toggleEditMode(true));
  els.bulkEditBtn.addEventListener("click", openBulkEdit);
  els.saveBtn.addEventListener("click", saveChanges);
  els.exportExcelBtn.addEventListener("click", () => mockExport("excel"));
  els.exportPdfBtn.addEventListener("click", () => mockExport("pdf"));

  els.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveModule(item.dataset.system);
      if (!["attendance", "score-subject", "record-report", "unable-exam"].includes(item.dataset.system)) {
        setToast(`กำลังเตรียมโมดูล ${moduleLabels[item.dataset.system]}`, "info");
      }
    });
  });
}

async function init() {
  try {
    await loadMockDatabase();
    populateFilters();
    updateFieldVisibility();
    syncModeControls();
    setActiveModule("attendance");
    bindMatrixHover();
    attachEvents();
  } catch (error) {
    console.error(error);
    setToast("ไม่สามารถเตรียม mock data สำหรับการค้นหาได้", "info");
    els.currentAcademicLabel.textContent = "โหลดข้อมูลไม่สำเร็จ";
  }
}

init();
