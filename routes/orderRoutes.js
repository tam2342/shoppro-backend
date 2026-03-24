const express = require('express');
const router = express.Router();
const { addOrderItems, createPaymentUrl, checkReturnUrl } = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, addOrderItems);
router.route('/:id/pay').post(protect, createPaymentUrl);

// THÊM DÒNG NÀY ĐỂ HỨNG KẾT QUẢ (DÙNG GET VÌ VNPAY TRẢ VỀ URL PARAMS)
router.route('/vnpay-return').get(checkReturnUrl);

module.exports = router;