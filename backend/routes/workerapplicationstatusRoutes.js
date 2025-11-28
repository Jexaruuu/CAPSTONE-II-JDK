const express = require("express");
const router = express.Router();
const controller = require("../controllers/workerapplicationstatusController");

router.post("/create", controller.create);
router.get("/", controller.list);
router.get("/count", controller.count);
router.get("/stats", controller.stats);
router.get("/:id", controller.getOne);
router.post("/:id/approve", controller.approve);
router.post("/:id/decline", controller.decline);

module.exports = router;
