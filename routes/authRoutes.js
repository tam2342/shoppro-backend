const express = require('express');
const router = express.Router();

// ==================== IMPORT CONTROLLERS ====================
const { 
  registerUser, 
  loginUser, 
  googleLogin,
  verifyLoginOTP,
  changePassword,
  toggle2FA 
} = require('../controllers/authController');

// ==================== IMPORT MIDDLEWARE ====================
const { protect } = require('../middlewares/authMiddleware');

// ==================== CÁC ROUTES ====================

// Đăng ký tài khoản
router.post('/register', registerUser);

// Đăng nhập truyền thống
router.post('/login', loginUser);

// Đăng nhập bằng Google
router.post('/google', googleLogin);

// Xác thực mã OTP (2FA)
router.post('/verify-otp', verifyLoginOTP);

// Đổi mật khẩu (yêu cầu đã đăng nhập)
router.put('/change-password', protect, changePassword);

// Bật / Tắt 2FA (yêu cầu đã đăng nhập)
router.put('/toggle-2fa', protect, toggle2FA);

module.exports = router;