const express = require('express');
const router = express.Router();
const { resendSignupEmail } = require('../supabaseClient');

router.post('/auth/resend', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    await resendSignupEmail(email);
    res.status(200).json({ message: 'Verification email resent.' });
  } catch (err) {
    const status = err?.status || 400;
    res.status(status).json({ message: err?.message || 'Failed to resend verification.' });
  }
});

module.exports = router;
