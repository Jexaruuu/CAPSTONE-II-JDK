const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", clientController.registerClient);
router.get("/me", clientController.me);
router.post("/password", clientController.password);
router.post("/profile", clientController.updateProfile);
router.post("/profile/avatar", upload.single("file"), clientController.uploadClientAvatar);
router.delete("/profile/avatar", clientController.deleteClientAvatar);

module.exports = router;
