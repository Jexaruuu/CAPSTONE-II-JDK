// routes/workerapplicationRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/workerapplicationController');

router.post('/submit', controller.submitFullApplication);
router.post('/cancel', controller.cancel);
router.get('/approved', controller.listApproved);
router.get('/', controller.listMine);
router.get('/:id', controller.getByGroup);
router.delete('/:id', controller.deleteApplication);

module.exports = router;
