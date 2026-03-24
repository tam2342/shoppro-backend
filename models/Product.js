const mongoose = require('mongoose');

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
      unique: true, // Dùng để làm link SEO đẹp: shoppro.vn/san-pham/iphone-15
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
      enum: ['Điện thoại', 'Laptop', 'Phụ kiện', 'Máy tính bảng'] // Giới hạn danh mục
    },
    
    // HÌNH ẢNH VÀ KHO
    images: [{ 
      type: String, // Lưu link ảnh (ví dụ: Cloudinary hoặc local)
      required: [true, 'Vui lòng thêm ít nhất 1 hình ảnh']
    }], 
    countInStock: { 
      type: Number, 
      required: [true, 'Vui lòng nhập số lượng kho'], 
      default: 0 
    },

    // THÔNG TIN BÁN HÀNG (CỰC KỲ QUAN TRỌNG CHO PHÂN QUYỀN VÀ CHAT)
    seller: {
      type: mongoose.Schema.Types.ObjectId, // Kết nối trực tiếp với bảng User
      ref: 'User', // Trỏ đến model 'User'
      required: true // Sản phẩm bắt buộc phải biết ai là người bán
    },

    // THÔNG TIN THÊM (Tùy chọn)
    brand: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
  },
  { 
    timestamps: true // Tự động tạo createdAt và updatedAt
  }
);

// Middleware tự động tạo slug từ name (Hỗ trợ tiếng Việt)
productSchema.pre('validate', function() {
  if (this.name) {
    // Chỉ thay khoảng trắng thành dấu gạch ngang, giữ nguyên chữ tiếng Việt
    this.slug = this.name.toLowerCase().trim().replace(/\s+/g, '-');
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;