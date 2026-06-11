const mongoose = require('mongoose');

// 👉 BƯỚC 1: TẠO SCHEMA CHO ĐÁNH GIÁ (Nằm trên Product Schema)
const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Tên người dùng để hiển thị luôn cho lẹ
    rating: { type: Number, required: true }, // Số sao (1-5)
    comment: { type: String, required: true }, // Nội dung bình luận
    images: [{ type: String }], // Mảng chứa URL hình ảnh/video trả về từ Cloudinary
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Liên kết tài khoản đánh giá
    },
  },
  { timestamps: true } // Tự động tạo createdAt, updatedAt cho từng bình luận
);

// 👉 BƯỚC 2: KHAI BÁO PRODUCT SCHEMA
const productSchema = new mongoose.Schema(
  {
    // THÔNG TIN BẮT BUỘC
    name: { 
      type: String, 
      required: [true, 'Vui lòng nhập tên sản phẩm'], 
      trim: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true 
    },
    description: { 
      type: String, 
      required: [true, 'Vui lòng nhập mô tả sản phẩm'] 
    },
    price: { 
      type: Number, 
      required: [true, 'Vui lòng nhập giá sản phẩm'], 
      default: 0 
    },
    category: { 
      type: String, 
      required: [true, 'Vui lòng chọn danh mục'],
      enum: [
        'Điện Thoại & Phụ Kiện', 
        'Máy Tính & Laptop', 
        'Thời Trang Nam', 
        'Thời Trang Nữ', 
        'Mẹ & Bé', 
        'Nhà Cửa & Đời Sống', 
        'Sắc Đẹp',
        'Sức Khỏe',          
        'Giày Dép Nam',      
        'Phụ Kiện Nữ',       
        'Đồng Hồ',
        'Thể Thao & Du Lịch',
        'Ô Tô & Xe Máy',
        'Bách Hóa Online',
        // Giữ lại các danh mục cũ
        'Điện thoại', 
        'Laptop', 
        'Phụ kiện', 
        'Máy tính bảng'
      ] 
    },
    
    // HÌNH ẢNH VÀ KHO
    images: [{ 
      type: String, 
      required: [true, 'Vui lòng thêm ít nhất 1 hình ảnh']
    }], 
    countInStock: { 
      type: Number, 
      required: [true, 'Vui lòng nhập số lượng kho'], 
      default: 0 
    },

    // THÔNG TIN BÁN HÀNG
    seller: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    // THÔNG TIN THÊM
    brand: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isPromo: { type: Boolean, default: false },

    // 👉 BƯỚC 3: NHÚNG BẢNG ĐÁNH GIÁ VÀO SẢN PHẨM
    reviews: [reviewSchema], 
  },
  { 
    timestamps: true 
  }
);

// Middleware tự động tạo slug chuẩn SEO
// Middleware tự động tạo slug chuẩn SEO (Đã gỡ bỏ next)
productSchema.pre('validate', function() {
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .normalize('NFD') // Chuyển đổi Unicode để bóc tách dấu
      .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
      .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Xử lý riêng chữ đ/Đ
      .replace(/[^a-z0-9\s-]/g, '') // Xóa các ký tự đặc biệt
      .replace(/\s+/g, '-') // Biến khoảng trắng thành gạch ngang
      .replace(/-+/g, '-'); // Xóa các dấu gạch ngang thừa liên tiếp
      
    // Thêm chuỗi random nhỏ phía sau để tránh trùng lặp tên sản phẩm
    if (this.isNew) {
      const randomString = Math.random().toString(36).substring(2, 6);
      this.slug = `${this.slug}-${randomString}`;
    }
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;