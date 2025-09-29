const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/pendingworkerapplicationController");

router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/count", ctrl.count);
router.get("/stats", ctrl.stats);
router.get("/:id", ctrl.getOne);
router.patch("/:id/approve", ctrl.approve);
router.patch("/:id/decline", ctrl.decline);

module.exports = router;
