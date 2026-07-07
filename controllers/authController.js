const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');   // ← Đảm bảo import đúng đường dẫn

// ------------------------------------------------------------------
// HÀM TIỆN ÍCH: TẠO CHỮ KÝ ĐIỆN TỬ (TOKEN)
// ------------------------------------------------------------------
const generateToken = (id) => {
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

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'buyer',
    });

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
// API 2: ĐĂNG NHẬP TRUYỀN THỐNG + HỖ TRỢ 2FA (POST /api/auth/login)
// ------------------------------------------------------------------
// API 2: ĐĂNG NHẬP + HỖ TRỢ 2FA
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {

      // Nếu đã bật 2FA → Yêu cầu OTP
      if (user.is2FAEnabled) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.otp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 phút
        await user.save();

        const message = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Mã xác thực đăng nhập</h2>
            <p>Xin chào <b>${user.name}</b>,</p>
            <p>Mã OTP của bạn là: <b style="font-size:24px;color:red;">${otp}</b></p>
            <p>Mã này có hiệu lực trong 5 phút.</p>
          </div>
        `;

        await sendEmail({ 
          email: user.email, 
          subject: 'Mã OTP xác thực 2 lớp', 
          message 
        });

        return res.json({ 
          requireOTP: true, 
          userId: user._id 
        });
      }

      // Không bật 2FA → đăng nhập bình thường
      return res.json({
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
    console.log("🚨 LỖI LOGIN:", error);
    res.status(500).json({ message: 'Lỗi Server!' });
  }
};

// ------------------------------------------------------------------
// API 3: XÁC THỰC MÃ OTP KHI ĐĂNG NHẬP (POST /api/auth/verify-otp)
// ------------------------------------------------------------------
const verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn!' });
    }

    // Xóa OTP sau khi xác thực thành công
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.log("🚨 LỖI VERIFY OTP:", error);
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 4: ĐỔI MẬT KHẨU (PUT /api/auth/change-password)
// ------------------------------------------------------------------
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword; // Mật khẩu sẽ được hash tự động nhờ pre-save
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------------------------------------
// API 5: BẬT / TẮT 2FA (PUT /api/auth/toggle-2fa)
// ------------------------------------------------------------------
const toggle2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.is2FAEnabled = !user.is2FAEnabled;
    await user.save();

    res.json({ 
      is2FAEnabled: user.is2FAEnabled, 
      message: user.is2FAEnabled 
        ? 'Đã bật xác thực 2 lớp thành công' 
        : 'Đã tắt xác thực 2 lớp' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------------------------------------
// API 6: ĐĂNG NHẬP BẰNG GOOGLE
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// API 6: ĐĂNG NHẬP BẰNG GOOGLE (BYPASS 2FA)
// ------------------------------------------------------------------
const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    const { data: googleUser } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        password: Math.random().toString(36).slice(-8) + Date.now().toString(),
        role: 'buyer',
        avatar: googleUser.picture,
        is2FAEnabled: false   // ← Đảm bảo tài khoản Google không bật 2FA
      });
    }

    // Google login luôn bypass 2FA
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.log("🚨 CHI TIẾT LỖI GOOGLE LOGIN:", error);
    res.status(400).json({ message: 'Xác thực Google thất bại!', error: error.message });
  }
};

module.exports = { 
  registerUser, 
  loginUser, 
  googleLogin,
  verifyLoginOTP,
  changePassword,
  toggle2FA 
};