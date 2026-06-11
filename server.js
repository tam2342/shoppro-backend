const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// IMPORT SOCKET.IO VÀ HTTP
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const messageRoutes = require('./routes/messageRoutes');
const orderRoutes = require('./routes/orderRoutes'); 
const uploadRoutes = require('./routes/uploadRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes'); // 👉 ĐÃ THÊM IMPORT ROUTE CHATBOT VÀO ĐÂY

dotenv.config();

const app = express();

// 1. TẠO HTTP SERVER VÀ BỌC APP LẠI
const server = http.createServer(app);

// 2. KHỞI TẠO SOCKET.IO CHO SERVER
const io = new Server(server, {
  cors: {
    origin: ["https://tamsu.id.vn", "https://tamsu.id.vn", "https://www.tamsu.id.vn"], 
    methods: ["GET", "POST"]
  }
});

connectDB();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: ["https://tamsu.id.vn", "https://tamsu.id.vn", "https://www.tamsu.id.vn"],
  credentials: true
}));

// --- KHAI BÁO CÁC ĐƯỜNG ỐNG DỮ LIỆU (ROUTES) ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/orders', orderRoutes); 
app.use('/api/upload', uploadRoutes);
app.use('/api/chatbot', chatbotRoutes); // 👉 ĐÃ KÍCH HOẠT ĐƯỜNG ỐNG CHATBOT Ở ĐÂY

// ------------------------------------------------------------------
// KHU VỰC XỬ LÝ SOCKET.IO (CHAT REAL-TIME)
// ------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log("⚡ Một User vừa cắm ống nước kết nối! ID Socket:", socket.id);

  // 1. Khi 2 người bắt đầu chat, họ sẽ chui vào một "Phòng kín" (Room)
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`🚪 User đã tham gia phòng chat: ${roomId}`);
  });

  // 2. Lắng nghe khi có người gửi tin nhắn
  socket.on("send_message", async (data) => {
    try {
      // Lưu tin nhắn vào Database (MongoDB)
      const newMessage = new Message({
        sender: data.senderId,
        receiver: data.receiverId,
        content: data.content
      });
      await newMessage.save();

      // 1. Bắn vào phòng chat chung của 2 người (Dành cho bong bóng chat)
      socket.to(data.roomId).emit("receive_message", data);
      
      // 2. Bắn thẳng vào "Kênh tổng đài" cá nhân của người nhận (Dành cho Trang Message Center)
      socket.to(data.receiverId).emit("receive_message", data);
      
    } catch (error) {
      console.log("🚨 Lỗi lưu tin nhắn Socket:", error);
    }
  });

  // Khi User tắt tab hoặc thoát trình duyệt
  socket.on("disconnect", () => {
    console.log("❌ User đã ngắt kết nối Socket", socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('API của ShopPro đang chạy ngon lành! 🚀');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🔥 Server & Socket.io đang chạy tại http://localhost:${PORT}`);
});