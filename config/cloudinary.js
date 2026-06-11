// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// 1. Kết nối với tài khoản Cloudinary của bạn qua file .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Cấu hình kho lưu trữ: Tạo thư mục 'ShopPro_Products' trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ShopPro_Products', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Chỉ cho phép định dạng ảnh
  },
});

// 3. Khởi tạo công cụ Multer để hứng file
const upload = multer({ storage: storage });

module.exports = upload;