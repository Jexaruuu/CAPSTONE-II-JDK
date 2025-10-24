const express = require('express');
const router = express.Router();
const { submitFullRequest, listApproved, detailsByEmail, byGroup, listCurrent, cancelRequest } = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);
router.post('/cancel', cancelRequest);
router.get('/approved', listApproved);
router.get('/details', detailsByEmail);
router.get('/by-group/:groupId', byGroup);
router.get('/', listCurrent);

module.exports = router;
