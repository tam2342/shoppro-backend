const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Kiểm tra token có nằm trong Header 'Authorization' dạng 'Bearer <token>' không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Lấy token từ chuỗi Bearer
      token = req.headers.authorization.split(' ')[1];

      // 2. Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Tìm user trong DB bằng ID giải mã được và gắn vào req.user (không lấy mật khẩu)
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Cho phép đi tiếp
    } catch (error) {
      res.status(401).json({ message: 'Token không hợp lệ, xác thực thất bại!' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Không tìm thấy Token, vui lòng đăng nhập!' });
  }
};

// Middleware kiểm tra quyền Người bán
const sellerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'seller') {
    next();
  } else {
    res.status(403).json({ message: 'Chỉ tài khoản Người bán mới có quyền thực hiện thao tác này!' });
  }
};

module.exports = { protect, sellerOnly };