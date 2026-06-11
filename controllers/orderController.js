const Order = require('../models/Order');
const Product = require('../models/Product');
const crypto = require('crypto');
const moment = require('moment');
const qs = require('qs');
const axios = require('axios'); // 👉 BẮT BUỘC IMPORT AXIOS ĐỂ GỌI PAYPAL

// ==========================================
// 1. CHỨC NĂNG CƠ BẢN & THANH TOÁN
// ==========================================

const addOrderItems = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, totalPrice } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'Không có sản phẩm nào trong đơn hàng' });
    }

    const sellerId = orderItems[0].seller;

    const order = new Order({
      user: req.user._id,
      seller: sellerId,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    console.log("-----------------------------------------");
    console.log("🚀 BẮT ĐẦU QUÁ TRÌNH TRỪ KHO...");

    for (const item of orderItems) {
      const realProductId = item.product || (item._id ? String(item._id).split('-')[0] : null);
      const buyQty = Number(item.qty) || Number(item.quantity) || 1;

      console.log(`📦 Đang xử lý sản phẩm: "${item.name}"`);

      if (realProductId) {
        const updatedProduct = await Product.findByIdAndUpdate(
          realProductId,
          { $inc: { countInStock: -buyQty } }, 
          { returnDocument: 'after' }
        );

        if (updatedProduct) {
          console.log(`   ✅ THÀNH CÔNG! Kho hiện tại của SP này còn lại: ${updatedProduct.countInStock}`);
        } else {
          console.log(`   ❌ THẤT BẠI! Không tìm thấy sản phẩm nào trong DB có ID là [${realProductId}]`);
        }
      } else {
        console.log(`   ❌ BỎ QUA! Không tìm ra ID hợp lệ từ Frontend gửi lên.`);
      }
    }
    console.log("🏁 KẾT THÚC QUÁ TRÌNH TRỪ KHO");
    console.log("-----------------------------------------");

    res.status(201).json(createdOrder);

  } catch (error) {
    console.error("LỖI CRASH TẠI ADD ORDER:", error);
    res.status(500).json({ message: 'Lỗi Server khi tạo đơn hàng', error: error.message });
  }
};

const createPaymentUrl = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    process.env.TZ = 'Asia/Ho_Chi_Minh'; 
    
    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    
    let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';

    let tmnCode = process.env.VNP_TMNCODE;
    let secretKey = process.env.VNP_HASHSECRET;
    let vnpUrl = process.env.VNP_URL;
    let returnUrl = process.env.VNP_RETURN_URL;

    let orderId = order._id.toString();
    let amount = order.totalPrice;

    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId; 
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; 
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    vnp_Params = sortObject(vnp_Params);
    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    vnp_Params['vnp_SecureHash'] = signed;
    
    vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

    res.json({ url: vnpUrl });
  } catch (error) {
    console.log("Lỗi tạo VNPAY:", error);
    res.status(500).json({ message: 'Lỗi tạo URL thanh toán' });
  }
};

const checkReturnUrl = async (req, res) => {
  try {
    let vnp_Params = { ...req.query }; 
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params); 
    let secretKey = process.env.VNP_HASHSECRET;

    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];

      if (responseCode === '00') {
        const order = await Order.findById(orderId);
        if (order) {
          order.isPaid = true;
          order.paidAt = Date.now();
          order.paymentResult = {
            id: vnp_Params['vnp_TransactionNo'],
            status: responseCode,
            update_time: vnp_Params['vnp_PayDate']
          };
          order.status = 'Đang xử lý'; 
          
          await order.save();
          return res.status(200).json({ success: true, message: 'Thanh toán thành công' });
        }
      }
      return res.status(400).json({ success: false, message: 'Giao dịch không thành công' });
    } else {
      return res.status(400).json({ success: false, message: 'Chữ ký không hợp lệ' });
    }
  } catch (error) {
    console.error("Lỗi xác thực VNPAY:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// ==========================================
// 2. TRUY XUẤT THÔNG TIN ĐƠN HÀNG
// ==========================================

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('seller', 'name email');

    if (order) {
      if (
        order.user._id.toString() !== req.user._id.toString() &&
        order.seller._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập đơn hàng này' });
      }
      res.json(order);
    } else {
      res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sử đơn hàng', error: error.message });
  }
};

// ==========================================
// 3. DÀNH CHO SELLER DASHBOARD
// ==========================================

const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng của Shop', error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Không có quyền cập nhật đơn hàng này' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          status: status,
          deliveredAt: status === 'Đã giao' ? Date.now() : order.deliveredAt,
          isPaid: (status === 'Đã giao' && order.paymentMethod === 'COD') ? true : order.isPaid
        } 
      },
      { returnDocument: 'after', runValidators: false } 
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error("LỖI CẬP NHẬT:", error);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái đơn hàng', error: error.message });
  }
};

const getSellerStatistics = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const matchStage = { $match: { seller: sellerId, status: 'Đã giao' } };

    const regionStats = await Order.aggregate([
      matchStage,
      { $group: { _id: '$shippingAddress.city', totalRevenue: { $sum: '$totalPrice' }, orderCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } } 
    ]);

    const branchStats = await Order.aggregate([
      matchStage,
      { $group: { _id: '$branch', totalRevenue: { $sum: '$totalPrice' }, orderCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } }
    ]);

    const stockStats = await Product.aggregate([
      { $match: { seller: sellerId } },
      { $group: { _id: null, totalStock: { $sum: '$countInStock' } } }
    ]);

    const totalRevenue = branchStats.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalOrders = branchStats.reduce((sum, item) => sum + item.orderCount, 0);
    const totalStock = stockStats.length > 0 ? stockStats[0].totalStock : 0;

    res.json({ overview: { totalRevenue, totalOrders, totalStock }, regionStats, branchStats });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tính toán thống kê', error: error.message });
  }
};

// ==========================================
// 5. THANH TOÁN QUỐC TẾ (PAYPAL) DÙNG AXIOS
// ==========================================

const createPaypalUrl = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // 1. Quy đổi VND sang USD (Tỉ giá tạm tính 25,000 VND = 1 USD)
    const exchangeRate = 25000;
    const usdAmount = (order.totalPrice / exchangeRate).toFixed(2);

    // 2. Lấy Access Token từ PayPal
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

    const tokenResponse = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // 3. Tạo Order trên PayPal
    const frontendUrl = process.env.FRONTEND_URL || 'https://tamsu.id.vn';
    const paypalOrderResponse = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order._id.toString(),
          amount: { currency_code: 'USD', value: usdAmount },
          description: `Thanh toan don hang ShopPro - ${order._id}`
        }],
        application_context: {
          return_url: `${frontendUrl}/order/${order._id}?payment=paypal_success`,
          cancel_url: `${frontendUrl}/order/${order._id}?payment=paypal_cancel`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // 4. Lấy link trả về Frontend
    const approveLink = paypalOrderResponse.data.links.find(link => link.rel === 'approve').href;
    res.json({ url: approveLink, paypalOrderId: paypalOrderResponse.data.id });

  } catch (error) {
    console.error("LỖI TẠO PAYPAL URL:", error.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi hệ thống cổng thanh toán quốc tế' });
  }
};

const capturePaypalOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

    const tokenResponse = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenResponse.data.access_token;

    // Capture tiền
    const captureResponse = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const captureData = captureResponse.data;

    if (captureData.status === 'COMPLETED') {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.status = 'Đang xử lý';
      order.paymentResult = {
        id: captureData.id,
        status: captureData.status,
        update_time: captureData.update_time,
        email_address: captureData.payer.email_address
      };
      await order.save();
      return res.json({ success: true, message: 'Thanh toán quốc tế thành công' });
    }

    res.status(400).json({ success: false, message: 'Giao dịch chưa hoàn tất' });
  } catch (error) {
    console.error("LỖI XÁC NHẬN PAYPAL:", error.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi máy chủ khi xác nhận thanh toán' });
  }
};

module.exports = { 
  addOrderItems, 
  createPaymentUrl, 
  checkReturnUrl,
  getOrderById,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  getSellerStatistics,
  createPaypalUrl,     // 👉 ĐÃ THÊM VÀO EXPORT
  capturePaypalOrder   // 👉 ĐÃ THÊM VÀO EXPORT
};