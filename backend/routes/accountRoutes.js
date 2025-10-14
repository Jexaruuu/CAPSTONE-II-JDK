const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/accountController");
const multer = require("multer");

const upload = multer();

router.get("/me", ctrl.me);
router.post("/avatar", upload.any(), ctrl.avatar);
router.delete("/avatar", ctrl.removeAvatar);
router.post("/password", ctrl.password);
router.post("/profile", ctrl.updateProfile);

module.exports = router;
