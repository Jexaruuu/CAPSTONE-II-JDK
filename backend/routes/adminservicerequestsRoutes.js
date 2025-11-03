const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminservicerequestsController");

router.get("/", controller.list);
router.get("/count", controller.count);
router.post("/:id/approve", controller.approve);
router.post("/:id/decline", controller.decline);

module.exports = router;
