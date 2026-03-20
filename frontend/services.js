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
  { threshold: 0.1 },
);
document.querySelectorAll(".fade-in").forEach((el) => _obs.observe(el));

// ── NUMBER COUNTER (hero stats) ──
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
