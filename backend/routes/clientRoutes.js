const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');  // Make sure the path is correct

// Route to handle client registration
router.post('/register', clientController.registerClient);

module.exports = router;