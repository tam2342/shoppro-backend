const Order = require('../models/Order');
const sendEmail = require('../utils/sendEmail');

// ------------------------------------------------------------------
// API: GỬI YÊU CẦU HỖ TRỢ / HỦY ĐƠN HÀNG (POST /api/orders/:id/support)
// ------------------------------------------------------------------
const sendSupportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, reason, message, phone } = req.body;
    // type: 'cancel' | 'support'

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do / nội dung yêu cầu.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    // Chỉ chủ đơn hàng mới được gửi yêu cầu cho đơn của mình
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền thao tác trên đơn hàng này.' });
    }

    const typeLabel = type === 'cancel' ? 'YÊU CẦU HỦY ĐƠN HÀNG' : 'YÊU CẦU HỖ TRỢ';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: ${type === 'cancel' ? '#dc2626' : '#2563eb'};">${typeLabel}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 160px;">Mã đơn hàng:</td>
            <td style="padding: 8px 0; font-weight: bold;">#${order._id.toString().substring(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Khách hàng:</td>
            <td style="padding: 8px 0; font-weight: bold;">${req.user.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email:</td>
            <td style="padding: 8px 0;">${req.user.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Số điện thoại liên hệ:</td>
            <td style="padding: 8px 0;">${phone || 'Không cung cấp'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Trạng thái đơn hàng:</td>
            <td style="padding: 8px 0;">${order.status}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Lý do / Nội dung:</p>
          <p style="margin: 0; white-space: pre-wrap;">${reason}</p>
          ${message ? `<p style="margin: 12px 0 0 0; white-space: pre-wrap;">${message}</p>` : ''}
        </div>
      </div>
    `;

    await sendEmail({
      email: 'admin@tamsu.id.vn',
      subject: `[ShopPro] ${typeLabel} - Đơn #${order._id.toString().substring(0, 8).toUpperCase()}`,
      message: emailHtml,
    });

    res.json({ message: 'Yêu cầu của bạn đã được gửi tới bộ phận hỗ trợ. Chúng tôi sẽ phản hồi sớm nhất!' });
  } catch (error) {
    console.log('🚨 LỖI GỬI YÊU CẦU HỖ TRỢ:', error);
    res.status(500).json({ message: 'Không thể gửi yêu cầu, vui lòng thử lại sau.' });
  }
};

module.exports = { sendSupportRequest };