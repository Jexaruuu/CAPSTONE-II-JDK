// routes/clientservicerequestsRoutes.js
const express = require('express');
const router = express.Router();
const { submitFullRequest, listApproved } = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);
router.get('/approved', listApproved);

module.exports = router;
