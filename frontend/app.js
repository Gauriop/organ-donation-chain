console.log("✅ app.js loaded");
// ── LANDING ↔ DASHBOARD ─────────────────────────────────────
function enterDashboard() {
  document.getElementById("landing").style.display = "none";
  const app = document.getElementById("app");
  app.style.display = "flex";
  app.style.flexDirection = "column";
}

function goHome() {
  document.getElementById("app").style.display = "none";
  const landing = document.getElementById("landing");
  landing.style.display = "flex";
  landing.style.flexDirection = "column";
  window.scrollTo(0, 0);
}

// ── LANDING SECTIONS (Home / About) ──────────────────────────
function showLandingPage(name) {
  document.getElementById("lsection-home").style.display = "none";
  const about = document.getElementById("lsection-about");
  if (about) about.style.display = "none";

  const el = document.getElementById("lsection-" + name);
  if (el) {
    el.style.display = "flex";
    el.style.flexDirection = "column";
  }

  document
    .querySelectorAll(".land-nav-links a")
    .forEach((a) => a.classList.remove("active"));
  const navEl = document.getElementById("lnav-" + name);
  if (navEl) navEl.classList.add("active");
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

  const content = document.querySelector(".app-content");
  if (content) content.scrollTop = 0;

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
