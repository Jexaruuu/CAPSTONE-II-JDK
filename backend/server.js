const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./db");
const clientRoutes = require('./routes/clientRoutes'); // Import client routes
const workerRoutes = require('./routes/workerRoutes'); // ✅ NEW
const loginRoutes = require('./routes/loginRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test DB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ message: "Database connected successfully!", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use client routes for handling client registration
app.use('/api/clients', clientRoutes);
app.use('/api/workers', workerRoutes); 
app.use('/api/login', loginRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
