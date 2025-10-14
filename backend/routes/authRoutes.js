const express = require('express');
const router = express.Router();
const { resendVerification, checkEmailAvailability } = require('../controllers/authController');

router.post('/auth/resend', resendVerification);
router.post('/auth/check-email', checkEmailAvailability);

module.exports = router;
