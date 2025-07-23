const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

router.post('/', loginController.loginUser);
router.post('/logout', loginController.logoutUser); // ✅ Add this

module.exports = router;