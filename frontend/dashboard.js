const API = "http://localhost:3000";

// ── USER SESSION ──
const user = JSON.parse(
  sessionStorage.getItem("organlife_user") ||
    '{"username":"Admin","role":"admin"}',
);
const initials = user.username.slice(0, 2).toUpperCase();
document.getElementById("sb-avatar").textContent = initials;
document.getElementById("top-avatar").textContent = initials;
document.getElementById("sb-name").textContent = user.username;
document.getElementById("sb-role").textContent =
  user.role === "admin"
    ? "System Admin"
    : user.role === "coordinator"
      ? "Hospital Coordinator"
      : user.role === "doctor"
        ? "Medical Staff"
        : "Guest";

function logout() {
  sessionStorage.removeItem("organlife_user");
  window.location.href = "/frontend/login.html";
}

// ── NAVIGATION ──
const titles = {
  dashboard: "Dashboard",
  "donor-reg": "Register Donor",
  "donors-list": "All Donors",
  "donor-living": "Living Donors",
  "donor-deceased": "Deceased Donors",
  "recipient-reg": "Add Recipient",
  recipients: "All Recipients",
  waitlist: "Waitlist",
  regions: "Recipients by Region",
  organs: "Organ Inventory",
  compatibility: "Compatibility Test",
  "donation-chain": "Donation Chain",
  transplants: "Transplant Records",
  "transplant-medical": "Medical Details",
  hospitals: "Hospitals",
  staff: "Medical Staff",
};
const loaders = {
  dashboard: loadDashboard,
  "donors-list": loadDonors,
  "donor-living": loadLivingDonors,
  "donor-deceased": loadDeceasedDonors,
  recipients: loadRecipients,
  waitlist: loadWaitlist,
  regions: loadRegions,
  organs: loadOrgans,
  compatibility: loadCompatibility,
  "donation-chain": loadChains,
  transplants: loadTransplants,
  "transplant-medical": loadTransplantMedical,
  hospitals: loadHospitals,
  staff: loadStaff,
};

function showPage(id, navEl) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + id)?.classList.add("active");
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  if (navEl) navEl.classList.add("active");
  document.getElementById("topbar-title").textContent = titles[id] || id;
  document.querySelector(".content").scrollTop = 0;
  if (loaders[id]) loaders[id]();
}

// ── HELPERS ──
async function apiFetch(url) {
  try {
    const token = sessionStorage.getItem("organlife_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(url, { headers });
    const j = await r.json();
    return j.success ? j.data : [];
  } catch {
    return [];
  }
}
function badge(text) {
  if (!text) return "-";
  const map = {
    Critical: "b-red",
    High: "b-amber",
    Medium: "b-blue",
    Low: "b-gray",
    Active: "b-green",
    Approved: "b-green",
    Healthy: "b-green",
    Available: "b-green",
    Successful: "b-green",
    Compatible: "b-green",
    Completed: "b-blue",
    "In Progress": "b-blue",
    Allocated: "b-blue",
    Transplanted: "b-blue",
    Pending: "b-amber",
    Scheduled: "b-amber",
    Monitoring: "b-amber",
    "Under Evaluation": "b-amber",
    Planned: "b-gray",
    Incompatible: "b-red",
    Expired: "b-red",
    Failed: "b-red",
    Rejected: "b-red",
    Cancelled: "b-red",
    "A+": "b-blue",
    "A-": "b-blue",
    "B+": "b-green",
    "B-": "b-green",
    "O+": "b-red",
    "O-": "b-red",
    "AB+": "b-red",
    "AB-": "b-red",
  };
  return `<span class="badge ${map[text] || "b-gray"}">${text}</span>`;
}
function fmt(d) {
  return d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}
function empty(id, cols, msg = "No records found") {
  const el = document.getElementById(id);
  if (el)
    el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--muted)">${msg}</td></tr>`;
}
function toggleDT() {
  const v = document.getElementById("dtype").value;
  document.getElementById("lfield").style.display =
    v === "living" ? "" : "none";
  document.getElementById("dfield").style.display =
    v === "deceased" ? "" : "none";
}
function showAlert(id) {
  const el = document.getElementById(id);
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3500);
}
function filterTable(input, tbodyId, cols) {
  const q = input.value.toLowerCase();
  document.querySelectorAll(`#${tbodyId} tr`).forEach((row) => {
    const text = cols
      .map((i) => row.cells[i]?.textContent.toLowerCase() || "")
      .join(" ");
    row.style.display = text.includes(q) ? "" : "none";
  });
}

// ── DASHBOARD ──
async function loadDashboard() {
  try {
    const token = sessionStorage.getItem("organlife_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`${API}/api/stats`, { headers });
    const j = await r.json();
    if (j.success) {
      const d = j.data;
      document.getElementById("dash-donors").textContent = d.total_donors;
      document.getElementById("dash-recipients").textContent =
        d.active_recipients;
      document.getElementById("dash-transplants").textContent =
        d.transplants_done;
      document.getElementById("dash-waitlist").textContent = d.waitlist_count;
      document.getElementById("dash-hosp-total").textContent = d.hospitals;
      document.getElementById("dash-staff-total").textContent = d.staff;
    }
  } catch (e) {}

  const transplants = await apiFetch(`${API}/api/transplants`);
  const tbody = document.getElementById("dash-transplants-tbody");
  if (tbody)
    tbody.innerHTML = transplants.length
      ? transplants
          .slice(0, 5)
          .map(
            (t) =>
              `<tr><td>#TR-${t.transplant_id}</td><td>${t.organ_type}</td><td>${t.donor_name} → ${t.recipient_name}</td><td>${t.hospital_name}</td><td>${badge(t.outcome || t.status)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No transplant records yet</td></tr>`;

  const waitlist = await apiFetch(`${API}/api/waitlist`);
  const wlDiv = document.getElementById("dash-waitlist-items");
  if (wlDiv) {
    const critical = waitlist
      .filter((w) => w.urgency_level === "Critical")
      .slice(0, 4);
    wlDiv.innerHTML = critical.length
      ? critical
          .map(
            (w, i) =>
              `<div class="wl-item"><div class="wl-rank">${i + 1}</div><div class="wl-info"><div class="wl-name">${w.recipient_name}</div><div class="wl-detail">${w.organ_type} • ${w.blood_type} • ${w.days_waiting} days</div></div>${badge(w.urgency_level)}</div>`,
          )
          .join("")
      : `<div style="padding:16px;color:var(--muted);font-size:13px">No critical patients</div>`;
  }

  const tests = await apiFetch(`${API}/api/compatibility`);
  document.getElementById("dash-tests-done").textContent = tests.length;
  document.getElementById("dash-tests-pending").textContent = tests.filter(
    (t) => t.test_result === "Pending",
  ).length;

  const chains = await apiFetch(`${API}/api/chains`);
  const active = chains.filter((c) => c.status === "In Progress");
  const chainDiv = document.getElementById("dash-chains");
  if (chainDiv && active.length) {
    chainDiv.innerHTML = "";
    for (const chain of active.slice(0, 2)) {
      const links = await apiFetch(`${API}/api/chains/${chain.chain_id}/links`);
      chainDiv.innerHTML += `<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:8px">${chain.chain_name.toUpperCase()}</div>
              <div class="chain-row">
                <div class="cnode"><div class="cnode-circle cd">D</div><div class="cnode-lbl">Donor</div></div>
                ${links.map((l) => `<div class="carrow">→</div><div class="cnode"><div class="cnode-circle cr">R</div><div class="cnode-lbl">${l.recipient_name.split(" ")[0]}</div></div>`).join("")}
              </div><div style="margin-bottom:12px"></div>`;
    }
  } else if (chainDiv) {
    chainDiv.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:8px 0">No active chains</div>`;
  }
}

async function loadDonors() {
  const d = await apiFetch(`${API}/api/donors`);
  const el = document.getElementById("tbody-donors");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) =>
            `<tr><td>#D-${r.donor_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td><td>${r.donor_type}</td><td>${r.hospital_name}</td><td>${r.age} yrs</td><td>${badge(r.medical_status)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No donors found</td></tr>`;
}
async function loadLivingDonors() {
  const d = await apiFetch(`${API}/api/donors/living`);
  const el = document.getElementById("tbody-donor-living");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) =>
            `<tr><td>#DL-${r.donor_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td><td>${r.hospital_name}</td><td>${r.age} yrs</td><td>${badge(r.medical_status)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No living donors</td></tr>`;
}
async function loadDeceasedDonors() {
  const d = await apiFetch(`${API}/api/donors/deceased`);
  const el = document.getElementById("tbody-donor-deceased");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) =>
            `<tr><td>#DD-${r.donor_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td><td>${fmt(r.registration_date)}</td><td>${badge(r.medical_status)}</td><td>${r.hospital_name}</td><td>-</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No deceased donors</td></tr>`;
}
async function loadRecipients() {
  const d = await apiFetch(`${API}/api/recipients`);
  const el = document.getElementById("tbody-recipients");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) =>
            `<tr><td>#R-${r.recipient_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td><td>-</td><td>${r.region || "-"}</td><td>${badge(r.urgency_level)}</td><td>-</td><td>${badge(r.medical_status)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No recipients</td></tr>`;
}
async function loadWaitlist() {
  const d = await apiFetch(`${API}/api/waitlist`);
  document.getElementById("wl-critical").textContent = d.filter(
    (w) => w.urgency_level === "Critical",
  ).length;
  document.getElementById("wl-high").textContent = d.filter(
    (w) => w.urgency_level === "High",
  ).length;
  document.getElementById("wl-normal").textContent = d.filter(
    (w) => w.urgency_level === "Medium" || w.urgency_level === "Low",
  ).length;
  document.getElementById("wl-total").textContent = d.length;
  const el = document.getElementById("tbody-waitlist");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (w, i) =>
            `<tr><td><b style="color:var(--red)">#${i + 1}</b></td><td>${w.recipient_name}</td><td>${badge(w.blood_type)}</td><td>${w.organ_type}</td><td>${w.hospital_name}</td><td>${w.days_waiting}</td><td>${badge(w.urgency_level)}</td><td>${badge("Active")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">Waitlist empty</td></tr>`;
}
async function loadRegions() {
  const [n, s, e, w] = await Promise.all([
    apiFetch(`${API}/api/recipients/north`),
    apiFetch(`${API}/api/recipients/south`),
    apiFetch(`${API}/api/recipients/east`),
    apiFetch(`${API}/api/recipients/west`),
  ]);
  const sets = [n, s, e, w],
    ids = ["region-north", "region-south", "region-east", "region-west"],
    max = Math.max(...sets.map((x) => x.length), 1);
  sets.forEach((data, i) => {
    const card = document.getElementById(ids[i]);
    if (!card) return;
    const critical = data.filter((r) => r.urgency_level === "Critical").length;
    const bar = card.querySelector(".rbar-fill");
    const bolds = card.querySelectorAll("b");
    if (bar) bar.style.width = Math.round((data.length / max) * 100) + "%";
    if (bolds[0]) bolds[0].textContent = data.length;
    if (bolds[1]) bolds[1].textContent = critical;
  });
}
async function loadOrgans() {
  const d = await apiFetch(`${API}/api/organs`);
  const el = document.getElementById("tbody-organs");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (o) =>
            `<tr><td>#ORG-${o.organ_id}</td><td>${o.organ_type}</td><td>#D-${o.donor_id}</td><td>${badge(o.blood_type)}</td><td>${fmt(o.harvest_date)}</td><td>${o.hours_remaining != null ? o.hours_remaining + " hrs" : "-"}</td><td>${o.hospital_name}</td><td>${badge(o.status)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No organs</td></tr>`;
}
async function loadCompatibility() {
  const d = await apiFetch(`${API}/api/compatibility`);
  const el = document.getElementById("tbody-compatibility");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .slice(0, 30)
        .map(
          (t) =>
            `<tr><td>#CT-${t.test_id}</td><td>${t.donor_name}</td><td>${t.recipient_name}</td><td>-</td><td>${t.compatibility_score}%</td><td>${badge(t.test_result)}</td><td>${fmt(t.test_date)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No tests</td></tr>`;
}
async function loadChains() {
  const d = await apiFetch(`${API}/api/chains`);
  const el = document.getElementById("tbody-chains");
  if (el)
    el.innerHTML = d.length
      ? d
          .map(
            (c) =>
              `<tr><td>#DC-${c.chain_id}</td><td>${fmt(c.start_date)}</td><td>${c.total_transplants}</td><td>${badge(c.status)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">No chains</td></tr>`;
  const el2 = document.getElementById("tbody-chain-links");
  if (el2 && d.length) {
    const links = await apiFetch(`${API}/api/chains/${d[0].chain_id}/links`);
    el2.innerHTML = links.length
      ? links
          .map(
            (l) =>
              `<tr><td>#CL-${l.link_id}</td><td>#DC-${l.chain_id}</td><td>${l.donor_name}</td><td>${l.recipient_name}</td><td>-</td><td>${l.sequence_number}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No links</td></tr>`;
  }
}
async function loadTransplants() {
  const d = await apiFetch(`${API}/api/transplants`);
  const el = document.getElementById("tbody-transplants");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (t) =>
            `<tr><td>#TR-${t.transplant_id}</td><td>${t.donor_name}</td><td>${t.recipient_name}</td><td>${t.organ_type}</td><td>${t.hospital_name}</td><td>${t.surgeon_name}</td><td>${fmt(t.surgery_date)}</td><td>${badge(t.outcome || "Pending")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>`;
}
async function loadTransplantMedical() {
  const d = await apiFetch(`${API}/api/transplants`);
  const el1 = document.getElementById("tbody-transplant-medical");
  const el2 = document.getElementById("tbody-transplant-details");
  if (el1)
    el1.innerHTML = d.length
      ? d
          .map(
            (t) =>
              `<tr><td>#TM-${t.transplant_id}</td><td>#TR-${t.transplant_id}</td><td>${t.surgeon_name}</td><td>${badge(t.outcome || "Pending")}</td><td>-</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>`;
  if (el2)
    el2.innerHTML = d.length
      ? d
          .map(
            (t) =>
              `<tr><td>#TD-${t.transplant_id}</td><td>#TR-${t.transplant_id}</td><td>${badge(t.surgery_status || t.status)}</td><td>${fmt(t.surgery_date)}</td><td>-</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>`;
}
async function loadHospitals() {
  const d = await apiFetch(`${API}/api/hospitals`);
  const el = document.getElementById("tbody-hospitals");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (h) =>
            `<tr><td>#H-${h.hospital_id}</td><td>${h.name}</td><td>${h.location}</td><td>${h.region || "-"}</td><td>${h.transplant_capacity}</td><td>${h.specialization || "-"}</td><td>${badge("Active")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No hospitals</td></tr>`;
}
async function loadStaff() {
  const d = await apiFetch(`${API}/api/staff`);
  const el = document.getElementById("tbody-staff");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (s) =>
            `<tr><td>#MS-${s.staff_id}</td><td>${s.name}</td><td>${s.specialization}</td><td>${s.specialization}</td><td>${s.hospital_name}</td><td>${badge("Active")}</td><td>${s.transplants_done}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No staff</td></tr>`;
}

// ── FORMS ──
async function submitDonor() {
  const name =
    `${document.getElementById("d-fname").value} ${document.getElementById("d-lname").value}`.trim();
  const age = document.getElementById("d-age").value,
    contact = document.getElementById("d-phone").value,
    hospital_id = document.getElementById("d-hospital").value;
  const blood_type = document.getElementById("d-blood").value,
    donor_type =
      document.getElementById("dtype").value === "living"
        ? "Living"
        : "Deceased";
  if (!name || !age || !contact || !hospital_id) {
    document.getElementById("da-err").style.display = "block";
    setTimeout(
      () => (document.getElementById("da-err").style.display = "none"),
      3000,
    );
    return;
  }
  try {
    const r = await fetch(`${API}/api/donors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        blood_type,
        age: +age,
        contact,
        donor_type,
        hospital_id: +hospital_id,
      }),
    });
    const j = await r.json();
    if (j.success) showAlert("da");
    else {
      document.getElementById("da-err").style.display = "block";
      setTimeout(
        () => (document.getElementById("da-err").style.display = "none"),
        3000,
      );
    }
  } catch {
    alert("Backend not connected");
  }
}
async function submitRecipient() {
  const name =
    `${document.getElementById("r-fname").value} ${document.getElementById("r-lname").value}`.trim();
  const age = document.getElementById("r-age").value,
    contact = document.getElementById("r-phone").value,
    hospital_id = document.getElementById("r-hospital").value;
  const blood_type = document.getElementById("r-blood").value,
    urgency_level = document.getElementById("r-urgency").value;
  if (!name || !age || !contact || !hospital_id) {
    document.getElementById("ra-err").style.display = "block";
    setTimeout(
      () => (document.getElementById("ra-err").style.display = "none"),
      3000,
    );
    return;
  }
  try {
    const r = await fetch(`${API}/api/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        blood_type,
        age: +age,
        contact,
        urgency_level,
        hospital_id: +hospital_id,
      }),
    });
    const j = await r.json();
    if (j.success) showAlert("ra");
    else {
      document.getElementById("ra-err").style.display = "block";
      setTimeout(
        () => (document.getElementById("ra-err").style.display = "none"),
        3000,
      );
    }
  } catch {
    alert("Backend not connected");
  }
}

// ── INIT ──
loadDashboard();
