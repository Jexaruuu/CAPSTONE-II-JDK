const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const workerController = require("../controllers/workerController");

router.post("/register", workerController.registerWorker);
router.get("/me", workerController.me);
router.post("/avatar", upload.any(), workerController.avatar);
router.delete("/avatar", workerController.removeAvatar);
router.post("/password", workerController.password);
router.post("/profile", workerController.updateProfile);

module.exports = router;
