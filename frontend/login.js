let selectedRole = "admin";

function selectRole(el, role) {
  document
    .querySelectorAll(".role-tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  selectedRole = role;

  // placeholder hints per role
  const hints = {
    admin: "admin_test",
    coordinator: "coordinator_apollo",
    doctor: "doctor_test",
    donor: "9123456780",
    recipient: "9234567890",
  };
  document.getElementById("username").placeholder =
    hints[role] || "Enter username";

  // show hint box only for donor / recipient
  const hintBox = document.getElementById("contact-hint");
  if (hintBox) {
    hintBox.style.display =
      role === "donor" || role === "recipient" ? "block" : "none";
  }

  // update password placeholder
  const passPH = {
    admin: "admin123",
    coordinator: "coord123",
    doctor: "doctor123",
    donor: "donor123",
    recipient: "recipient123",
  };
  document.getElementById("password").placeholder =
    "Password: " + (passPH[role] || "");
}

async function doLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errEl = document.getElementById("login-err");
  const okEl = document.getElementById("login-ok");
  const btn = document.getElementById("login-btn");

  errEl.style.display = "none";
  okEl.style.display = "none";

  if (!username || !password) {
    errEl.textContent = "⚠ Please enter username and password.";
    errEl.style.display = "block";
    return;
  }

  btn.textContent = "Signing in...";
  btn.classList.add("loading");

  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: selectedRole }),
    });
    const json = await res.json();

    if (json.success) {
      okEl.style.display = "block";

      // ── SAVE TOKEN — this is what makes RLS work ──
      // Every API call in dashboard/app.js sends this token
      // Backend decodes it → connects to DB as this user
      // PostgreSQL RLS then filters rows automatically
      sessionStorage.setItem("organlife_token", json.token);
      sessionStorage.setItem(
        "organlife_user",
        JSON.stringify({ username, role: selectedRole }),
      );

      // redirect to dashboard (not index)
      setTimeout(
        () => (window.location.href = "/frontend/dashboard.html"),
        1200,
      );
    } else {
      errEl.textContent = "⚠ " + (json.error || "Invalid credentials.");
      errEl.style.display = "block";
      btn.textContent = "Sign In →";
      btn.classList.remove("loading");
    }
  } catch (e) {
    errEl.textContent =
      "⚠ Cannot reach server. Make sure npm start is running.";
    errEl.style.display = "block";
    btn.textContent = "Sign In →";
    btn.classList.remove("loading");
  }
}

function guestLogin() {
  // guest gets no token → backend uses admin pool → sees everything
  sessionStorage.removeItem("organlife_token");
  sessionStorage.setItem(
    "organlife_user",
    JSON.stringify({ username: "guest", role: "guest" }),
  );
  window.location.href = "/frontend/dashboard.html";
}

// allow Enter key
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
