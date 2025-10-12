const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationsController");

router.get("/", ctrl.list);
router.get("/count", ctrl.unreadCount);
router.get("/stream", ctrl.stream);
router.post("/read-all", ctrl.readAll);
router.post("/:id/read", ctrl.read);
router.delete("/:id", ctrl.remove);
router.post("/", ctrl.create);

module.exports = router;
