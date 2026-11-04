// Connects the gradebook (scores.html) and attendance (attendance.html) apps to the shared layout.
// The apps in assets/js are kept as shipped: they still render into #view and write their own
// sidebar/topbar into hidden stand-ins, which this file mirrors into the shared sidebar and header.
(function () {
  const app = document.body.dataset.gradingApp; // 'scores' | 'attendance'
  const academic = AcademicLayout.role() === 'admin'; // admin = ครูฝ่ายวิชาการ (see docs/actors.md)

  // the mock data belongs to ครูสมศรี; admin keeps the shared admin persona
  const PERSONA = { teacher: { name: 'ครูสมศรี ใจดี', title: 'ครู · คณิตศาสตร์', initials: 'สศ' } };

  // the gradebook picks its view from the hash and remembers it under its own key; drive both from the shared role
  if (app === 'scores') {
    try { localStorage.setItem('gradebook-demo-role', academic ? 'academic' : 'teacher'); } catch (e) { /* ignore */ }
    const hash = location.hash || '#/';
    const academicHash = hash.startsWith('#/a');
    if (academic && !academicHash && !hash.startsWith('#/criteria')) history.replaceState(null, '', '#/a');
    if (!academic && academicHash) history.replaceState(null, '', '#/');
  }

  const GROUPS = {
    scores: academic ? 'ผลการเรียน' : 'บันทึกคะแนน',
    attendance: 'เช็คชื่อ'
  };

  function activeKey() {
    const hash = location.hash || '#/';
    if (app === 'attendance') {
      if (hash.startsWith('#/h')) return 'att-homeroom';
      if (hash.startsWith('#/sections') || hash.startsWith('#/s/')) return 'att-sections';
      return 'att-today';
    }
    if (hash.startsWith('#/a/inbox')) return 'g-ainbox';
    if (hash.startsWith('#/a/reports')) return 'g-areports';
    if (hash.startsWith('#/a/clubs')) return 'g-aclubs';
    if (hash.startsWith('#/a/holidays')) return 'g-aholidays';
    if (hash.startsWith('#/a')) return 'g-aoverview';
    if (hash.startsWith('#/followup')) return 'g-followup';
    if (hash.startsWith('#/remedial')) return 'g-remedial';
    if (hash.startsWith('#/clubs')) return 'g-clubs';
    if (hash.startsWith('#/criteria')) return 'g-criteria';
    return 'g-home';
  }

  // วันหยุดอยู่ในเมนูตารางเรียน ไม่ใช่เมนูผลการเรียน
  function group() {
    return app === 'scores' && (location.hash || '').startsWith('#/a/holidays') ? 'ตารางเรียน' : GROUPS[app];
  }

  function title() {
    return document.getElementById('topbarTitle')?.textContent.trim() || group();
  }

  let mounted = '';
  function mount() {
    const options = { active: activeKey(), title: title(), persona: PERSONA };
    const signature = options.active + '|' + options.title;
    if (signature === mounted) return;
    mounted = signature;
    AcademicLayout.mount(options);
  }

  // หน้าหลัก > group > page, at the top of each rendered page, like the other pages
  function addBreadcrumb() {
    const view = document.getElementById('view');
    const first = view.firstElementChild;
    if (!first || first.classList.contains('ar-breadcrumb')) return;
    const nav = document.createElement('nav');
    nav.className = 'ar-breadcrumb';
    nav.setAttribute('aria-label', 'breadcrumb');
    nav.innerHTML = `<a href="${AcademicLayout.url(academic ? 'overview.html' : 'my-timetable.html')}">หน้าหลัก</a><span>&gt;</span><span>${group()}</span><span>&gt;</span><span class="ar-breadcrumb-current"></span>`;
    // the page name, not the h1 (the home page's h1 is a greeting)
    nav.querySelector('.ar-breadcrumb-current').textContent = title();
    view.insertBefore(nav, first);
  }

  mount();
  window.addEventListener('hashchange', mount);
  document.addEventListener('DOMContentLoaded', () => {
    const topbarTitle = document.getElementById('topbarTitle');
    if (topbarTitle) new MutationObserver(mount).observe(topbarTitle, { childList: true, characterData: true, subtree: true });
    // watch the wrapper, not #view: the attendance app swaps #view for a fresh element on every route
    new MutationObserver(addBreadcrumb).observe(document.getElementById('view').parentElement, { childList: true, subtree: true });
    mount();
    addBreadcrumb();
  });
}());
