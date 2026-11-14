// One mock data set for the five report pages that use assets/academic-report/.
// Rooms, subjects, teachers and student rosters come from the gradebook's definitions
// (grading/assets/js/data.js, loaded before this file), so a room shows the same students,
// subject codes and teachers here as in scores.html and attendance.html.
// Attendance and scores below are generated for the reports only: they do not read the
// gradebook store (gradebook-demo-v2), so edits made there do not show up in the reports.
(function () {
  const CURRENT = (window.AcademicLayout && window.AcademicLayout.currentTerm) || { year: "2569", term: "1" };
  const CURRENT_YEAR = Number(CURRENT.year);
  const CURRENT_TERM_NO = Number(CURRENT.term);
  const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];
  const WEEKS_PER_TERM = 20;
  const TERM_FIRST_MONDAY = "2026-05-18";

  const LEARNING_AREAS = {
    th: { id: "thai", name: "ภาษาไทย", shortName: "ไทย" },
    ma: { id: "math", name: "คณิตศาสตร์", shortName: "คณิต" },
    sc: { id: "science", name: "วิทยาศาสตร์และเทคโนโลยี", shortName: "วิทย์ฯ" },
    te: { id: "science", name: "วิทยาศาสตร์และเทคโนโลยี", shortName: "วิทย์ฯ" },
    so: { id: "social", name: "สังคมศึกษา ศาสนา และวัฒนธรรม", shortName: "สังคม" },
    hi: { id: "social", name: "สังคมศึกษา ศาสนา และวัฒนธรรม", shortName: "สังคม" },
    pe: { id: "health", name: "สุขศึกษาและพลศึกษา", shortName: "สุขศึกษา" },
    ar: { id: "art", name: "ศิลปะ", shortName: "ศิลปะ" },
    wo: { id: "career", name: "การงานอาชีพ", shortName: "การงาน" }
  };

  const academicYears = YEARS.map((year) => ({
    id: `ay-${year}`,
    name: String(year),
    startDate: `${year - 543}-05-01`,
    endDate: `${year - 542}-03-31`,
    isCurrent: year === CURRENT_YEAR
  }));

  const semesters = YEARS.flatMap((year) => [1, 2].map((term) => ({
    id: `sem-${year}-${term}`,
    academicYearId: `ay-${year}`,
    year,
    term,
    name: `ภาคเรียนที่ ${term}/${year}`,
    startDate: term === 1 ? `${year - 543}-05-01` : `${year - 543}-11-01`,
    endDate: term === 1 ? `${year - 543}-10-31` : `${year - 542}-03-31`,
    isCurrent: year === CURRENT_YEAR && term === CURRENT_TERM_NO
  })));

  const grades = GRADES.map((no) => ({
    id: `grade-m${no}`,
    code: `m${no}`,
    no,
    name: `ม.${no}`,
    fullName: `มัธยมศึกษาปีที่ ${no}`,
    order: no
  }));

  // the gradebook has no study plans for ม.1–ม.3; the reports group rooms by room number
  const plans = [
    { id: "science", name: "วิทยาศาสตร์-คณิตศาสตร์" },
    { id: "language", name: "ภาษา" },
    { id: "general", name: "ทั่วไป" }
  ];

  const roomParts = (roomName) => roomName.replace("ม.", "").split("/").map(Number);

  const classrooms = ROOMS.map((roomName) => {
    const [gradeNo, roomNo] = roomParts(roomName);
    return {
      id: `room-m${gradeNo}-${roomNo}`,
      gradeId: `grade-m${gradeNo}`,
      gradeNo,
      roomNo,
      code: `m${gradeNo}-${roomNo}`,
      name: roomName,
      planId: plans[(roomNo - 1) % plans.length].id
    };
  });

  const teachers = USERS.map((user) => ({ id: user.id, name: user.name, shortName: user.name.split(" ")[0] }));

  const subjects = SUBJECTS.map((subject) => ({
    id: `subject-${subject.slot}`,
    slot: subject.slot,
    prefix: subject.prefix,
    num: subject.num,
    // the real code depends on the grade (ค21101, ค22101, …): see subjectCode()
    code: `${subject.prefix}${subject.num}`,
    name: subject.name,
    shortName: subject.short,
    credit: subject.credit,
    hours: subject.hours,
    fullScore: 100,
    learningArea: LEARNING_AREAS[subject.slot].name,
    subjectGroupId: LEARNING_AREAS[subject.slot].id
  }));

  const subjectGroups = [];
  subjects.forEach((subject) => {
    const area = LEARNING_AREAS[subject.slot];
    let group = subjectGroups.find((item) => item.id === area.id);
    if (!group) {
      group = { id: area.id, name: area.name, shortName: area.shortName, credit: 0, requiredCredits: 0 };
      subjectGroups.push(group);
    }
    group.credit += subject.credit;
    group.requiredCredits += subject.credit * 6; // three years, two terms each
  });

  const gradeNoOf = (gradeId) => (gradeId ? Number(String(gradeId).replace(/\D/g, "")) : null);

  // same rule as the gradebook seed: prefix + 2 + grade + number
  function subjectCode(subject, gradeId) {
    const gradeNo = gradeNoOf(gradeId);
    return gradeNo ? `${subject.prefix}2${gradeNo}${subject.num}` : subject.code;
  }

  function subjectLabel(subject, gradeId) {
    return gradeNoOf(gradeId) ? `${subjectCode(subject, gradeId)} - ${subject.name}` : subject.name;
  }

  /* ---------- timetable: one schedule per room and subject in the current term ---------- */
  const weeklyPeriods = subjects.flatMap((subject) => Array.from({ length: subject.hours / WEEKS_PER_TERM }, () => subject));
  const DAYS_PER_WEEK = 5;
  const gridSize = Math.ceil(weeklyPeriods.length / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const currentSemesterId = `sem-${CURRENT_YEAR}-${CURRENT_TERM_NO}`;

  const schedules = [];
  classrooms.forEach((room, roomIndex) => {
    const byId = new Map();
    weeklyPeriods.forEach((subject, index) => {
      // 7 is coprime with the grid size, so every period of the week lands in its own cell
      const cell = (index * 7 + roomIndex * 3) % gridSize;
      if (!byId.has(subject.id)) {
        const schedule = {
          id: `sch-${room.code}-${subject.slot}`,
          classroomId: room.id,
          subjectId: subject.id,
          subjectCode: subjectCode(subject, room.gradeId),
          teacherId: teacherFor(subject.slot, room.gradeNo, room.roomNo),
          semesterId: currentSemesterId,
          weeklySlots: []
        };
        byId.set(subject.id, schedule);
        schedules.push(schedule);
      }
      byId.get(subject.id).weeklySlots.push({ dayOfWeek: (cell % DAYS_PER_WEEK) + 1, period: Math.floor(cell / DAYS_PER_WEEK) + 1 });
    });
  });

  /* ---------- students: the gradebook's rosters ---------- */
  // Must stay in step with buildSeed() in grading/assets/js/seed.js: same seed, same room order,
  // same first draws, so ids and names match the gradebook.
  const rosterRand = mulberry32(2569);
  const idBase = { 1: 17001, 2: 16401, 3: 15001 };
  const rosters = new Map();
  classrooms.forEach((room) => {
    const count = room.gradeNo === 2 ? [36, 35, 34][room.roomNo - 1] : 32 + Math.floor(rosterRand() * 5);
    rosters.set(room.id, makeStudents(rosterRand, count, idBase[room.gradeNo] + (room.roomNo - 1) * 40));
  });

  // everything below draws from its own generator, so it cannot disturb the rosters
  const rand = mulberry32(25691);

  const STATUS_PROFILES = {
    perfect: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    steady: ["ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    late: ["สาย", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    leave: ["ลากิจ", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ลาป่วย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    activity: ["กิจกรรม", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "กิจกรรม", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    occasionalAbsence: ["ตรงเวลา", "ตรงเวลา", "ขาด", "ตรงเวลา", "ตรงเวลา", "สาย", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    borderlineAbsence: ["ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    highAbsence: ["ขาด", "ตรงเวลา", "ขาด", "ตรงเวลา", "สาย", "ขาด", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา", "ตรงเวลา"],
    severeAbsence: ["ขาด", "ขาด", "ตรงเวลา", "ขาด", "สาย", "ขาด", "ตรงเวลา", "ขาด", "ตรงเวลา", "ตรงเวลา"]
  };
  const EVERYDAY_PROFILES = [["perfect", 0.22], ["steady", 0.36], ["late", 0.12], ["leave", 0.1], ["activity", 0.06], ["occasionalAbsence", 0.14]];
  const RISK_PROFILES = ["borderlineAbsence", "borderlineAbsence", "highAbsence", "highAbsence", "severeAbsence"];
  const STATUS_REMARKS = {
    "ตรงเวลา": "เข้าชั้นเรียนตามเวลา",
    "สาย": "เข้าชั้นเรียนช้ากว่ากำหนด",
    "ขาด": "ไม่พบการเข้าเรียนตามตาราง",
    "ลากิจ": "มีการยื่นใบลา",
    "ลาป่วย": "แจ้งลาป่วยกับครูประจำวิชา",
    "กิจกรรม": "เข้าร่วมกิจกรรมที่ได้รับมอบหมาย"
  };

  function pickEverydayProfile() {
    let roll = rand();
    for (const [name, share] of EVERYDAY_PROFILES) {
      if (roll < share) return name;
      roll -= share;
    }
    return "steady";
  }

  // students the gradebook seed gives low attendance (lowAtt in seed.js), by position in the roster,
  // so the same students fall below the attendance rule in both places
  const SEEDED_LOW_ATTENDANCE = [
    { room: "ม.2/1", slot: "ma", index: 7 },
    { room: "ม.2/2", slot: "ma", index: 15 },
    { room: "ม.3/1", slot: "pe", index: 2 },
    { room: "ม.3/1", slot: "pe", index: 5 },
    { room: "ม.3/1", slot: "pe", index: 9 }
  ];

  const students = [];
  classrooms.forEach((room) => {
    const roster = rosters.get(room.id);
    roster.forEach((source, index) => {
      // about one student in twelve skips class, and only in a few subjects
      const atRisk = rand() < 0.085;
      const riskSubjects = {};
      if (atRisk) {
        const profile = RISK_PROFILES[Math.floor(rand() * RISK_PROFILES.length)];
        const howMany = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < howMany; i += 1) riskSubjects[subjects[Math.floor(rand() * subjects.length)].id] = profile;
      }
      SEEDED_LOW_ATTENDANCE
        .filter((item) => item.room === room.name && item.index === index)
        .forEach((item) => { riskSubjects[`subject-${item.slot}`] = "highAbsence"; });
      students.push({
        id: `student-${source.id}`,
        studentCode: source.id,
        code: source.id,
        prefix: source.prefix,
        firstName: `${source.prefix}${source.first}`,
        lastName: source.last,
        name: `${source.prefix}${source.first} ${source.last}`,
        classroomId: room.id,
        gradeId: room.gradeId,
        planId: room.planId,
        number: source.no,
        ability: source.ability,
        profile: pickEverydayProfile(),
        riskSubjects,
        // one student per room has moved school, so the status filters have something to show
        enrollmentStatus: index === roster.length - 1 ? "transferred" : "active"
      });
    });
  });

  /* ---------- attendance: every period of the current term ---------- */
  function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function buildSessions(weeklySlots) {
    const sessions = [];
    const monday = new Date(`${TERM_FIRST_MONDAY}T00:00:00`);
    for (let week = 0; week < WEEKS_PER_TERM; week += 1) {
      weeklySlots.forEach((slot) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + week * 7 + slot.dayOfWeek - 1);
        sessions.push({ date: formatDate(day), period: slot.period });
      });
    }
    return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
  }

  let attendanceCache = null;
  let attendanceByScheduleCache = null;

  function buildAttendance() {
    const records = [];
    const bySchedule = new Map();
    const studentsByRoom = new Map(classrooms.map((room) => [room.id, []]));
    students.forEach((student) => studentsByRoom.get(student.classroomId).push(student));
    let serial = 1;

    schedules.forEach((schedule, scheduleIndex) => {
      const sessions = buildSessions(schedule.weeklySlots);
      // "scheduleId|date|period" identifies one period; built once here so reports need not rebuild it per record
      sessions.forEach((session) => { session.key = `${schedule.id}|${session.date}|${session.period}`; });
      const scheduleRecords = [];
      studentsByRoom.get(schedule.classroomId).forEach((student) => {
        const pattern = STATUS_PROFILES[student.riskSubjects[schedule.subjectId] || student.profile];
        // shift the pattern per subject so a student is not late in the same week everywhere
        const offset = (scheduleIndex * 3 + student.number) % pattern.length;
        sessions.forEach((session, index) => {
          const status = pattern[(index + offset) % pattern.length];
          const record = {
            id: `att-${serial}`,
            key: session.key,
            scheduleId: schedule.id,
            studentId: student.id,
            date: session.date,
            period: session.period,
            status,
            remark: STATUS_REMARKS[status]
          };
          serial += 1;
          records.push(record);
          scheduleRecords.push(record);
        });
      });
      bySchedule.set(schedule.id, scheduleRecords);
    });

    attendanceCache = records;
    attendanceByScheduleCache = bySchedule;
  }

  /* ---------- scores: one total out of 100 per student, subject and term ---------- */
  const SUBJECT_BIAS = { th: 2, ma: -5, sc: -3, te: 3, so: 1, hi: 0, pe: 7, ar: 6, wo: 5 };
  const scoreRecords = [];
  students.forEach((student) => {
    semesters.forEach((semester) => {
      const isCurrentYear = semester.year === CURRENT_YEAR;
      subjects.forEach((subject) => {
        const base = 28 + student.ability * 62 + SUBJECT_BIAS[subject.slot] + (rand() - 0.5) * 18;
        const score = Math.max(22, Math.min(99, Math.round(base)));
        // only the current year still has marks to come in
        const roll = rand();
        const status = !isCurrentYear ? "complete" : roll < 0.015 ? "missing" : roll < 0.025 && semester.term === 2 ? "pending" : "complete";
        scoreRecords.push({
          academicYearId: semester.academicYearId,
          semesterId: semester.id,
          year: semester.year,
          term: semester.term,
          studentId: student.id,
          subjectId: subject.id,
          score: status === "complete" ? score : null,
          maxScore: subject.fullScore,
          status
        });
      });
    });
  });

  function gradePoint(score) {
    if (!Number.isFinite(score)) return null;
    return Number(GRADE_SCALE.find((item) => score >= item.min).grade);
  }

  window.ReportData = {
    academicYears,
    semesters,
    grades,
    plans,
    classrooms,
    teachers,
    subjects,
    subjectGroups,
    schedules,
    students,
    scoreRecords,
    get attendance() {
      if (!attendanceCache) buildAttendance();
      return attendanceCache;
    },
    attendanceOf(scheduleId) {
      if (!attendanceByScheduleCache) buildAttendance();
      return attendanceByScheduleCache.get(scheduleId) || [];
    },
    currentYear: () => academicYears.find((year) => year.isCurrent),
    currentSemester: () => semesters.find((semester) => semester.isCurrent),
    subjectCode,
    subjectLabel,
    gradePoint,
    minAttendance: MIN_ATTENDANCE,
    // the teacher whose sections the gradebook shows under "รายวิชาของฉัน"
    teacherPersona: { id: TEACHER.id, name: TEACHER.name, title: "ครู · คณิตศาสตร์", initials: "สศ" }
  };
}());
