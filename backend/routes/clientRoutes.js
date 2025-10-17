const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const clientController = require("../controllers/clientController");

router.post("/register", clientController.registerClient);
router.get("/me", clientController.me);
router.post("/avatar", upload.any(), clientController.avatar);
router.delete("/avatar", clientController.removeAvatar);
router.post("/password", clientController.password);
router.post("/profile", clientController.updateProfile);

module.exports = router;
