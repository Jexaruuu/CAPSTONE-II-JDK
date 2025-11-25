const express = require('express');
const router = express.Router();
const { submitFullApplication, listApproved, getByGroup, cancel, listMine, deleteApplication } = require('../controllers/workerapplicationController');

router.post('/submit', submitFullApplication);
router.get('/approved', listApproved);
router.get('/by-group/:id', getByGroup);
router.post('/cancel', cancel);
router.get('/mine', listMine);
router.delete('/:id', deleteApplication);

module.exports = router;
