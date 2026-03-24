const Order = require('../models/Order');
const crypto = require('crypto');
const moment = require('moment');
const qs = require('qs');

// 1. LƯU ĐƠN HÀNG MỚI VÀO DATABASE (GIỮ NGUYÊN)
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
    res.status(201).json(createdOrder);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi Server khi tạo đơn hàng', error: error.message });
  }
};

// 2. TẠO URL THANH TOÁN VNPAY
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

// 3. HỨNG KẾT QUẢ TỪ VNPAY TRẢ VỀ
const checkReturnUrl = async (req, res) => {
  try {
    // ĐÃ SỬA DÒNG NÀY: Copy dữ liệu ra Object bình thường
    let vnp_Params = { ...req.query }; 
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params); 
    let secretKey = process.env.VNP_HASHSECRET;

    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    console.log("=== VNPAY DEBUG ===");
    console.log("1. Mã trạng thái (00 là OK):", vnp_Params['vnp_ResponseCode']);
    console.log("2. Chữ ký VNPAY gửi về:", secureHash);
    console.log("3. Chữ ký Server tự tính:", signed);
    console.log("=====================");

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

// Hàm hỗ trợ sắp xếp chuẩn VNPAY (ĐÃ FIX LỖI PROTOTYPE)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    // Sửa dòng này để tránh lỗi hasOwnProperty
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

// CẬP NHẬT LẠI DÒNG EXPORT Ở DƯỚI CÙNG:
module.exports = { addOrderItems, createPaymentUrl, checkReturnUrl };