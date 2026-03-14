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
