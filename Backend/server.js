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

const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false
  }
});


console.log("✅ MySQL Pool Connected");

/* LOGIN */
app.post("/login", async (req, res) => {
  try {
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
    } else {
      userId = users[0].id;
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
    res.status(500).json({ error: err.message });
  }
});

/* DASHBOARD */
/* DASHBOARD */
app.get("/api/dashboard", async (req, res) => {
  try {
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
  const [data] = await db.query("SELECT * FROM crops");
  res.json(data);
});

app.get("/api/crops/:id", async (req, res) => {
  const [[data]] = await db.query(
    "SELECT * FROM crops WHERE id=?",
    [req.params.id]
  );
  res.json(data);
});


/* USERS */
app.get("/api/users", async (req, res) => {
  try {
    const [data] = await db.query("SELECT * FROM users");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALL DISEASES */
app.get("/api/diseases", async (req, res) => {
  try {
    const [data] = await db.query("SELECT * FROM diseases");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ALL FERTILIZERS */
app.get("/api/fertilizers", async (req, res) => {
  try {
    const [data] = await db.query("SELECT * FROM fertilizers");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




app.get("/api/crops/:id/diseases", async (req, res) => {
  try {
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
  const [rows] = await db.query(
    "SELECT d.*, c.name as crop FROM diseases d JOIN crops c ON d.crop_id=c.id WHERE d.id=?",
    [req.params.id]
  );
  res.json(rows[0]);
});

app.get("/api/crops/:id/fertilizers", async (req, res) => {
  const [data] = await db.query(
    "SELECT * FROM fertilizers WHERE crop_id=?",
    [req.params.id]
  );
  res.json(data);
});

/* ALL ADVISORY */
/* CROP ADVISORY */
app.get("/api/crops/:id/advisory", async (req, res) => {
  try {
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


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});


