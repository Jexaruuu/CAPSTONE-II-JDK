const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

const clientRoutes = require('./routes/clientRoutes');
const workerRoutes = require('./routes/workerRoutes');
const loginRoutes = require('./routes/loginRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2
  }
}));

app.get('/test', (req, res) => {
  res.json({ message: "Server is up and running" });
});

app.use('/api/clients', clientRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/login', loginRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});