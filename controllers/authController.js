const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // 👉 ĐÃ THÊM: Cài đặt axios để gọi API xác thực với Google

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
    console.log("🚨 CHI TIẾT LỖI TẠI BACKEND:", error); 
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 2: ĐĂNG NHẬP TRUYỀN THỐNG (POST /api/auth/login)
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
    console.log("🚨 CHI TIẾT LỖI TẠI BACKEND:", error); 
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 3: ĐĂNG NHẬP BẰNG GOOGLE (POST /api/auth/google) - 👉 BỔ SUNG MỚI
// ------------------------------------------------------------------
const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    // 1. Dùng Access Token gửi từ Frontend để xin Google cấp thông tin Userinfo
    const { data: googleUser } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // 2. Tìm trong Database xem Email Google này đã từng xuất hiện chưa
    let user = await User.findOne({ email: googleUser.email });

    // 3. Nếu chưa có, hệ thống tự động tạo luôn tài khoản (Social Register)
    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        // Vì đăng nhập bên thứ 3 nên tạo bừa 1 chuỗi ngẫu nhiên làm pass để vượt qua validation của Schema
        password: Math.random().toString(36).slice(-8) + Date.now().toString(), 
        role: 'buyer', // Mặc định tài khoản Google tạo mới là người mua
        avatar: googleUser.picture // Lưu ảnh đại diện từ Google
      });
    }

    // 4. Trả về thông tin User kèm JWT Token của riêng hệ thống mình y chang hàm login truyền thống
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.log("🚨 CHI TIẾT LỖI GOOGLE LOGIN TẠI BACKEND:", error);
    res.status(400).json({ message: 'Xác thực tài khoản Google thất bại!', error: error.message });
  }
};

module.exports = { registerUser, loginUser, googleLogin }; // 👉 Đã export thêm googleLogin ở đây