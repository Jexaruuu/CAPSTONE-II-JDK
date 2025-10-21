const express = require('express');
const router = express.Router();
const { submitFullRequest, listApproved, detailsByEmail, byGroup } = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);
router.get('/approved', listApproved);
router.get('/details', detailsByEmail);
router.get('/by-group/:groupId', byGroup);

module.exports = router;
