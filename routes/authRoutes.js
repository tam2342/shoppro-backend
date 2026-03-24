const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Khai báo các đường dẫn API
// Khi gọi POST đến /register, hàm registerUser sẽ được chạy
router.post('/register', registerUser);

// Khi gọi POST đến /login, hàm loginUser sẽ được chạy
router.post('/login', loginUser);

module.exports = router;