const express = require('express');
const router = express.Router();

// ĐÃ THÊM hàm searchProducts vào danh sách import
const { getMyProducts, createProduct, updateProduct, deleteProduct, getProductById, searchProducts } = require('../controllers/productController');
const { protect, sellerOnly } = require('../middlewares/authMiddleware');

// 1. CÁC ROUTE CHUNG (Không có ID)
router.route('/')
  .get(async (req, res) => {
    // Cho phép bất kỳ ai (khách) cũng xem được danh sách sản phẩm ở trang chủ
    try {
      const products = await require('../models/Product').find({});
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi lấy sản phẩm' });
    }
  })
  .post(protect, sellerOnly, createProduct); // Thêm sản phẩm mới (Chỉ Seller)


// 👉 ROUTE TÌM KIẾM NHANH (LIVE SEARCH)
// Bắt buộc phải đặt ở đây (TRƯỚC cái /:id) để Express không nhầm chữ "search" thành ID
router.route('/search').get(searchProducts);


// 2. ROUTE RIÊNG CỦA SELLER (Phải đặt TRƯỚC route /:id)
router.route('/myproducts')
  .get(protect, sellerOnly, getMyProducts);

// 3. CÁC ROUTE TÁC ĐỘNG LÊN 1 SẢN PHẨM CỤ THỂ (Có ID)
router.route('/:id')
  .get(getProductById)                         // Khách hàng xem chi tiết 1 sản phẩm 
  .put(protect, sellerOnly, updateProduct)     // Sửa (Chỉ Seller)
  .delete(protect, sellerOnly, deleteProduct); // Xóa (Chỉ Seller)

module.exports = router;