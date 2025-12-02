const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientservicerequeststatusController');

router.get('/', ctrl.list);
router.get('/count', ctrl.count);
router.get('/counts', ctrl.counts);
router.get('/mine', ctrl.listMine);
router.get('/:id', ctrl.getById);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/', ctrl.create);

module.exports = router;
