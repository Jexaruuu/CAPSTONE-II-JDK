const express = require('express');
const router = express.Router();
const { submitFullApplication, listApproved } = require('../controllers/workerapplicationController');

router.post('/submit', submitFullApplication);
router.get('/approved', listApproved);

module.exports = router;
