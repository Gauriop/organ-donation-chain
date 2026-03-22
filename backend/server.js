const jwt = require("jsonwebtoken");
const JWT_SECRET = "organlife_secret_2026";

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ── ADMIN POOL (for fallback / stats) ────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "organ donation",
  user: process.env.DB_USER || "admin_test",
  password: process.env.DB_PASSWORD || "admin123",
});

pool
  .connect()
  .then(() => console.log("✅ PostgreSQL connected!"))
  .catch((err) => console.error("❌ DB failed:", err.message));

// ── AUTH ROUTES (before middleware) ──────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ success: false, error: "Username and password required" });
  try {
    const testPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "organ donation",
      user: username,
      password: password,
    });
    await testPool.query("SELECT 1"); // validates credentials against PostgreSQL
    await testPool.end();

    // Issue JWT — stores DB credentials so backend can connect as this user
    const token = jwt.sign({ username, password, role }, JWT_SECRET, {
      expiresIn: "8h",
    });
    res.json({ success: true, token, user: { username, role } });
  } catch (e) {
    res
      .status(401)
      .json({ success: false, error: "Invalid username or password" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const {
    username,
    password,
    role,
    name,
    email,
    phone,
    age,
    blood_type,
    donor_type,
    hospital_id,
    contact,
    organ_type,
    urgency,
  } = req.body;
  if (!username || !password || !role)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const roleMap = {
    admin: "system_admin",
    coordinator: "hospital_coordinator",
    doctor: "medical_staff_role",
    donor: "donor_role",
    recipient: "recipient_role",
  };
  const dbRole = roleMap[role] || "medical_staff_role";

  try {
    // 1. Create PostgreSQL user with the role
    await pool.query(
      `CREATE USER "${username}" WITH PASSWORD $1 IN ROLE ${dbRole}`,
      [password],
    );

    // 2. For donor — also insert a row into the donor table
    //    username = phone number = contact field (this is how RLS links them)
    if (role === "donor" && name && age && blood_type && hospital_id) {
      await pool.query(
        `INSERT INTO donor (name, blood_type, age, contact, registration_date, donor_type, medical_status, hospital_id)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'Under Evaluation', $6)`,
        [
          name,
          blood_type,
          +age,
          username,
          donor_type || "Living",
          +hospital_id,
        ],
      );
    }

    // 3. For recipient — also insert a row into the recipient table
    if (role === "recipient" && name && age && blood_type && hospital_id) {
      await pool.query(
        `INSERT INTO recipient (name, blood_type, age, contact, registration_date, urgency_level, medical_status, hospital_id)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'Active', $6)`,
        [name, blood_type, +age, username, urgency || "Medium", +hospital_id],
      );
    }

    res.json({
      success: true,
      message: `Account created with role: ${dbRole}`,
    });
  } catch (e) {
    if (e.message.includes("already exists"))
      return res
        .status(409)
        .json({ success: false, error: "Username already taken" });
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PER-USER DB MIDDLEWARE ────────────────────────────────────
// This is the KEY fix — creates a DB connection as the logged-in user
// PostgreSQL RLS then filters rows automatically based on current_user
app.use((req, res, next) => {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      // Create a pool connected as the actual DB user (donor, recipient, etc.)
      req.db = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "organ donation",
        user: decoded.username,
        password: decoded.password,
        max: 1,
      });
      req.userRole = decoded.role;
      req.username = decoded.username;
    } catch (e) {
      req.db = pool; // fallback to admin if token invalid
    }
  } else {
    req.db = pool; // no token → use admin pool
  }

  // clean up user pool after response
  res.on("finish", () => {
    if (req.db && req.db !== pool) req.db.end().catch(() => {});
  });
  next();
});

// ── QUERY HELPER (uses req.db — respects RLS) ─────────────────
const run = async (res, sql, params = [], db) => {
  try {
    const r = await db.query(sql, params);
    res.json({ success: true, data: r.rows, count: r.rowCount });
  } catch (e) {
    console.error("SQL Error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── STATS ─────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const db = req.db;
    const [
      donors,
      recipients,
      transplants,
      waitlist,
      hospitals,
      staff,
      organs,
      chains,
    ] = await Promise.all([
      db.query("SELECT COUNT(*) FROM donor"),
      db.query("SELECT COUNT(*) FROM recipient WHERE medical_status='Active'"),
      db.query(
        "SELECT COUNT(*) FROM transplant_record WHERE status='Completed'",
      ),
      db.query("SELECT COUNT(*) FROM waitlist"),
      db.query("SELECT COUNT(*) FROM hospital"),
      db.query("SELECT COUNT(*) FROM medical_staff"),
      db.query("SELECT COUNT(*) FROM organ WHERE status='Available'"),
      db.query(
        "SELECT COUNT(*) FROM donation_chain WHERE status='In Progress'",
      ),
    ]);
    res.json({
      success: true,
      data: {
        total_donors: +donors.rows[0].count,
        active_recipients: +recipients.rows[0].count,
        transplants_done: +transplants.rows[0].count,
        waitlist_count: +waitlist.rows[0].count,
        hospitals: +hospitals.rows[0].count,
        staff: +staff.rows[0].count,
        available_organs: +organs.rows[0].count,
        active_chains: +chains.rows[0].count,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
// IMPORTANT: Specific sub-routes MUST come before generic routes
// e.g. /api/donors/living BEFORE /api/donors
// otherwise Express matches /api/donors first and ignores the rest
// ══════════════════════════════════════════════════════════════

// ── HOSPITALS (specific first, then generic) ──────────────────
["north", "south", "east", "west"].forEach((r) => {
  app.get(`/api/hospitals/${r}`, async (req, res) => {
    await run(res, `SELECT * FROM hospital_${r} ORDER BY name`, [], req.db);
  });
});
app.get("/api/hospitals", async (req, res) => {
  const { region, search } = req.query;
  let sql = "SELECT * FROM hospital WHERE 1=1";
  const p = [];
  if (region) {
    p.push(region);
    sql += ` AND region=$${p.length}`;
  }
  if (search) {
    p.push(`%${search}%`);
    sql += ` AND (name ILIKE $${p.length} OR location ILIKE $${p.length})`;
  }
  await run(res, sql + " ORDER BY name", p, req.db);
});
app.post("/api/hospitals", async (req, res) => {
  const {
    name,
    location,
    contact,
    transplant_capacity,
    specialization,
    region,
  } = req.body;
  await run(
    res,
    `INSERT INTO hospital (name,location,contact,transplant_capacity,specialization,region) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, location, contact, transplant_capacity, specialization, region],
    req.db,
  );
});

// ── DONORS (specific sub-routes FIRST, then generic) ─────────
app.get("/api/donors/living", async (req, res) => {
  await run(
    res,
    `SELECT d.*, h.name AS hospital_name FROM donor_living d JOIN hospital h ON d.hospital_id=h.hospital_id ORDER BY d.donor_id DESC`,
    [],
    req.db,
  );
});
app.get("/api/donors/deceased", async (req, res) => {
  await run(
    res,
    `SELECT d.*, h.name AS hospital_name FROM donor_deceased d JOIN hospital h ON d.hospital_id=h.hospital_id ORDER BY d.donor_id DESC`,
    [],
    req.db,
  );
});
app.get("/api/donors/approved", async (req, res) => {
  await run(
    res,
    `SELECT d.*, h.name AS hospital_name FROM donor_approved d JOIN hospital h ON d.hospital_id=h.hospital_id ORDER BY d.registration_date DESC`,
    [],
    req.db,
  );
});
app.get("/api/donors/pending", async (req, res) => {
  await run(
    res,
    `SELECT d.*, h.name AS hospital_name FROM donor_pending d JOIN hospital h ON d.hospital_id=h.hospital_id ORDER BY d.registration_date DESC`,
    [],
    req.db,
  );
});
app.get("/api/donors", async (req, res) => {
  const { type, status, blood_type } = req.query;
  let sql = `SELECT d.*, h.name AS hospital_name, h.region FROM donor d JOIN hospital h ON d.hospital_id=h.hospital_id WHERE 1=1`;
  const p = [];
  if (type) {
    p.push(type);
    sql += ` AND d.donor_type=$${p.length}`;
  }
  if (status) {
    p.push(status);
    sql += ` AND d.medical_status=$${p.length}`;
  }
  if (blood_type) {
    p.push(blood_type);
    sql += ` AND d.blood_type=$${p.length}`;
  }
  await run(res, sql + " ORDER BY d.registration_date DESC", p, req.db);
});
app.post("/api/donors", async (req, res) => {
  const {
    name,
    blood_type,
    age,
    contact,
    donor_type,
    medical_status,
    hospital_id,
  } = req.body;
  await run(
    res,
    `INSERT INTO donor (name,blood_type,age,contact,registration_date,donor_type,medical_status,hospital_id) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7) RETURNING *`,
    [
      name,
      blood_type,
      age,
      contact,
      donor_type,
      medical_status || "Under Evaluation",
      hospital_id,
    ],
    req.db,
  );
});

// ── RECIPIENTS (specific sub-routes FIRST, then generic) ─────
["north", "south", "east", "west"].forEach((r) => {
  app.get(`/api/recipients/${r}`, async (req, res) => {
    await run(
      res,
      `SELECT r.*, h.name AS hospital_name FROM recipient_${r} r JOIN hospital h ON r.hospital_id=h.hospital_id ORDER BY r.recipient_id`,
      [],
      req.db,
    );
  });
});
app.get("/api/recipients", async (req, res) => {
  const { urgency, status, region } = req.query;
  let sql = `SELECT r.*, h.name AS hospital_name, h.region FROM recipient r JOIN hospital h ON r.hospital_id=h.hospital_id WHERE 1=1`;
  const p = [];
  if (urgency) {
    p.push(urgency);
    sql += ` AND r.urgency_level=$${p.length}`;
  }
  if (status) {
    p.push(status);
    sql += ` AND r.medical_status=$${p.length}`;
  }
  if (region) {
    p.push(region);
    sql += ` AND h.region=$${p.length}`;
  }
  await run(
    res,
    sql +
      ` ORDER BY CASE WHEN r.urgency_level='Critical' THEN 1 WHEN r.urgency_level='High' THEN 2 WHEN r.urgency_level='Medium' THEN 3 ELSE 4 END`,
    p,
    req.db,
  );
});
app.post("/api/recipients", async (req, res) => {
  const {
    name,
    blood_type,
    age,
    contact,
    urgency_level,
    medical_status,
    hospital_id,
  } = req.body;
  await run(
    res,
    `INSERT INTO recipient (name,blood_type,age,contact,registration_date,urgency_level,medical_status,hospital_id) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7) RETURNING *`,
    [
      name,
      blood_type,
      age,
      contact,
      urgency_level,
      medical_status || "Active",
      hospital_id,
    ],
    req.db,
  );
});

// ── WAITLIST (specific sub-routes FIRST, then generic) ───────
app.get("/api/waitlist/critical", async (req, res) => {
  await run(
    res,
    `SELECT w.*, r.name AS recipient_name, r.blood_type, r.urgency_level,
            h.name AS hospital_name,
            (CURRENT_DATE - w.registration_date) AS days_waiting
     FROM waitlist_critical w
     JOIN recipient r ON w.recipient_id = r.recipient_id
     JOIN hospital h ON r.hospital_id = h.hospital_id
     ORDER BY w.priority_score DESC`,
    [],
    req.db,
  );
});
app.get("/api/waitlist/normal", async (req, res) => {
  await run(
    res,
    `SELECT w.*, r.name AS recipient_name, r.blood_type, r.urgency_level,
            h.name AS hospital_name,
            (CURRENT_DATE - w.registration_date) AS days_waiting
     FROM waitlist_normal w
     JOIN recipient r ON w.recipient_id = r.recipient_id
     JOIN hospital h ON r.hospital_id = h.hospital_id
     ORDER BY w.priority_score DESC`,
    [],
    req.db,
  );
});
app.get("/api/waitlist", async (req, res) => {
  await run(
    res,
    `SELECT w.*, r.name AS recipient_name, r.blood_type, r.urgency_level, r.age,
            h.name AS hospital_name, h.region,
            (CURRENT_DATE - w.registration_date) AS days_waiting
     FROM waitlist w
     JOIN recipient r ON w.recipient_id=r.recipient_id
     JOIN hospital h ON r.hospital_id=h.hospital_id
     WHERE r.medical_status='Active'
     ORDER BY CASE WHEN r.urgency_level='Critical' THEN 1 WHEN r.urgency_level='High' THEN 2 WHEN r.urgency_level='Medium' THEN 3 ELSE 4 END, w.priority_score DESC`,
    [],
    req.db,
  );
});
app.post("/api/waitlist", async (req, res) => {
  const { recipient_id, organ_type, priority_score } = req.body;
  await run(
    res,
    `INSERT INTO waitlist (recipient_id,organ_type,priority_score,registration_date) VALUES ($1,$2,$3,CURRENT_DATE) RETURNING *`,
    [recipient_id, organ_type, priority_score || 50],
    req.db,
  );
});

// ── ORGANS (specific sub-routes FIRST, then generic) ─────────
app.get("/api/organs/available", async (req, res) => {
  await run(
    res,
    `SELECT o.*, d.name AS donor_name, d.blood_type, h.name AS hospital_name,
            ROUND(EXTRACT(EPOCH FROM (o.expiry_time - NOW()))/3600,1) AS hours_remaining
     FROM organ_available o
     JOIN donor d ON o.donor_id = d.donor_id
     JOIN hospital h ON d.hospital_id = h.hospital_id
     ORDER BY o.expiry_time ASC NULLS LAST`,
    [],
    req.db,
  );
});
app.get("/api/organs/allocated", async (req, res) => {
  await run(
    res,
    `SELECT o.*, d.name AS donor_name, d.blood_type, h.name AS hospital_name
     FROM organ_allocated o
     JOIN donor d ON o.donor_id = d.donor_id
     JOIN hospital h ON d.hospital_id = h.hospital_id
     ORDER BY o.expiry_time ASC NULLS LAST`,
    [],
    req.db,
  );
});
app.get("/api/organs/completed", async (req, res) => {
  await run(
    res,
    `SELECT o.*, d.name AS donor_name, d.blood_type, h.name AS hospital_name
     FROM organ_completed o
     JOIN donor d ON o.donor_id = d.donor_id
     JOIN hospital h ON d.hospital_id = h.hospital_id
     ORDER BY o.harvest_date DESC`,
    [],
    req.db,
  );
});
app.get("/api/organs", async (req, res) => {
  const { status, organ_type } = req.query;
  let sql = `SELECT o.*, d.name AS donor_name, d.blood_type, d.donor_type, h.name AS hospital_name,
                    ROUND(EXTRACT(EPOCH FROM (o.expiry_time - NOW()))/3600,1) AS hours_remaining
             FROM organ o JOIN donor d ON o.donor_id=d.donor_id JOIN hospital h ON d.hospital_id=h.hospital_id WHERE 1=1`;
  const p = [];
  if (status) {
    p.push(status);
    sql += ` AND o.status=$${p.length}`;
  }
  if (organ_type) {
    p.push(organ_type);
    sql += ` AND o.organ_type=$${p.length}`;
  }
  await run(res, sql + " ORDER BY o.expiry_time ASC NULLS LAST", p, req.db);
});
app.post("/api/organs", async (req, res) => {
  const { organ_type, donor_id, harvest_date, expiry_time } = req.body;
  await run(
    res,
    `INSERT INTO organ (organ_type,donor_id,status,harvest_date,expiry_time) VALUES ($1,$2,'Available',$3,$4) RETURNING *`,
    [organ_type, donor_id, harvest_date, expiry_time],
    req.db,
  );
});

// ── COMPATIBILITY (specific FIRST, then generic) ─────────────
app.get("/api/compatibility/summary", async (req, res) => {
  await run(
    res,
    `SELECT cs.*, d.name AS donor_name, r.name AS recipient_name
     FROM compat_summary cs
     JOIN donor d ON cs.donor_id = d.donor_id
     JOIN recipient r ON cs.recipient_id = r.recipient_id
     ORDER BY cs.test_date DESC`,
    [],
    req.db,
  );
});
app.get("/api/compatibility/detail", async (req, res) => {
  await run(
    res,
    `SELECT cd.*, d.name AS donor_name, r.name AS recipient_name
     FROM compat_detail cd
     JOIN compatibility_test ct ON cd.test_id = ct.test_id
     JOIN donor d ON ct.donor_id = d.donor_id
     JOIN recipient r ON ct.recipient_id = r.recipient_id
     ORDER BY cd.compatibility_score DESC`,
    [],
    req.db,
  );
});
// ── COMPATIBILITY ─────────────────────────────────────────────
app.get("/api/compatibility", async (req, res) => {
  const { result, min_score } = req.query;
  let sql = `SELECT ct.*, d.name AS donor_name, d.blood_type AS donor_blood,
                    r.name AS recipient_name, r.blood_type AS recipient_blood, r.urgency_level
             FROM compatibility_test ct
             JOIN donor d ON ct.donor_id=d.donor_id
             JOIN recipient r ON ct.recipient_id=r.recipient_id WHERE 1=1`;
  const p = [];
  if (result) {
    p.push(result);
    sql += ` AND ct.test_result=$${p.length}`;
  }
  if (min_score) {
    p.push(min_score);
    sql += ` AND ct.compatibility_score>=$${p.length}`;
  }
  await run(res, sql + " ORDER BY ct.compatibility_score DESC", p, req.db);
});
app.post("/api/compatibility", async (req, res) => {
  const {
    donor_id,
    recipient_id,
    blood_match,
    tissue_match,
    compatibility_score,
    test_result,
  } = req.body;
  await run(
    res,
    `INSERT INTO compatibility_test (donor_id,recipient_id,test_date,blood_match,tissue_match,compatibility_score,test_result) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6) RETURNING *`,
    [
      donor_id,
      recipient_id,
      blood_match,
      tissue_match,
      compatibility_score,
      test_result || "Pending",
    ],
    req.db,
  );
});

// ── CHAINS ────────────────────────────────────────────────────
app.get("/api/chains", async (req, res) => {
  await run(
    res,
    "SELECT * FROM donation_chain ORDER BY start_date DESC",
    [],
    req.db,
  );
});
app.get("/api/chains/:id/links", async (req, res) => {
  await run(
    res,
    `SELECT cl.*, d.name AS donor_name, d.blood_type AS donor_blood,
            r.name AS recipient_name, r.urgency_level
     FROM chain_link cl
     JOIN donor d ON cl.donor_id=d.donor_id
     JOIN recipient r ON cl.recipient_id=r.recipient_id
     WHERE cl.chain_id=$1 ORDER BY cl.sequence_number`,
    [req.params.id],
    req.db,
  );
});

// ── TRANSPLANTS ───────────────────────────────────────────────
app.get("/api/transplants", async (req, res) => {
  const { status, outcome } = req.query;
  let sql = `SELECT tr.*, d.name AS donor_name, r.name AS recipient_name, o.organ_type,
                    h.name AS hospital_name, ms.name AS surgeon_name, tm.outcome, td.status AS surgery_status
             FROM transplant_record tr
             JOIN donor d ON tr.donor_id=d.donor_id
             JOIN recipient r ON tr.recipient_id=r.recipient_id
             JOIN organ o ON tr.organ_id=o.organ_id
             JOIN hospital h ON tr.hospital_id=h.hospital_id
             JOIN medical_staff ms ON tr.staff_id=ms.staff_id
             LEFT JOIN transplant_medical tm ON tr.transplant_id=tm.transplant_id
             LEFT JOIN transplant_details td ON tr.transplant_id=td.transplant_id WHERE 1=1`;
  const p = [];
  if (status) {
    p.push(status);
    sql += ` AND tr.status=$${p.length}`;
  }
  if (outcome) {
    p.push(outcome);
    sql += ` AND tr.outcome=$${p.length}`;
  }
  await run(res, sql + " ORDER BY tr.surgery_date DESC", p, req.db);
});
app.post("/api/transplants", async (req, res) => {
  const {
    organ_id,
    donor_id,
    recipient_id,
    hospital_id,
    staff_id,
    surgery_date,
  } = req.body;
  await run(
    res,
    `INSERT INTO transplant_record (organ_id,donor_id,recipient_id,hospital_id,staff_id,surgery_date,status,outcome) VALUES ($1,$2,$3,$4,$5,$6,'Scheduled','Pending') RETURNING *`,
    [organ_id, donor_id, recipient_id, hospital_id, staff_id, surgery_date],
    req.db,
  );
});

// ── STAFF (specific FIRST, then generic) ─────────────────────
app.get("/api/staff/admin", async (req, res) => {
  await run(res, `SELECT * FROM staff_admin ORDER BY staff_id`, [], req.db);
});
app.get("/api/staff/clinical", async (req, res) => {
  await run(res, `SELECT * FROM staff_clinical ORDER BY staff_id`, [], req.db);
});
app.get("/api/staff", async (req, res) => {
  await run(
    res,
    `SELECT ms.*, h.name AS hospital_name, h.region,
            COUNT(tr.transplant_id) AS transplants_done
     FROM medical_staff ms
     JOIN hospital h ON ms.hospital_id=h.hospital_id
     LEFT JOIN transplant_record tr ON ms.staff_id=tr.staff_id
     GROUP BY ms.staff_id, h.name, h.region
     ORDER BY transplants_done DESC`,
    [],
    req.db,
  );
});

// ── SPECIAL QUERIES ───────────────────────────────────────────
app.get("/api/query/urgent-cases", async (req, res) => {
  await run(
    res,
    `SELECT r.recipient_id, r.name, r.blood_type, w.organ_type, r.urgency_level,
            w.priority_score, h.name AS hospital_name,
            (CURRENT_DATE - r.registration_date) AS days_registered
     FROM recipient r
     JOIN waitlist w ON r.recipient_id=w.recipient_id
     JOIN hospital h ON r.hospital_id=h.hospital_id
     WHERE r.urgency_level='Critical' AND r.medical_status='Active'
     ORDER BY w.priority_score DESC`,
    [],
    req.db,
  );
});
app.get("/api/query/expiring-soon", async (req, res) => {
  await run(
    res,
    `SELECT o.organ_id, o.organ_type, d.name AS donor_name, h.name AS hospital_name, o.expiry_time,
            ROUND(EXTRACT(EPOCH FROM (o.expiry_time - NOW()))/3600,1) AS hours_left
     FROM organ o JOIN donor d ON o.donor_id=d.donor_id JOIN hospital h ON d.hospital_id=h.hospital_id
     WHERE o.status='Available' AND o.expiry_time > NOW()
     AND EXTRACT(EPOCH FROM (o.expiry_time - NOW()))/3600 <= 24
     ORDER BY hours_left ASC`,
    [],
    req.db,
  );
});
app.get("/api/query/hospital-stats", async (req, res) => {
  await run(
    res,
    `SELECT h.name AS hospital_name, COUNT(tr.transplant_id) AS total_transplants,
            SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END) AS successful,
            ROUND(SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END)::NUMERIC*100.0/NULLIF(COUNT(tr.transplant_id),0),2) AS success_rate
     FROM hospital h JOIN transplant_record tr ON h.hospital_id=tr.hospital_id
     WHERE tr.status='Completed'
     GROUP BY h.hospital_id, h.name ORDER BY success_rate DESC`,
    [],
    req.db,
  );
});
app.get("/api/query/compatible-pairs", async (req, res) => {
  await run(
    res,
    `SELECT d.name AS donor_name, r.name AS recipient_name,
            ct.blood_match, ct.tissue_match, ct.compatibility_score, ct.test_result
     FROM compatibility_test ct
     JOIN donor d ON ct.donor_id=d.donor_id
     JOIN recipient r ON ct.recipient_id=r.recipient_id
     WHERE ct.test_result='Compatible' ORDER BY ct.compatibility_score DESC`,
    [],
    req.db,
  );
});

// ── SERVE FRONTEND ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..")));
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "index.html")),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running → http://localhost:${PORT}`),
);
