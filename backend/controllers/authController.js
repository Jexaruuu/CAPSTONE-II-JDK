const { resendEmailVerification, isEmailTaken } = require('../models/authModel');

async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    await resendEmailVerification(email);
    res.status(200).json({ message: 'Verification email resent.' });
  } catch (err) {
    const status = err?.status || 400;
    res.status(status).json({ message: err?.message || 'Failed to resend verification.' });
  }
}

async function checkEmailAvailability(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ available: false, message: 'Email is required' });
    const taken = await isEmailTaken(email);
    res.status(200).json({ available: !taken });
  } catch (err) {
    res.status(400).json({ available: false, message: 'Email check failed' });
  }
}

async function requestOtp(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    if (!req.session) return res.status(500).json({ message: 'Session not available' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 10 * 60 * 1000;
    const now = Date.now();

    if (!req.session.emailOtps) req.session.emailOtps = {};
    req.session.emailOtps[email] = { code, expiresAt: now + ttl };

    res.status(200).json({ message: 'OTP sent.' });
  } catch (err) {
    const status = err?.status || 400;
    res.status(status).json({ message: err?.message || 'Failed to send OTP.' });
  }
}

async function verifyOtp(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    if (!req.session || !req.session.emailOtps || !req.session.emailOtps[email]) {
      return res.status(400).json({ message: 'Code not found. Please request a new one.' });
    }

    const entry = req.session.emailOtps[email];

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete req.session.emailOtps[email];
      return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    }

    if (entry.code !== code) {
      return res.status(400).json({ message: 'Invalid code.' });
    }

    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[email] = true;

    delete req.session.emailOtps[email];

    res.status(200).json({ message: 'Verified.' });
  } catch (err) {
    const status = err?.status || 400;
    res.status(status).json({ message: err?.message || 'Failed to verify OTP.' });
  }
}

module.exports = { resendVerification, checkEmailAvailability, requestOtp, verifyOtp };
