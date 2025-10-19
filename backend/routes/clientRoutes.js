const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");

router.post("/register", clientController.registerClient);
router.get("/me", clientController.me);
router.post("/password", clientController.password);
router.post("/profile", clientController.updateProfile);

module.exports = router;
