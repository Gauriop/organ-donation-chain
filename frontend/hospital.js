// ── FILTER ──
let activeRegion = "all";
function filterHospitals() {
  const query = document.getElementById("search-input").value.toLowerCase();
  const cards = document.querySelectorAll(".hosp-card");
  let visible = 0;
  cards.forEach((card) => {
    const match =
      card.dataset.name.includes(query) &&
      (activeRegion === "all" || card.dataset.region === activeRegion);
    card.style.display = match ? "" : "none";
    if (match) visible++;
  });
  document.getElementById("no-results").style.display =
    visible === 0 ? "block" : "none";
}
function filterRegion(region, btn) {
  activeRegion = region;
  document
    .querySelectorAll(".ftab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  filterHospitals();
}

// ── SCROLL FADE-IN ──
const _obs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        _obs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.08 },
);
document.querySelectorAll(".fade-in").forEach((el) => _obs.observe(el));

// ── NUMBER COUNTER ──
function _countUp(el) {
  const target = parseInt(el.dataset.count),
    suffix = el.dataset.suffix || "";
  let step = 0;
  const inc = target / 50;
  const t = setInterval(() => {
    step++;
    el.textContent = Math.min(Math.round(inc * step), target) + suffix;
    if (step >= 50) clearInterval(t);
  }, 28);
}
const _cobs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        _countUp(e.target);
        _cobs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.5 },
);
document.querySelectorAll("[data-count]").forEach((el) => _cobs.observe(el));

// ── NAV SHADOW ──
window.addEventListener("scroll", () => {
  document
    .querySelector(".land-nav")
    .classList.toggle("scrolled", scrollY > 10);
});
