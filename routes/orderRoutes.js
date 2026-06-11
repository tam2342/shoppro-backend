const express = require('express');
const router = express.Router();

// 👉 1. GỘP CHUNG TOÀN BỘ CONTROLLER VÀO 1 CHỖ DUY NHẤT (Tránh lỗi sập Server)
const { 
  addOrderItems, 
  createPaymentUrl, 
  checkReturnUrl,
  getOrderById,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  getSellerStatistics,
  createPaypalUrl,      // Đã thêm PayPal
  capturePaypalOrder    // Đã thêm PayPal Capture
} = require('../controllers/orderController');

// 👉 2. CHỈ IMPORT MIDDLEWARE 1 LẦN
// (Lưu ý: Nếu thư mục của ông tên là 'middlewares' có chữ 's' thì sửa lại nhé, tôi đang để mặc định là 'middleware')
const { protect } = require('../middlewares/authMiddleware');

// ==========================================
// 1. API HỨNG KẾT QUẢ VNPAY
// ==========================================
// Để trên cùng để không bị vướng middleware auth
router.route('/vnpay-return').get(checkReturnUrl);

// ==========================================
// 2. CÁC API DÀNH CHO NGƯỜI BÁN (SELLER)
// ==========================================
// Đã thêm Route lấy thống kê (Nằm trên các route có :id)
router.route('/seller/stats').get(protect, getSellerStatistics);

// Lấy danh sách đơn hàng thuộc về riêng 1 người bán
router.route('/seller/all').get(protect, getSellerOrders);

// ==========================================
// 3. CÁC API DÀNH CHO KHÁCH HÀNG (BUYER)
// ==========================================
// Tạo đơn hàng mới
router.route('/').post(protect, addOrderItems);
// Xem lịch sử mua hàng cá nhân
router.route('/myorders').get(protect, getMyOrders);

// ==========================================
// 4. CÁC API ĐỘNG TÌM THEO ID (BẮT BUỘC ĐỂ CUỐI)
// ==========================================
// Xem chi tiết 1 đơn hàng
router.route('/:id').get(protect, getOrderById);

// Tạo URL thanh toán VNPay
router.route('/:id/pay').post(protect, createPaymentUrl);

// Người bán cập nhật trạng thái đơn (Duyệt, Đang giao...)
router.route('/:id/status').put(protect, updateOrderStatus);

// Cổng thanh toán quốc tế PayPal
router.post('/:id/paypal', protect, createPaypalUrl);
router.post('/:id/paypal/capture', protect, capturePaypalOrder);

module.exports = router;