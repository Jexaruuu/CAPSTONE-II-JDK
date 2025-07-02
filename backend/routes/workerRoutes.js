const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

// Route to handle worker registration
router.post('/register', workerController.registerWorker);

module.exports = router;
