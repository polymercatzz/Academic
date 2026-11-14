// The "preview before export / print" dialog shared by the report pages.
// A page that uses it needs the #attendancePdfModal markup and the #toast element.
(function () {
  const modal = document.getElementById("attendancePdfModal");
  if (!modal) return;

  const title = document.getElementById("attendancePdfTitle");
  const scope = document.getElementById("attendancePdfScope");
  const sheet = document.getElementById("attendancePdfSheet");
  const closeBtn = document.getElementById("attendancePdfCloseBtn");
  const confirmBtn = document.getElementById("attendancePdfDownloadBtn");
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    // the page names the toast's Tailwind classes on the element (data-base-class / data-visible-class)
    const visible = (toast.dataset.visibleClass || "is-visible").split(" ");
    toast.className = toast.dataset.baseClass || "toast info";
    toast.innerHTML = `<strong>แจ้งเตือน</strong><span>${message}</span>`;
    toast.classList.add(...visible);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove(...visible), 2200);
  }

  function open(options) {
    title.textContent = options.title;
    scope.textContent = options.scope;
    sheet.innerHTML = options.sheetHtml;
    confirmBtn.textContent = options.confirmText || "ดำเนินการ";
    confirmBtn.dataset.mockMessage = options.mockMessage || "Mockup: ยังไม่เชื่อมต่อการทำงานจริง";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    closeBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  // export and print are mockups: confirming only closes the dialog and says so
  confirmBtn.addEventListener("click", () => {
    const message = confirmBtn.dataset.mockMessage;
    close();
    showToast(message);
  });
  closeBtn.addEventListener("click", close);
  modal.querySelectorAll("[data-pdf-close]").forEach((node) => node.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });

  window.openReportPreviewModal = open;
}());
