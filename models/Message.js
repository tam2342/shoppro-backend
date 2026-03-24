const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    receiver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    content: { 
      type: String, 
      required: true 
    },
    // Trạng thái đã xem hay chưa (sau này dùng làm thông báo "có tin nhắn mới")
    isRead: { 
      type: Boolean, 
      default: false 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);