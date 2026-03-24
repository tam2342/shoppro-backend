const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');

// 1. API Lấy danh sách khách hàng đã chat (Đổ vào Cột trái của Seller)
router.get('/conversations', protect, async (req, res) => {
  try {
    const myId = req.user._id;
    
    // Tìm tất cả tin nhắn gửi ĐI hoặc gửi ĐẾN mình
    const messages = await Message.find({
      $or: [{ sender: myId }, { receiver: myId }]
    }).sort({ createdAt: -1 }).populate('sender receiver', 'name'); // Lấy luôn tên thật để hiển thị

    // Lọc ra danh sách những người khác (loại bỏ trùng lặp)
    const contacts = new Map();
    messages.forEach(msg => {
      // 🛡️ BỨC TƯỜNG BẢO VỆ: Nếu account người gửi hoặc nhận đã bị xóa khỏi DB thì bỏ qua tin nhắn này
      if (!msg.sender || !msg.receiver) return;

      const otherPerson = msg.sender._id.toString() === myId.toString() ? msg.receiver : msg.sender;
      
      if (!contacts.has(otherPerson._id.toString())) {
        contacts.set(otherPerson._id.toString(), {
          id: otherPerson._id,
          name: otherPerson.name || "Khách hàng" // Fallback nếu không có tên
        });
      }
    });

    res.json(Array.from(contacts.values()));
  } catch (error) {
    console.log("🚨 Lỗi API conversations:", error); // In lỗi ra Terminal để dễ soi
    res.status(500).json({ message: 'Lỗi lấy danh sách chat', error: error.message });
  }
});

// 2. API Lấy chi tiết tin nhắn giữa mình và 1 người khác (Đổ vào Khung chat)
router.get('/:otherId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.otherId },
        { sender: req.params.otherId, receiver: req.user._id }
      ]
    }).sort({ createdAt: 1 }); // Sắp xếp từ cũ đến mới

    // Format lại dữ liệu cho giống với cấu trúc mảng mà React đang dùng
    const formattedMessages = messages.map(msg => ({
      senderId: msg.sender.toString(),
      receiverId: msg.receiver.toString(),
      content: msg.content,
      time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sử tin nhắn' });
  }
});

module.exports = router;