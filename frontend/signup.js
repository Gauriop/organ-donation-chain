let selectedRole = "admin";

function selectRole(el, role) {
  document
    .querySelectorAll(".role-tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  selectedRole = role;

  // show/hide sections based on role
  const profSection = document.getElementById("prof-section");
  const donorSection = document.getElementById("donor-section");
  const recipientSection = document.getElementById("recipient-section");
  const licenseField = document.getElementById("license-field");
  const hintBox = document.getElementById("role-hint");
  const usernameLabel = document.getElementById("username-label");
  const usernameInput = document.getElementById("s-username");

  // reset all
  profSection.classList.remove("show");
  donorSection.classList.remove("show");
  recipientSection.classList.remove("show");
  hintBox.style.display = "none";
  licenseField.style.display = "";
  usernameLabel.textContent = "Username *";
  usernameInput.placeholder = "rahul_kem";

  if (role === "admin" || role === "coordinator") {
    profSection.classList.add("show");
    licenseField.style.display = "none";
  } else if (role === "doctor") {
    profSection.classList.add("show");
  } else if (role === "donor") {
    donorSection.classList.add("show");
    hintBox.style.display = "block";
    document.getElementById("hint-title").textContent =
      "📋 Registering as a Donor";
    document.getElementById("hint-body").innerHTML =
      "Your <b>username must be your phone number</b> (e.g. 9123456780) — this links your login to your donor record via the contact field.";
    usernameLabel.textContent = "Username (your phone number) *";
    usernameInput.placeholder = "9123456780";
  } else if (role === "recipient") {
    recipientSection.classList.add("show");
    hintBox.style.display = "block";
    document.getElementById("hint-title").textContent =
      "📋 Registering as a Recipient";
    document.getElementById("hint-body").innerHTML =
      "Your <b>username must be your phone number</b> (e.g. 9234567890) — this links your login to your recipient record via the contact field.";
    usernameLabel.textContent = "Username (your phone number) *";
    usernameInput.placeholder = "9234567890";
  }
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

  // for donor/recipient, username must be phone number
  if (
    (selectedRole === "donor" || selectedRole === "recipient") &&
    !/^\d{10}$/.test(username)
  ) {
    errEl.textContent =
      "⚠ For Donor/Recipient, username must be a 10-digit phone number.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.querySelector(".btn-signup");
  btn.textContent = "Creating account...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  // build payload based on role
  const payload = {
    name: fname + " " + lname,
    email,
    phone,
    username,
    password: pass1,
    role: selectedRole,
    hospital: document.getElementById("s-hospital")?.value.trim() || "",
    license: document.getElementById("s-license")?.value.trim() || "",
  };

  // extra fields for donor
  if (selectedRole === "donor") {
    payload.age = document.getElementById("s-age").value;
    payload.blood_type = document.getElementById("s-blood").value;
    payload.donor_type = document.getElementById("s-dtype").value;
    payload.hospital_id = document.getElementById("s-donor-hospital").value;
    payload.contact = username; // phone number = username = contact
  }

  // extra fields for recipient
  if (selectedRole === "recipient") {
    payload.age = document.getElementById("s-r-age").value;
    payload.blood_type = document.getElementById("s-r-blood").value;
    payload.organ_type = document.getElementById("s-r-organ").value;
    payload.urgency = document.getElementById("s-r-urgency").value;
    payload.hospital_id = document.getElementById("s-r-hospital").value;
    payload.contact = username; // phone number = username = contact
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (json.success) {
      okEl.textContent = "✓ Account created! Redirecting to login...";
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
    // demo mode — backend not connected
    okEl.textContent = "✓ Demo: Account created! Redirecting to login...";
    okEl.style.display = "block";
    setTimeout(() => (window.location.href = "/frontend/login.html"), 1500);
  }
}
