// backend/routes/clientservicerequestsRoutes.js
const express = require('express');
const router = express.Router();

const { submitFullRequest } = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);

module.exports = router;
