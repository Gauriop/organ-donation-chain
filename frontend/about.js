function sendMsg() {
  const btn = document.querySelector(".cf-submit");
  btn.textContent = "Sending...";
  btn.style.opacity = ".7";
  setTimeout(() => {
    btn.textContent = "Send Message →";
    btn.style.opacity = "1";
    const msg = document.getElementById("smsg");
    msg.style.display = "block";
    setTimeout(() => (msg.style.display = "none"), 4000);
  }, 1200);
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
  { threshold: 0.1 },
);
document.querySelectorAll(".fade-in").forEach((el) => _obs.observe(el));

// ── NUMBER COUNTER ──
function _countUp(el) {
  const target = parseInt(el.dataset.count),
    suffix = el.dataset.suffix || "";
  let step = 0;
  const inc = target / 60;
  const t = setInterval(() => {
    step++;
    el.textContent = Math.min(Math.round(inc * step), target) + suffix;
    if (step >= 60) clearInterval(t);
  }, 24);
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

// ── CONTACT FORM ──
function sendMsg() {
  const btn = document.querySelector(".cf-submit");
  btn.textContent = "Sending...";
  btn.style.opacity = "0.7";
  setTimeout(() => {
    btn.textContent = "Send Message →";
    btn.style.opacity = "1";
    const msg = document.getElementById("smsg");
    msg.style.display = "block";
    setTimeout(() => (msg.style.display = "none"), 4000);
  }, 1200);
}
