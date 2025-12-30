const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");

router.post("/", loginController.loginUser);
router.post("/logout", loginController.logoutUser);

module.exports = router;
