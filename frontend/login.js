let selectedRole = "admin";

function selectRole(el, role) {
  document
    .querySelectorAll(".role-tab")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  selectedRole = role;

  // update placeholder hints
  const hints = {
    admin: "admin_test",
    coordinator: "coordinator_apollo",
    doctor: "doctor_test",
  };
  document.getElementById("username").placeholder =
    hints[role] || "Enter username";
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
      // store session
      sessionStorage.setItem(
        "organlife_user",
        JSON.stringify({ username, role: selectedRole }),
      );
      setTimeout(() => (window.location.href = "/index.html"), 1200);
    } else {
      errEl.textContent = "⚠ " + (json.error || "Invalid credentials.");
      errEl.style.display = "block";
      btn.textContent = "Sign In →";
      btn.classList.remove("loading");
    }
  } catch (e) {
    // backend not connected — allow guest bypass for demo
    errEl.textContent = "⚠ Cannot reach server. Use Guest login for demo.";
    errEl.style.display = "block";
    btn.textContent = "Sign In →";
    btn.classList.remove("loading");
  }
}

function guestLogin() {
  sessionStorage.setItem(
    "organlife_user",
    JSON.stringify({ username: "guest", role: "guest" }),
  );
  window.location.href = "/index.html";
}

// allow Enter key
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
