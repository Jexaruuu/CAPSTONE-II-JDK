const express = require("express");
const { applyRequest } = require("../controllers/requestController");

const router = express.Router();

router.post("/apply", applyRequest);

module.exports = router;
