const Product = require('../models/Product');

// ------------------------------------------------------------------
// API 1: LẤY DANH SÁCH SẢN PHẨM CỦA RIÊNG NGƯỜI BÁN (Dùng cho trang CRUD)
// GET /api/products/myproducts (Cần đăng nhập role=seller)
// ------------------------------------------------------------------
const getMyProducts = async (req, res) => {
  try {
    // req.user._id lấy từ middleware xác thực JWT
    const products = await Product.find({ seller: req.user._id });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 2: TẠO SẢN PHẨM MỚI (POST /api/products)
// ------------------------------------------------------------------
const createProduct = async (req, res) => {
  try {
    const { name, price, description, images, category, countInStock, brand } = req.body;

    const product = new Product({
      name,
      price,
      description,
      images, // Tạm thời Frontend gửi mảng string link ảnh
      category,
      countInStock,
      brand,
      seller: req.user._id // GẮN ID CỦA NGƯỜI BÁN ĐANG ĐĂNG NHẬP VÀO ĐÂY
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.log("🚨 LỖI THÊM SẢN PHẨM TẠI BACKEND:", error); // Ép in lỗi ra Terminal
    res.status(400).json({ message: 'Dữ liệu không hợp lệ!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 3: CẬP NHẬT SẢN PHẨM (PUT /api/products/:id)
// ------------------------------------------------------------------
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    // Kiểm tra sản phẩm tồn tại và CÓ PHẢI CỦA CHÍNH CHỦ KHÔNG
    if (product) {
      if (product.seller.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Bạn không có quyền sửa sản phẩm của shop khác!' });
      }

      product.name = req.body.name || product.name;
      product.price = req.body.price || product.price;
      // ... (cập nhật các trường khác tương tự)

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 4: XÓA SẢN PHẨM (DELETE /api/products/:id)
// ------------------------------------------------------------------
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (product.seller.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Bạn không có quyền xóa sản phẩm này!' });
      }
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Đã xóa sản phẩm thành công' });
    } else {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 5: LẤY CHI TIẾT 1 SẢN PHẨM (Cho khách hàng xem)
// GET /api/products/:id
// ------------------------------------------------------------------
const getProductById = async (req, res) => {
  try {
    // Tìm sản phẩm theo ID và "móc" thêm thông tin tên Chủ shop, bao gồm cả đánh giá
    const product = await Product.findById(req.params.id).populate('seller', 'name'); 
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 6: TÌM KIẾM NHANH SẢN PHẨM (LIVE SEARCH)
// ------------------------------------------------------------------
const searchProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    if (!keyword.trim()) {
      return res.json([]); 
    }

    // Tìm các sản phẩm có tên chứa từ khóa (không phân biệt hoa thường)
    const products = await Product.find({
      name: { $regex: keyword, $options: 'i' }
    })
    .limit(5)
    .select('_id name price images image'); 

    res.json(products);
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    res.status(500).json({ message: 'Lỗi tìm kiếm sản phẩm' });
  }
};

// ------------------------------------------------------------------
// API 7: TẠO ĐÁNH GIÁ SẢN PHẨM 
// POST /api/products/:id/reviews (Cần đăng nhập)
// ------------------------------------------------------------------
const createProductReview = async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Chặn user đánh giá 2 lần trên cùng 1 sản phẩm
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }

    // Tạo đối tượng đánh giá mới
    const review = {
      name: req.user.name, // req.user được gán từ middleware xác thực token
      rating: Number(rating),
      comment: comment,
      images: images || [], // Mảng URL ảnh/video gửi từ Frontend
      user: req.user._id,
    };

    // Đẩy đánh giá mới vào danh sách
    product.reviews.push(review);

    // Tính toán lại tổng số bài đánh giá và điểm sao trung bình
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    // Lưu vào CSDL
    await product.save();
    res.status(201).json({ message: 'Đã thêm đánh giá thành công' });
  } catch (error) {
    console.error("Lỗi thêm đánh giá:", error);
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};
// ------------------------------------------------------------------
// API 8: XÓA ĐÁNH GIÁ SẢN PHẨM 
// DELETE /api/products/:id/reviews/:reviewId (Cần đăng nhập)
// ------------------------------------------------------------------
const deleteProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Tìm review cần xóa
    const reviewIndex = product.reviews.findIndex(
      (r) => r._id.toString() === req.params.reviewId.toString()
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá này' });
    }

    // Kiểm tra quyền: Chỉ người tạo đánh giá mới được xóa
    if (product.reviews[reviewIndex].user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Bạn không có quyền xóa đánh giá của người khác' });
    }

    // Xóa đánh giá khỏi mảng
    product.reviews.splice(reviewIndex, 1);

    // Tính toán lại tổng số bài đánh giá và điểm sao trung bình
    product.numReviews = product.reviews.length;
    
    if (product.numReviews === 0) {
      product.rating = 0;
    } else {
      product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
    }

    await product.save();
    res.json({ message: 'Đã xóa đánh giá thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// ------------------------------------------------------------------
// API 9: SỬA ĐÁNH GIÁ SẢN PHẨM 
// PUT /api/products/:id/reviews/:reviewId (Cần đăng nhập)
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// API 9: SỬA ĐÁNH GIÁ SẢN PHẨM 
// PUT /api/products/:id/reviews/:reviewId (Cần đăng nhập)
// ------------------------------------------------------------------
const updateProductReview = async (req, res) => {
  try {
    // 👉 ĐÃ BỔ SUNG: Nhận thêm trường 'images' từ Frontend gửi lên
    const { rating, comment, images } = req.body; 
    
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

    const review = product.reviews.id(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Không tìm thấy đánh giá' });

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Bạn không có quyền sửa đánh giá này' });
    }

    // Cập nhật nội dung
    review.rating = Number(rating);
    review.comment = comment;
    
    // 👉 ĐÃ BỔ SUNG: Cập nhật lại mảng hình ảnh
    if (images) {
      review.images = images; 
    }

    // Tính lại điểm trung bình
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    res.json({ message: 'Đã cập nhật đánh giá thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server!', error: error.message });
  }
};

// NHỚ THÊM NÓ VÀO EXPORT:
module.exports = { 
  getMyProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getProductById, 
  searchProducts,
  createProductReview,
  deleteProductReview, // Thêm dòng này
  updateProductReview// 👉 ĐÃ BỔ SUNG VÀO ĐÂY
};