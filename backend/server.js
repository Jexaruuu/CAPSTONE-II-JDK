const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

const clientRoutes = require("./routes/clientRoutes");
const workerRoutes = require("./routes/workerRoutes");
const loginRoutes = require("./routes/loginRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { resendSignupEmail, setDefaultRedirectBase } = require("./supabaseClient");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const clientModel = require("./models/clientModel");
const workerModel = require("./models/workerModel");
const adminModel = require("./models/adminModel");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const rawAllowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const wcToReg = pat =>
  new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

const allowedRegexes = rawAllowed.map(wcToReg);

const isLocal = origin =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
  /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);

const isAllowed = origin =>
  !origin ||
  isLocal(origin) ||
  allowedRegexes.some(rx => rx.test(origin));

const corsOrigin = (origin, cb) => {
  if (isAllowed(origin)) return cb(null, true);
  return cb(new Error("Not allowed by CORS"));
};

app.use(cors({ origin: corsOrigin, credentials: true }));

app.use((req, res, next) => {
  const o = req.headers.origin;
  const base = isAllowed(o) ? o : process.env.PUBLIC_APP_URL || "";
  if (base) setDefaultRedirectBase(base);
  next();
});

app.use(express.json());

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const useSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const cookieSameSite = useSecure ? "none" : "lax";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecure,
      httpOnly: true,
      sameSite: cookieSameSite,
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

app.get("/test", (req, res) => {
  res.json({ message: "Server is up and running" });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.post("/api/auth/resend", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });
    await resendSignupEmail(email);
    return res.status(200).json({ message: "Verification email resent." });
  } catch (err) {
    const status = err?.status || 400;
    return res.status(status).json({ message: err?.message || "Failed to resend verification." });
  }
});

app.post("/api/auth/check-email", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });
    const [clientFound, workerFound, adminFound] = await Promise.all([
      clientModel.checkEmailExistenceAcrossAllUsers(email),
      workerModel.checkEmailExistenceAcrossAllUsers(email),
      adminModel.checkEmailExistenceAcrossAllUsers ? adminModel.checkEmailExistenceAcrossAllUsers(email) : false
    ]);
    const flatten = v =>
      v === true ||
      (Array.isArray(v) && v.length > 0) ||
      (!!v && typeof v === "object" && Array.isArray(v.data) && v.data.length > 0);
    const exists = flatten(clientFound) || flatten(workerFound) || flatten(adminFound);
    return res.status(200).json({ exists });
  } catch (e) {
    return res.status(400).json({ message: "Failed to check email" });
  }
});

const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_PORT || "465") === "465",
  auth: {
    user: process.env.SMTP_USER || "YOUR_EMAIL@example.com",
    pass: process.env.SMTP_PASS || "YOUR_APP_PASSWORD"
  }
});

const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PEPPER = process.env.OTP_SECRET || "otp_pepper_dev";

function hashOtp(email, code) {
  return crypto.createHash("sha256").update(`${email}:${code}:${OTP_PEPPER}`).digest("hex");
}
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });
    const existing = otpStore.get(email);
    const now = Date.now();
    if (existing && existing.lastSentAt && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting another code.` });
    }
    const code = generateCode();
    const hash = hashOtp(email, code);
    otpStore.set(email, { hash, expiresAt: now + OTP_TTL_MS, attempts: 0, lastSentAt: now });
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
    await mailTransport.sendMail({
      from: `"JDK HOMECARE" <${from}>`,
      to: email,
      subject: "Your JDK HOMECARE verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:16px;color:#333;"><p>Hi,</p><p>Your JDK HOMECARE verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code will expire in <b>10 minutes</b>.</p><p>If you didn't request this, you can ignore this email.</p></div>`
    });
    return res.status(200).json({ message: "OTP sent" });
  } catch (err) {
    return res.status(502).json({ message: "Failed to send OTP email. Check SMTP settings." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ message: "Email and code are required" });
    const rec = otpStore.get(email);
    if (!rec) return res.status(400).json({ message: "No OTP requested for this email." });
    const now = Date.now();
    if (now > rec.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ message: "Too many attempts. Please request a new code." });
    }
    const ok = rec.hash === hashOtp(email, code);
    rec.attempts += 1;
    if (!ok) {
      otpStore.set(email, rec);
      return res.status(400).json({ message: "Invalid code. Please try again." });
    }
    otpStore.delete(email);
    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[email] = true;
    return res.status(200).json({ message: "OTP verified." });
  } catch (err) {
    return res.status(400).json({ message: "OTP verification failed." });
  }
});

app.use("/api/clients", clientRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
