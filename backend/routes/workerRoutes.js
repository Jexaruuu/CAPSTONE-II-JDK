const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");

router.post("/register", workerController.registerWorker);
router.get("/me", workerController.me);
router.post("/password", workerController.password);
router.post("/profile", workerController.updateProfile);
router.get("/public/sex", workerController.publicSex);
router.get("/public/reviews", workerController.listPublicReviews);

router.get("/myworks", workerController.getMyWorks);
router.post("/myworks", workerController.saveMyWorks);

module.exports = router;
