const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", workerController.registerWorker);
router.get("/me", workerController.me);
router.post("/password", workerController.password);
router.post("/profile", workerController.updateProfile);
router.post("/profile/avatar", upload.single("file"), workerController.uploadWorkerAvatar);
router.delete("/profile/avatar", workerController.deleteWorkerAvatar);

module.exports = router;
