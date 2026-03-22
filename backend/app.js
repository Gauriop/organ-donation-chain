console.log("✅ app.js loaded");

const API = "http://localhost:3000";

// ── LANDING ↔ DASHBOARD ──────────────────────────────────────
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

// ── DROPDOWN TOGGLE ──────────────────────────────────────────
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

// ── PAGE NAVIGATION ──────────────────────────────────────────
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

// ── DONOR TYPE TOGGLE ────────────────────────────────────────
function toggleDT() {
  const v = document.getElementById("dtype").value;
  document.getElementById("lfield").style.display =
    v === "living" ? "" : "none";
  document.getElementById("dfield").style.display =
    v === "deceased" ? "" : "none";
}

// ── FORM ALERTS ──────────────────────────────────────────────
function ok(id) {
  const el = document.getElementById(id);
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3500);
}

// ── KEY FIX: apiFetch sends JWT token with every request ─────
// This makes PostgreSQL RLS work — backend connects as the
// actual logged-in user, so RLS filters rows automatically
async function apiFetch(url) {
  try {
    const token = sessionStorage.getItem("organlife_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (e) {
    console.error("API error:", e.message);
    return [];
  }
}

// ── BADGE HELPER ─────────────────────────────────────────────
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
    Completed: "b-green",
    "In Progress": "b-blue",
    Allocated: "b-blue",
    Transplanted: "b-blue",
    Matched: "b-amber",
    Monitoring: "b-amber",
    Pending: "b-amber",
    Scheduled: "b-amber",
    Planned: "b-amber",
    Borderline: "b-amber",
    Incompatible: "b-red",
    Expired: "b-red",
    Failed: "b-red",
    Rejected: "b-red",
    Deceased: "b-gray",
    "Under Evaluation": "b-gray",
    Inactive: "b-gray",
    Cancelled: "b-gray",
  };
  return `<span class="badge ${map[text] || "b-gray"}">${text}</span>`;
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString("en-IN") : "-";
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const token = sessionStorage.getItem("organlife_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API}/api/stats`, { headers });
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;
    document.querySelector("#apage-dashboard .s-red").textContent =
      d.total_donors;
    document.querySelector("#apage-dashboard .s-blue").textContent =
      d.active_recipients;
    document.querySelector("#apage-dashboard .s-green").textContent =
      d.transplants_done;
    document.querySelector("#apage-dashboard .s-amber").textContent =
      d.waitlist_count;
  } catch (e) {
    console.error(e);
  }

  const transplants = await apiFetch(`${API}/api/transplants`);
  const tbody = document.querySelector("#apage-dashboard table tbody");
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
      : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No transplant records yet</td></tr>`;
  }

  const wl = await apiFetch(`${API}/api/waitlist`);
  const wlDiv = document.getElementById("dash-waitlist-items");
  if (wlDiv) {
    const critical = wl
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

  const chains = await apiFetch(`${API}/api/chains`);
  const active = chains.filter((c) => c.status === "In Progress");
  const chainDiv = document.getElementById("dash-chains");
  if (chainDiv && active.length) {
    chainDiv.innerHTML = "";
    for (const chain of active.slice(0, 2)) {
      const links = await apiFetch(`${API}/api/chains/${chain.chain_id}/links`);
      chainDiv.innerHTML += `
        <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">${chain.chain_name?.toUpperCase() || "CHAIN #" + chain.chain_id}</div>
        <div class="chain-row">
          <div class="cnode"><div class="cnode-circle cd">D</div><div class="cnode-lbl">Donor</div></div>
          ${links.map((l) => `<div class="carrow">→</div><div class="cnode"><div class="cnode-circle cr">R</div><div class="cnode-lbl">${l.recipient_name?.split(" ")[0]}</div></div>`).join("")}
        </div>
        <div style="margin-bottom:14px"></div>`;
    }
  } else if (chainDiv) {
    chainDiv.innerHTML = `<div style="color:var(--muted);font-size:13px">No active chains</div>`;
  }
}

// ════════════════════════════════════════════════════════════
// DONORS
// ════════════════════════════════════════════════════════════
async function loadDonors() {
  const donors = await apiFetch(`${API}/api/donors`);
  const tbody = document.querySelector("#apage-donors-list table tbody");
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
          <td>${d.age}</td>
          <td>${badge(d.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No donors found</td></tr>`;
}

async function loadLivingDonors() {
  const donors = await apiFetch(`${API}/api/donors/living`);
  const tbody = document.querySelector("#apage-donor-living table tbody");
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
          <td>${d.age}</td>
          <td>${badge(d.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No living donors</td></tr>`;
}

async function loadDeceasedDonors() {
  const donors = await apiFetch(`${API}/api/donors/deceased`);
  const tbody = document.querySelector("#apage-donor-deceased table tbody");
  if (!tbody) return;
  tbody.innerHTML = donors.length
    ? donors
        .map(
          (d) => `
        <tr>
          <td>#DD-${d.donor_id}</td>
          <td>${d.name}</td>
          <td>${badge(d.blood_type)}</td>
          <td>${d.hospital_name}</td>
          <td>${d.age}</td>
          <td>${badge(d.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No deceased donors</td></tr>`;
}

async function submitDonor() {
  const name = (
    document.getElementById("d-fname").value +
    " " +
    document.getElementById("d-lname").value
  ).trim();
  const age = document.getElementById("d-age").value;
  const blood_type = document.getElementById("d-blood").value;
  const contact = document.getElementById("d-phone").value;
  const hospital_id = document.getElementById("d-hospital").value;
  const donor_type =
    document.getElementById("dtype").value === "living" ? "Living" : "Deceased";
  if (!name || !age || !contact || !hospital_id) {
    document.getElementById("da-err").style.display = "block";
    setTimeout(
      () => (document.getElementById("da-err").style.display = "none"),
      3000,
    );
    return;
  }
  try {
    const token = sessionStorage.getItem("organlife_token");
    const r = await fetch(`${API}/api/donors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    if (j.success) ok("da");
    else {
      document.getElementById("da-err").style.display = "block";
      setTimeout(
        () => (document.getElementById("da-err").style.display = "none"),
        3000,
      );
    }
  } catch (e) {
    alert("Backend not connected");
  }
}

// ════════════════════════════════════════════════════════════
// RECIPIENTS
// ════════════════════════════════════════════════════════════
async function loadRecipients() {
  const recipients = await apiFetch(`${API}/api/recipients`);
  const tbody = document.querySelector("#apage-recipients table tbody");
  if (!tbody) return;
  tbody.innerHTML = recipients.length
    ? recipients
        .map(
          (r) => `
        <tr>
          <td>#R-${r.recipient_id}</td>
          <td>${r.name}</td>
          <td>${badge(r.blood_type)}</td>
          <td>${r.hospital_name}</td>
          <td>${r.region || "-"}</td>
          <td>${badge(r.urgency_level)}</td>
          <td>${badge(r.medical_status)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No recipients</td></tr>`;
}

async function submitRecipient() {
  const name = (
    document.getElementById("r-fname").value +
    " " +
    document.getElementById("r-lname").value
  ).trim();
  const age = document.getElementById("r-age").value;
  const blood_type = document.getElementById("r-blood").value;
  const contact = document.getElementById("r-phone").value;
  const hospital_id = document.getElementById("r-hospital").value;
  const urgency_level = document.getElementById("r-urgency").value;
  if (!name || !age || !contact || !hospital_id) {
    document.getElementById("ra-err").style.display = "block";
    setTimeout(
      () => (document.getElementById("ra-err").style.display = "none"),
      3000,
    );
    return;
  }
  try {
    const token = sessionStorage.getItem("organlife_token");
    const r = await fetch(`${API}/api/recipients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    if (j.success) ok("ra");
    else {
      document.getElementById("ra-err").style.display = "block";
      setTimeout(
        () => (document.getElementById("ra-err").style.display = "none"),
        3000,
      );
    }
  } catch (e) {
    alert("Backend not connected");
  }
}

// ════════════════════════════════════════════════════════════
// WAITLIST
// ════════════════════════════════════════════════════════════
async function loadWaitlist() {
  const wl = await apiFetch(`${API}/api/waitlist`);
  const tbody = document.querySelector("#apage-waitlist table tbody");
  if (!tbody) return;
  const nums = document.querySelectorAll("#apage-waitlist .s-num");
  if (nums[0])
    nums[0].textContent = wl.filter(
      (w) => w.urgency_level === "Critical",
    ).length;
  if (nums[1])
    nums[1].textContent = wl.filter((w) => w.urgency_level === "High").length;
  if (nums[2])
    nums[2].textContent = wl.filter(
      (w) => w.urgency_level === "Medium" || w.urgency_level === "Low",
    ).length;
  if (nums[3]) nums[3].textContent = wl.length;
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
          <td>${badge(w.medical_status || "Active")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Waitlist empty</td></tr>`;
}

// ════════════════════════════════════════════════════════════
// REGIONS
// ════════════════════════════════════════════════════════════
async function loadRegions() {
  const [north, south, east, west] = await Promise.all([
    apiFetch(`${API}/api/recipients/north`),
    apiFetch(`${API}/api/recipients/south`),
    apiFetch(`${API}/api/recipients/east`),
    apiFetch(`${API}/api/recipients/west`),
  ]);
  const rcards = document.querySelectorAll("#apage-regions .rcard");
  [north, south, east, west].forEach((data, i) => {
    const card = rcards[i];
    if (!card) return;
    const critical = data.filter((r) => r.urgency_level === "Critical").length;
    const bar = card.querySelector(".rbar-fill");
    const info = card.querySelectorAll("b");
    if (bar)
      bar.style.width =
        Math.min(100, Math.round((data.length / 60) * 100)) + "%";
    if (info[0]) info[0].textContent = data.length;
    if (info[1]) info[1].textContent = critical;
  });
}

// ════════════════════════════════════════════════════════════
// ORGANS
// ════════════════════════════════════════════════════════════
async function loadOrgans() {
  const organs = await apiFetch(`${API}/api/organs`);
  const tbody = document.querySelector("#apage-organs table tbody");
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
    : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No organs</td></tr>`;
}

// ════════════════════════════════════════════════════════════
// COMPATIBILITY
// ════════════════════════════════════════════════════════════
async function loadCompatibility() {
  const tests = await apiFetch(`${API}/api/compatibility`);
  const tbody = document.querySelector(
    "#apage-compatibility .tcard table tbody",
  );
  if (!tbody) return;
  tbody.innerHTML = tests.length
    ? tests
        .slice(0, 20)
        .map(
          (t) => `
        <tr>
          <td>#CT-${t.test_id}</td>
          <td>${t.donor_name}</td>
          <td>${t.recipient_name}</td>
          <td>${t.organ_type || "-"}</td>
          <td>${t.compatibility_score}%</td>
          <td>${badge(t.test_result)}</td>
          <td>${fmt(t.test_date)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No tests</td></tr>`;
}

// ════════════════════════════════════════════════════════════
// CHAINS
// ════════════════════════════════════════════════════════════
async function loadChains() {
  const chains = await apiFetch(`${API}/api/chains`);
  const tbody = document.querySelector(
    "#apage-donation-chain .tcard table tbody",
  );
  if (!tbody) return;
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
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No chains</td></tr>`;

  if (chains.length) {
    const links = await apiFetch(
      `${API}/api/chains/${chains[0].chain_id}/links`,
    );
    const tbody2 = document.querySelectorAll(
      "#apage-donation-chain .tcard table tbody",
    )[1];
    if (tbody2) {
      tbody2.innerHTML = links.length
        ? links
            .map(
              (l) => `
            <tr>
              <td>#CL-${l.link_id}</td>
              <td>#DC-${l.chain_id}</td>
              <td>${l.donor_name}</td>
              <td>${l.recipient_name}</td>
              <td>${l.sequence_number}</td>
            </tr>`,
            )
            .join("")
        : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">No links</td></tr>`;
    }
  }
}

// ════════════════════════════════════════════════════════════
// TRANSPLANTS
// ════════════════════════════════════════════════════════════
async function loadTransplants() {
  const list = await apiFetch(`${API}/api/transplants`);
  const tbody = document.querySelector("#apage-transplants table tbody");
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
    : `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">No records</td></tr>`;
}

async function loadTransplantMedical() {
  const list = await apiFetch(`${API}/api/transplants`);
  const tbody1 = document.querySelectorAll(
    "#apage-transplant-medical table tbody",
  )[0];
  if (tbody1) {
    tbody1.innerHTML =
      list
        .slice(0, 10)
        .map(
          (t) => `
      <tr>
        <td>#TM-${t.transplant_id}</td>
        <td>#TR-${t.transplant_id}</td>
        <td>${t.surgeon_name}</td>
        <td>${badge(t.outcome || "Pending")}</td>
      </tr>`,
        )
        .join("") ||
      `<tr><td colspan="4" style="text-align:center;color:var(--muted)">No records</td></tr>`;
  }
  const tbody2 = document.querySelectorAll(
    "#apage-transplant-medical table tbody",
  )[1];
  if (tbody2) {
    tbody2.innerHTML =
      list
        .slice(0, 10)
        .map(
          (t) => `
      <tr>
        <td>#TD-${t.transplant_id}</td>
        <td>#TR-${t.transplant_id}</td>
        <td>${badge(t.surgery_status || t.status)}</td>
        <td>${fmt(t.surgery_date)}</td>
      </tr>`,
        )
        .join("") ||
      `<tr><td colspan="4" style="text-align:center;color:var(--muted)">No records</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════
// HOSPITALS
// ════════════════════════════════════════════════════════════
async function loadHospitals() {
  const list = await apiFetch(`${API}/api/hospitals`);
  const tbody = document.querySelector("#apage-hospitals table tbody");
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
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No hospitals</td></tr>`;
}

// ════════════════════════════════════════════════════════════
// STAFF
// ════════════════════════════════════════════════════════════
async function loadStaff() {
  const list = await apiFetch(`${API}/api/staff`);
  const tbody = document.querySelector("#apage-staff table tbody");
  if (!tbody) return;
  tbody.innerHTML = list.length
    ? list
        .map(
          (s) => `
        <tr>
          <td>#MS-${s.staff_id}</td>
          <td>${s.name}</td>
          <td>${s.specialization}</td>
          <td>${s.hospital_name}</td>
          <td>${s.region || "-"}</td>
          <td>${badge("Active")}</td>
          <td>${s.transplants_done}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No staff</td></tr>`;
}
