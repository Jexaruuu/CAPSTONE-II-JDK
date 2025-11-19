const express = require('express');
const router = express.Router();
const { resendVerification, checkEmailAvailability, requestOtp, verifyOtp } = require('../controllers/authController');

router.post('/auth/resend', resendVerification);
router.post('/auth/check-email', checkEmailAvailability);
router.post('/auth/request-otp', requestOtp);
router.post('/auth/verify-otp', verifyOtp);

module.exports = router;
