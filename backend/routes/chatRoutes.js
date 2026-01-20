const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.post("/ensure", chatController.ensure);
router.get("/conversations", chatController.conversations);
router.get("/messages/:conversationId", chatController.messages);
router.post("/messages/:conversationId", chatController.send);
router.post("/mark-read/:conversationId", chatController.markRead);

module.exports = router;
