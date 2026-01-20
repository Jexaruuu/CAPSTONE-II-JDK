const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.post("/ensure", chatController.ensure);
router.get("/conversations", chatController.conversations);
router.get("/messages/:conversationId", chatController.messages);
router.post("/messages/:conversationId", chatController.send);

router.put("/messages/:conversationId/:messageId", chatController.editMessage);
router.delete("/messages/:conversationId/:messageId", chatController.deleteMessage);

router.post("/mark-read/:conversationId", chatController.markRead);
router.post("/read/:conversationId", chatController.markRead);

router.post("/mark-all-read", chatController.markAllRead);
router.post("/read-all", chatController.markAllRead);

module.exports = router;
