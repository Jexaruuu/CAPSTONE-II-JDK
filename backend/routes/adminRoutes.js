const express = require('express');
const controller = require('../controllers/adminController');

const router = express.Router();
router.post('/register', controller.registerAdmin);
router.post('/login', controller.loginAdmin);
router.post('/send-admin-no', controller.sendAdminNoEmail);
router.post('/request-admin-no', controller.requestAdminNo);
router.post('/logout', controller.logoutAdmin);

module.exports = router;
