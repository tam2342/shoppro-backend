const express = require('express');
const router = express.Router();
const { handleChatConsultant } = require('../controllers/chatbotController');

// Route này sẽ nhận request từ Frontend
router.post('/', handleChatConsultant);

module.exports = router;