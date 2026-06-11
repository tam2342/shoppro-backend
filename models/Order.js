// backend/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // 1. NGƯỜI MUA
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 2. NGƯỜI BÁN (Shop nào phải giao đơn này)
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 3. DANH SÁCH MẶT HÀNG (Copy cứng dữ liệu tại thời điểm mua)
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
      },
    ],

    // 4. THÔNG TIN GIAO HÀNG (Đã bổ sung trường city phục vụ thống kê khu vực)
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true }, // 👉 Dùng để nhóm (group) dữ liệu vẽ biểu đồ khu vực
    },

    // 👉 QUẢN LÝ CHI NHÁNH XỬ LÝ ĐƠN
    branch: { 
      type: String, 
      required: true,
      default: 'Chi nhánh chính' 
    },

    // 5. THÔNG TIN THANH TOÁN
    paymentMethod: { type: String, required: true }, // 'COD', 'VNPAY', 'MOMO'
    
    // Nơi lưu trữ mã giao dịch do VNPay/MoMo trả về (Để sau này đối soát)
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
    },

    // 6. TỔNG TIỀN
    itemsPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // 7. TRẠNG THÁI THEO DÕI VÀ VÒNG ĐỜI ĐƠN HÀNG
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    
    status: { 
      type: String, 
      required: true, 
      default: 'Chờ xác nhận',
      enum: ['Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Đã giao', 'Đã hủy'] 
    },
    deliveredAt: { type: Date }, // Lưu mốc thời gian khách nhận hàng để chốt doanh thu
  },
  {
    timestamps: true, // Tự động tạo createdAt (Ngày đặt hàng) và updatedAt
  }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;