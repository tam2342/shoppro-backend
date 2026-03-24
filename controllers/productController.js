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
    // Tìm sản phẩm theo ID và "móc" thêm thông tin tên Chủ shop
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
    // 👉 ĐÃ SỬA THÀNH 'images' (CÓ S) ĐỂ LẤY ĐÚNG TRƯỜNG MẢNG ẢNH TỪ DATABASE
    .select('_id name price images image'); // Lấy luôn cả 'image' đề phòng data cũ

    res.json(products);
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    res.status(500).json({ message: 'Lỗi tìm kiếm sản phẩm' });
  }
};

// NHỚ THÊM NÓ VÀO EXPORT:
module.exports = { getMyProducts, createProduct, updateProduct, deleteProduct, getProductById, searchProducts };