const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  const { data, error } = await resend.emails.send({
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