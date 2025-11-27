const express = require("express");
const router = express.Router();
const {
  list,
  count,
  approve,
  decline
} = require("../controllers/adminworkerapplicationController");

router.get("/", list);
router.get("/count", count);
router.post("/:id/approve", approve);
router.post("/:id/decline", decline);

module.exports = router;
