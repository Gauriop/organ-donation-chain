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
    `SELECT cl.*,
            d.name          AS donor_name,
            d.blood_type    AS donor_blood,
            d.age           AS donor_age,
            d.donor_type    AS donor_type,
            d.medical_status AS donor_status,
            hd.name         AS donor_hospital,
            hd.location     AS donor_hospital_location,
            hd.region       AS donor_region,
            r.name          AS recipient_name,
            r.blood_type    AS recipient_blood,
            r.age           AS recipient_age,
            r.urgency_level AS urgency_level,
            r.medical_status AS recipient_status,
            hr.name         AS recipient_hospital,
            hr.location     AS recipient_hospital_location,
            hr.region       AS recipient_region
     FROM chain_link cl
     JOIN donor     d  ON cl.donor_id     = d.donor_id
     JOIN recipient r  ON cl.recipient_id = r.recipient_id
     JOIN hospital  hd ON d.hospital_id   = hd.hospital_id
     JOIN hospital  hr ON r.hospital_id   = hr.hospital_id
     WHERE cl.chain_id=$1
     ORDER BY cl.sequence_number`,
    [req.params.id],
    req.db,
  );
});

// ── CHAIN CREATION ROUTES ─────────────────────────────────────

// Get compatible donor-recipient pairs for building a chain
// Returns approved donors + active recipients with compatibility info
app.get("/api/chains/suggest-pairs", async (req, res) => {
  try {
    const db = req.db;
    // Get all approved donors with their hospital
    const donors = await db.query(`
      SELECT d.donor_id, d.name, d.blood_type, d.donor_type, d.age,
             h.name AS hospital_name, h.hospital_id, h.region
      FROM donor d
      JOIN hospital h ON d.hospital_id = h.hospital_id
      WHERE d.medical_status = 'Approved'
      ORDER BY d.name`);

    // Get all active recipients on waitlist with their hospital
    const recipients = await db.query(`
      SELECT r.recipient_id, r.name, r.blood_type, r.urgency_level, r.age,
             w.organ_type, w.priority_score,
             h.name AS hospital_name, h.hospital_id, h.region
      FROM recipient r
      JOIN waitlist w ON r.recipient_id = w.recipient_id
      JOIN hospital h ON r.hospital_id = h.hospital_id
      WHERE r.medical_status = 'Active'
      ORDER BY CASE WHEN r.urgency_level='Critical' THEN 1
                    WHEN r.urgency_level='High' THEN 2
                    WHEN r.urgency_level='Medium' THEN 3
                    ELSE 4 END, w.priority_score DESC`);

    // Blood type compatibility map
    const compatible = (donorBT, recipientBT) => {
      const compat = {
        "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
        "O+": ["O+", "A+", "B+", "AB+"],
        "A-": ["A-", "A+", "AB-", "AB+"],
        "A+": ["A+", "AB+"],
        "B-": ["B-", "B+", "AB-", "AB+"],
        "B+": ["B+", "AB+"],
        "AB-": ["AB-", "AB+"],
        "AB+": ["AB+"],
      };
      return (compat[donorBT] || []).includes(recipientBT);
    };

    // Find compatible pairs
    const pairs = [];
    for (const d of donors.rows) {
      for (const r of recipients.rows) {
        if (compatible(d.blood_type, r.blood_type)) {
          pairs.push({
            donor_id: d.donor_id,
            donor_name: d.name,
            donor_blood: d.blood_type,
            donor_type: d.donor_type,
            donor_age: d.age,
            donor_hospital: d.hospital_name,
            donor_hospital_id: d.hospital_id,
            donor_region: d.region,
            recipient_id: r.recipient_id,
            recipient_name: r.name,
            recipient_blood: r.blood_type,
            recipient_urgency: r.urgency_level,
            recipient_age: r.age,
            recipient_organ_needed: r.organ_type,
            recipient_priority: r.priority_score,
            recipient_hospital: r.hospital_name,
            recipient_hospital_id: r.hospital_id,
            recipient_region: r.region,
            cross_region: d.region !== r.region,
          });
        }
      }
    }

    res.json({
      success: true,
      data: pairs,
      donors: donors.rows,
      recipients: recipients.rows,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create a new donation chain with links
app.post("/api/chains/create", async (req, res) => {
  const { chain_name, links } = req.body;
  // links = [{donor_id, recipient_id}, ...] in sequence order
  if (!chain_name || !links || !links.length)
    return res
      .status(400)
      .json({
        success: false,
        error: "Chain name and at least one link required",
      });

  const db = req.db;
  try {
    await db.query("BEGIN");

    // 1. Create the chain record
    const chainRes = await db.query(
      `INSERT INTO donation_chain (chain_name, start_date, status, total_transplants)
       VALUES ($1, CURRENT_DATE, 'Planned', 0) RETURNING *`,
      [chain_name],
    );
    const chain = chainRes.rows[0];

    // 2. Insert each link
    for (let i = 0; i < links.length; i++) {
      await db.query(
        `INSERT INTO chain_link (chain_id, donor_id, recipient_id, sequence_number)
         VALUES ($1, $2, $3, $4)`,
        [chain.chain_id, links[i].donor_id, links[i].recipient_id, i + 1],
      );
    }

    // 3. Update status to In Progress
    await db.query(
      `UPDATE donation_chain SET status='In Progress' WHERE chain_id=$1`,
      [chain.chain_id],
    );

    await db.query("COMMIT");

    res.json({
      success: true,
      message: `Chain "${chain_name}" created with ${links.length} links!`,
      chain_id: chain.chain_id,
      chain_name: chain.chain_name,
    });
  } catch (e) {
    await db.query("ROLLBACK");
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get all approved donors (for chain builder dropdown)
app.get("/api/chains/donors", async (req, res) => {
  await run(
    res,
    `SELECT d.donor_id, d.name, d.blood_type, d.donor_type, d.age,
            h.name AS hospital_name, h.region
     FROM donor d JOIN hospital h ON d.hospital_id=h.hospital_id
     WHERE d.medical_status='Approved'
     ORDER BY d.name`,
    [],
    req.db,
  );
});

// Get all active recipients on waitlist (for chain builder dropdown)
app.get("/api/chains/recipients", async (req, res) => {
  await run(
    res,
    `SELECT r.recipient_id, r.name, r.blood_type, r.urgency_level, r.age,
            w.organ_type, w.priority_score,
            h.name AS hospital_name, h.region
     FROM recipient r
     JOIN waitlist w ON r.recipient_id=w.recipient_id
     JOIN hospital h ON r.hospital_id=h.hospital_id
     WHERE r.medical_status='Active'
     ORDER BY CASE WHEN r.urgency_level='Critical' THEN 1
                   WHEN r.urgency_level='High' THEN 2
                   WHEN r.urgency_level='Medium' THEN 3
                   ELSE 4 END`,
    [],
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

// ── QUERY OPTIMIZATION ROUTES ────────────────────────────────
// Each route runs the query TWICE:
// 1. WITHOUT index (DROP index, run, measure time)
// 2. WITH index (CREATE index, run, measure time)
// Returns both execution times for comparison on the dashboard

const { performance } = require("perf_hooks");

async function runTimed(db, sql, params = []) {
  const start = performance.now();
  const r = await db.query(sql, params);
  const end = performance.now();
  return { rows: r.rows, ms: +(end - start).toFixed(3) };
}

// Q1: Available organs by blood type
app.get("/api/qopt/available-organs", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query(
          "DROP INDEX IF EXISTS idx_qopt_organ_status, idx_qopt_donor_blood",
        )
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_organ_status ON organ(status)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_donor_blood ON donor(blood_type)",
        )
        .catch(() => {});
    }
    const { rows, ms } = await runTimed(
      db,
      `SELECT o.organ_id, o.organ_type, d.name AS donor_name, d.blood_type,
              h.name AS hospital_name, o.expiry_time
       FROM organ o JOIN donor d ON o.donor_id=d.donor_id
       JOIN hospital h ON d.hospital_id=h.hospital_id
       WHERE o.status='Available' ORDER BY o.expiry_time ASC NULLS LAST`,
    );
    res.json({
      success: true,
      data: rows,
      execution_ms: ms,
      indexed,
      index_used: indexed
        ? "idx_qopt_organ_status, idx_qopt_donor_blood"
        : "none (Seq Scan)",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q2: Critical waitlist priority
app.get("/api/qopt/critical-waitlist", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query(
          "DROP INDEX IF EXISTS idx_qopt_rec_urgency, idx_qopt_wl_priority",
        )
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_rec_urgency ON recipient(urgency_level, medical_status)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_wl_priority ON waitlist(priority_score DESC)",
        )
        .catch(() => {});
    }
    const { rows, ms } = await runTimed(
      db,
      `SELECT w.waitlist_id, r.name AS recipient_name, r.blood_type,
              r.urgency_level, w.organ_type, w.priority_score,
              CURRENT_DATE - w.registration_date AS days_waiting
       FROM waitlist w JOIN recipient r ON w.recipient_id=r.recipient_id
       WHERE r.urgency_level='Critical' AND r.medical_status='Active'
       ORDER BY w.priority_score DESC`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q3: Compatible donor-recipient pairs
app.get("/api/qopt/compatible-pairs", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_compat_result")
        .catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_compat_result ON compatibility_test(test_result, compatibility_score DESC)",
        )
        .catch(() => {});
    const { rows, ms } = await runTimed(
      db,
      `SELECT ct.test_id, d.name AS donor_name, d.blood_type AS donor_blood,
              r.name AS recipient_name, r.urgency_level,
              ct.compatibility_score, ct.test_result
       FROM compatibility_test ct
       JOIN donor d ON ct.donor_id=d.donor_id
       JOIN recipient r ON ct.recipient_id=r.recipient_id
       WHERE ct.test_result='Compatible' AND ct.compatibility_score>=85.0
         AND r.medical_status='Active'
       ORDER BY ct.compatibility_score DESC`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q4: Transplant success by hospital
app.get("/api/qopt/hospital-success", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db.query("DROP INDEX IF EXISTS idx_qopt_tr_status").catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_tr_status ON transplant_record(status, outcome)",
        )
        .catch(() => {});
    const { rows, ms } = await runTimed(
      db,
      `SELECT h.name AS hospital_name,
              COUNT(tr.transplant_id) AS total_transplants,
              SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END) AS successful,
              ROUND(SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END)::NUMERIC*100.0/NULLIF(COUNT(tr.transplant_id),0),2) AS success_rate
       FROM hospital h JOIN transplant_record tr ON h.hospital_id=tr.hospital_id
       GROUP BY h.hospital_id, h.name ORDER BY success_rate DESC NULLS LAST`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q5: Expiring organs within 24 hours
app.get("/api/qopt/expiring-organs", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_org_expiry")
        .catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_org_expiry ON organ(status, expiry_time)",
        )
        .catch(() => {});
    const { rows, ms } = await runTimed(
      db,
      `SELECT o.organ_id, o.organ_type, d.name AS donor_name,
              h.name AS hospital_name, o.expiry_time,
              ROUND(EXTRACT(EPOCH FROM (o.expiry_time - NOW()))/3600,1) AS hours_left
       FROM organ o JOIN donor d ON o.donor_id=d.donor_id
       JOIN hospital h ON d.hospital_id=h.hospital_id
       WHERE o.status='Available' AND o.expiry_time > NOW()
       ORDER BY o.expiry_time ASC`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q6: Active donation chains
app.get("/api/qopt/active-chains", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_chain_status, idx_qopt_cl_chain")
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_chain_status ON donation_chain(status)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_cl_chain ON chain_link(chain_id)",
        )
        .catch(() => {});
    }
    const { rows, ms } = await runTimed(
      db,
      `SELECT dc.chain_name, dc.status AS chain_status,
              cl.sequence_number, d.name AS donor_name,
              d.blood_type AS donor_blood, r.name AS recipient_name, r.urgency_level
       FROM donation_chain dc
       JOIN chain_link cl ON dc.chain_id=cl.chain_id
       JOIN donor d ON cl.donor_id=d.donor_id
       JOIN recipient r ON cl.recipient_id=r.recipient_id
       WHERE dc.status IN ('In Progress','Planned')
       ORDER BY dc.chain_id, cl.sequence_number`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q7: Donor utilization rate
app.get("/api/qopt/donor-utilization", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_donor_type, idx_qopt_organ_donor")
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_donor_type ON donor(donor_type, medical_status)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_organ_donor ON organ(donor_id, status)",
        )
        .catch(() => {});
    }
    const { rows, ms } = await runTimed(
      db,
      `SELECT d.donor_type,
              COUNT(DISTINCT d.donor_id) AS total_donors,
              COUNT(DISTINCT o.organ_id) AS total_organs,
              COUNT(DISTINCT CASE WHEN o.status='Transplanted' THEN o.organ_id END) AS transplanted,
              ROUND(COUNT(DISTINCT CASE WHEN o.status='Transplanted' THEN o.organ_id END)::NUMERIC*100.0/NULLIF(COUNT(DISTINCT o.organ_id),0),2) AS utilization_rate
       FROM donor d LEFT JOIN organ o ON d.donor_id=o.donor_id
       GROUP BY d.donor_type`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q8: Blood type demand vs supply
app.get("/api/qopt/blood-type-match", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_don_blood, idx_qopt_rec_blood")
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_don_blood ON donor(blood_type)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_rec_blood ON recipient(blood_type)",
        )
        .catch(() => {});
    }
    const { rows, ms } = await runTimed(
      db,
      `SELECT bt.blood_type,
              COALESCE(supply.available_organs,0) AS available_organs,
              COALESCE(demand.waiting_recipients,0) AS waiting_recipients,
              COALESCE(demand.waiting_recipients,0) - COALESCE(supply.available_organs,0) AS shortage
       FROM (SELECT DISTINCT blood_type FROM donor) bt
       LEFT JOIN (SELECT d.blood_type, COUNT(o.organ_id) AS available_organs
                  FROM organ o JOIN donor d ON o.donor_id=d.donor_id
                  WHERE o.status='Available' GROUP BY d.blood_type) supply USING(blood_type)
       LEFT JOIN (SELECT blood_type, COUNT(*) AS waiting_recipients
                  FROM recipient WHERE medical_status='Active' GROUP BY blood_type) demand USING(blood_type)
       ORDER BY shortage DESC`,
    );
    res.json({ success: true, data: rows, execution_ms: ms, indexed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q9: Hospital capacity vs transplant load
app.get("/api/qopt/hospital-load", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db.query("DROP INDEX IF EXISTS idx_qopt_tr_hosp").catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_tr_hosp ON transplant_record(hospital_id)",
        )
        .catch(() => {});
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const { ms } = await runTimed(
        db,
        `SELECT h.hospital_id, h.name, h.transplant_capacity, h.region,
                COUNT(DISTINCT d.donor_id) AS total_donors,
                COUNT(DISTINCT r.recipient_id) AS total_recipients,
                COUNT(DISTINCT tr.transplant_id) AS total_transplants,
                ROUND(COUNT(DISTINCT tr.transplant_id)::NUMERIC * 100.0 / NULLIF(h.transplant_capacity,0),1) AS capacity_used_pct
         FROM hospital h
         LEFT JOIN donor d ON h.hospital_id = d.hospital_id
         LEFT JOIN recipient r ON h.hospital_id = r.hospital_id
         LEFT JOIN transplant_record tr ON h.hospital_id = tr.hospital_id
         GROUP BY h.hospital_id, h.name, h.transplant_capacity, h.region
         ORDER BY capacity_used_pct DESC NULLS LAST`,
      );
      runs.push(ms);
    }
    const { rows } = await runTimed(
      db,
      `SELECT h.hospital_id, h.name, h.transplant_capacity, h.region, COUNT(DISTINCT d.donor_id) AS total_donors, COUNT(DISTINCT r.recipient_id) AS total_recipients, COUNT(DISTINCT tr.transplant_id) AS total_transplants, ROUND(COUNT(DISTINCT tr.transplant_id)::NUMERIC*100.0/NULLIF(h.transplant_capacity,0),1) AS capacity_used_pct FROM hospital h LEFT JOIN donor d ON h.hospital_id=d.hospital_id LEFT JOIN recipient r ON h.hospital_id=r.hospital_id LEFT JOIN transplant_record tr ON h.hospital_id=tr.hospital_id GROUP BY h.hospital_id,h.name,h.transplant_capacity,h.region ORDER BY capacity_used_pct DESC NULLS LAST`,
    );
    const ms = runs.reduce((a, b) => a + b, 0) / runs.length;
    res.json({
      success: true,
      data: rows,
      execution_ms: +ms.toFixed(3),
      indexed,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q10: Regional hospital performance comparison
app.get("/api/qopt/region-performance", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_hosp_region")
        .catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_hosp_region ON hospital(region)",
        )
        .catch(() => {});
    const runs = [];
    const sql = `SELECT h.region,
                COUNT(DISTINCT h.hospital_id) AS hospitals,
                SUM(h.transplant_capacity) AS total_capacity,
                COUNT(DISTINCT d.donor_id) AS donors,
                COUNT(DISTINCT r.recipient_id) AS recipients,
                COUNT(DISTINCT tr.transplant_id) AS transplants
         FROM hospital h
         LEFT JOIN donor d ON h.hospital_id=d.hospital_id
         LEFT JOIN recipient r ON h.hospital_id=r.hospital_id
         LEFT JOIN transplant_record tr ON h.hospital_id=tr.hospital_id
         WHERE h.region IS NOT NULL
         GROUP BY h.region ORDER BY transplants DESC`;
    for (let i = 0; i < 3; i++) {
      const { ms } = await runTimed(db, sql);
      runs.push(ms);
    }
    const { rows } = await runTimed(db, sql);
    const ms = runs.reduce((a, b) => a + b, 0) / runs.length;
    res.json({
      success: true,
      data: rows,
      execution_ms: +ms.toFixed(3),
      indexed,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q11: Staff workload by specialization
app.get("/api/qopt/staff-workload", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_staff_spec, idx_qopt_tr_staff")
        .catch(() => {});
    else {
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_staff_spec ON medical_staff(specialization)",
        )
        .catch(() => {});
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_tr_staff ON transplant_record(staff_id)",
        )
        .catch(() => {});
    }
    const sql = `SELECT ms.specialization,
                COUNT(DISTINCT ms.staff_id) AS total_staff,
                COUNT(tr.transplant_id) AS total_transplants,
                ROUND(COUNT(tr.transplant_id)::NUMERIC / NULLIF(COUNT(DISTINCT ms.staff_id),0),1) AS avg_per_staff,
                SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END) AS successful
         FROM medical_staff ms
         LEFT JOIN transplant_record tr ON ms.staff_id=tr.staff_id
         GROUP BY ms.specialization ORDER BY total_transplants DESC`;
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const { ms } = await runTimed(db, sql);
      runs.push(ms);
    }
    const { rows } = await runTimed(db, sql);
    const ms = runs.reduce((a, b) => a + b, 0) / runs.length;
    res.json({
      success: true,
      data: rows,
      execution_ms: +ms.toFixed(3),
      indexed,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Q12: Recipient urgency distribution by hospital
app.get("/api/qopt/urgency-by-hospital", async (req, res) => {
  const indexed = req.query.indexed === "true";
  const db = req.db;
  try {
    if (!indexed)
      await db
        .query("DROP INDEX IF EXISTS idx_qopt_rec_hosp_urg")
        .catch(() => {});
    else
      await db
        .query(
          "CREATE INDEX IF NOT EXISTS idx_qopt_rec_hosp_urg ON recipient(hospital_id, urgency_level)",
        )
        .catch(() => {});
    const sql = `SELECT h.name AS hospital_name, h.region,
                COUNT(CASE WHEN r.urgency_level='Critical' THEN 1 END) AS critical,
                COUNT(CASE WHEN r.urgency_level='High'     THEN 1 END) AS high,
                COUNT(CASE WHEN r.urgency_level='Medium'   THEN 1 END) AS medium,
                COUNT(CASE WHEN r.urgency_level='Low'      THEN 1 END) AS low,
                COUNT(r.recipient_id) AS total
         FROM hospital h
         JOIN recipient r ON h.hospital_id=r.hospital_id
         WHERE r.medical_status='Active'
         GROUP BY h.hospital_id, h.name, h.region
         ORDER BY critical DESC, total DESC`;
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const { ms } = await runTimed(db, sql);
      runs.push(ms);
    }
    const { rows } = await runTimed(db, sql);
    const ms = runs.reduce((a, b) => a + b, 0) / runs.length;
    res.json({
      success: true,
      data: rows,
      execution_ms: +ms.toFixed(3),
      indexed,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
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

// ── QUERY OPTIMIZATION ROUTES ────────────────────────────────
// These routes run EXPLAIN ANALYZE and return timing + plan info
// Used by the Query Optimization page in the dashboard

// Drop all custom indexes (simulate no-index state)
app.post("/api/optimize/drop-indexes", async (req, res) => {
  try {
    await pool.query(`
      DROP INDEX IF EXISTS idx_organ_status;
      DROP INDEX IF EXISTS idx_donor_blood_type;
      DROP INDEX IF EXISTS idx_donor_hospital;
      DROP INDEX IF EXISTS idx_donor_type_status;
      DROP INDEX IF EXISTS idx_recipient_blood_type;
      DROP INDEX IF EXISTS idx_recipient_urgency_status;
      DROP INDEX IF EXISTS idx_recipient_urgency;
      DROP INDEX IF EXISTS idx_recipient_status;
      DROP INDEX IF EXISTS idx_waitlist_priority;
      DROP INDEX IF EXISTS idx_waitlist_recipient;
      DROP INDEX IF EXISTS idx_compatibility_result_score;
      DROP INDEX IF EXISTS idx_compatibility_donor;
      DROP INDEX IF EXISTS idx_compatibility_recipient;
      DROP INDEX IF EXISTS idx_compatibility_result;
      DROP INDEX IF EXISTS idx_transplant_status_outcome;
      DROP INDEX IF EXISTS idx_transplant_surgery_date;
      DROP INDEX IF EXISTS idx_transplant_donor;
      DROP INDEX IF EXISTS idx_transplant_recipient;
      DROP INDEX IF EXISTS idx_transplant_hospital;
      DROP INDEX IF EXISTS idx_chain_status;
      DROP INDEX IF EXISTS idx_chain_link_chain;
      DROP INDEX IF EXISTS idx_donor_blood;
      DROP INDEX IF EXISTS idx_recipient_blood;
      DROP INDEX IF EXISTS idx_organ_donor;
      DROP INDEX IF EXISTS idx_waitlist_organ_type;
      DROP INDEX IF EXISTS idx_transplant_status;
      DROP INDEX IF EXISTS idx_transplant_outcome;
      DROP INDEX IF EXISTS idx_chain_link_donor;
      DROP INDEX IF EXISTS idx_chain_link_recipient;
    `);
    res.json({ success: true, message: "All custom indexes dropped" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create all indexes
app.post("/api/optimize/create-indexes", async (req, res) => {
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_organ_status ON organ(status);
      CREATE INDEX IF NOT EXISTS idx_donor_blood_type ON donor(blood_type);
      CREATE INDEX IF NOT EXISTS idx_donor_hospital ON donor(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_donor_type_status ON donor(donor_type, medical_status);
      CREATE INDEX IF NOT EXISTS idx_recipient_blood_type ON recipient(blood_type);
      CREATE INDEX IF NOT EXISTS idx_recipient_urgency_status ON recipient(urgency_level, medical_status);
      CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority_score DESC);
      CREATE INDEX IF NOT EXISTS idx_waitlist_recipient ON waitlist(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_compatibility_result_score ON compatibility_test(test_result, compatibility_score DESC);
      CREATE INDEX IF NOT EXISTS idx_compatibility_donor ON compatibility_test(donor_id);
      CREATE INDEX IF NOT EXISTS idx_compatibility_recipient ON compatibility_test(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_transplant_status_outcome ON transplant_record(status, outcome);
      CREATE INDEX IF NOT EXISTS idx_transplant_surgery_date ON transplant_record(surgery_date DESC);
      CREATE INDEX IF NOT EXISTS idx_transplant_donor ON transplant_record(donor_id);
      CREATE INDEX IF NOT EXISTS idx_transplant_recipient ON transplant_record(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_chain_status ON donation_chain(status);
      CREATE INDEX IF NOT EXISTS idx_chain_link_chain ON chain_link(chain_id);
    `);
    res.json({ success: true, message: "All indexes created" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Run EXPLAIN ANALYZE for a named query and return parsed results
app.get("/api/optimize/run/:queryId", async (req, res) => {
  const queries = {
    q1: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT o.organ_id, o.organ_type, d.name AS donor_name, d.blood_type, h.name AS hospital_name, o.expiry_time
         FROM organ o JOIN donor d ON o.donor_id=d.donor_id JOIN hospital h ON d.hospital_id=h.hospital_id
         WHERE o.status='Available' AND d.blood_type='O+'`,

    q2: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT w.waitlist_id, r.name, r.blood_type, r.urgency_level, w.organ_type, w.priority_score,
                CURRENT_DATE - w.registration_date AS days_waiting
         FROM waitlist w JOIN recipient r ON w.recipient_id=r.recipient_id
         WHERE r.urgency_level='Critical' AND r.medical_status='Active'
         ORDER BY w.priority_score DESC`,

    q3: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT ct.test_id, d.name AS donor_name, d.blood_type, r.name AS recipient_name,
                r.urgency_level, ct.compatibility_score, ct.test_result
         FROM compatibility_test ct
         JOIN donor d ON ct.donor_id=d.donor_id JOIN recipient r ON ct.recipient_id=r.recipient_id
         WHERE ct.test_result='Compatible' AND ct.compatibility_score>=85.0 AND r.medical_status='Active'
         ORDER BY ct.compatibility_score DESC`,

    q4: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT tr.transplant_id, d.name AS donor_name, r.name AS recipient_name,
                o.organ_type, h.name AS hospital_name, ms.name AS surgeon_name,
                tr.surgery_date, tr.status, tr.outcome
         FROM transplant_record tr
         JOIN donor d ON tr.donor_id=d.donor_id JOIN recipient r ON tr.recipient_id=r.recipient_id
         JOIN organ o ON tr.organ_id=o.organ_id JOIN hospital h ON tr.hospital_id=h.hospital_id
         JOIN medical_staff ms ON tr.staff_id=ms.staff_id
         WHERE tr.status='Completed' AND tr.outcome='Successful'
         ORDER BY tr.surgery_date DESC`,

    q5: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT dc.chain_name, dc.status, cl.sequence_number,
                d.name AS donor_name, d.blood_type, r.name AS recipient_name, r.urgency_level
         FROM donation_chain dc
         JOIN chain_link cl ON dc.chain_id=cl.chain_id
         JOIN donor d ON cl.donor_id=d.donor_id JOIN recipient r ON cl.recipient_id=r.recipient_id
         WHERE dc.status='In Progress'
         ORDER BY dc.chain_id, cl.sequence_number`,

    q6: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT d.donor_type, COUNT(DISTINCT d.donor_id) AS total_donors,
                COUNT(DISTINCT o.organ_id) AS total_organs,
                COUNT(DISTINCT CASE WHEN o.status='Transplanted' THEN o.organ_id END) AS transplanted
         FROM donor d LEFT JOIN organ o ON d.donor_id=o.donor_id
         GROUP BY d.donor_type`,

    q7: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT h.name AS hospital_name, COUNT(tr.transplant_id) AS total,
                SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END) AS successful,
                ROUND(SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END)::NUMERIC*100.0/NULLIF(COUNT(tr.transplant_id),0),2) AS success_rate
         FROM hospital h JOIN transplant_record tr ON h.hospital_id=tr.hospital_id
         WHERE tr.status='Completed'
         GROUP BY h.hospital_id, h.name ORDER BY success_rate DESC`,

    q8: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT r.recipient_id, r.name, r.blood_type, w.organ_type, r.urgency_level,
                w.priority_score, h.name AS hospital_name, CURRENT_DATE-r.registration_date AS days_registered
         FROM recipient r JOIN waitlist w ON r.recipient_id=w.recipient_id
         JOIN hospital h ON r.hospital_id=h.hospital_id
         WHERE r.urgency_level='Critical' AND r.medical_status='Active'
         ORDER BY w.priority_score DESC`,

    q9: `EXPLAIN (ANALYZE, FORMAT TEXT)
         SELECT ms.name, ms.specialization, h.name AS hospital_name,
                COUNT(tr.transplant_id) AS transplants_done,
                SUM(CASE WHEN tr.outcome='Successful' THEN 1 ELSE 0 END) AS successful
         FROM medical_staff ms LEFT JOIN transplant_record tr ON ms.staff_id=tr.staff_id
         JOIN hospital h ON ms.hospital_id=h.hospital_id
         GROUP BY ms.staff_id, ms.name, ms.specialization, h.name
         ORDER BY transplants_done DESC`,

    q10: `EXPLAIN (ANALYZE, FORMAT TEXT)
          SELECT o.organ_id, o.organ_type, d.name AS donor_name, h.name AS hospital_name,
                 o.expiry_time, ROUND(EXTRACT(EPOCH FROM (o.expiry_time-NOW()))/3600,1) AS hours_left
          FROM organ o JOIN donor d ON o.donor_id=d.donor_id JOIN hospital h ON d.hospital_id=h.hospital_id
          WHERE o.status='Available' AND o.expiry_time>NOW()
          ORDER BY o.expiry_time ASC`,
  };

  const sql = queries[req.params.queryId];
  if (!sql)
    return res.status(404).json({ success: false, error: "Query not found" });

  try {
    const result = await pool.query(sql);
    const plan = result.rows.map((r) => r["QUERY PLAN"]).join("\n");

    // parse planning time, execution time, scan type from plan text
    const execMatch = plan.match(/Execution Time:\s*([\d.]+)\s*ms/);
    const planMatch = plan.match(/Planning Time:\s*([\d.]+)\s*ms/);
    const scanType = plan.includes("Index Scan")
      ? "Index Scan"
      : plan.includes("Index Only Scan")
        ? "Index Only Scan"
        : plan.includes("Bitmap Heap Scan")
          ? "Bitmap Scan"
          : "Seq Scan";
    const costMatch = plan.match(/cost=([\d.]+)\.\.([\d.]+)/);

    res.json({
      success: true,
      data: {
        plan,
        scanType,
        planningTime: planMatch ? parseFloat(planMatch[1]) : null,
        executionTime: execMatch ? parseFloat(execMatch[1]) : null,
        costStart: costMatch ? parseFloat(costMatch[1]) : null,
        costEnd: costMatch ? parseFloat(costMatch[2]) : null,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
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
