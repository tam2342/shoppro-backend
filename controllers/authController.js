const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ------------------------------------------------------------------
// HÀM TIỆN ÍCH: TẠO CHỮ KÝ ĐIỆN TỬ (TOKEN)
// ------------------------------------------------------------------
const generateToken = (id) => {
  // Token sẽ chứa ID của user, được khóa bằng JWT_SECRET và có hạn 30 ngày
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// ------------------------------------------------------------------
// API 1: ĐĂNG KÝ TÀI KHOẢN (POST /api/auth/register)
// ------------------------------------------------------------------
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Kiểm tra xem email đã tồn tại trong Database chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    // 2. Tạo User mới (Mật khẩu sẽ tự động được mã hóa nhờ hàm pre-save ở Model)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'buyer', // Nếu không gửi role lên, mặc định là người mua
    });

    // 3. Trả về thông tin User kèm theo Token
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ, không thể tạo tài khoản.' });
    }
  } catch (error) {
    console.log("🚨 CHI TIẾT LỖI TẠI BACKEND:", error); // Dòng này ép nó phải in lỗi ra Terminal
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 2: ĐĂNG NHẬP (POST /api/auth/login)
// ------------------------------------------------------------------
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm user theo email
    const user = await User.findOne({ email });

    // 2. Nếu có user VÀ mật khẩu giải mã ra khớp nhau
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }
  } catch (error) {
    console.log("🚨 CHI TIẾT LỖI TẠI BACKEND:", error); // Dòng này ép nó phải in lỗi ra Terminal
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

module.exports = { registerUser, loginUser };