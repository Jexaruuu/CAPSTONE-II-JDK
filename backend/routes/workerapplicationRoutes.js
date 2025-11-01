const express = require('express');
const router = express.Router();
const { submitFullApplication, listApproved, getByGroup } = require('../controllers/workerapplicationController');

router.post('/submit', submitFullApplication);
router.get('/approved', listApproved);
router.get('/by-group/:id', getByGroup);

module.exports = router;
