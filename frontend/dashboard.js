const API = "http://localhost:3000";

// ── USER SESSION ──
const user = JSON.parse(
  sessionStorage.getItem("organlife_user") ||
    '{"username":"Admin","role":"admin"}',
);
const initials = user.username.slice(0, 2).toUpperCase();
document.getElementById("sb-avatar").textContent = initials;
document.getElementById("top-avatar").textContent = initials;
document.getElementById("sb-avatar").textContent = initials;

function logout() {
  sessionStorage.removeItem("organlife_user");
  sessionStorage.removeItem("organlife_token");
  window.location.href = "/frontend/login.html";
}

function toggleFlyout(id) {
  const flyout = document.getElementById(id);
  if (!flyout) return;
  const isOpen = flyout.classList.contains("open");
  closeFlyouts();
  if (!isOpen) {
    const btn = document.querySelector('[onclick*="' + id + '"]');
    if (btn) {
      const r = btn.getBoundingClientRect();
      flyout.style.top = r.top + "px";
      flyout.style.left = r.right + 6 + "px";
    }
    flyout.classList.add("open");
  }
}
function closeFlyouts() {
  document
    .querySelectorAll(".snav-flyout")
    .forEach((f) => f.classList.remove("open"));
}
function setFlyActive(el) {
  document
    .querySelectorAll(".flyout-item")
    .forEach((i) => i.classList.remove("fi-active"));
  el.classList.add("fi-active");
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sidebar")) closeFlyouts();
});

// map page → which sidebar icon to highlight
const pageToNav = {
  dashboard: "snav-dashboard",
  "donor-reg": "snav-donors",
  "donors-list": "snav-donors",
  "donor-living": "snav-donors",
  "donor-deceased": "snav-donors",
  "donor-approved": "snav-donors",
  "donor-pending": "snav-donors",
  "recipient-reg": "snav-recipients",
  recipients: "snav-recipients",
  waitlist: "snav-recipients",
  "waitlist-critical": "snav-recipients",
  "waitlist-normal": "snav-recipients",
  regions: "snav-recipients",
  organs: "snav-organs",
  "organs-available": "snav-organs",
  "organs-allocated": "snav-organs",
  compatibility: "snav-organs",
  "compat-summary": "snav-organs",
  "donation-chain": "snav-organs",
  transplants: "snav-transplants",
  "transplant-medical": "snav-transplants",
  hospitals: "snav-infra",
  "hosp-north": "snav-infra",
  "hosp-south": "snav-infra",
  "hosp-east": "snav-infra",
  "hosp-west": "snav-infra",
  staff: "snav-infra",
  qopt: "snav-infra",
  qopt: "snav-qopt",
};

// ── NAVIGATION ──
const titles = {
  dashboard: "Dashboard",
  "donor-reg": "Register Donor",
  "donors-list": "All Donors",
  "donor-living": "Living Donors",
  "donor-deceased": "Deceased Donors",
  "donor-approved": "Approved Donors",
  "donor-pending": "Pending Donors",
  "recipient-reg": "Add Recipient",
  recipients: "All Recipients",
  waitlist: "Waitlist",
  "waitlist-critical": "Critical Waitlist",
  "waitlist-normal": "Normal Waitlist",
  regions: "Recipients by Region",
  organs: "Organ Inventory",
  "organs-available": "Available Organs",
  "organs-allocated": "Allocated Organs",
  compatibility: "Compatibility Test",
  "compat-summary": "Compatibility Summary",
  "donation-chain": "Donation Chain",
  transplants: "Transplant Records",
  "transplant-medical": "Medical Details",
  hospitals: "Hospitals",
  "hosp-north": "North Hospitals",
  "hosp-south": "South Hospitals",
  "hosp-east": "East Hospitals",
  "hosp-west": "West Hospitals",
  staff: "Medical Staff",
  qopt: "⚡ Query Optimization",
};
const loaders = {
  dashboard: loadDashboard,
  "donors-list": loadDonors,
  "donor-living": loadLivingDonors,
  "donor-deceased": loadDeceasedDonors,
  "donor-approved": loadApprovedDonors,
  "donor-pending": loadPendingDonors,
  recipients: loadRecipients,
  waitlist: loadWaitlist,
  "waitlist-critical": loadCriticalWaitlist,
  "waitlist-normal": loadNormalWaitlist,
  regions: loadRegions,
  organs: loadOrgans,
  "organs-available": loadAvailableOrgans,
  "organs-allocated": loadAllocatedOrgans,
  compatibility: loadCompatibility,
  "compat-summary": loadCompatSummary,
  "donation-chain": loadChains,
  transplants: loadTransplants,
  "transplant-medical": loadTransplantMedical,
  hospitals: loadHospitals,
  "hosp-north": () => loadHospRegion("north"),
  "hosp-south": () => loadHospRegion("south"),
  "hosp-east": () => loadHospRegion("east"),
  "hosp-west": () => loadHospRegion("west"),
  staff: loadStaff,
  qopt: loadQueryOptimizer,
};

function showPage(id, navEl) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("page-" + id)?.classList.add("active");
  // highlight correct sidebar icon
  document
    .querySelectorAll(".snav-btn")
    .forEach((b) => b.classList.remove("active"));
  const navId = pageToNav[id];
  if (navId) document.getElementById(navId)?.classList.add("active");
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

// ── CHART HELPERS ──────────────────────────────────────────
function drawDonut(canvasId, data, colors, lineWidth = 18) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2,
    cy = canvas.height / 2;
  const r = Math.min(cx, cy) - lineWidth / 2 - 2;
  const total = data.reduce((a, b) => a + b, 0);
  let start = -Math.PI / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#f0eef8";
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  data.forEach((val, i) => {
    if (!val) return;
    const sweep = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + sweep);
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
    start += sweep;
  });
}

function drawRing(canvasId, pct, color, bg = "#f0eef8") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2,
    cy = canvas.height / 2,
    r = cx - 10;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = bg;
  ctx.lineWidth = 14;
  ctx.stroke();
  const sweep = (pct / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + sweep);
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.offsetWidth || 200,
    h = 36;
  canvas.width = w;
  canvas.height = h;
  if (!data.length) return;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1 || 1)) * w,
    h - ((v - min) / range) * (h - 6) - 3,
  ]);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBarChart(canvasId, labels, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width || canvas.offsetWidth;
  const h = canvas.height;
  const max = Math.max(...data) || 1;
  const bw = (w - 20) / data.length - 6;
  ctx.clearRect(0, 0, w, h);
  data.forEach((val, i) => {
    const bh = (val / max) * (h - 30);
    const x = 10 + i * (bw + 6);
    const y = h - bh - 20;
    // bar
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, 4);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // label
    ctx.fillStyle = "#7c7a8e";
    ctx.font = "10px DM Sans";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + bw / 2, h - 4);
    // value
    ctx.fillStyle = "#1a1826";
    ctx.font = "bold 11px DM Sans";
    ctx.fillText(val, x + bw / 2, y - 4);
  });
}

// ── QUERY OPTIMIZER ────────────────────────────────────────

const QUERIES = [
  {
    id: "q1",
    label: "Available Organs by Blood Type",
    desc: "Organ matching — most frequent operation. Finds available organs matching a blood type.",
    icon: "🫀",
    color: "#e8344a",
    index: "idx_organ_status + idx_donor_blood_type",
    endpoint: "/api/qopt/available-organs",
  },
  {
    id: "q2",
    label: "Critical Waitlist Priority",
    desc: "Emergency lookup — retrieves critical patients ordered by priority score.",
    icon: "🚨",
    color: "#f59e0b",
    index: "idx_recipient_urgency_status + idx_waitlist_priority",
    endpoint: "/api/qopt/critical-waitlist",
  },
  {
    id: "q3",
    label: "Compatible Donor-Recipient Pairs",
    desc: "Finds compatible pairs with score ≥ 85%, ordered by compatibility score.",
    icon: "🧬",
    color: "#3b82f6",
    index: "idx_compatibility_result_score",
    endpoint: "/api/qopt/compatible-pairs",
  },
  {
    id: "q4",
    label: "Transplant Success by Hospital",
    desc: "Hospital performance report — completed transplants with success rate.",
    icon: "🏨",
    color: "#1db87a",
    index: "idx_transplant_status_outcome + idx_transplant_surgery_date",
    endpoint: "/api/qopt/hospital-success",
  },
  {
    id: "q5",
    label: "Expiring Organs (24 hrs)",
    desc: "Organs expiring within 24 hours — time-critical matching query.",
    icon: "⏰",
    color: "#e8344a",
    index: "idx_organ_status + idx_organ_type_status",
    endpoint: "/api/qopt/expiring-organs",
  },
  {
    id: "q6",
    label: "Active Donation Chains",
    desc: "Full chain tracking — joins chain, links, donors and recipients.",
    icon: "🔗",
    color: "#8b5cf6",
    index: "idx_chain_status + idx_chain_link_chain",
    endpoint: "/api/qopt/active-chains",
  },
  {
    id: "q7",
    label: "Donor Utilization Rate",
    desc: "How many organs from each donor type were actually transplanted.",
    icon: "📊",
    color: "#f59e0b",
    index: "idx_donor_type_status + idx_organ_donor",
    endpoint: "/api/qopt/donor-utilization",
  },
  {
    id: "q8",
    label: "Blood Type Demand vs Supply",
    desc: "Compares available organs vs waiting recipients per blood type.",
    icon: "🩸",
    color: "#e8344a",
    index: "idx_donor_blood_type + idx_recipient_blood_type",
    endpoint: "/api/qopt/blood-type-match",
  },
  {
    id: "q9",
    label: "Hospital Capacity vs Load",
    desc: "How many donors, recipients and transplants each hospital handles vs its capacity.",
    icon: "🏨",
    color: "#8b5cf6",
    index: "idx_transplant_hospital",
    endpoint: "/api/qopt/hospital-load",
  },
  {
    id: "q10",
    label: "Regional Performance Comparison",
    desc: "North vs South vs East vs West — hospitals, donors, recipients, transplants per region.",
    icon: "🗺️",
    color: "#06b6d4",
    index: "idx_hospital_region",
    endpoint: "/api/qopt/region-performance",
  },
  {
    id: "q11",
    label: "Staff Workload by Specialization",
    desc: "Which specialization handles the most transplants — avg per staff member.",
    icon: "👨‍⚕️",
    color: "#1db87a",
    index: "idx_staff_specialization + idx_transplant_staff",
    endpoint: "/api/qopt/staff-workload",
  },
  {
    id: "q12",
    label: "Urgency Distribution by Hospital",
    desc: "How many Critical/High/Medium/Low recipients each hospital is managing.",
    icon: "🚑",
    color: "#e8344a",
    index: "idx_recipient_hospital_urgency",
    endpoint: "/api/qopt/urgency-by-hospital",
  },
];

function loadQueryOptimizer() {
  const grid = document.getElementById("qopt-cards");
  if (!grid) return;
  // update total count
  const tot = document.getElementById("qopt-total-count");
  if (tot) tot.textContent = QUERIES.length;
  grid.innerHTML = QUERIES.map(
    (q, idx) => `
          <div style="background:white;border-radius:16px;border:1px solid var(--border);overflow:hidden;" id="card-${q.id}">
            <!-- Header -->
            <div style="background:${q.color}18;border-bottom:1px solid ${q.color}30;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:28px;height:28px;background:${q.color};border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;flex-shrink:0;">Q${idx + 1}</div>
                <span style="font-size:20px;">${q.icon}</span>
                <div>
                  <div style="font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;color:#1a1826;">${q.label}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${q.desc}</div>
                </div>
              </div>
              <button onclick="runSingleQuery('${q.id}')"
                style="background:${q.color};color:white;border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;">
                ▶ Run
              </button>
            </div>
            <!-- Timing Bar -->
            <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" id="timing-${q.id}">
              <div style="background:#fef2f2;border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:#e8344a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">🐌 Without Index</div>
                <div style="font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#e8344a;" id="before-${q.id}">—</div>
                <div style="font-size:10px;color:var(--muted);">ms (avg of 3 runs)</div>
              </div>
              <div style="background:#f0fdf4;border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:#1db87a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">🚀 With Index</div>
                <div style="font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#1db87a;" id="after-${q.id}">—</div>
                <div style="font-size:10px;color:var(--muted);">ms (avg of 3 runs)</div>
              </div>
              <div style="background:#eff6ff;border-radius:10px;padding:12px;text-align:center;">
                <div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">📈 Speedup</div>
                <div style="font-family:'Nunito',sans-serif;font-size:22px;font-weight:900;color:#3b82f6;" id="speedup-${q.id}">—</div>
                <div style="font-size:10px;color:var(--muted);">× faster</div>
              </div>
            </div>
            <!-- Visual speedup bar -->
            <div style="padding:0 20px 4px;" id="speedbar-wrap-${q.id}" style="display:none;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:10px;color:var(--muted);width:80px;flex-shrink:0;">No Index</span>
                <div style="flex:1;height:8px;background:#fde8ec;border-radius:4px;overflow:hidden;">
                  <div id="speedbar-before-${q.id}" style="height:100%;background:#e8344a;border-radius:4px;width:100%;transition:width .6s;"></div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                <span style="font-size:10px;color:var(--muted);width:80px;flex-shrink:0;">With Index</span>
                <div style="flex:1;height:8px;background:#e8faf3;border-radius:4px;overflow:hidden;">
                  <div id="speedbar-after-${q.id}" style="height:100%;background:#1db87a;border-radius:4px;width:0%;transition:width .6s;"></div>
                </div>
              </div>
            </div>
            <!-- Progress bar -->
            <div style="padding:8px 20px;display:none;" id="progress-${q.id}">
              <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
                <div style="height:100%;background:${q.color};border-radius:2px;animation:progressAnim 1.5s ease infinite;"></div>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:center;" id="pstatus-${q.id}">Running...</div>
            </div>
            <!-- Index info -->
            <div style="padding:8px 20px 14px;font-size:11px;color:var(--muted);">
              <span style="background:#f0f0f8;border-radius:6px;padding:3px 8px;font-family:monospace;">📑 Index: ${q.index}</span>
            </div>
            <!-- Results table -->
            <div style="border-top:1px solid var(--border);display:none;" id="results-${q.id}">
              <div style="padding:10px 20px;font-size:12px;font-weight:700;color:var(--muted);background:#fafafa;">Query Results <span id="rowcount-${q.id}" style="color:#3b82f6;"></span></div>
              <div style="overflow-x:auto;max-height:200px;overflow-y:auto;" id="table-${q.id}"></div>
            </div>
          </div>`,
  ).join("");
}

async function runSingleQuery(qid) {
  const q = QUERIES.find((x) => x.id === qid);
  if (!q) return;
  const progEl = document.getElementById("progress-" + qid);
  const resEl = document.getElementById("results-" + qid);
  const beforeEl = document.getElementById("before-" + qid);
  const afterEl = document.getElementById("after-" + qid);
  const speedupEl = document.getElementById("speedup-" + qid);
  const pstatEl = document.getElementById("pstatus-" + qid);
  const rcEl = document.getElementById("rowcount-" + qid);
  const tableEl = document.getElementById("table-" + qid);

  if (progEl) progEl.style.display = "block";
  if (resEl) resEl.style.display = "none";

  try {
    // Step 1: run WITHOUT index
    if (pstatEl) pstatEl.textContent = "Step 1/2: Running without index...";
    const token = sessionStorage.getItem("organlife_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const r1 = await fetch(`${API}${q.endpoint}?indexed=false`, { headers });
    const j1 = await r1.json();
    const beforeMs = j1.execution_ms || 0;
    if (beforeEl) beforeEl.textContent = beforeMs.toFixed(2);

    // Step 2: run WITH index
    if (pstatEl) pstatEl.textContent = "Step 2/2: Running with index...";
    const r2 = await fetch(`${API}${q.endpoint}?indexed=true`, { headers });
    const j2 = await r2.json();
    const afterMs = j2.execution_ms || 0;
    if (afterEl) afterEl.textContent = afterMs.toFixed(2);

    // Speedup — handle edge cases
    let speedupText = "—";
    let speedupColor = "#3b82f6";
    if (beforeMs > 0 && afterMs > 0) {
      const ratio = beforeMs / afterMs;
      speedupText = ratio.toFixed(2) + "x";
      speedupColor =
        ratio >= 2 ? "#1db87a" : ratio >= 1.2 ? "#f59e0b" : "#3b82f6";
    } else if (beforeMs > 0 && afterMs === 0) {
      speedupText = "∞";
    }
    if (speedupEl) {
      speedupEl.textContent = speedupText;
      speedupEl.style.color = speedupColor;
    }

    // Visual speedup bar
    const wrapEl = document.getElementById("speedbar-wrap-" + qid);
    const barB = document.getElementById("speedbar-before-" + qid);
    const barA = document.getElementById("speedbar-after-" + qid);
    if (wrapEl && barB && barA && beforeMs > 0) {
      wrapEl.style.display = "block";
      const pct = Math.min((afterMs / beforeMs) * 100, 100);
      setTimeout(() => {
        barA.style.width = pct + "%";
      }, 100);
    }

    // Show results table
    if (j2.data && j2.data.length > 0) {
      const cols = Object.keys(j2.data[0]);
      const tableHTML = `<table style="width:100%;font-size:12px;">
              <thead><tr>${cols.map((c) => `<th style="padding:8px 12px;text-align:left;background:#f8f7ff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap;">${c}</th>`).join("")}</tr></thead>
              <tbody>${j2.data
                .slice(0, 10)
                .map(
                  (row) =>
                    `<tr>${cols.map((c) => `<td style="padding:7px 12px;border-top:1px solid var(--border);white-space:nowrap;">${row[c] ?? "-"}</td>`).join("")}</tr>`,
                )
                .join("")}</tbody>
            </table>`;
      if (tableEl) tableEl.innerHTML = tableHTML;
      if (rcEl) rcEl.textContent = `(${j2.data.length} rows)`;
      if (resEl) resEl.style.display = "block";
    }

    updateSummaryCards();
  } catch (e) {
    if (beforeEl) beforeEl.textContent = "ERR";
    console.error(e);
  }
  if (progEl) progEl.style.display = "none";
}

async function runAllQueries(indexedOnly = false) {
  const statusEl = document.getElementById("qopt-status");
  if (statusEl) statusEl.textContent = "Running all queries...";
  for (let i = 0; i < QUERIES.length; i++) {
    if (statusEl)
      statusEl.textContent = `Running query ${i + 1} of ${QUERIES.length}...`;
    await runSingleQuery(QUERIES[i].id);
    await new Promise((r) => setTimeout(r, 300));
  }
  if (statusEl) statusEl.textContent = "✅ All done!";
  setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 3000);
}

function updateSummaryCards() {
  const befores = [],
    afters = [];
  QUERIES.forEach((q) => {
    const b = parseFloat(
      document.getElementById("before-" + q.id)?.textContent,
    );
    const a = parseFloat(document.getElementById("after-" + q.id)?.textContent);
    if (!isNaN(b)) befores.push(b);
    if (!isNaN(a)) afters.push(a);
  });
  if (befores.length) {
    const avgB = (befores.reduce((s, v) => s + v, 0) / befores.length).toFixed(
      2,
    );
    const avgA = afters.length
      ? (afters.reduce((s, v) => s + v, 0) / afters.length).toFixed(2)
      : "—";
    const avgS =
      afters.length && avgA !== "—" ? (avgB / avgA).toFixed(1) + "x" : "—";
    const el1 = document.getElementById("qopt-avg-before");
    if (el1) el1.textContent = avgB + "ms";
    const el2 = document.getElementById("qopt-avg-after");
    if (el2) el2.textContent = avgA + "ms";
    const el3 = document.getElementById("qopt-avg-speedup");
    if (el3) el3.textContent = avgS;
  }
}

// ── DASHBOARD ──────────────────────────────────────────────
async function loadDashboard() {
  // set greeting
  const now = new Date();
  const hour = now.getHours();
  const greet =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const user = JSON.parse(sessionStorage.getItem("organlife_user") || "{}");
  document.getElementById("dash-greeting").textContent =
    `${greet}, ${user.username || "Admin"} 👋`;
  document.getElementById("dash-date").textContent = now.toLocaleDateString(
    "en-IN",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  // stats
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
      document.getElementById("dash-chains-count").textContent =
        d.active_chains;
      // sparklines with dummy trend data (animate from 0 to value)
      const trend = (v) =>
        Array.from({ length: 8 }, (_, i) =>
          Math.max(
            0,
            v -
              Math.floor(Math.random() * Math.floor(v * 0.3)) +
              Math.floor(i * (v * 0.04)),
          ),
        );
      setTimeout(() => {
        drawSparkline("spark-donors", trend(d.total_donors), "white");
        drawSparkline("spark-recipients", trend(d.active_recipients), "white");
        drawSparkline("spark-transplants", trend(d.transplants_done), "white");
        drawSparkline("spark-waitlist", trend(d.waitlist_count), "white");
      }, 300);
    }
  } catch (e) {}

  // fetch data
  const [
    organs,
    waitlist,
    transplants,
    donors,
    tests,
    chains,
    north,
    south,
    east,
    west,
  ] = await Promise.all([
    apiFetch(`${API}/api/organs`),
    apiFetch(`${API}/api/waitlist`),
    apiFetch(`${API}/api/transplants`),
    apiFetch(`${API}/api/donors`),
    apiFetch(`${API}/api/compatibility`),
    apiFetch(`${API}/api/chains`),
    apiFetch(`${API}/api/recipients/north`),
    apiFetch(`${API}/api/recipients/south`),
    apiFetch(`${API}/api/recipients/east`),
    apiFetch(`${API}/api/recipients/west`),
  ]);

  document.getElementById("dash-tests-done").textContent = tests.length;

  // ── ORGAN DONUT ──
  const avail = organs.filter((o) => o.status === "Available").length;
  const allocated = organs.filter((o) => o.status === "Allocated").length;
  const transplanted = organs.filter((o) => o.status === "Transplanted").length;
  const expired = organs.filter((o) => o.status === "Expired").length;
  setTimeout(
    () =>
      drawDonut(
        "chart-organs",
        [avail, allocated, transplanted, expired],
        ["#1db87a", "#3b82f6", "#e8344a", "#d1d5db"],
      ),
    200,
  );
  document.getElementById("organ-legend").innerHTML = [
    ["Available", avail, "#1db87a"],
    ["Allocated", allocated, "#3b82f6"],
    ["Transplanted", transplanted, "#e8344a"],
    ["Expired", expired, "#d1d5db"],
  ]
    .map(
      ([l, v, c]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${c};flex-shrink:0;"></div>
              <span style="font-size:12.5px;color:var(--muted);">${l}</span>
            </div>
            <span style="font-size:13px;font-weight:700;color:var(--text);">${v}</span>
          </div>`,
    )
    .join("");

  // ── CRITICAL RING ──
  const critical = waitlist.filter(
    (w) => w.urgency_level === "Critical",
  ).length;
  const pct = waitlist.length
    ? Math.round((critical / waitlist.length) * 100)
    : 0;
  setTimeout(() => drawRing("chart-critical", pct, "#e8344a"), 200);
  document.getElementById("pct-critical").textContent = pct + "%";
  document.getElementById("txt-critical").textContent =
    `${critical} of ${waitlist.length} patients`;

  // ── SUCCESS RING ──
  const completed = transplants.filter((t) => t.status === "Completed").length;
  const successful = transplants.filter(
    (t) => t.outcome === "Successful",
  ).length;
  const successPct = completed ? Math.round((successful / completed) * 100) : 0;
  setTimeout(() => drawRing("chart-success", successPct || 75, "#1db87a"), 200);
  document.getElementById("pct-success").textContent =
    (successPct || "—") + (successPct ? "%" : "");
  document.getElementById("txt-success").textContent =
    `${successful} of ${completed} completed`;

  // ── CRITICAL WAITLIST CARDS ──
  const critDiv = document.getElementById("dash-waitlist-cards");
  if (critDiv) {
    const crit = waitlist
      .filter((w) => w.urgency_level === "Critical")
      .slice(0, 4);
    critDiv.innerHTML = crit.length
      ? crit
          .map(
            (w, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">
              <div style="width:28px;height:28px;border-radius:8px;background:var(--red-bg);color:var(--red);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">${i + 1}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.recipient_name}</div>
                <div style="font-size:11px;color:var(--muted);">${w.organ_type} • ${w.blood_type} • ${w.days_waiting}d</div>
              </div>
              <span style="background:var(--red-bg);color:var(--red);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0;">Critical</span>
            </div>`,
          )
          .join("")
      : '<div style="color:var(--muted);font-size:13px;padding:8px 0;">No critical patients 🎉</div>';
  }

  // ── TRANSPLANT TIMELINE ──
  const tlDiv = document.getElementById("dash-transplant-timeline");
  if (tlDiv) {
    tlDiv.innerHTML =
      transplants
        .slice(0, 5)
        .map(
          (t) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <div style="width:8px;height:8px;border-radius:50%;background:${t.outcome === "Successful" ? "#1db87a" : t.outcome === "Pending" ? "#f59e0b" : "#e8344a"};flex-shrink:0;margin-top:1px;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.organ_type} — ${t.donor_name?.split(" ")[0]} → ${t.recipient_name?.split(" ")[0]}</div>
                <div style="font-size:11px;color:var(--muted);">${t.hospital_name} • ${fmt(t.surgery_date)}</div>
              </div>
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0;
                background:${t.outcome === "Successful" ? "#e8faf3" : t.outcome === "Pending" ? "#fef3c7" : "var(--red-bg)"};
                color:${t.outcome === "Successful" ? "#0a7a4e" : t.outcome === "Pending" ? "#92400e" : "var(--red)"};">
                ${t.outcome || "Pending"}
              </span>
            </div>`,
        )
        .join("") ||
      '<div style="color:var(--muted);font-size:13px;">No records yet</div>';
  }

  // ── BLOOD TYPE BAR CHART ──
  const btCounts = {};
  donors.forEach((d) => {
    btCounts[d.blood_type] = (btCounts[d.blood_type] || 0) + 1;
  });
  const btLabels = Object.keys(btCounts);
  const btData = btLabels.map((k) => btCounts[k]);
  const btColors = [
    "#e8344a",
    "#f2647a",
    "#3b82f6",
    "#60a5fa",
    "#1db87a",
    "#34d399",
    "#f59e0b",
    "#fbbf24",
  ];
  setTimeout(
    () => drawBarChart("chart-bloodtype", btLabels, btData, btColors),
    300,
  );

  // ── REGION BAR CHART ──
  const regionData = [north.length, south.length, east.length, west.length];
  const regionLabels = ["North", "South", "East", "West"];
  const regionColors = ["#3b82f6", "#1db87a", "#f59e0b", "#e8344a"];
  setTimeout(
    () => drawBarChart("chart-regions", regionLabels, regionData, regionColors),
    300,
  );
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
  const regions = [
    { data: n, key: "north" },
    { data: s, key: "south" },
    { data: e, key: "east" },
    { data: w, key: "west" },
  ];
  // stat cards
  regions.forEach(({ data, key }) => {
    const crit = data.filter((r) => r.urgency_level === "Critical").length;
    const s1 = document.getElementById("rstat-" + key);
    const s2 = document.getElementById("rcrit-" + key);
    const s3 = document.getElementById("badge-" + key);
    if (s1) s1.textContent = data.length;
    if (s2) s2.textContent = crit;
    if (s3) s3.textContent = data.length + " recipients";
  });
  // total bar chart
  setTimeout(
    () =>
      drawBarChart(
        "chart-region-total",
        ["North", "South", "East", "West"],
        [n.length, s.length, e.length, w.length],
        ["#3b82f6", "#1db87a", "#f59e0b", "#e8344a"],
      ),
    200,
  );
  // urgency grouped bar chart
  setTimeout(() => {
    const canvas = document.getElementById("chart-region-urgency");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = ["North", "South", "East", "West"];
    const urgencies = [
      { label: "Critical", color: "#e8344a" },
      { label: "High", color: "#f59e0b" },
      { label: "Medium", color: "#3b82f6" },
      { label: "Low", color: "#1db87a" },
    ];
    const allData = [n, s, e, w];
    const vals = urgencies.map((u) =>
      allData.map((d) => d.filter((r) => r.urgency_level === u.label).length),
    );
    const cw = canvas.offsetWidth || 500,
      ch = 160;
    canvas.width = cw;
    canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    const groupW = (cw - 40) / 4,
      bw = groupW / 4 - 2,
      maxV = Math.max(...vals.flat()) || 1;
    vals.forEach((v, di) =>
      v.forEach((val, gi) => {
        const x = 20 + gi * groupW + di * (bw + 2);
        const bh = (val / maxV) * (ch - 30),
          y = ch - bh - 20;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 3);
        else ctx.rect(x, y, bw, bh);
        ctx.fillStyle = urgencies[di].color;
        ctx.fill();
        if (val > 0) {
          ctx.fillStyle = "#1a1826";
          ctx.font = "bold 9px DM Sans";
          ctx.textAlign = "center";
          ctx.fillText(val, x + bw / 2, y - 3);
        }
      }),
    );
    labels.forEach((l, i) => {
      ctx.fillStyle = "#7c7a8e";
      ctx.font = "10px DM Sans";
      ctx.textAlign = "center";
      ctx.fillText(l, 20 + i * groupW + groupW / 2, ch - 4);
    });
    urgencies.forEach((u, i) => {
      const lx = cw - 180 + (i % 2) * 88;
      const ly = 4 + Math.floor(i / 2) * 14;
      ctx.fillStyle = u.color;
      ctx.fillRect(lx, ly, 8, 8);
      ctx.fillStyle = "#7c7a8e";
      ctx.font = "10px DM Sans";
      ctx.textAlign = "left";
      ctx.fillText(u.label, lx + 11, ly + 8);
    });
  }, 250);
  // per-region tables
  [
    { data: n, id: "tbody-region-north" },
    { data: s, id: "tbody-region-south" },
    { data: e, id: "tbody-region-east" },
    { data: w, id: "tbody-region-west" },
  ].forEach(({ data, id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = data.length
      ? data
          .map(
            (r) =>
              `<tr><td>#R-${r.recipient_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td><td>${r.age} yrs</td><td>${badge(r.urgency_level)}</td><td>${r.hospital_name || "-"}</td><td>${badge(r.medical_status)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No recipients in this region</td></tr>`;
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

  // stat cards
  const total = d.length;
  const completed = d.filter((c) => c.status === "Completed").length;
  const inProgress = d.filter((c) => c.status === "In Progress").length;
  const totalTrans = d.reduce((s, c) => s + (+c.total_transplants || 0), 0);
  const s1 = document.getElementById("chain-total");
  if (s1) s1.textContent = total;
  const s2 = document.getElementById("chain-completed");
  if (s2) s2.textContent = completed;
  const s3 = document.getElementById("chain-progress");
  if (s3) s3.textContent = inProgress;
  const s4 = document.getElementById("chain-transplants");
  if (s4) s4.textContent = totalTrans;

  // full chains table — clicking a row loads its links
  const el = document.getElementById("tbody-chains-full");
  if (el) {
    el.innerHTML = d.length
      ? d
          .map((c) => {
            const statusColor =
              c.status === "Completed"
                ? "#1db87a"
                : c.status === "In Progress"
                  ? "#f59e0b"
                  : c.status === "Planned"
                    ? "#3b82f6"
                    : "#e8344a";
            return `<tr style="cursor:pointer;" onclick="loadChainLinks(${c.chain_id},'${c.chain_name}')"
                    onmouseover="this.style.background='#f8f7ff'" onmouseout="this.style.background=''">
                  <td><b>#DC-${c.chain_id}</b></td>
                  <td>${c.chain_name}</td>
                  <td>${fmt(c.start_date)}</td>
                  <td>${c.end_date ? fmt(c.end_date) : '<span style="color:var(--muted)">Ongoing</span>'}</td>
                  <td><b>${c.total_transplants}</b></td>
                  <td>${badge(c.status)}</td>
                  <td><span style="color:#3b82f6;font-size:12px;text-decoration:underline;">View Links →</span></td>
                </tr>`;
          })
          .join("")
      : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No chains found</td></tr>`;
  }

  // auto-load first chain's links
  if (d.length) loadChainLinks(d[0].chain_id, d[0].chain_name);
}

async function loadChainLinks(chainId, chainName) {
  const titleEl = document.getElementById("chain-links-title");
  if (titleEl) titleEl.textContent = `— ${chainName} (#DC-${chainId})`;

  const links = await apiFetch(`${API}/api/chains/${chainId}/links`);

  // auto-scroll to links section
  const flowEl = document.getElementById("chain-flow");
  if (flowEl) flowEl.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── VISUAL CHAIN FLOW (enhanced with hospital info) ──
  if (flowEl) {
    if (links.length) {
      flowEl.innerHTML = links
        .map(
          (l, i) => `
              <div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;">
                <!-- DONOR CARD -->
                <div style="background:#e8f0fe;border:2px solid #3b82f6;border-radius:12px;padding:10px 14px;text-align:center;min-width:130px;">
                  <div style="font-size:9px;color:#3b82f6;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">DONOR · Step ${l.sequence_number}</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1826;margin-bottom:2px;">${l.donor_name}</div>
                  <div style="display:flex;justify-content:center;gap:6px;margin-bottom:4px;">
                    ${badge(l.donor_blood)}
                    <span style="font-size:10px;background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:8px;">${l.donor_type || "Living"}</span>
                  </div>
                  <div style="font-size:10px;color:#3b82f6;font-weight:600;margin-top:4px;">🏥 ${l.donor_hospital || "-"}</div>
                  <div style="font-size:9px;color:var(--muted);">${l.donor_hospital_location || ""}</div>
                  ${l.donor_region ? `<div style="font-size:9px;background:#eff6ff;color:#3b82f6;border-radius:6px;padding:1px 6px;margin-top:3px;display:inline-block;">${l.donor_region} Region</div>` : ""}
                </div>
                <!-- ARROW + ORGAN -->
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:20px;gap:2px;">
                  <div style="font-size:20px;">🫀</div>
                  <div style="font-size:9px;color:var(--muted);font-weight:600;">donates to</div>
                  <div style="font-size:18px;color:var(--muted);">→</div>
                </div>
                <!-- RECIPIENT CARD -->
                <div style="background:#fef3f2;border:2px solid #e8344a;border-radius:12px;padding:10px 14px;text-align:center;min-width:130px;">
                  <div style="font-size:9px;color:#e8344a;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">RECIPIENT · Step ${l.sequence_number}</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1826;margin-bottom:2px;">${l.recipient_name}</div>
                  <div style="display:flex;justify-content:center;gap:6px;margin-bottom:4px;">
                    ${badge(l.recipient_blood)}
                    ${badge(l.urgency_level)}
                  </div>
                  <div style="font-size:10px;color:#e8344a;font-weight:600;margin-top:4px;">🏥 ${l.recipient_hospital || "-"}</div>
                  <div style="font-size:9px;color:var(--muted);">${l.recipient_hospital_location || ""}</div>
                  ${l.recipient_region ? `<div style="font-size:9px;background:#fef2f2;color:#e8344a;border-radius:6px;padding:1px 6px;margin-top:3px;display:inline-block;">${l.recipient_region} Region</div>` : ""}
                </div>
                <!-- NEXT ARROW -->
                ${i < links.length - 1 ? '<div style="display:flex;align-items:center;padding-top:20px;font-size:24px;color:#9ca3af;margin:0 4px;">⟶</div>' : ""}
              </div>`,
        )
        .join("");
    } else {
      flowEl.innerHTML = `<span style="color:var(--muted);font-size:13px;">No links found for this chain</span>`;
    }
  }

  // ── DETAILED TABLE ──
  const el2 = document.getElementById("tbody-chain-links-detail");
  if (el2) {
    el2.innerHTML = links.length
      ? links
          .map(
            (l) => `<tr>
                <td><b style="color:#3b82f6;font-size:15px;">${l.sequence_number}</b></td>
                <td>
                  <div style="font-weight:600;">${l.donor_name}</div>
                  <div style="font-size:11px;color:var(--muted);">${l.donor_age} yrs · ${l.donor_type || "-"}</div>
                </td>
                <td>${badge(l.donor_blood)}</td>
                <td>${l.donor_age} yrs</td>
                <td><span style="font-size:11px;">${l.donor_type || "-"}</span></td>
                <td>
                  <div style="font-weight:600;font-size:12px;">${l.donor_hospital || "-"}</div>
                  <div style="font-size:10px;color:var(--muted);">${l.donor_hospital_location || ""}</div>
                </td>
                <td>${l.donor_region ? `<span style="background:#eff6ff;color:#3b82f6;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">${l.donor_region}</span>` : "-"}</td>
                <td style="text-align:center;font-size:18px;">🫀→</td>
                <td>
                  <div style="font-weight:600;">${l.recipient_name}</div>
                  <div style="font-size:11px;color:var(--muted);">${l.recipient_age} yrs</div>
                </td>
                <td>${badge(l.recipient_blood)}</td>
                <td>${l.recipient_age} yrs</td>
                <td>${badge(l.urgency_level)}</td>
                <td>
                  <div style="font-weight:600;font-size:12px;">${l.recipient_hospital || "-"}</div>
                  <div style="font-size:10px;color:var(--muted);">${l.recipient_hospital_location || ""}</div>
                </td>
                <td>${l.recipient_region ? `<span style="background:#fef2f2;color:#e8344a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">${l.recipient_region}</span>` : "-"}</td>
              </tr>`,
          )
          .join("")
      : `<tr><td colspan="14" style="text-align:center;padding:24px;color:var(--muted)">No links in this chain</td></tr>`;
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
async function loadHospRegion(region) {
  const d = await apiFetch(`${API}/api/hospitals/${region}`);
  const el = document.getElementById(`tbody-hosp-${region}`);
  const bdg = document.getElementById(`badge-hosp-${region}`);
  if (bdg) bdg.textContent = d.length + " hospitals";
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (h) => `<tr>
              <td>#H-${h.hospital_id}</td>
              <td><b>${h.name}</b></td>
              <td>${h.location}</td>
              <td>${h.transplant_capacity}</td>
              <td>${h.specialization || "-"}</td>
              <td>${badge("Active")}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No hospitals in this region</td></tr>`;
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

// ── FRAGMENT LOADERS ─────────────────────────────────────

async function loadAvailableOrgans() {
  const d = await apiFetch(`${API}/api/organs/available`);
  const el = document.getElementById("tbody-organs-available");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (o) => `<tr>
          <td>#ORG-${o.organ_id}</td><td>${o.organ_type}</td><td>${o.donor_name}</td>
          <td>${badge(o.blood_type)}</td><td>${fmt(o.harvest_date)}</td>
          <td style="color:${o.hours_remaining < 12 ? "var(--red)" : "var(--green)"}">
            ${o.hours_remaining != null ? o.hours_remaining + " hrs" : "-"}
          </td><td>${o.hospital_name}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No available organs</td></tr>`;
}

async function loadAllocatedOrgans() {
  const d = await apiFetch(`${API}/api/organs/allocated`);
  const el = document.getElementById("tbody-organs-allocated");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (o) => `<tr>
          <td>#ORG-${o.organ_id}</td><td>${o.organ_type}</td><td>${o.donor_name}</td>
          <td>${badge(o.blood_type)}</td><td>${fmt(o.harvest_date)}</td>
          <td>${o.hospital_name}</td><td>${badge("Allocated")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No allocated organs</td></tr>`;
}

async function loadCriticalWaitlist() {
  const d = await apiFetch(`${API}/api/waitlist/critical`);
  const el = document.getElementById("tbody-waitlist-critical");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (w, i) => `<tr>
          <td><b style="color:var(--red)">#${i + 1}</b></td>
          <td>${w.recipient_name}</td><td>${badge(w.blood_type)}</td>
          <td>${w.organ_type}</td><td>${w.hospital_name}</td>
          <td>${w.days_waiting}</td><td>${badge("Critical")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No critical patients</td></tr>`;
}

async function loadNormalWaitlist() {
  const d = await apiFetch(`${API}/api/waitlist/normal`);
  const el = document.getElementById("tbody-waitlist-normal");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (w, i) => `<tr>
          <td>#${i + 1}</td><td>${w.recipient_name}</td><td>${badge(w.blood_type)}</td>
          <td>${w.organ_type}</td><td>${w.hospital_name}</td>
          <td>${w.days_waiting}</td><td>${badge(w.urgency_level)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No patients</td></tr>`;
}

async function loadApprovedDonors() {
  const d = await apiFetch(`${API}/api/donors/approved`);
  const el = document.getElementById("tbody-donor-approved");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) => `<tr>
          <td>#D-${r.donor_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td>
          <td>${r.donor_type}</td><td>${r.hospital_name}</td>
          <td>${r.age} yrs</td><td>${badge("Approved")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No approved donors</td></tr>`;
}

async function loadPendingDonors() {
  const d = await apiFetch(`${API}/api/donors/pending`);
  const el = document.getElementById("tbody-donor-pending");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (r) => `<tr>
          <td>#D-${r.donor_id}</td><td>${r.name}</td><td>${badge(r.blood_type)}</td>
          <td>${r.donor_type}</td><td>${r.hospital_name}</td>
          <td>${r.age} yrs</td><td>${badge("Under Evaluation")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No pending donors</td></tr>`;
}

async function loadCompatSummary() {
  const d = await apiFetch(`${API}/api/compatibility/summary`);
  const el = document.getElementById("tbody-compat-summary");
  if (!el) return;
  el.innerHTML = d.length
    ? d
        .map(
          (t) => `<tr>
          <td>#CT-${t.test_id}</td><td>${t.donor_name}</td>
          <td>${t.recipient_name}</td><td>${fmt(t.test_date)}</td>
          <td>${badge(t.test_result)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No tests</td></tr>`;
}

// ── INIT ──
loadDashboard();
