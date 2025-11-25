const express = require('express');
const router = express.Router();
const { submitFullRequest, listApproved, detailsByEmail, byGroup, listCurrent, cancelRequest, deleteRequest } = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);
router.post('/cancel', cancelRequest);
router.get('/approved', listApproved);
router.get('/details', detailsByEmail);
router.get('/by-group/:groupId', byGroup);
router.get('/', listCurrent);
router.delete('/:groupId', deleteRequest);

module.exports = router;
