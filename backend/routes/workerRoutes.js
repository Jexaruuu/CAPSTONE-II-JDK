const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

router.post('/register', workerController.registerWorker);

module.exports = router;
