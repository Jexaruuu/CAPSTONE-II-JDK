const express = require('express');
const controller = require('../controllers/adminController');

const router = express.Router();
router.post('/register', controller.registerAdmin);
router.post('/login', controller.loginAdmin);

module.exports = router;
