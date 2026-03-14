// ── LANDING ↔ DASHBOARD ─────────────────────────────────────
function enterDashboard() {
  document.getElementById("landing").style.display = "none";
  const app = document.getElementById("app");
  app.style.display = "flex";
  // allow scrolling inside app content (not body)
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function goHome() {
  document.getElementById("app").style.display = "none";
  const landing = document.getElementById("landing");
  landing.style.display = "flex";
  // keep overflow hidden — landing also must not scroll
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  window.scrollTo(0, 0);
}

// ── DROPDOWN TOGGLE ──────────────────────────────────────────
function toggleDD(id) {
  const grp = document.getElementById(id);
  const isOpen = grp.classList.contains("open");
  closeAll();
  if (!isOpen) grp.classList.add("open");
}

function closeAll() {
  document
    .querySelectorAll(".nav-group")
    .forEach((g) => g.classList.remove("open"));
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".nav-group")) closeAll();
});

// ── PAGE NAVIGATION ──────────────────────────────────────────
function showPage(id) {
  document
    .querySelectorAll(".apage")
    .forEach((p) => p.classList.remove("active"));
  const el = document.getElementById("apage-" + id);
  if (el) el.classList.add("active");

  // scroll content area back to top on page change
  const content = document.querySelector(".app-content");
  if (content) content.scrollTop = 0;

  // update dashboard direct button active state
  document
    .querySelectorAll(".nav-direct-btn")
    .forEach((b) => b.classList.remove("active"));
  if (id === "dashboard") {
    const dashBtn = document.getElementById("nav-dash");
    if (dashBtn) dashBtn.classList.add("active");
  }
  closeAll();
}

function setActiveDirect(btn) {
  document
    .querySelectorAll(".nav-direct-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// ── DONOR TYPE TOGGLE ────────────────────────────────────────
function toggleDT() {
  const v = document.getElementById("dtype").value;
  document.getElementById("lfield").style.display =
    v === "living" ? "" : "none";
  document.getElementById("dfield").style.display =
    v === "deceased" ? "" : "none";
}

// ── FORM SUCCESS ALERTS ──────────────────────────────────────
function ok(id) {
  const el = document.getElementById(id);
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3500);
}
