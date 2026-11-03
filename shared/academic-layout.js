(function () {
  // Pages live in feature folders; links are written as bare file names and resolved here,
  // relative to this script, so they work from any folder (and over file://).
  const ROOT = new URL('../', document.currentScript.src).href;
  const PAGE_DIRS = {
    curriculum: ['curriculum-management.html', 'curriculum-structure.html', 'course-management.html'],
    timetable: ['timetable.html', 'timetable-approvals.html', 'my-timetable.html', 'teacher-profile.html'],
    reports: ['overview.html', 'student-retake-management.html', 'student-retake-detail.html', 'subject-retake-detail.html',
      'fail-student-detail.html', 'student-score-ranking.html', 'student-score-ranking-detail.html', 'subject-results.html',
      'student-results-detail.html', 'student-list-by-classroom.html', 'academic-report.html', 'teacher-attendance.html'],
    grading: ['scores.html', 'attendance.html']
  };
  function pageUrl(link) {
    const file = (link || '').split(/[#?]/)[0];
    // only the file part decides: hash routes like "scores.html#/a" still need their folder
    if (!file || file.includes('/')) return link || '#';
    const dir = Object.keys(PAGE_DIRS).find((d) => PAGE_DIRS[d].includes(file));
    return dir ? `${ROOT}${dir}/${link}` : link;
  }

  const curriculumMenuItems = [
    {
      key: 'curriculum-management',
      href: 'curriculum-management.html',
      label: 'จัดการหลักสูตร',
      icon: '<path d="M5 3h9.59L19 7.41V21H5V3Zm2 2v14h10V8h-4V5H7Zm2 6h6v2H9v-2Zm0 4h6v2H9v-2Z"/>'
    },
    {
      key: 'curriculum-structure',
      href: 'curriculum-structure.html',
      label: 'โครงสร้างหลักสูตร',
      icon: '<path d="M4 4h16v4H4V4Zm0 6h7v10H4V10Zm9 0h7v4h-7v-4Zm0 6h7v4h-7v-4Z"/>'
    },
    {
      key: 'course-management',
      href: 'course-management.html',
      label: 'จัดการรายวิชา',
      icon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h4.1c.53 0 1.04.21 1.41.59l1.3 1.3c.19.19.44.29.71.29h3.47A2.5 2.5 0 0 1 20 7.68v10.82a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"/>'
    }
  ];

  const scheduleMenuItems = [
    {
      key: 'timetable',
      href: 'timetable.html',
      label: 'ตารางสอน',
      icon: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM8 12h3v3H8v-3Zm5 0h3v3h-3v-3Z"/>'
    },
    {
      key: 'timetable-approvals',
      href: 'timetable-approvals.html',
      label: 'คำขออนุมัติ',
      badge: 'approvals',
      icon: '<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z"/>'
    }
  ];

  const teacherMenuItems = [
    {
      key: 'my-timetable',
      href: 'my-timetable.html',
      label: 'ตารางสอนของฉัน',
      icon: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM8 12h3v3H8v-3Zm5 0h3v3h-3v-3Z"/>'
    },
    {
      key: 'teacher-profile',
      href: 'teacher-profile.html',
      label: 'โปรไฟล์และเวลาไม่ว่าง',
      icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5Z"/>'
    },
    {
      key: 'teacher-attendance',
      href: 'teacher-attendance.html',
      label: 'รายงานการเข้าเรียน',
      icon: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm-7.5 8L7 14.5l1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z"/>'
    }
  ];

  /* ---------- mock role + shared timetable store (see timetable-core.js) ---------- */
  const PERSONAS = {
    admin: { name: 'อ.สุนิสา ปัญญาดี', title: 'งานวิชาการ (admin)', initials: 'SP', home: 'timetable.html', notifyTo: 'admin' },
    teacher: { name: 'อ.อนุชา แสงทอง', title: 'ครู · คณิตศาสตร์', initials: 'AS', home: 'my-timetable.html', notifyTo: 't05' }
  };
  // every localStorage key that holds demo data, cleared by the sidebar's reset button
  const DEMO_STORES = ['tt-store-v1', 'gradebook-demo-v2'];
  function currentRole() { try { return localStorage.getItem('tt-role') === 'teacher' ? 'teacher' : 'admin'; } catch (e) { return 'admin'; } }
  // pages whose mock data belongs to another user pass { persona } to mount(); notifications stay per role
  function persona() { return (lastOptions.persona && lastOptions.persona[currentRole()]) || PERSONAS[currentRole()]; }
  function readStore() { try { return JSON.parse(localStorage.getItem('tt-store-v1') || 'null'); } catch (e) { return null; } }
  function writeStore(store) { try { localStorage.setItem('tt-store-v1', JSON.stringify(store)); } catch (e) { /* ignore */ } }
  function badgeCount(kind) {
    const store = readStore();
    if (!store || kind !== 'approvals') return 0;
    return store.requests.filter((r) => r.status === 'pending').length + store.unavailability.filter((u) => u.status === 'pending').length;
  }

  const reportMenuItems = [
    {
      key: 'overview',
      href: 'overview.html',
      label: 'ภาพรวม',
      icon: '<path d="M4 6h7v7H4V6Zm9 0h7v4h-7V6ZM4 15h7v3H4v-3Zm9-3h7v6h-7v-6Z"/>'
    },
    {
      key: 'retake',
      href: 'student-retake-management.html',
      label: 'รายงานผลการสอบซ่อม',
      icon: '<path d="M4 5h16v3H4V5Zm0 5h10v3H4v-3Zm0 5h16v4H4v-4Z"/>'
    },
    {
      key: 'fail-student',
      href: 'fail-student-detail.html',
      label: 'รายงานนักเรียนต้องปรับปรุง',
      icon: '<path d="M7 4h10l2 4v12H5V8l2-4Zm1.5 2L7.7 8h8.6l-.8-2H8.5ZM8 11h8v2H8v-2Zm0 4h6v2H8v-2Z"/>'
    },
    
    {
      key: 'ranking',
      href: 'student-score-ranking.html',
      label: 'รายงานจัดอันดับคะแนนรายวิชา',
      icon: '<path d="M6 4h12v16H6V4Zm2 2v12h8V6H8Zm1 2h6v2H9V8Zm0 4h6v2H9v-2Z"/>'
    },
    {
      key: 'student-results',
      href: 'subject-results.html',
      label: 'รายงานสรุปผลการเรียนรู้',
      icon: '<path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v1H9v-1Z"/>'
    },
    {
      key: 'ar-attendance',
      href: 'academic-report.html#attendance',
      label: 'รายงานการเข้าเรียน',
      icon: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm-7.5 8L7 14.5l1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z"/>'
    },
    {
      key: 'ar-unable-exam',
      href: 'academic-report.html#unable-exam',
      label: 'รายงานผู้ไม่มีสิทธิ์สอบ',
      icon: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 6.32 12.9L7.1 5.68A7.96 7.96 0 0 1 12 4Zm-6.32 3.1L16.9 18.32A8 8 0 0 1 5.68 7.1Z"/>'
    },
    {
      key: 'ar-score-subject',
      href: 'academic-report.html#score-subject',
      label: 'รายงานคะแนนรายวิชา',
      icon: '<path d="M4 4h16v16H4V4Zm2 2v12h12V6H6Zm2 8h2v3H8v-3Zm3-4h2v7h-2v-7Zm3 2h2v5h-2v-5Z"/>'
    },
    {
      key: 'ar-average-score-year',
      href: 'academic-report.html#average-score-year',
      label: 'รายงานคะแนนเฉลี่ยรายปี',
      icon: '<path d="M3 19h18v2H3v-2Zm2-2 4.5-6 3.5 3 4.5-7L21 11v3l-3.5-3.2-4.5 7-3.5-3L6 18H5v-1Z"/>'
    },
    {
      key: 'ar-record-report',
      href: 'academic-report.html#record-report',
      label: 'รายงานระเบียนสะสม / GPAX',
      icon: '<path d="M6 2h9l5 5v15H6V2Zm2 2v16h10V8h-4V4H8Zm2 8h6v2h-6v-2Zm0 4h6v2h-6v-2Z"/>'
    }
  ];

  function ensureStyles() {
    if (document.getElementById('academicLayoutStyles')) return;
    const style = document.createElement('style');
    style.id = 'academicLayoutStyles';
    style.textContent = `
      .menu-group + .menu-group { margin-top:.75rem; border-top:1px solid #e2e8f0; padding-top:.75rem; }
      .menu-group-items { position:relative; margin:.25rem 0 .25rem 1.375rem; border-left:1px solid #e2e8f0; padding-left:.5rem; }
      .menu-group-items > * + * { margin-top:.125rem; }
      .menu-link { position:relative; display:flex; align-items:center; gap:.625rem; border-radius:.75rem; padding:.55rem .75rem; font-size:.9375rem; font-weight:500; color:#64748b; text-decoration:none; transition:background-color .15s ease,color .15s ease; }
      .menu-link:hover { background:#f1f5f9; color:#0f172a; }
      .menu-link.active { background:#eff6ff; color:#1d4ed8; font-weight:600; }
      /* the active page also marks the group's tree line */
      .menu-link.active::before { content:''; position:absolute; left:calc(-.5rem - 2px); top:.375rem; bottom:.375rem; width:3px; border-radius:9999px; background:#2563eb; }
      .menu-icon { height:1rem; width:1rem; flex-shrink:0; fill:currentColor; }
      .report-menu-toggle { display:flex; width:100%; align-items:center; justify-content:space-between; gap:.75rem; border-radius:.75rem; padding:.5rem .75rem; color:#0f172a; text-align:left; transition:background-color .15s ease,color .15s ease; }
      .report-menu-toggle:hover { background:#f8fafc; color:#2563eb; }
      .report-menu-toggle:focus-visible { outline:2px solid #93c5fd; outline-offset:3px; }
      .report-menu-chevron { color:#94a3b8; transition:transform .2s ease; }
      .report-menu-toggle[aria-expanded="true"] .report-menu-chevron { transform:rotate(180deg); }
      .report-menu-toggle[aria-expanded="true"] .menu-group-count { display:none; }
    `;
    document.head.appendChild(style);
  }

  const ICON_BOOK = '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 4v2h8V7H7Zm0 4v2h8v-2H7Zm0 4v2h5v-2H7Z"/>';
  const ICON_CHECK = '<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-9 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z"/>';
  const ICON_SCALE = '<path d="M11 3h2v2h6l-3 7a3 3 0 0 0 6 0l-3-7h1V3h-7V1h-2v2H4v2h1l-3 7a3 3 0 0 0 6 0L5 5h6v14H7v2h10v-2h-4V5h-2V3Zm-5 5.6L7.6 12H4.4L6 8.6Zm12 0 1.6 3.4h-3.2L18 8.6Z"/>';

  // gradebook + attendance (grading/): teacher work in the teacher menu, review in the admin menu
  const scoreMenuItems = [
    { key: 'g-home', href: 'scores.html#/', label: 'รายวิชาของฉัน', icon: '<path d="M4 5h16v3H4V5Zm0 5h16v9H4v-9Zm2 2v5h5v-5H6Zm7 0v2h5v-2h-5Zm0 3v2h5v-2h-5Z"/>' },
    { key: 'g-followup', href: 'scores.html#/followup', label: 'นักเรียนที่ต้องติดตาม', icon: '<path d="M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>' },
    { key: 'g-criteria', href: 'scores.html#/criteria', label: 'เกณฑ์การตัดสินผล', icon: ICON_SCALE }
  ];

  const checkInMenuItems = [
    { key: 'att-today', href: 'attendance.html#/', label: 'คาบวันนี้', icon: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm-7.5 8L7 14.5l1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z"/>' },
    { key: 'att-sections', href: 'attendance.html#/sections', label: 'ห้องที่ฉันสอน', icon: '<path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/>' },
    { key: 'att-homeroom', href: 'attendance.html#/h', label: 'ห้องประจำชั้น ม.2/1', icon: '<path d="M4 21V3h11v2h5v16h-3V7h-2v14H4Zm7-8h2v-2h-2v2Z"/>' }
  ];

  const reviewMenuItems = [
    { key: 'g-aoverview', href: 'scores.html#/a', label: 'ภาพรวมทั้งโรงเรียน', icon: '<path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/>' },
    { key: 'g-ainbox', href: 'scores.html#/a/inbox', label: 'กล่องงาน', icon: '<path d="M4 4h16v16H4V4Zm2 2v8h3l1 2h4l1-2h3V6H6Z"/>' },
    { key: 'g-areports', href: 'scores.html#/a/reports', label: 'รายงานภาพรวม', icon: '<path d="M5 20h14v-2H5v2Zm7-18-5 5h3v7h4V7h3l-5-5Z"/>' },
    { key: 'g-criteria', href: 'scores.html#/criteria', label: 'เกณฑ์การตัดสินผล', icon: ICON_SCALE }
  ];

  const menuGroups = [
    {
      id: 'curriculumMenu',
      label: 'หลักสูตร',
      icon: '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3ZM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z"/>',
      items: curriculumMenuItems
    },
    {
      id: 'scheduleMenu',
      label: 'ตารางเรียน',
      icon: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v5.41l3.29 3.3 1.42-1.42L13 11.59V7h-2Z"/>',
      items: scheduleMenuItems
    },
    {
      id: 'reportMenu',
      label: 'รายงานวิชาการ',
      icon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h4.1c.53 0 1.04.21 1.41.59l1.3 1.3c.19.19.44.29.71.29h3.47A2.5 2.5 0 0 1 20 7.68v10.82a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"/>',
      items: reportMenuItems
    },
    {
      id: 'reviewMenu',
      label: 'ผลการเรียน',
      icon: ICON_BOOK,
      items: reviewMenuItems
    }
  ];

  const teacherMenuGroups = [
    {
      id: 'teacherMenu',
      label: 'งานของฉัน',
      icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5Z"/>',
      items: teacherMenuItems
    },
    {
      id: 'scoreMenu',
      label: 'บันทึกคะแนน',
      icon: ICON_BOOK,
      items: scoreMenuItems
    },
    {
      id: 'checkInMenu',
      label: 'เช็คชื่อ',
      icon: ICON_CHECK,
      items: checkInMenuItems
    }
  ];

  function menuLinks(items, active) {
    return items.map((item) => {
      const n = item.badge ? badgeCount(item.badge) : 0;
      return `
      <a href="${pageUrl(item.href)}" class="menu-link ${active === item.key ? 'active' : ''}" ${active === item.key ? 'aria-current="page"' : ''}>
        <svg class="menu-icon" viewBox="0 0 24 24">${item.icon}</svg>
        <span class="flex-1">${item.label}</span>
        ${n ? `<span class="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">${n}</span>` : ''}
      </a>
    `;
    }).join('');
  }

  // groups the user folded away, by group id; kept across pages and re-renders
  const COLLAPSED_KEY = 'ar-sidebar-collapsed';
  function collapsedGroups() {
    try { const v = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function setGroupCollapsed(id, collapsed) {
    const ids = collapsedGroups().filter((g) => g !== id);
    if (collapsed) ids.push(id);
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
  }

  function menuGroup(group, active) {
    // the group holding the current page always opens, so the user can see where they are
    const expanded = group.items.some((item) => item.key === active) || !collapsedGroups().includes(group.id);
    // shown only while folded: pending badges if any, otherwise how many links are hidden
    const pending = group.items.reduce((sum, item) => sum + (item.badge ? badgeCount(item.badge) : 0), 0);
    const count = pending
      ? `<span class="menu-group-count rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">${pending}</span>`
      : `<span class="menu-group-count rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">${group.items.length}</span>`;
    return `
      <div class="menu-group">
        <button type="button" class="report-menu-toggle" aria-expanded="${expanded}" aria-controls="${group.id}" data-menu-toggle>
          <span class="flex items-center gap-3">
            <svg class="h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">${group.icon}</svg>
            <span class="text-base font-bold">${group.label}</span>
          </span>
          <span class="flex items-center gap-2">
            ${count}
            <svg class="report-menu-chevron h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z"/></svg>
          </span>
        </button>
        <div id="${group.id}" class="menu-group-items${expanded ? '' : ' hidden'}">
          ${menuLinks(group.items, active)}
        </div>
      </div>
    `;
  }

  function sidebar(active) {
    return `
      <div id="sidebarOverlay" class="fixed inset-0 z-40 hidden bg-slate-900/40 lg:hidden"></div>
      <aside id="sidebar" class="fixed inset-y-0 left-0 z-50 w-80 -translate-x-full overflow-y-auto border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform duration-300 lg:translate-x-0">
        <div class="flex h-full flex-col">
          <div class="border-b border-slate-200 px-6 py-5">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">AR</div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Academic Report</p>
                <p class="text-sm font-medium text-slate-500">ระบบรายงานผลการเรียน</p>
              </div>
            </div>
          </div>
          <nav class="flex-1 px-4 py-5">
            ${(currentRole() === 'teacher' ? teacherMenuGroups : menuGroups).map((group) => menuGroup(group, active)).join('')}
          </nav>
          <div class="border-t border-slate-200 p-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">${persona().initials}</div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">${persona().name}</p>
                  <p class="truncate text-xs text-slate-500">${persona().title}</p>
                </div>
              </div>
              <div class="mt-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">สลับบทบาท (ตัวอย่าง)</p>
                <div class="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                  ${['admin', 'teacher'].map((r) => `<button type="button" data-role-switch="${r}" class="rounded-lg px-2 py-1.5 text-xs font-semibold transition ${currentRole() === r ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}">${r === 'admin' ? 'admin' : 'ครู'}</button>`).join('')}
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between gap-2">
                <button type="button" data-reset-mock class="text-[11px] font-medium text-slate-400 underline hover:text-slate-600">รีเซ็ตข้อมูลตัวอย่าง</button>
                <button type="button" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 21h14v-2H5v2Zm7-18L4 11h4v8h8v-8h4L12 3Z"/></svg>
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  function bellHtml() {
    const store = readStore();
    if (!store) return '';
    const to = PERSONAS[currentRole()].notifyTo;
    const list = (store.notifications || []).filter((n) => n.to === to);
    const unread = list.filter((n) => !n.read).length;
    const fmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    return `
      <div class="relative">
        <button id="bellButton" type="button" class="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50" aria-label="การแจ้งเตือน" aria-expanded="false">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z"/></svg>
          ${unread ? `<span class="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">${unread}</span>` : ''}
        </button>
        <div id="bellPanel" class="absolute right-0 top-14 z-50 hidden w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p class="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>${unread ? '<button type="button" data-bell-readall class="text-xs font-semibold text-blue-600">อ่านทั้งหมด</button>' : ''}</div>
          <div class="max-h-96 overflow-y-auto">
            ${list.length ? list.map((n) => `<a href="${pageUrl(n.link)}" data-bell-item="${n.id}" class="block border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${n.read ? '' : 'bg-blue-50/50'}"><p class="text-sm font-semibold text-slate-800">${n.title}</p><p class="mt-0.5 text-xs text-slate-500">${n.text}</p><p class="mt-1 text-[11px] text-slate-400">${fmt.format(new Date(n.at))}</p></a>`).join('') : '<p class="px-4 py-6 text-center text-sm text-slate-400">ไม่มีการแจ้งเตือน</p>'}
          </div>
        </div>
      </div>`;
  }

  function bindBell() {
    const btn = document.getElementById('bellButton');
    const panel = document.getElementById('bellPanel');
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); btn.setAttribute('aria-expanded', String(!panel.classList.contains('hidden'))); });
    document.addEventListener('click', (e) => { if (!panel.contains(e.target) && e.target !== btn) panel.classList.add('hidden'); });
    const markRead = (id) => {
      const store = readStore(); if (!store) return;
      const to = PERSONAS[currentRole()].notifyTo;
      store.notifications.forEach((n) => { if (n.to === to && (!id || n.id === id)) n.read = true; });
      writeStore(store);
      window.dispatchEvent(new Event('tt-store-external'));
    };
    panel.querySelectorAll('[data-bell-item]').forEach((a) => a.addEventListener('click', () => markRead(a.dataset.bellItem)));
    const all = panel.querySelector('[data-bell-readall]');
    if (all) all.addEventListener('click', () => { markRead(null); refreshChrome(); });
  }

  function bindRoleSwitch() {
    document.querySelectorAll('[data-role-switch]').forEach((b) => b.addEventListener('click', () => {
      const role = b.dataset.roleSwitch;
      if (role === currentRole()) return;
      try { localStorage.setItem('tt-role', role); } catch (e) { /* ignore */ }
      window.location.href = pageUrl(PERSONAS[role].home);
    }));
    const reset = document.querySelector('[data-reset-mock]');
    if (reset) reset.addEventListener('click', () => { try { DEMO_STORES.forEach((key) => localStorage.removeItem(key)); } catch (e) { /* ignore */ } window.location.reload(); });
  }

  let lastOptions = {};
  // the sidebar is re-rendered on every mount and every page load; keep its scroll position
  // (per browser tab) so picking a menu item low in the list doesn't jump the menu back to the top
  const SCROLL_KEY = 'ar-sidebar-scroll';
  function savedScroll() {
    try { const v = sessionStorage.getItem(SCROLL_KEY); return v === null ? null : Number(v); } catch (e) { return null; }
  }
  function keepScroll(sidebarEl) {
    const save = () => { try { sessionStorage.setItem(SCROLL_KEY, String(sidebarEl.scrollTop)); } catch (e) { /* ignore */ } };
    sidebarEl.addEventListener('scroll', save, { passive: true });
    // also when a menu link is clicked: the page may unload before a pending scroll event fires
    sidebarEl.addEventListener('click', save);
  }

  // leaving the page by any route (link in the page, back button) keeps the menu where it was
  window.addEventListener('pagehide', () => {
    const el = document.getElementById('sidebar');
    if (pendingScroll === null && el && el.scrollHeight > el.clientHeight) {
      try { sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop)); } catch (e) { /* ignore */ }
    }
  });

  // a restore that has not landed yet: right after a page load the sidebar is not scrollable until the
  // Tailwind CDN has styled it, and a mount in that window must neither read nor save its 0 position
  let pendingScroll = null;

  function refreshChrome() {
    const sidebarMount = document.getElementById('layoutSidebar');
    const headerMount = document.getElementById('layoutHeader');
    const current = document.getElementById('sidebar');
    if (pendingScroll === null && current && current.scrollHeight > current.clientHeight) {
      try { sessionStorage.setItem(SCROLL_KEY, String(current.scrollTop)); } catch (e) { /* ignore */ }
    }
    const scrollTop = pendingScroll ?? savedScroll();
    if (sidebarMount) sidebarMount.innerHTML = sidebar(lastOptions.active);
    if (headerMount) headerMount.innerHTML = header(lastOptions);
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
      if (scrollTop !== null) {
        pendingScroll = scrollTop;
        const restore = () => {
          if (!sidebarEl.isConnected || pendingScroll === null) return;
          sidebarEl.scrollTop = scrollTop;
          if (sidebarEl.scrollHeight > sidebarEl.clientHeight) pendingScroll = null; // styled: landed (clamped if this menu is shorter)
        };
        restore();
        requestAnimationFrame(restore);
        window.addEventListener('load', restore, { once: true });
        [100, 400].forEach((ms) => setTimeout(restore, ms));
      } else {
        sidebarEl.querySelector('.menu-link.active')?.scrollIntoView({ block: 'nearest' });
      }
      keepScroll(sidebarEl);
    }
    bindSidebar();
    bindMenuGroups();
    bindBell();
    bindRoleSwitch();
    updateTimestamp();
  }

  function defaultRightHtml() {
    return `
      <div class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 6v6c0 5 3.5 9.7 8 10 4.5-.3 8-5 8-10V6l-8-4Zm0 2.2 5.9 2.8v4.8c0 3.8-2.4 7.4-5.9 8-3.5-.6-5.9-4.2-5.9-8V7l5.9-2.8Z"/></svg>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">ข้อมูลล่าสุด</p>
          <p id="timestampText" class="text-sm font-medium text-slate-900">-</p>
        </div>
      </div>
    `;
  }

  function header(options) {
    const eyebrow = options.eyebrow || 'รายงานผลการเรียน';
    const title = options.title || 'Academic Report';
    const customRightHtml = options.rightHtml || options.actionHtml || '';
    const hasTimestampCard = /timestamp(Text|Label)/.test(customRightHtml);
    const rightHtml = `${hasTimestampCard ? customRightHtml : `${defaultRightHtml()}${customRightHtml}`}${bellHtml()}`;
    return `
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-slate-100/90 backdrop-blur">
        <div class="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <button id="mobileMenuButton" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden" aria-label="เปิดเมนู">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>
            </button>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">${eyebrow}</p>
              <p class="truncate text-sm font-medium text-slate-600">${title}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">${rightHtml}</div>
        </div>
      </header>
    `;
  }

  function bindSidebar() {
    const sidebarEl = document.getElementById('sidebar');
    const overlayEl = document.getElementById('sidebarOverlay');
    const menuButton = document.getElementById('mobileMenuButton');
    if (!sidebarEl || !overlayEl || !menuButton) return;
    const open = () => {
      sidebarEl.classList.remove('-translate-x-full');
      overlayEl.classList.remove('hidden');
    };
    const close = () => {
      sidebarEl.classList.add('-translate-x-full');
      overlayEl.classList.add('hidden');
    };
    menuButton.addEventListener('click', open);
    overlayEl.addEventListener('click', close);
  }

  function bindMenuGroups() {
    document.querySelectorAll('[data-menu-toggle]').forEach((toggle) => {
      const menu = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!menu) return;
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        menu.classList.toggle('hidden', expanded);
        setGroupCollapsed(menu.id, expanded);
      });
    });
  }

  function updateTimestamp() {
    const timestamp = document.getElementById('timestampText');
    if (!timestamp) return;
    timestamp.textContent = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());
  }

  window.AcademicLayout = {
    mount(options = {}) {
      ensureStyles();
      lastOptions = options;
      refreshChrome();
    },
    // re-render sidebar badges + bell after the timetable store changes
    refresh() { refreshChrome(); },
    role: currentRole,
    url: pageUrl
  };
}());
