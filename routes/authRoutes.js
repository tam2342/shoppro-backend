const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin } = require('../controllers/authController');
// Khai báo các đường dẫn API
// Khi gọi POST đến /register, hàm registerUser sẽ được chạy
router.post('/register', registerUser);

// Khi gọi POST đến /login, hàm loginUser sẽ được chạy
router.post('/login', loginUser);
router.post('/google', googleLogin); // 👉 KÍCH HOẠT ĐƯỜNG DẪN NÀY LÀ XONG ĐỒ ÁN!
router.put('/toggle-2fa', protect, toggle2FA);
module.exports = router;