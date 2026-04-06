const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "database-container",
  user: "root",
  password: "root123",
  database: "formulaire_db"
});

function connectWithRetry() {
  db.connect((err) => {
    if (err) {
      console.log("MySQL not ready, retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
      return;
    }

    console.log("Connected to MySQL");

    const sql = `
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL
      )
    `;

    db.query(sql, (err) => {
      if (err) {
        console.error("Table creation error:", err.message);
      } else {
        console.log("Table contacts ready");
      }
    });
  });
}

connectWithRetry();

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/contacts", (req, res) => {
  db.query("SELECT * FROM contacts ORDER BY id DESC", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post("/contacts", (req, res) => {
  const { nom, email } = req.body;

  if (!nom || !email) {
    return res.status(400).json({ message: "nom and email are required" });
  }

  const sql = "INSERT INTO contacts (nom, email) VALUES (?, ?)";
  db.query(sql, [nom, email], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      message: "Contact added successfully",
      id: result.insertId
    });
  });
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});