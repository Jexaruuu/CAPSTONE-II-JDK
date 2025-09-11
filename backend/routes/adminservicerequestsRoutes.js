// backend/routes/adminservicerequestsRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminservicerequestsController');

router.get('/', ctrl.list);            // supports ?status=all|pending|approved|declined & ?q=
router.get('/count', ctrl.count);
router.post('/:id/approve', ctrl.approve);
router.post('/:id/decline', ctrl.decline);

module.exports = router;
