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

// ── NAV SHADOW ──
window.addEventListener("scroll", () => {
  document
    .querySelector(".land-nav")
    .classList.toggle("scrolled", scrollY > 10);
});

// ── CONTACT FORM ──
function sendMessage() {
  const fname = document.getElementById("fname").value.trim();
  const email = document.getElementById("email").value.trim();
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value.trim();
  const errEl = document.getElementById("error-msg");
  const okEl = document.getElementById("success-msg");

  errEl.style.display = "none";
  okEl.style.display = "none";

  if (!fname || !email || !subject || !message) {
    errEl.style.display = "block";
    setTimeout(() => (errEl.style.display = "none"), 4000);
    return;
  }

  const btn = document.querySelector(".submit-btn");
  btn.textContent = "Sending…";
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = "Send Message →";
    btn.disabled = false;
    okEl.style.display = "block";
    ["fname", "lname", "email", "phone", "message"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    document.getElementById("subject").value = "";
    setTimeout(() => (okEl.style.display = "none"), 5000);
  }, 1200);
}
