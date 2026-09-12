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
  "score-subject": "รายงานคะแนนรายวิชา",
  "average-score-year": "รายงานคะแนนเฉลี่ยรายปี",
  "record-report": "รายงานผลการเรียนระเบียนสะสม / GPAX",
  "unable-exam": "รายงานผู้ไม่มีสิทธิ์สอบ",
  grade: "ผลการเรียน",
  behavior: "บันทึกพฤติกรรม",
  schedule: "ตารางเรียน",
  settings: "ตั้งค่าระบบ"
};

const viewModeDetails = {
  report: {
    label: "รายละเอียดรายคาบ",
    summaryTitle: "สรุปผลการเข้าเรียน",
    tableTitle: "รายละเอียดการเข้าเรียนรายคาบ"
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
  tableWrap: document.querySelector(".table-wrap"),
  totalStudents: document.getElementById("totalStudents"),
  presentCount: document.getElementById("presentCount"),
  lateCount: document.getElementById("lateCount"),
  absentCount: document.getElementById("absentCount"),
  leaveCount: document.getElementById("leaveCount"),
  priorityInsightCount: document.getElementById("priorityInsightCount"),
  priorityList: document.getElementById("priorityList"),
  priorityThresholdNote: document.getElementById("priorityThresholdNote"),
  priorityThresholdBtn: document.getElementById("priorityThresholdBtn"),
  tableThresholdBtn: document.getElementById("tableThresholdBtn"),
  attendanceThresholdModal: document.getElementById("attendanceThresholdModal"),
  attendanceThresholdInput: document.getElementById("attendanceThresholdInput"),
  attendanceThresholdCloseBtn: document.getElementById("attendanceThresholdCloseBtn"),
  attendanceThresholdApplyBtn: document.getElementById("attendanceThresholdApplyBtn"),
  presentDesc: document.getElementById("presentDesc"),
  absentDesc: document.getElementById("absentDesc"),
  lateDesc: document.getElementById("lateDesc"),
  leaveDesc: document.getElementById("leaveDesc"),
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
  attendancePdfModal: document.getElementById("attendancePdfModal"),
  attendancePdfScope: document.getElementById("attendancePdfScope"),
  attendancePdfSheet: document.getElementById("attendancePdfSheet"),
  attendancePdfCloseBtn: document.getElementById("attendancePdfCloseBtn"),
  attendancePdfDownloadBtn: document.getElementById("attendancePdfDownloadBtn"),
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
  { key: "presentRate", countKey: "presentPeriods", label: "เข้าเรียน", className: "present" },
  { key: "absentRate", countKey: "absentPeriods", label: "ขาดเรียน", className: "absent" },
  { key: "lateRate", countKey: "lateTimes", label: "มาสาย", className: "late" }
];

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
    { id: "room-m3-1", gradeId: "grade-m3", code: "m3-1", name: "ม.3/1", homeroomTeacherId: "teacher-preecha" },
    { id: "room-m4-1", gradeId: "grade-m4", code: "m4-1", name: "ม.4/1", homeroomTeacherId: "teacher-mali" },
    { id: "room-m5-1", gradeId: "grade-m5", code: "m5-1", name: "ม.5/1", homeroomTeacherId: "teacher-niran" },
    { id: "room-m6-1", gradeId: "grade-m6", code: "m6-1", name: "ม.6/1", homeroomTeacherId: "teacher-anong" }
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
    { id: "schedule-m31-science", classroomId: "room-m3-1", subjectId: "subject-science", teacherId: "teacher-niran", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 5 }, { dayOfWeek: 4, period: 5 }] },
    { id: "schedule-m41-math", classroomId: "room-m4-1", subjectId: "subject-math", teacherId: "teacher-krit", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 3 }, { dayOfWeek: 3, period: 2 }] },
    { id: "schedule-m41-english", classroomId: "room-m4-1", subjectId: "subject-english", teacherId: "teacher-mali", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 5 }, { dayOfWeek: 5, period: 4 }] },
    { id: "schedule-m41-science", classroomId: "room-m4-1", subjectId: "subject-science", teacherId: "teacher-niran", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 4, period: 1 }] },
    { id: "schedule-m51-math", classroomId: "room-m5-1", subjectId: "subject-math", teacherId: "teacher-anong", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 4 }, { dayOfWeek: 4, period: 3 }] },
    { id: "schedule-m51-social", classroomId: "room-m5-1", subjectId: "subject-social", teacherId: "teacher-preecha", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 2 }, { dayOfWeek: 5, period: 1 }] },
    { id: "schedule-m51-science", classroomId: "room-m5-1", subjectId: "subject-science", teacherId: "teacher-niran", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 3, period: 6 }] },
    { id: "schedule-m61-math", classroomId: "room-m6-1", subjectId: "subject-math", teacherId: "teacher-krit", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 2, period: 1 }, { dayOfWeek: 4, period: 4 }] },
    { id: "schedule-m61-english", classroomId: "room-m6-1", subjectId: "subject-english", teacherId: "teacher-mali", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 1, period: 6 }, { dayOfWeek: 5, period: 2 }] },
    { id: "schedule-m61-social", classroomId: "room-m6-1", subjectId: "subject-social", teacherId: "teacher-preecha", semesterId: "sem-2569-1", weeklySlots: [{ dayOfWeek: 3, period: 4 }] }
  ];

  const students = [
    { id: "student-66001", studentCode: "66001", name: "กานต์ธิดา สุขผล", classroomId: "room-m1-1", number: 1, profile: "perfect" },
    { id: "student-66002", studentCode: "66002", name: "ธนกฤต แซ่ตั้ง", classroomId: "room-m1-1", number: 2, profile: "late" },
    { id: "student-66003", studentCode: "66003", name: "ปวีณ์นุช อินทรา", classroomId: "room-m1-1", number: 3, profile: "leave" },
    { id: "student-66004", studentCode: "66004", name: "ภูริณัฐ ขยันดี", classroomId: "room-m1-1", number: 4, profile: "highAbsence" },
    { id: "student-66009", studentCode: "66009", name: "วรัญญา พรประเสริฐ", classroomId: "room-m1-1", number: 5, profile: "occasionalAbsence" },
    { id: "student-66010", studentCode: "66010", name: "ชนนท์ มีสุข", classroomId: "room-m1-1", number: 6, profile: "severeAbsence" },
    { id: "student-66011", studentCode: "66011", name: "พิมพ์ชนก แสงแก้ว", classroomId: "room-m1-1", number: 7, profile: "mixedRisk" },
    { id: "student-66012", studentCode: "66012", name: "ศิรวิชญ์ คำดี", classroomId: "room-m1-1", number: 8, profile: "sickLeave" },
    { id: "student-66013", studentCode: "66013", name: "ณัฐณิชา วัฒนะ", classroomId: "room-m1-1", number: 9, profile: "activity" },
    { id: "student-66014", studentCode: "66014", name: "ธีรภัทร บุญช่วย", classroomId: "room-m1-1", number: 10, profile: "steady" },
    { id: "student-66015", studentCode: "66015", name: "อชิรญา รุ่งเรือง", classroomId: "room-m1-1", number: 11, profile: "personalLeave" },
    { id: "student-66016", studentCode: "66016", name: "ปุณณภพ เกียรติไพบูลย์", classroomId: "room-m1-1", number: 12, profile: "borderlineAbsence" },
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
    { id: "student-64004", studentCode: "64004", name: "กิตติพงษ์ สุขสำราญ", classroomId: "room-m3-1", number: 4, profile: "late" },
    { id: "student-63001", studentCode: "63001", name: "ภัทรพล ตั้งมั่น", classroomId: "room-m4-1", number: 1, profile: "steady" },
    { id: "student-63002", studentCode: "63002", name: "ณิชาภา แสงทอง", classroomId: "room-m4-1", number: 2, profile: "occasionalAbsence" },
    { id: "student-63003", studentCode: "63003", name: "ชยุตม์ วัฒนชัย", classroomId: "room-m4-1", number: 3, profile: "late" },
    { id: "student-63004", studentCode: "63004", name: "อริสรา พงษ์ดี", classroomId: "room-m4-1", number: 4, profile: "personalLeave" },
    { id: "student-62001", studentCode: "62001", name: "กฤติน ภูวดล", classroomId: "room-m5-1", number: 1, profile: "borderlineAbsence" },
    { id: "student-62002", studentCode: "62002", name: "ปาณิศา จันทร์สุข", classroomId: "room-m5-1", number: 2, profile: "steady" },
    { id: "student-62003", studentCode: "62003", name: "ธันวา ศรีนวล", classroomId: "room-m5-1", number: 3, profile: "highAbsence" },
    { id: "student-62004", studentCode: "62004", name: "สิรินทรา ธรรมวงศ์", classroomId: "room-m5-1", number: 4, profile: "sickLeave" },
    { id: "student-61001", studentCode: "61001", name: "นภัสกร อินทรา", classroomId: "room-m6-1", number: 1, profile: "mixedRisk" },
    { id: "student-61002", studentCode: "61002", name: "ภคินี สุขใจ", classroomId: "room-m6-1", number: 2, profile: "activity" },
    { id: "student-61003", studentCode: "61003", name: "ธนภัทร เกียรติไพบูลย์", classroomId: "room-m6-1", number: 3, profile: "severeAbsence" },
    { id: "student-61004", studentCode: "61004", name: "กัญญาณัฐ บุญมาก", classroomId: "room-m6-1", number: 4, profile: "leave" }
  ];

  const statusProfiles = {
    perfect: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    steady: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    late: ["สาย", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา"],
    absence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา"],
    leave: ["ลากิจ", "ตรงเวลา", "ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ลากิจ", "ตรงเวลา", "ตรงเวลา"],
    activity: ["กิจกรรม", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา"],
    occasionalAbsence: ["ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    borderlineAbsence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    highAbsence: ["ขาด", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    severeAbsence: ["ขาด", "ขาด", "ตรงเวลา", "ขาด", "สาย", "ขาด", "ตรงเวลา", "ขาด", "ตรงเวลา", "ตรงเวลา"],
    mixedRisk: ["ขาด", "สาย", "ลากิจ", "ขาด", "ตรงเวลา", "ลาป่วย", "ขาด", "สาย", "ตรงเวลา", "ตรงเวลา"],
    sickLeave: ["ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ลาป่วย", "สาย", "ตรงเวลา", "ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    personalLeave: ["ลากิจ", "ตรงเวลา", "ลากิจ", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ลากิจ", "ตรงเวลา", "ตรงเวลา"]
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
    const sessions = [5, 6, 7, 8, 9, 10].flatMap((month) => buildScheduleSessions(schedule.weeklySlots, 2026, month));

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
  const todayText = formatDateInput(today);
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
  const currentSemester = getCurrentSemester();
  const fallback = semesters[0] ? semesters[0].id : "";
  els.semesterTerm.value = semesters.some((semester) => semester.id === currentSemester.id) ? currentSemester.id : fallback;
}

function populateGradeOptions() {
  const grades = state.db.grades
    .slice()
    .sort((a, b) => a.order - b.order);
  const options = grades
    .map((grade) => `<option value="${grade.id}">${grade.name}</option>`)
    .join("");
  els.classLevel.innerHTML = `<option value="all">ทุกระดับชั้น</option>${options}`;
  els.classLevel.value = grades[0]?.id || "all";
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

  const fallback = els.classLevel.value === "all" ? "all" : classrooms[0]?.id || "all";
  const nextValue = classrooms.some((classroom) => classroom.id === previous) ? previous : fallback;
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
  const currentSemester = getCurrentSemester();
  els.searchType.value = "semester";
  populateAcademicYears();
  els.semesterYear.value = currentSemester.academicYearId;
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

function getThaiWeekday(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("th-TH", { weekday: "short" });
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
  els.presentCount.textContent = `${summary.presentStudents} คน`;
  els.absentCount.textContent = `${summary.absentStudents} คน`;
  els.lateCount.textContent = `${summary.lateStudents} คน`;
  els.leaveCount.textContent = `${summary.leaveStudents} คน`;
  els.presentDesc.textContent = `${summary.presentPeriods} คาบ`;
  els.absentDesc.textContent = `${summary.absentPeriods} คาบ`;
  els.lateDesc.textContent = `${summary.lateTimes} ครั้ง`;
  els.leaveDesc.textContent = `ลากิจ ${summary.personalLeave} · ลาป่วย ${summary.sickLeave}`;
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

function buildTrendDataset(students) {
  if (state.trendDrilldown) return buildDailyTrendDataset(students, state.trendDrilldown);
  if (els.searchType.value === "semester") return buildSemesterTrendDataset(students);
  if (els.searchType.value === "monthly") return buildMonthlyTrendDataset(students);
  return buildDateRangeTrendDataset(students);
}

function buildDateRangeTrendDataset(students) {
  const dates = [...new Set(state.visibleSessions.map((session) => session.date))]
    .sort((a, b) => a.localeCompare(b));

  return dates.map((date) => {
    const sessions = state.visibleSessions.filter((session) => session.date === date);
    return buildTrendPointFromSessions(formatThaiShortDate(date), sessions, students, {
      dateStart: date,
      dateEnd: date
    });
  });
}

function buildMonthlyTrendDataset(students) {
  const points = [1, 2, 3, 4, 5].map((weekNumber) => {
    const sessions = state.visibleSessions.filter((session) => getWeekOfMonth(session.date) === weekNumber);
    return buildTrendPointFromSessions(`สัปดาห์ที่ ${weekNumber}`, sessions, students, {
      drilldownLabel: `สัปดาห์ที่ ${weekNumber}`
    });
  });
  return points.filter((point) => point.sessionCount > 0);
}

function buildSemesterTrendDataset(students) {
  const semester = state.maps.semesters.get(els.semesterTerm.value) || getCurrentSemester();
  const academicYear = state.maps.academicYears.get(semester.academicYearId);
  const gregorianYear = Number(academicYear.name) - 543;
  const startMonth = Number(semester.startDate.slice(5, 7));
  const endMonth = Number(semester.endDate.slice(5, 7));
  const months = [];
  for (let month = startMonth; month <= endMonth; month += 1) {
    months.push(month);
  }

  const points = months.map((month) => {
    const monthText = new Date(gregorianYear, month - 1, 1).toLocaleDateString("th-TH", { month: "long" });
    const monthKey = String(month).padStart(2, "0");
    const sessions = state.visibleSessions.filter((session) => session.date.slice(5, 7) === monthKey);
    return buildTrendPointFromSessions(monthText, sessions, students, {
      drilldownLabel: monthText
    });
  });
  return points.filter((point) => point.sessionCount > 0);
}

function buildDailyTrendDataset(students, drilldown) {
  const sessions = state.visibleSessions.filter((session) => {
    return session.date >= drilldown.dateStart && session.date <= drilldown.dateEnd;
  });
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

function getWeekOfMonth(dateString) {
  const day = Number(dateString.slice(8, 10));
  return Math.min(Math.ceil(day / 7), 5);
}

function getSessionDateRange(sessions) {
  const dates = sessions.map((session) => session.date).sort((a, b) => a.localeCompare(b));
  return {
    dateStart: dates[0] || "",
    dateEnd: dates[dates.length - 1] || ""
  };
}

function getRecordsForSessions(students, sessions) {
  const sessionKeys = new Set(sessions.map((session) => session.key));
  return students.flatMap((student) => student.studentRecords.filter((record) => {
    const key = `${record.scheduleId}|${record.date}|${record.period}`;
    return sessionKeys.has(key);
  }));
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
  if (els.subject.value === "subject-math") return "คณิตศาสตร์พื้นฐาน";
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

function renderAttendanceTrend(points) {
  hideTrendTooltip();
  syncTrendDrilldownControls();

  if (!points.length) {
    els.attendanceTrendChart.innerHTML = `<text class="trend-axis-label" x="360" y="152" text-anchor="middle">ไม่มีข้อมูลคาบเรียนในเงื่อนไขที่เลือก</text>`;
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

  els.trendAverage.textContent = `${formatRate(presentAverage)}%`;
  els.trendMax.textContent = `${formatRate(absentAverage)}%`;
  els.trendMin.textContent = `${formatRate(lateAverage)}%`;

  const width = Math.max(720, Math.round(els.attendanceTrendChart.clientWidth || 720));
  const height = 300;
  const padding = { top: 24, right: 28, bottom: 58, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const yForRate = (rate) => padding.top + chartHeight - ((rate / 100) * chartHeight);
  const pointCoords = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length > 1 ? index * xStep : chartWidth / 2),
    series: trendSeries.reduce((seriesData, series) => {
      seriesData[series.key] = {
        ...series,
        value: point[series.key],
        count: point[series.countKey],
        y: yForRate(point[series.key])
      };
      return seriesData;
    }, {})
  }));
  pointCoords.forEach((point) => {
    point.y = Math.min(...trendSeries.map((series) => point.series[series.key].y));
  });
  const buildPath = (series) => pointCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.series[series.key].y.toFixed(2)}`)
    .join(" ");
  const yTicks = [0, 25, 50, 75, 100];

  els.attendanceTrendChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.attendanceTrendChart.innerHTML = `
    ${yTicks.map((tick) => {
      const y = yForRate(tick);
      return `
        <line class="trend-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
        <text class="trend-axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${tick}%</text>
      `;
    }).join("")}
    <g class="trend-legend" transform="translate(${padding.left}, 16)">
      ${trendSeries.map((series, index) => `
        <g transform="translate(${index * 104}, 0)">
          <line class="trend-line-swatch trend-line-${series.className}" x1="0" y1="0" x2="18" y2="0"></line>
          <text class="trend-axis-label" x="25" y="4">${series.label}</text>
        </g>
      `).join("")}
    </g>
    ${trendSeries.map((series) => `<path class="trend-line trend-line-${series.className}" d="${buildPath(series)}"></path>`).join("")}
    ${pointCoords.map((point, index) => `
      <g class="trend-point-group ${point.isDrillable ? "is-drillable" : ""}" data-index="${index}" ${point.isDrillable ? `tabindex="0" role="button" aria-label="ดูรายวัน ${point.drilldownLabel}"` : ""}>
        <rect class="trend-hit-area" x="${point.x - Math.max(xStep / 2, 24)}" y="${padding.top}" width="${Math.max(xStep, 48)}" height="${chartHeight}"></rect>
        ${trendSeries.map((series) => `
          <circle class="trend-point trend-point-${series.className}" cx="${point.x}" cy="${point.series[series.key].y}" r="5"></circle>
        `).join("")}
        <text class="trend-axis-label trend-x-label" x="${point.x}" y="${height - 16}" text-anchor="middle">${point.label}</text>
      </g>
    `).join("")}
  `;

  els.attendanceTrendChart.querySelectorAll(".trend-point-group").forEach((node) => {
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
    : "แนวโน้มเข้าเรียน";
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
    els.priorityList.innerHTML = `<div class="priority-empty">ไม่พบนักเรียนกลุ่มเสี่ยง</div>`;
    return;
  }

  els.priorityList.innerHTML = priorityStudents.map((student) => {
    return `
      <a class="priority-item priority-item-link" href="#attendance-student-${student.id}" data-student-id="${student.id}">
        <div class="priority-student">
          <strong>${student.name}</strong>
          <span>${student.classroomName} · เลขที่ ${student.number}</span>
        </div>
        <div class="priority-metrics" aria-label="ข้อมูลการเข้าเรียนของ ${student.name}">
          <span class="priority-metric priority-metric-rate"><small>ขาด</small><strong>${student.absentPeriods}/${student.absenceLimit} คาบ</strong></span>
          <span class="priority-metric"><small>ทั้งหมด</small><strong>${student.totalPeriods} คาบ</strong></span>
          <span class="priority-metric"><small>เริ่มเสี่ยง</small><strong>${student.riskThreshold} คาบ</strong></span>
        </div>
        <span class="priority-link-label">ดูในตาราง <span aria-hidden="true">→</span></span>
      </a>
    `;
  }).join("");
}

function jumpToAttendanceStudent(event) {
  const link = event.target.closest(".priority-item-link");
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
      <th class="sticky-col sticky-col-id sticky-top">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-name sticky-top">ชื่อ-สกุล</th>
      <th class="sticky-top">ห้อง</th>
      <th class="sticky-top">วิชาที่พบ</th>
      <th class="sticky-top">วันที่/คาบล่าสุด</th>
      <th class="sticky-top">สถานะล่าสุด</th>
      <th class="sticky-top">มาเรียน</th>
      <th class="sticky-top">สาย</th>
      <th class="sticky-top">ขาด</th>
      <th class="sticky-top">ลา/อื่นๆ</th>
      <th class="sticky-top">% ขาดเรียน</th>
    </tr>
  `;
}

function renderReportHeader() {
  const sessionHeaders = state.visibleSessions.map((session, index) => `
    <th class="sticky-top matrix-date-head report-session-date" data-col-key="session-${index}">
      <div class="session-head">
        <strong>${formatThaiShortDate(session.date)}</strong>
        <span>${getThaiWeekday(session.date)}</span>
      </div>
    </th>
  `).join("");
  const sessionDetailHeaders = state.visibleSessions.map((session, index) => `
    <th class="sticky-top sticky-top-second matrix-date-head report-session-detail" data-col-key="session-${index}" title="${session.subjectCode} ${session.subjectName} / ${session.teacherName}">
      <div class="session-head session-head-compact">
        <strong>คาบ ${session.period}</strong>
        <span>${session.subjectCode}</span>
      </div>
    </th>
  `).join("");

  els.attendanceThead.innerHTML = `
    <tr>
      <th class="sticky-col sticky-col-id sticky-top report-rowspan-head" rowspan="2">รหัสนักเรียน</th>
      <th class="sticky-col sticky-col-name sticky-top report-rowspan-head" rowspan="2">ชื่อ-สกุล</th>
      <th class="sticky-top report-rowspan-head report-room-head" rowspan="2">ห้อง</th>
      ${sessionHeaders}
      <th class="sticky-top sticky-summary sticky-summary-present report-rowspan-head" rowspan="2">มา</th>
      <th class="sticky-top sticky-summary sticky-summary-late report-rowspan-head" rowspan="2">สาย</th>
      <th class="sticky-top sticky-summary sticky-summary-absent report-rowspan-head" rowspan="2">ขาด</th>
      <th class="sticky-top sticky-summary sticky-summary-leave report-rowspan-head" rowspan="2">ลา</th>
      <th class="sticky-top sticky-summary sticky-summary-rate report-rowspan-head" rowspan="2">% ขาดเรียน</th>
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
        <div class="empty-state">${message}</div>
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

function getAbsenceRateChipClass(student) {
  if (student.examBlocked) return "rate-chip-danger";
  if (student.needsAttention) return "rate-chip-alert";
  return "";
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
    const rateChipClass = getAbsenceRateChipClass(student);
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
      <tr id="attendance-student-${student.id}" class="attendance-student-row">
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
        <td class="${highlights.late ? "attendance-cell-highlight-late" : ""}">${student.counts.late}</td>
        <td class="${highlights.absent ? "attendance-cell-highlight-absent" : ""}">${student.counts.absent}</td>
        <td class="${highlights.leave ? "attendance-cell-highlight-leave" : ""}">${student.counts.leave}</td>
        <td><span class="rate-chip ${rateChipClass}">${student.absentRate}%</span></td>
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

  els.attendanceTbody.innerHTML = tableStudents.map((student) => {
    const highlights = getStudentAttendanceHighlights(student);
    const rateChipClass = getAbsenceRateChipClass(student);
    const sessionCells = state.visibleSessions.map((session, index) => {
      const record = student.sessionStatusMap.get(session.key);
      const isApplicable = session.classroomId === student.classroomId;
      const status = record ? record.status : "-";
      const displayTitle = record
        ? `${formatThaiShortDate(record.date)} คาบ ${record.period}: ${record.status}`
        : isApplicable
          ? `${formatThaiShortDate(session.date)} คาบ ${session.period}: ยังไม่มีข้อมูล`
          : "ไม่มีคาบเรียนของห้องนี้";

      if (state.bulkEditMode && record) {
        return `
          <td class="matrix-cell matrix-cell-edit" data-col-key="session-${index}">
            <select class="status-select matrix-status-select" data-record-id="${record.id}" aria-label="เปลี่ยนสถานะ ${student.name} ${formatThaiShortDate(session.date)} คาบ ${session.period}">
              ${attendanceOptions.map((option) => `<option value="${option}" ${option === status ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </td>
        `;
      }

      const tone = getStatusTone(status);
      const highlightClass = tone === "late"
        ? "attendance-cell-highlight-late"
        : tone === "leave"
          ? "attendance-cell-highlight-leave"
          : tone === "absent" && highlights.absent ? "attendance-cell-highlight-absent" : "";

      return `
        <td class="matrix-cell ${isApplicable ? "" : "matrix-cell-muted"} ${highlightClass}" data-col-key="session-${index}">
          <span class="status-dot status-dot-${getStatusTone(status)}" title="${displayTitle}" aria-label="${displayTitle}">${getStatusAbbr(status)}</span>
        </td>
      `;
    }).join("");

    return `
      <tr id="attendance-student-${student.id}" class="attendance-student-row">
        <td class="sticky-col sticky-col-id">${student.studentCode}</td>
        <td class="sticky-col sticky-col-name">
          <div class="student-cell">
            <strong>${student.name}</strong>
            <span>${student.classroomName}</span>
          </div>
        </td>
        <td>${student.classroomName}</td>
        ${sessionCells}
        <td class="report-summary-cell sticky-summary-present">${student.counts.present}</td>
        <td class="report-summary-cell sticky-summary-late ${highlights.late ? "attendance-cell-highlight-late" : ""}">${student.counts.late}</td>
        <td class="report-summary-cell sticky-summary-absent ${highlights.absent ? "attendance-cell-highlight-absent" : ""}">${student.counts.absent}</td>
        <td class="report-summary-cell sticky-summary-leave ${highlights.leave ? "attendance-cell-highlight-leave" : ""}">${student.counts.leave}</td>
        <td class="report-summary-cell sticky-summary-rate"><span class="rate-chip ${rateChipClass}">${student.absentRate}%</span></td>
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
        <th class="sticky-top">ไม่พบคาบเรียนจริงในช่วงเวลาที่เลือก</th>
      </tr>
    `;
    renderEmptyState("ช่วงเวลานี้ยังไม่มีคาบเรียนของห้องและวิชาที่เลือก", 1);
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
  els.bulkEditBtn.classList.toggle("is-active", state.bulkEditMode);
}

function searchData() {
  const result = buildSearchResult();
  state.visibleSessions = result.sessions;
  state.visibleStudents = result.students;
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
    const selects = els.attendanceTbody.querySelectorAll("select.matrix-status-select");
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
        return `<td><span class="pdf-status pdf-status-${getStatusTone(status)}">${getStatusAbbr(status)}</span></td>`;
      }).join("");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.studentCode}</td>
          <td class="pdf-name-cell">${student.name}</td>
          <td>${student.classroomName}</td>
          ${cells}
          <td>${student.absentRate}%</td>
        </tr>
      `;
    }).join("");

    return `
      <table class="pdf-preview-table pdf-preview-table-report">
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
      </table>
    `;
  }

  const rows = previewStudents.map((student, index) => {
    const latestStatus = student.latestRecord ? student.latestRecord.status : "-";
    const latestLabel = student.latestRecord ? `${formatThaiShortDate(student.latestRecord.date)} / คาบ ${student.latestRecord.period}` : "-";
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${student.studentCode}</td>
        <td class="pdf-name-cell">${student.name}</td>
        <td>${student.classroomName}</td>
        <td>${latestLabel}</td>
        <td><span class="pdf-status pdf-status-${getStatusTone(latestStatus)}">${latestStatus}</span></td>
        <td>${student.absentRate}%</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="pdf-preview-table">
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
    <div class="pdf-document-head">
      <div>
        <p>ระบบรายงานการเข้าเรียน</p>
        <h3>รายงานการเข้าเรียนของนักเรียน</h3>
      </div>
      <span>${modeLabel}</span>
    </div>
    <div class="pdf-document-meta">
      <span>ช่วงข้อมูล: ${state.currentScopeText}</span>
      <span>คาบเรียนจริง: ${state.visibleSessions.length} คาบ</span>
      <span>นักเรียน: ${state.visibleStudents.length} คน</span>
    </div>
    <div class="pdf-summary-strip">
      <span>นักเรียนทั้งหมด <strong>${els.totalStudents.textContent}</strong></span>
      <span>มาเรียน <strong>${els.presentCount.textContent}</strong></span>
      <span>ขาดเรียน <strong>${els.absentCount.textContent}</strong></span>
      <span>มาสาย <strong>${els.lateCount.textContent}</strong></span>
      <span>การลา <strong>${els.leaveCount.textContent}</strong></span>
    </div>
    ${buildPdfPreviewRows()}
    <p class="pdf-preview-note">ตัวอย่างนี้แสดงบางรายการเพื่อดูรูปแบบตารางก่อนดาวน์โหลดจริง</p>
    `
  });
}

function openReportPreviewModal(options) {
  const {
    title,
    scope,
    sheetHtml,
    confirmText = "ดำเนินการ",
    mockMessage = "Mockup: ยังไม่เชื่อมต่อการทำงานจริง"
  } = options;
  document.getElementById("attendancePdfTitle").textContent = title;
  els.attendancePdfScope.textContent = scope;
  els.attendancePdfSheet.innerHTML = sheetHtml;
  els.attendancePdfDownloadBtn.textContent = confirmText;
  els.attendancePdfDownloadBtn.dataset.mockMessage = mockMessage;
  els.attendancePdfModal.hidden = false;
  document.body.classList.add("modal-open");
  els.attendancePdfCloseBtn.focus();
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

function closeAttendancePdfPreview() {
  els.attendancePdfModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function mockPdfDownload() {
  const message = els.attendancePdfDownloadBtn.dataset.mockMessage || "Mockup: ขั้นตอนดาวน์โหลด PDF จะถูกเชื่อมต่อภายหลัง";
  closeAttendancePdfPreview();
  setToast(message, "info");
}

window.openReportPreviewModal = openReportPreviewModal;

function setActiveModule(system) {
  state.activeModule = system;
  els.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.system === system);
  });
  els.activeModuleLabel.textContent = moduleLabels[system] || system;
  const targetPage = ["attendance", "score-subject", "average-score-year", "record-report", "unable-exam"].includes(system) ? system : "placeholder";
  els.appPages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === targetPage);
  });

  if (targetPage === "placeholder") {
    els.placeholderPageTitle.textContent = moduleLabels[system] || "โมดูลอื่น";
    els.placeholderPageSubtitle.textContent = `หน้าสำหรับ ${moduleLabels[system] || system} ยังไม่ได้ถูกออกแบบใน prototype นี้`;
    els.placeholderModuleTitle.textContent = `${moduleLabels[system] || system} ยังไม่พร้อมใช้งาน`;
    els.placeholderModuleText.textContent = "ตอนนี้มีหน้ารายงานการเข้าเรียน รายงานคะแนนรายวิชา รายงานคะแนนเฉลี่ยรายปี รายงานผลการเรียนระเบียนสะสม / GPAX และรายงานผู้ไม่มีสิทธิ์สอบที่ใช้งานได้ภายใน sidebar เดียวกัน";
  }
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
  els.classLevel.addEventListener("change", () => {
    clearTrendDrilldown();
    syncRoomOptions();
    syncSubjectOptions();
    refreshAttendanceResults();
  });

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
  els.attendancePdfDownloadBtn.addEventListener("click", mockPdfDownload);
  els.attendancePdfModal.querySelectorAll("[data-pdf-close]").forEach((node) => {
    node.addEventListener("click", closeAttendancePdfPreview);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.attendanceThresholdModal.hidden) {
      closeAttendanceThresholdSettings();
    } else if (!els.attendancePdfModal.hidden) {
      closeAttendancePdfPreview();
    }
  });

  els.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveModule(item.dataset.system);
      if (!["attendance", "score-subject", "average-score-year", "record-report", "unable-exam"].includes(item.dataset.system)) {
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
