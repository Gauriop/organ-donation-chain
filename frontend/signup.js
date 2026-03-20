let selectedRole = "admin";

function selectRole(el, role) {
  document
    .querySelectorAll(".role-tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  selectedRole = role;

  // show/hide license field
  const licenseField = document.getElementById("license-field");
  licenseField.style.display = role === "doctor" ? "" : "none";
}

function checkStrength(val) {
  const bar = document.getElementById("strength-bar");
  const label = document.getElementById("strength-label");
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { pct: "0%", color: "transparent", text: "" },
    { pct: "25%", color: "#e8344a", text: "Weak" },
    { pct: "50%", color: "#f59e0b", text: "Fair" },
    { pct: "75%", color: "#3b82f6", text: "Good" },
    { pct: "100%", color: "#1db87a", text: "Strong ✓" },
  ];
  const lvl = levels[score] || levels[0];
  bar.style.width = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

async function doSignup() {
  const fname = document.getElementById("s-fname").value.trim();
  const lname = document.getElementById("s-lname").value.trim();
  const email = document.getElementById("s-email").value.trim();
  const phone = document.getElementById("s-phone").value.trim();
  const username = document.getElementById("s-username").value.trim();
  const pass1 = document.getElementById("s-pass1").value;
  const pass2 = document.getElementById("s-pass2").value;
  const terms = document.getElementById("terms-check").checked;
  const errEl = document.getElementById("signup-err");
  const okEl = document.getElementById("signup-ok");

  errEl.style.display = "none";
  okEl.style.display = "none";

  if (!fname || !lname || !email || !username || !pass1) {
    errEl.textContent = "⚠ Please fill all required fields.";
    errEl.style.display = "block";
    return;
  }
  if (pass1 !== pass2) {
    errEl.textContent = "⚠ Passwords do not match.";
    errEl.style.display = "block";
    return;
  }
  if (pass1.length < 8) {
    errEl.textContent = "⚠ Password must be at least 8 characters.";
    errEl.style.display = "block";
    return;
  }
  if (!terms) {
    errEl.textContent = "⚠ Please accept the Terms of Service.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.querySelector(".btn-signup");
  btn.textContent = "Creating account...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  try {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fname + " " + lname,
        email,
        phone,
        username,
        password: pass1,
        role: selectedRole,
        hospital: document.getElementById("s-hospital").value.trim(),
        license: document.getElementById("s-license").value.trim(),
      }),
    });
    const json = await res.json();

    if (json.success) {
      okEl.style.display = "block";
      setTimeout(() => (window.location.href = "/frontend/login.html"), 1500);
    } else {
      errEl.textContent = "⚠ " + (json.error || "Signup failed.");
      errEl.style.display = "block";
      btn.textContent = "Create Account →";
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    }
  } catch (e) {
    // Backend not connected — show demo success
    okEl.textContent = "✓ Demo mode: Account created! Redirecting to login...";
    okEl.style.display = "block";
    setTimeout(() => (window.location.href = "/frontend/login.html"), 1500);
  }
}
