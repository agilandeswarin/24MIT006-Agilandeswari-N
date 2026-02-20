import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Initialize database pool
let db;

(async () => {
  try {
    console.log("🔄 Attempting to connect to database...");
    console.log(`Host: ${process.env.DB_HOST}, Database: ${process.env.DB_NAME}`);
    
    db = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "cropsevaihub",
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 0,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test the connection
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    
    console.log("✅ MySQL Pool Connected Successfully");
  } catch (err) {
    console.error("❌ Database Connection Error:", err.message);
    console.log("⚠️  Server running without database connection");
    console.log("Environment variables loaded:", {
      DB_HOST: process.env.DB_HOST ? "✓" : "✗",
      DB_USER: process.env.DB_USER ? "✓" : "✗",
      DB_PASSWORD: process.env.DB_PASSWORD ? "✓" : "✗",
      DB_NAME: process.env.DB_NAME ? "✓" : "✗",
      DB_PORT: process.env.DB_PORT ? "✓" : "✗"
    });
  }
})();

/* LOGIN */
app.post("/login", async (req, res) => {
  try {
    console.log("🔐 Login attempt:", req.body.email);
    
    if (!db) {
      console.log("❌ Database not available");
      return res.status(500).json({ error: "Database not connected. Please try again later." });
    }

    const { email, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let userId;

    if (users.length === 0) {
      const [result] = await db.query(
        "INSERT INTO users (email,password) VALUES (?,?)",
        [email, password]
      );
      userId = result.insertId;
      console.log("✅ New user created:", userId);
    } else {
      userId = users[0].id;
      console.log("✅ Existing user logged in:", userId);
    }

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    res.json({
      success: true,
      token,
      user: { id: userId, email }
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* DASHBOARD */
/* DASHBOARD */
app.get("/api/dashboard", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const [[cropCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM crops"
    );

    const [[diseaseCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM diseases"
    );

    const [crops] = await db.query(`
      SELECT c.id, c.name,
      COUNT(d.id) AS diseaseCount
      FROM crops c
      LEFT JOIN diseases d ON c.id = d.crop_id
      GROUP BY c.id
    `);

    const cropHealth = crops.map(c => ({
      name: c.name,
      healthScore: Math.max(30, 100 - c.diseaseCount * 25),
      status: c.diseaseCount == 0 ? "Healthy" :
              c.diseaseCount == 1 ? "Warning" : "Critical"
    }));

    // Fetch alerts here if you want to include in dashboard
    const [alerts] = await db.query(`
      SELECT 
        c.name AS crop,
        d.disease_name,
        d.severity
      FROM diseases d
      JOIN crops c ON d.crop_id = c.id
    `);

    res.json({
      totalCrops: cropCount.total,
      diseaseAlerts: diseaseCount.total,
      cropHealth,
      alerts   // now correctly included
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALERTS - separate endpoint */
app.get("/api/alerts", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [alerts] = await db.query(`
      SELECT 
        c.name AS crop,
        d.disease_name,
        d.severity
      FROM diseases d
      JOIN crops c ON d.crop_id = c.id
    `);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




/* CROPS */
app.get("/api/crops", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [data] = await db.query("SELECT * FROM crops");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/crops/:id", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [[data]] = await db.query(
      "SELECT * FROM crops WHERE id=?",
      [req.params.id]
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* USERS */
app.get("/api/users", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [data] = await db.query("SELECT * FROM users");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALL DISEASES */
app.get("/api/diseases", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [data] = await db.query("SELECT * FROM diseases");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALL FERTILIZERS */
app.get("/api/fertilizers", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [data] = await db.query("SELECT * FROM fertilizers");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.get("/api/crops/:id/diseases", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const cropId = req.params.id;

    const [rows] = await db.query(
      "SELECT * FROM diseases WHERE crop_id = ?",
      [cropId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get("/api/disease/:id", async (req,res)=>{
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [rows] = await db.query(
      "SELECT d.*, c.name as crop FROM diseases d JOIN crops c ON d.crop_id=c.id WHERE d.id=?",
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/crops/:id/fertilizers", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const [data] = await db.query(
      "SELECT * FROM fertilizers WHERE crop_id=?",
      [req.params.id]
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALL ADVISORY */
/* CROP ADVISORY */
app.get("/api/crops/:id/advisory", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const cropId = req.params.id;

    const [rows] = await db.query(
      "SELECT * FROM advisory WHERE crop_id = ?",
      [cropId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  console.log('🔎 Health check');
  res.json({ ok: true, uptime: process.uptime() });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════╗
║  🚀 CropSevai Hub Backend     ║
║  Server running on port ${PORT}    ║
║  Environment: ${process.env.NODE_ENV || 'development'}       ║
╚════════════════════════════════╝
  `);
});


