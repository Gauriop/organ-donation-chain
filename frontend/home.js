console.log("✅ app.js loaded");

const API = "http://localhost:3000";

// ══════════════════════════════════════════════
// LANDING ↔ DASHBOARD
// ══════════════════════════════════════════════
function enterDashboard() {
  document.getElementById("landing").style.display = "none";
  const app = document.getElementById("app");
  app.style.display = "flex";
  app.style.flexDirection = "column";
  loadDashboard();
}

function goHome() {
  document.getElementById("app").style.display = "none";
  const landing = document.getElementById("landing");
  landing.style.display = "flex";
  landing.style.flexDirection = "column";
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function toggleDD(id) {
  const grp = document.getElementById(id);
  const isOpen = grp.classList.contains("open");
  closeAll();
  if (!isOpen) grp.classList.add("open");
}
function closeAll() {
  document
    .querySelectorAll(".nav-group")
    .forEach((g) => g.classList.remove("open"));
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".nav-group")) closeAll();
});

function showPage(id) {
  document
    .querySelectorAll(".apage")
    .forEach((p) => p.classList.remove("active"));
  const el = document.getElementById("apage-" + id);
  if (el) el.classList.add("active");
  document.querySelector(".app-content").scrollTop = 0;
  document
    .querySelectorAll(".nav-direct-btn")
    .forEach((b) => b.classList.remove("active"));
  if (id === "dashboard")
    document.getElementById("nav-dash")?.classList.add("active");
  closeAll();

  // load real data for each page
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
  if (loaders[id]) loaders[id]();
}

function setActiveDirect(btn) {
  document
    .querySelectorAll(".nav-direct-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// ══════════════════════════════════════════════
// FORM HELPERS
// ══════════════════════════════════════════════
function toggleDT() {
  const v = document.getElementById("dtype").value;
  document.getElementById("lfield").style.display =
    v === "living" ? "" : "none";
  document.getElementById("dfield").style.display =
    v === "deceased" ? "" : "none";
}
function ok(id) {
  const el = document.getElementById(id);
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3500);
}

// ══════════════════════════════════════════════
// API HELPER
// ══════════════════════════════════════════════
async function apiFetch(url) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (e) {
    console.error("API error:", url, e.message);
    return [];
  }
}

// ══════════════════════════════════════════════
// BADGE HELPER
// ══════════════════════════════════════════════
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
    Planned: "b-gray",
    Pending: "b-amber",
    Scheduled: "b-amber",
    Monitoring: "b-amber",
    "Under Evaluation": "b-amber",
    Matched: "b-amber",
    Incompatible: "b-red",
    Expired: "b-red",
    Failed: "b-red",
    Rejected: "b-red",
    Cancelled: "b-red",
    Deceased: "b-gray",
    Inactive: "b-gray",
    // blood types
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

function fmt(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function loading(tbodyId, cols) {
  const el = document.getElementById(tbodyId);
  if (el)
    el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--muted)">Loading...</td></tr>`;
}

function empty(tbodyId, cols, msg = "No records found") {
  const el = document.getElementById(tbodyId);
  if (el)
    el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--muted)">${msg}</td></tr>`;
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
  // stat cards
  try {
    const res = await fetch(`${API}/api/stats`);
    const json = await res.json();
    if (json.success) {
      const d = json.data;
      document.getElementById("dash-donors").textContent = d.total_donors;
      document.getElementById("dash-recipients").textContent =
        d.active_recipients;
      document.getElementById("dash-transplants").textContent =
        d.transplants_done;
      document.getElementById("dash-waitlist").textContent = d.waitlist_count;
      document.getElementById("dash-hospitals").textContent = d.hospitals;
      document.getElementById("dash-staff").textContent = d.staff;
      document.getElementById("dash-tests").textContent = "-";
    }
  } catch (e) {
    console.error(e);
  }

  // recent transplants table
  const transplants = await apiFetch(`${API}/api/transplants`);
  const tbody = document.getElementById("dash-transplants-tbody");
  if (tbody) {
    tbody.innerHTML = transplants.length
      ? transplants
          .slice(0, 5)
          .map(
            (t) => `
          <tr>
            <td>#TR-${String(t.transplant_id).padStart(3, "0")}</td>
            <td>${t.organ_type}</td>
            <td>${t.donor_name} → ${t.recipient_name}</td>
            <td>${t.hospital_name}</td>
            <td>${badge(t.outcome || t.status)}</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">No transplant records yet</td></tr>`;
  }

  // critical waitlist
  const waitlist = await apiFetch(`${API}/api/waitlist`);
  const wlDiv = document.getElementById("dash-waitlist-items");
  if (wlDiv) {
    const critical = waitlist
      .filter((w) => w.urgency_level === "Critical")
      .slice(0, 4);
    wlDiv.innerHTML = critical.length
      ? critical
          .map(
            (w, i) => `
          <div class="wl-item">
            <div class="wl-rank">${i + 1}</div>
            <div class="wl-info">
              <div class="wl-name">${w.recipient_name}</div>
              <div class="wl-detail">${w.organ_type} • ${w.blood_type} • ${w.days_waiting} days</div>
            </div>
            ${badge(w.urgency_level)}
          </div>`,
          )
          .join("")
      : `<div style="padding:16px;color:var(--muted);font-size:13px">No critical patients</div>`;
  }

  // mini info cards
  const hospitals = await apiFetch(`${API}/api/hospitals`);
  const staff = await apiFetch(`${API}/api/staff`);
  const tests = await apiFetch(`${API}/api/compatibility`);
  if (document.getElementById("dash-hosp-total"))
    document.getElementById("dash-hosp-total").textContent = hospitals.length;
  if (document.getElementById("dash-staff-total"))
    document.getElementById("dash-staff-total").textContent = staff.length;
  if (document.getElementById("dash-tests-done"))
    document.getElementById("dash-tests-done").textContent = tests.length;
  if (document.getElementById("dash-tests-pending"))
    document.getElementById("dash-tests-pending").textContent = tests.filter(
      (t) => t.test_result === "Pending",
    ).length;

  // active chains
  const chains = await apiFetch(`${API}/api/chains`);
  const active = chains.filter((c) => c.status === "In Progress");
  const chainDiv = document.getElementById("dash-chains");
  if (chainDiv && active.length) {
    chainDiv.innerHTML = "";
    for (const chain of active.slice(0, 2)) {
      const links = await apiFetch(`${API}/api/chains/${chain.chain_id}/links`);
      chainDiv.innerHTML += `
        <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">
          ${chain.chain_name.toUpperCase()}
        </div>
        <div class="chain-row" style="${active.indexOf(chain) === active.length - 1 ? "border:none" : ""}">
          <div class="cnode"><div class="cnode-circle cd">D</div><div class="cnode-lbl">Donor</div></div>
          ${links
            .map(
              (l) => `
            <div class="carrow">→</div>
            <div class="cnode"><div class="cnode-circle cr">R</div><div class="cnode-lbl">${l.recipient_name.split(" ")[0]}</div></div>
          `,
            )
            .join("")}
        </div>
        <div style="margin-bottom:14px"></div>`;
    }
  }
}

// ══════════════════════════════════════════════
// ALL DONORS
// ══════════════════════════════════════════════
async function loadDonors() {
  loading("tbody-donors", 7);
  const donors = await apiFetch(`${API}/api/donors`);
  const tbody = document.getElementById("tbody-donors");
  if (!tbody) return;
  tbody.innerHTML = donors.length
    ? donors
        .map(
          (d) => `
        <tr>
          <td>#D-${d.donor_id}</td>
          <td>${d.name}</td>
          <td>${badge(d.blood_type)}</td>
          <td>${d.donor_type}</td>
          <td>${d.hospital_name}</td>
          <td>${d.age} yrs</td>
          <td>${badge(d.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No donors found</td></tr>`;
}

// ══════════════════════════════════════════════
// LIVING DONORS
// ══════════════════════════════════════════════
async function loadLivingDonors() {
  loading("tbody-donor-living", 6);
  const donors = await apiFetch(`${API}/api/donors/living`);
  const tbody = document.getElementById("tbody-donor-living");
  if (!tbody) return;
  tbody.innerHTML = donors.length
    ? donors
        .map(
          (d) => `
        <tr>
          <td>#DL-${d.donor_id}</td>
          <td>${d.name}</td>
          <td>${badge(d.blood_type)}</td>
          <td>${d.hospital_name}</td>
          <td>${d.age} yrs</td>
          <td>${badge(d.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No living donors</td></tr>`;
}

// ══════════════════════════════════════════════
// DECEASED DONORS
// ══════════════════════════════════════════════
async function loadDeceasedDonors() {
  loading("tbody-donor-deceased", 6);
  const donors = await apiFetch(`${API}/api/donors/deceased`);
  const tbody = document.getElementById("tbody-donor-deceased");
  if (!tbody) return;
  tbody.innerHTML = donors.length
    ? donors
        .map(
          (d) => `
        <tr>
          <td>#DD-${d.donor_id}</td>
          <td>${d.name}</td>
          <td>${badge(d.blood_type)}</td>
          <td>${fmt(d.registration_date)}</td>
          <td>${badge(d.medical_status)}</td>
          <td>${d.hospital_name}</td>
          <td>-</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No deceased donors</td></tr>`;
}

// ══════════════════════════════════════════════
// RECIPIENTS
// ══════════════════════════════════════════════
async function loadRecipients() {
  loading("tbody-recipients", 8);
  const recipients = await apiFetch(`${API}/api/recipients`);
  const tbody = document.getElementById("tbody-recipients");
  if (!tbody) return;
  tbody.innerHTML = recipients.length
    ? recipients
        .map(
          (r) => `
        <tr>
          <td>#R-${r.recipient_id}</td>
          <td>${r.name}</td>
          <td>${badge(r.blood_type)}</td>
          <td>-</td>
          <td>${r.region || "-"}</td>
          <td>${badge(r.urgency_level)}</td>
          <td>-</td>
          <td>${badge(r.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No recipients</td></tr>`;
}

// ══════════════════════════════════════════════
// WAITLIST
// ══════════════════════════════════════════════
async function loadWaitlist() {
  loading("tbody-waitlist", 8);
  const wl = await apiFetch(`${API}/api/waitlist`);
  const tbody = document.getElementById("tbody-waitlist");

  // update stat cards
  if (document.getElementById("wl-critical"))
    document.getElementById("wl-critical").textContent = wl.filter(
      (w) => w.urgency_level === "Critical",
    ).length;
  if (document.getElementById("wl-high"))
    document.getElementById("wl-high").textContent = wl.filter(
      (w) => w.urgency_level === "High",
    ).length;
  if (document.getElementById("wl-normal"))
    document.getElementById("wl-normal").textContent = wl.filter(
      (w) => w.urgency_level === "Medium" || w.urgency_level === "Low",
    ).length;
  if (document.getElementById("wl-total"))
    document.getElementById("wl-total").textContent = wl.length;

  if (!tbody) return;
  tbody.innerHTML = wl.length
    ? wl
        .map(
          (w, i) => `
        <tr>
          <td><b style="color:var(--red)">#${i + 1}</b></td>
          <td>${w.recipient_name}</td>
          <td>${badge(w.blood_type)}</td>
          <td>${w.organ_type}</td>
          <td>${w.hospital_name}</td>
          <td>${w.days_waiting}</td>
          <td>${badge(w.urgency_level)}</td>
          <td>${badge("Active")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">Waitlist empty</td></tr>`;
}

// ══════════════════════════════════════════════
// REGIONS
// ══════════════════════════════════════════════
async function loadRegions() {
  const [north, south, east, west] = await Promise.all([
    apiFetch(`${API}/api/recipients/north`),
    apiFetch(`${API}/api/recipients/south`),
    apiFetch(`${API}/api/recipients/east`),
    apiFetch(`${API}/api/recipients/west`),
  ]);

  const sets = [north, south, east, west];
  const ids = ["region-north", "region-south", "region-east", "region-west"];
  const max = Math.max(...sets.map((s) => s.length), 1);

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

// ══════════════════════════════════════════════
// ORGANS
// ══════════════════════════════════════════════
async function loadOrgans() {
  loading("tbody-organs", 8);
  const organs = await apiFetch(`${API}/api/organs`);
  const tbody = document.getElementById("tbody-organs");
  if (!tbody) return;
  tbody.innerHTML = organs.length
    ? organs
        .map(
          (o) => `
        <tr>
          <td>#ORG-${o.organ_id}</td>
          <td>${o.organ_type}</td>
          <td>#D-${o.donor_id}</td>
          <td>${badge(o.blood_type)}</td>
          <td>${fmt(o.harvest_date)}</td>
          <td>${o.hours_remaining != null ? o.hours_remaining + " hrs" : "-"}</td>
          <td>${o.hospital_name}</td>
          <td>${badge(o.status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No organs in inventory</td></tr>`;
}

// ══════════════════════════════════════════════
// COMPATIBILITY
// ══════════════════════════════════════════════
async function loadCompatibility() {
  loading("tbody-compatibility", 7);
  const tests = await apiFetch(`${API}/api/compatibility`);
  const tbody = document.getElementById("tbody-compatibility");
  if (!tbody) return;
  tbody.innerHTML = tests.length
    ? tests
        .slice(0, 30)
        .map(
          (t) => `
        <tr>
          <td>#CT-${t.test_id}</td>
          <td>${t.donor_name}</td>
          <td>${t.recipient_name}</td>
          <td>-</td>
          <td>${t.compatibility_score}%</td>
          <td>${badge(t.test_result)}</td>
          <td>${fmt(t.test_date)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No tests found</td></tr>`;
}

// ══════════════════════════════════════════════
// DONATION CHAINS
// ══════════════════════════════════════════════
async function loadChains() {
  loading("tbody-chains", 4);
  loading("tbody-chain-links", 6);
  const chains = await apiFetch(`${API}/api/chains`);
  const tbody = document.getElementById("tbody-chains");
  if (tbody) {
    tbody.innerHTML = chains.length
      ? chains
          .map(
            (c) => `
          <tr>
            <td>#DC-${c.chain_id}</td>
            <td>${fmt(c.start_date)}</td>
            <td>${c.total_transplants}</td>
            <td>${badge(c.status)}</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">No chains</td></tr>`;
  }

  // load links for first chain
  const tbody2 = document.getElementById("tbody-chain-links");
  if (tbody2 && chains.length) {
    const links = await apiFetch(
      `${API}/api/chains/${chains[0].chain_id}/links`,
    );
    tbody2.innerHTML = links.length
      ? links
          .map(
            (l) => `
          <tr>
            <td>#CL-${l.link_id}</td>
            <td>#DC-${l.chain_id}</td>
            <td>${l.donor_name}</td>
            <td>${l.recipient_name}</td>
            <td>-</td>
            <td>${l.sequence_number}</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No links</td></tr>`;
  }
}

// ══════════════════════════════════════════════
// TRANSPLANTS
// ══════════════════════════════════════════════
async function loadTransplants() {
  loading("tbody-transplants", 8);
  const list = await apiFetch(`${API}/api/transplants`);
  const tbody = document.getElementById("tbody-transplants");
  if (!tbody) return;
  tbody.innerHTML = list.length
    ? list
        .map(
          (t) => `
        <tr>
          <td>#TR-${t.transplant_id}</td>
          <td>${t.donor_name}</td>
          <td>${t.recipient_name}</td>
          <td>${t.organ_type}</td>
          <td>${t.hospital_name}</td>
          <td>${t.surgeon_name}</td>
          <td>${fmt(t.surgery_date)}</td>
          <td>${badge(t.outcome || "Pending")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No transplant records</td></tr>`;
}

// ══════════════════════════════════════════════
// TRANSPLANT MEDICAL
// ══════════════════════════════════════════════
async function loadTransplantMedical() {
  loading("tbody-transplant-medical", 5);
  loading("tbody-transplant-details", 5);
  const list = await apiFetch(`${API}/api/transplants`);

  const tbody1 = document.getElementById("tbody-transplant-medical");
  if (tbody1) {
    tbody1.innerHTML = list.length
      ? list
          .map(
            (t) => `
          <tr>
            <td>#TM-${t.transplant_id}</td>
            <td>#TR-${t.transplant_id}</td>
            <td>${t.surgeon_name}</td>
            <td>${badge(t.outcome || "Pending")}</td>
            <td>-</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>`;
  }

  const tbody2 = document.getElementById("tbody-transplant-details");
  if (tbody2) {
    tbody2.innerHTML = list.length
      ? list
          .map(
            (t) => `
          <tr>
            <td>#TD-${t.transplant_id}</td>
            <td>#TR-${t.transplant_id}</td>
            <td>${badge(t.surgery_status || t.status)}</td>
            <td>${fmt(t.surgery_date)}</td>
            <td>-</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>`;
  }
}

// ══════════════════════════════════════════════
// HOSPITALS
// ══════════════════════════════════════════════
async function loadHospitals() {
  loading("tbody-hospitals", 7);
  const list = await apiFetch(`${API}/api/hospitals`);
  const tbody = document.getElementById("tbody-hospitals");
  if (!tbody) return;
  tbody.innerHTML = list.length
    ? list
        .map(
          (h) => `
        <tr>
          <td>#H-${h.hospital_id}</td>
          <td>${h.name}</td>
          <td>${h.location}</td>
          <td>${h.region || "-"}</td>
          <td>${h.transplant_capacity}</td>
          <td>${h.specialization || "-"}</td>
          <td>${badge("Active")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No hospitals</td></tr>`;
}

// ══════════════════════════════════════════════
// STAFF
// ══════════════════════════════════════════════
async function loadStaff() {
  loading("tbody-staff", 7);
  const list = await apiFetch(`${API}/api/staff`);
  const tbody = document.getElementById("tbody-staff");
  if (!tbody) return;
  tbody.innerHTML = list.length
    ? list
        .map(
          (s) => `
        <tr>
          <td>#MS-${s.staff_id}</td>
          <td>${s.name}</td>
          <td>${s.specialization}</td>
          <td>${s.specialization}</td>
          <td>${s.hospital_name}</td>
          <td>${badge("Active")}</td>
          <td>${s.transplants_done}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No staff</td></tr>`;
}
