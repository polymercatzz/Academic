(() => {
const STORAGE_KEY = "unableExamReport:index:lastSearch";

const statusProfiles = {
  steady: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
  late: ["สาย", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา"],
  absence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา"],
  leave: ["ลากิจ", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
  activity: ["กิจกรรม", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา"]
};

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
    { id: "grade-m3", code: "m3", name: "ม.3", order: 3 },
    { id: "grade-m4", code: "m4", name: "ม.4", order: 4 },
    { id: "grade-m5", code: "m5", name: "ม.5", order: 5 },
    { id: "grade-m6", code: "m6", name: "ม.6", order: 6 }
  ];

  const classrooms = [
    { id: "room-m1-1", gradeId: "grade-m1", code: "m1-1", name: "ม.1/1", homeroomTeacherId: "teacher-anong" },
    { id: "room-m1-2", gradeId: "grade-m1", code: "m1-2", name: "ม.1/2", homeroomTeacherId: "teacher-krit" },
    { id: "room-m2-1", gradeId: "grade-m2", code: "m2-1", name: "ม.2/1", homeroomTeacherId: "teacher-sunee" },
    { id: "room-m2-2", gradeId: "grade-m2", code: "m2-2", name: "ม.2/2", homeroomTeacherId: "teacher-mali" },
    { id: "room-m3-1", gradeId: "grade-m3", code: "m3-1", name: "ม.3/1", homeroomTeacherId: "teacher-preecha" },
    { id: "room-m3-2", gradeId: "grade-m3", code: "m3-2", name: "ม.3/2", homeroomTeacherId: "teacher-niran" },
    { id: "room-m4-1", gradeId: "grade-m4", code: "m4-1", name: "ม.4/1", homeroomTeacherId: "teacher-anong" },
    { id: "room-m4-2", gradeId: "grade-m4", code: "m4-2", name: "ม.4/2", homeroomTeacherId: "teacher-krit" },
    { id: "room-m5-1", gradeId: "grade-m5", code: "m5-1", name: "ม.5/1", homeroomTeacherId: "teacher-sunee" },
    { id: "room-m5-2", gradeId: "grade-m5", code: "m5-2", name: "ม.5/2", homeroomTeacherId: "teacher-preecha" },
    { id: "room-m6-1", gradeId: "grade-m6", code: "m6-1", name: "ม.6/1", homeroomTeacherId: "teacher-mali" },
    { id: "room-m6-2", gradeId: "grade-m6", code: "m6-2", name: "ม.6/2", homeroomTeacherId: "teacher-niran" }
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
    { id: "subject-thai", code: "th21102", name: "ภาษาไทย", shortName: "ไทย", learningArea: "ภาษาไทย" },
    { id: "subject-math", code: "ma21101", name: "คณิตศาสตร์", shortName: "คณิต", learningArea: "คณิตศาสตร์" },
    { id: "subject-science", code: "sc21103", name: "วิทยาศาสตร์", shortName: "วิทย์", learningArea: "วิทยาศาสตร์และเทคโนโลยี" },
    { id: "subject-computer", code: "cs21101", name: "วิทยาการคำนวณ", shortName: "คอมพิวเตอร์", learningArea: "วิทยาศาสตร์และเทคโนโลยี" },
    { id: "subject-design", code: "ds21101", name: "การออกแบบและเทคโนโลยี", shortName: "ออกแบบ", learningArea: "วิทยาศาสตร์และเทคโนโลยี" },
    { id: "subject-robotics", code: "rb21101", name: "หุ่นยนต์เบื้องต้น", shortName: "หุ่นยนต์", learningArea: "วิทยาศาสตร์และเทคโนโลยี" },
    { id: "subject-social", code: "so21104", name: "สังคมศึกษา", shortName: "สังคม", learningArea: "สังคมศึกษา ศาสนา และวัฒนธรรม" },
    { id: "subject-history", code: "hi21101", name: "ประวัติศาสตร์", shortName: "ประวัติ", learningArea: "สังคมศึกษา ศาสนา และวัฒนธรรม" },
    { id: "subject-civics", code: "ci21101", name: "หน้าที่พลเมือง", shortName: "พลเมือง", learningArea: "สังคมศึกษา ศาสนา และวัฒนธรรม" },
    { id: "subject-environment", code: "ev21101", name: "สิ่งแวดล้อมศึกษา", shortName: "สิ่งแวดล้อม", learningArea: "สังคมศึกษา ศาสนา และวัฒนธรรม" },
    { id: "subject-health", code: "he21101", name: "สุขศึกษา", shortName: "สุขศึกษา", learningArea: "สุขศึกษาและพลศึกษา" },
    { id: "subject-physical", code: "pe21101", name: "พลศึกษา", shortName: "พละ", learningArea: "สุขศึกษาและพลศึกษา" },
    { id: "subject-art", code: "ar21101", name: "ศิลปะ", shortName: "ศิลปะ", learningArea: "ศิลปะ" },
    { id: "subject-music", code: "mu21101", name: "ดนตรี", shortName: "ดนตรี", learningArea: "ศิลปะ" },
    { id: "subject-career", code: "oc21101", name: "การงานอาชีพ", shortName: "การงาน", learningArea: "การงานอาชีพ" },
    { id: "subject-english", code: "en21101", name: "ภาษาอังกฤษ", shortName: "อังกฤษ", learningArea: "ภาษาต่างประเทศ" },
    { id: "subject-chinese", code: "ch21101", name: "ภาษาจีน", shortName: "จีน", learningArea: "ภาษาต่างประเทศ" },
    { id: "subject-japanese", code: "jp21101", name: "ภาษาญี่ปุ่น", shortName: "ญี่ปุ่น", learningArea: "ภาษาต่างประเทศ" },
    { id: "subject-guidance", code: "gu21101", name: "แนะแนว", shortName: "แนะแนว", learningArea: "กิจกรรมพัฒนาผู้เรียน" },
    { id: "subject-research", code: "is21101", name: "การศึกษาค้นคว้า", shortName: "IS", learningArea: "กิจกรรมพัฒนาผู้เรียน" }
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

  const existingScheduleKeys = new Set(schedules.map((schedule) => `${schedule.classroomId}:${schedule.subjectId}`));
  classrooms.forEach((classroom, roomIndex) => {
    subjects.forEach((subject, subjectIndex) => {
      const key = `${classroom.id}:${subject.id}`;
      if (existingScheduleKeys.has(key)) return;
      const firstDay = (subjectIndex % 5) + 1;
      const secondDay = ((subjectIndex + 2) % 5) + 1;
      schedules.push({
        id: `schedule-${classroom.code}-${subject.id.replace("subject-", "")}`,
        classroomId: classroom.id,
        subjectId: subject.id,
        teacherId: teachers[(roomIndex + subjectIndex) % teachers.length].id,
        semesterId: "sem-2569-1",
        weeklySlots: [
          { dayOfWeek: firstDay, period: (subjectIndex % 6) + 1 },
          { dayOfWeek: secondDay, period: ((subjectIndex + 2) % 6) + 1 }
        ]
      });
    });
  });

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

  let generatedStudentIndex = 1;
  classrooms.forEach((classroom, roomIndex) => {
    const currentCount = students.filter((student) => student.classroomId === classroom.id).length;
    for (let index = currentCount; index < 6; index += 1) {
      const serial = 70000 + (roomIndex * 10) + index + 1;
      const profiles = ["steady", "absence", "late", "leave", "activity", "steady"];
      students.push({
        id: `student-generated-${generatedStudentIndex}`,
        studentCode: String(serial),
        name: `นักเรียนตัวอย่าง ${classroom.name}-${index + 1}`,
        classroomId: classroom.id,
        profile: profiles[(roomIndex + index) % profiles.length]
      });
      generatedStudentIndex += 1;
    }
  });

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

// Filters open on the current semester only when it has attendance records;
// otherwise on the semester of the latest record, so the report never opens empty.
function getDefaultSemester() {
  const current = getCurrentSemester();
  const records = state.db.attendance;
  if (!records.length || records.some((record) => record.date >= current.startDate && record.date <= current.endDate)) return current;
  const latest = records.reduce((max, record) => (record.date > max ? record.date : max), "");
  return state.db.semesters.find((semester) => semester.startDate <= latest && semester.endDate >= latest) || current;
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
  const currentSemester = getDefaultSemester();
  els.semester.value = semesters.some((item) => item.id === currentSemester.id) ? currentSemester.id : semesters[0]?.id || "";
}

function populateGrades() {
  const gradeOptions = state.db.grades
    .sort((a, b) => a.order - b.order)
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("");
  els.grade.innerHTML = `<option value="">ทุกระดับชั้น</option>${gradeOptions}`;
}

function syncClassrooms() {
  const gradeId = els.grade.value;
  const classrooms = state.db.classrooms
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
    state.db.schedules
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
        .map((subject) => `<option value="${subject.id}">${subject.code} - ${subject.name}</option>`)
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
  const selectedSchedules = state.db.schedules.filter((schedule) => (
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
    const scheduleRecords = state.db.attendance.filter((record) => record.scheduleId === schedule.id);
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
        subjectLabel: `${subject.code} - ${subject.name}`
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
  const subjectText = subject?.code || "วิชา";
  return `UnableExam_${gradeText}_${roomText}_${subjectText}_${date}`;
}

function getScopeLabel() {
  const grade = state.maps.grades.get(els.grade.value);
  const classroom = state.maps.classrooms.get(els.classroom.value);
  const subject = state.maps.subjects.get(els.subject.value);
  return [grade?.name || "ทุกระดับชั้น", classroom?.name || "ทุกห้อง", subject ? `${subject.code} - ${subject.name}` : "ทุกวิชา"].join(" | ");
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
    return `<div class="unable-chart-row">
      <span>${item.label}</span>
      <div class="unable-chart-track"><span data-tone="${item.tone}" style="width:${Math.round((count / max) * 100)}%"></span></div>
      <strong>${count}</strong>
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
  const items = [...grouped.values()]
    .map((item) => ({ ...item, unable: item.rows.filter((row) => row.statusKey === "unable").length }))
    .sort((a, b) => b.unable - a.unable || a.label.localeCompare(b.label, "th"));

  element.innerHTML = items.length ? items.map((item) => `
    <button class="unable-breakdown-row" type="button" data-drill-type="${drillType}" data-drill-id="${item.id}">
      <span>${item.label}</span>
      <span class="unable-breakdown-counts"><strong>${item.unable}</strong> ไม่มีสิทธิ์</span>
      <span class="unable-drill-arrow" aria-hidden="true">›</span>
    </button>
  `).join("") : `<div class="unable-breakdown-empty">ไม่มีข้อมูล</div>`;
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
        .filter((room) => room.total > 0)
        .sort((a, b) => a.label.localeCompare(b.label, "th"));
      return { ...grade, rooms };
    })
    .filter((grade) => grade.rooms.length);

  els.gradeRoomBreakdown.innerHTML = grades.length ? grades.map((grade) => `
    <section class="unable-grade-room-group">
      <div class="unable-grade-room-heading">
        <span>${grade.name}</span>
        <strong>${grade.rooms.reduce((sum, room) => sum + room.unable, 0)}</strong>
      </div>
      <div class="unable-room-chip-list">
        ${grade.rooms.map((room) => `
          <button class="unable-room-chip" type="button" data-drill-type="classroom" data-drill-id="${room.id}">
            <span>${room.label}</span>
            <strong>${room.unable}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("") : `<div class="unable-breakdown-empty">ไม่มีข้อมูล</div>`;
}

function setBreakdownTab(tabKey) {
  document.querySelectorAll("[data-breakdown-tab]").forEach((button) => {
    const isActive = button.dataset.breakdownTab === tabKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll("[data-breakdown-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.breakdownPanel !== tabKey);
  });
  document.querySelector(".unable-breakdown-viewport").scrollTop = 0;
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
        <div class="pdf-document-head">
          <div>
            <p>ระบบติดตามสิทธิ์สอบ</p>
            <h3>รายงานผู้ไม่มีสิทธิ์สอบ</h3>
          </div>
          <span>${type === "print" ? "Print" : "PDF"}</span>
        </div>
        <div class="pdf-document-meta">
          <span>${els.detailScope.textContent}</span>
          <span>เกณฑ์เข้าเรียน: ${normalizeThreshold(els.threshold.value)}%</span>
          <span>สถานะ: ${els.status.options[els.status.selectedIndex].text}</span>
        </div>
        <div class="pdf-summary-strip">
          <span>พบทั้งหมด <strong>${state.filteredRows.length}</strong></span>
          <span>ไม่มีสิทธิ์สอบ <strong>${getUniqueStudentCount(state.filteredRows, "unable")}</strong></span>
        </div>
        <table class="pdf-preview-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>รหัส</th>
              <th>ชื่อ-สกุล</th>
              <th>ชั้น/ห้อง</th>
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
                <td class="pdf-name-cell">${row.studentName}</td>
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

  document.querySelector(".unable-overview-grid").addEventListener("click", (event) => {
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
    document.getElementById("unableFilterTitle").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector(".unable-breakdown-tabs").addEventListener("click", (event) => {
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
  renderTableHeader();
  attachEvents();

  const currentYear = getCurrentAcademicYear();
  const currentSemester = getCurrentSemester();
  els.currentAcademicLabel.textContent = `${currentYear.name} / ภาคเรียนที่ ${currentSemester.term}`;
  renderDashboard();
}

init();
})();
