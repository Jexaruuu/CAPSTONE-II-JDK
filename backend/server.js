const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const db = require("./db");

const clientRoutes = require('./routes/clientRoutes');
const workerRoutes = require('./routes/workerRoutes');
const loginRoutes = require('./routes/loginRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Enable CORS with credentials
app.use(cors({
  origin: 'http://localhost:5174', // 👈 Match your actual frontend port
  credentials: true
}));

// ✅ JSON parser
app.use(express.json());

// ✅ Session middleware
app.use(session({
  secret: 'your-secret-key', // Replace with strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2 // 2 hours
  }
}));

// ✅ Test DB connection route
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ message: "Database connected successfully!", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Register routes
app.use('/api/clients', clientRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/login', loginRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
