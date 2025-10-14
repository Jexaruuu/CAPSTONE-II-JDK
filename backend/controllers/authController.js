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

module.exports = { resendVerification, checkEmailAvailability };
