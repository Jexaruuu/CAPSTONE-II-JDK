const express = require('express');
const controller = require('../controllers/adminController');

const router = express.Router();

const requireAdminSession = (req, res, next) => {
  const u = req.session && req.session.user;
  if (!u || String(u.role || '').toLowerCase() !== 'admin') {
    return res.status(401).json({ message: 'Not authenticated as admin.' });
  }
  next();
};

router.post('/register', controller.registerAdmin);
router.post('/login', controller.loginAdmin);
router.post('/send-admin-no', controller.sendAdminNoEmail);
router.post('/request-admin-no', controller.requestAdminNo);
router.post('/logout', controller.logoutAdmin);
router.get('/users', requireAdminSession, controller.listAllUsers);

module.exports = router;
