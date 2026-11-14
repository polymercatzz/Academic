// Shows a report's scope card (".academic-card", e.g. "ภาคการเรียนปัจจุบัน") as a chip in the
// shared top header, next to "ข้อมูลล่าสุด", like the Tailwind pages. The card stays in the page
// (with the class hidden) because the module scripts keep writing into it; this mirrors its text.
(function () {
  const chipHtml = `
    <div data-scope-chip class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z"/></svg>
      </div>
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400" data-scope-label>-</p>
        <p class="text-sm font-medium text-slate-900" data-scope-value>-</p>
      </div>
    </div>`;

  let source = null;

  function sync() {
    const label = document.querySelector('[data-scope-label]');
    const value = document.querySelector('[data-scope-value]');
    if (!label || !value || !source) return;
    label.textContent = source.querySelector('.meta-label')?.textContent.trim() || '';
    value.textContent = [...source.querySelectorAll('.meta-value, .teacher-profile-label')]
      .map((el) => el.textContent.trim()).filter(Boolean).join(' · ');
  }

  const observer = new MutationObserver(sync);

  window.ScopeChip = {
    html: chipHtml,
    // call after AcademicLayout.mount({ rightHtml: ScopeChip.html, ... })
    follow(card) {
      source = card;
      observer.disconnect();
      if (card) observer.observe(card, { subtree: true, childList: true, characterData: true });
      sync();
    }
  };
}());
