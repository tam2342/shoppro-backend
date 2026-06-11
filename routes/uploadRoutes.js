// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');

// API endpoint: POST /api/upload
// 'image' chính là tên cái field (trường dữ liệu) mà Frontend sẽ gửi lên
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không tìm thấy file tải lên' });
    }
    
    // Cloudinary đã tự up ảnh xong và trả về link URL an toàn nằm trong req.file.path
    res.status(200).json({ 
      message: 'Tải ảnh thành công', 
      imageUrl: req.file.path 
    });
  } catch (error) {
    console.error("Lỗi up ảnh:", error);
    res.status(500).json({ message: 'Lỗi server khi tải ảnh', error: error.message });
  }
});

module.exports = router;