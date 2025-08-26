const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

const clientRoutes = require('./routes/clientRoutes');
const workerRoutes = require('./routes/workerRoutes');
const loginRoutes = require('./routes/loginRoutes');

// ✅ NEW: Admin routes
const adminRoutes = require('./routes/adminRoutes');

const { resendSignupEmail } = require('./supabaseClient');

// ✅ NEW: mail + otp utils
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ✅ NEW: bring in models to check email existence
const clientModel = require('./models/clientModel');
const workerModel = require('./models/workerModel');
// ✅ NEW: admin model for email checks
const adminModel = require('./models/adminModel');

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

app.post('/api/auth/resend', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    await resendSignupEmail(email);
    return res.status(200).json({ message: 'Verification email resent.' });
  } catch (err) {
    const status = err?.status || 400;
    return res.status(status).json({ message: err?.message || 'Failed to resend verification.' });
  }
});

/* ======================
   ✅ EMAIL EXISTENCE CHECK
   ====================== */
app.post('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const [clientFound, workerFound, adminFound] = await Promise.all([
      clientModel.checkEmailExistenceAcrossAllUsers(email),
      workerModel.checkEmailExistenceAcrossAllUsers(email),
      adminModel.checkEmailExistenceAcrossAllUsers
        ? adminModel.checkEmailExistenceAcrossAllUsers(email)
        : false
    ]);

    // Normalize to boolean
    const flatten = (v) =>
      v === true ||
      (Array.isArray(v) && v.length > 0) ||
      (!!v && typeof v === 'object' && Array.isArray(v.data) && v.data.length > 0);

    const exists = flatten(clientFound) || flatten(workerFound) || flatten(adminFound);
    return res.status(200).json({ exists });
  } catch (e) {
    console.error('check-email error:', e);
    return res.status(400).json({ message: 'Failed to check email' });
  }
});

// =====================
// ✅ NEW: EMAIL OTP FLOW
// =====================

// These SMTP creds are for **your own mailer** (separate from Supabase’s SMTP UI)
const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_PORT || '465') === '465', // 465 -> true, 587 -> false
  auth: {
    user: process.env.SMTP_USER || 'YOUR_EMAIL@example.com',
    pass: process.env.SMTP_PASS || 'YOUR_APP_PASSWORD',
  }
});

// Simple in-memory OTP store (good for dev). For prod, persist to DB.
const otpStore = new Map(); // key: email, value: { hash, expiresAt, attempts, lastSentAt }

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;
const OTP_PEPPER = process.env.OTP_SECRET || 'otp_pepper_dev';

function hashOtp(email, code) {
  return crypto.createHash('sha256').update(`${email}:${code}:${OTP_PEPPER}`).digest('hex');
}
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// Request OTP → email the code and save a hash for verification
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const existing = otpStore.get(email);
    const now = Date.now();
    if (existing && existing.lastSentAt && (now - existing.lastSentAt) < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting another code.` });
    }

    const code = generateCode();
    const hash = hashOtp(email, code);

    otpStore.set(email, {
      hash,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now
    });

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
    await mailTransport.sendMail({
      from: `"JDK HOMECARE" <${from}>`,
      to: email,
      subject: 'Your JDK HOMECARE verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:16px;color:#333;">
          <p>Hi,</p>
          <p>Your JDK HOMECARE verification code is:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
          <p>This code will expire in <b>10 minutes</b>.</p>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `
    });

    return res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.error('OTP send error:', err);
    return res.status(502).json({ message: 'Failed to send OTP email. Check SMTP settings.' });
  }
});

// Verify OTP → on success, mark email as verified in the session
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const rec = otpStore.get(email);
    if (!rec) return res.status(400).json({ message: 'No OTP requested for this email.' });

    const now = Date.now();
    if (now > rec.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });
    }

    const ok = rec.hash === hashOtp(email, code);
    rec.attempts += 1;

    if (!ok) {
      otpStore.set(email, rec);
      return res.status(400).json({ message: 'Invalid code. Please try again.' });
    }

    // success
    otpStore.delete(email);
    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[email] = true;

    return res.status(200).json({ message: 'OTP verified.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(400).json({ message: 'OTP verification failed.' });
  }
});

// -------------- existing routes --------------
app.use('/api/clients', clientRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/login', loginRoutes);

// ✅ NEW: admin routes (both plural & singular for compatibility)
app.use('/api/admins', adminRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
