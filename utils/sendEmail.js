const { Resend } = require('resend');

let resend = null;

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Thiếu biến môi trường RESEND_API_KEY. Vui lòng cấu hình trên Render.');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const sendEmail = async (options) => {
  const client = getResendClient();

  const { data, error } = await client.emails.send({
    from: 'ShopPro <admin@tamsu.id.vn>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  });

  if (error) {
    console.log('🚨 LỖI GỬI EMAIL (Resend):', error);
    throw new Error(error.message || 'Không thể gửi email');
  }

  return data;
};

module.exports = sendEmail;