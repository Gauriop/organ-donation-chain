function enterDashboard() {
  // Check if user is logged in
  const user = sessionStorage.getItem("organlife_user");
  if (user) {
    // Already logged in — go straight to dashboard
    window.location.href = "/frontend/dashboard.html";
  } else {
    // Not logged in — go to login page
    window.location.href = "/frontend/login.html";
  }
}
