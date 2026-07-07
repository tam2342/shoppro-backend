const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Vui lòng nhập họ tên'] 
    },
    email: { 
      type: String, 
      required: [true, 'Vui lòng nhập email'], 
      unique: true // Đảm bảo mỗi email chỉ tạo được 1 tài khoản
    },
    password: { 
      type: String, 
      required: [true, 'Vui lòng nhập mật khẩu'] 
    },
    avatar: { 
      type: String, 
      default: '' 
    },
    phone: { 
      type: String, 
      default: '' 
    },
    address: { 
      type: String, 
      default: '' 
    },
    
    // ==========================================
    // BỔ SUNG CHO TÍNH NĂNG XÁC THỰC 2 LỚP (2FA)
    // ==========================================
    is2FAEnabled: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String
    },
    otpExpires: {
      type: Date
    },
    // ==========================================

    // PHÂN QUYỀN (Role-Based Access Control)
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer', // Mặc định ai đăng ký cũng là người mua
    },
    // KHU VỰC DÀNH RIÊNG CHO NGƯỜI BÁN (Chỉ dùng khi role là 'seller')
    shopInfo: {
      shopName: { type: String, default: '' },
      shopDescription: { type: String, default: '' },
      rating: { type: Number, default: 0 },
    }
  },
  { 
    timestamps: true // Tự động sinh ra trường createdAt và updatedAt
  } 
);

// MIDDLEWARE: TỰ ĐỘNG MÃ HÓA MẬT KHẨU TRƯỚC KHI LƯU VÀO DATABASE
// ------------------------------------------------------------------
userSchema.pre('save', async function () {
  // Nếu mật khẩu không bị thay đổi (ví dụ user chỉ cập nhật tên), thì bỏ qua
  if (!this.isModified('password')) {
    return; // Mongoose 9.x chỉ cần return, không cần gọi next()
  }
  
  // Tạo chuỗi mã hóa (salt) với độ khó là 10
  const salt = await bcrypt.genSalt(10);
  // Băm mật khẩu gốc thành chuỗi loằng ngoằng không thể dịch ngược
  this.password = await bcrypt.hash(this.password, salt);
});

// ------------------------------------------------------------------
// HÀM TIỆN ÍCH: SO SÁNH MẬT KHẨU KHI USER ĐĂNG NHẬP
// ------------------------------------------------------------------
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;