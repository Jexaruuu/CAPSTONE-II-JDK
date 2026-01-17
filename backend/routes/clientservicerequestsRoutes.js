const express = require('express');
const router = express.Router();
const {
  submitFullRequest,
  listApproved,
  detailsByEmail,
  byGroup,
  listCurrent,
  cancelRequest,
  deleteRequest,
  updateByGroup,
  listOpen,
  updatePaymentMethodByGroup,
  requestStatusIdByGroup
} = require('../controllers/clientservicerequestsController');

router.post('/submit', submitFullRequest);
router.post('/cancel', cancelRequest);
router.get('/approved', listApproved);
router.get('/details', detailsByEmail);
router.get('/by-group/:groupId', byGroup);
router.get('/request-status-id/by-group/:groupId', requestStatusIdByGroup);
router.put('/by-group/:groupId', updateByGroup);
router.put('/by-group/:groupId/payment-method', updatePaymentMethodByGroup);
router.get('/', listCurrent);
router.delete('/:groupId', deleteRequest);
router.get('/open', listOpen);

module.exports = router;
