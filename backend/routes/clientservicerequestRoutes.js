// routes/clientservicerequestRoutes.js
const express = require('express');
const router = express.Router();
const { submitFullRequest } = require('../controllers/clientservicerequestController');

router.post('/submit', submitFullRequest);

module.exports = router;
