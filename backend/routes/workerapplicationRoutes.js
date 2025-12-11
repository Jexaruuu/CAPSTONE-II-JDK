// routes/workerapplicationRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/workerapplicationController');

router.get('/public/approved', controller.listPublicApproved);
router.post('/submit', controller.submitFullApplication);
router.post('/cancel', controller.cancel);
router.get('/approved', controller.listApproved);
router.get('/', controller.listMine);
router.get('/:id', controller.getByGroup);
router.delete('/:id', controller.deleteApplication);
router.get('/by-group/:id', controller.getByGroupFull);
router.put('/by-group/:id', controller.updateByGroup);

module.exports = router;
