const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Cấu hình SMTP - dùng port 587 (STARTTLS) thay vì 465
  // Nếu 587 vẫn treo/lỗi, thử lại với port 465 + secure: true
  const transporter = nodemailer.createTransport({
    host: 'pro214.emailserver.vn',
    port: 587,
    secure: false, // false với port 587 (STARTTLS), true nếu dùng port 465
    auth: {
      user: 'admin@tamsu.id.vn',
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 10000, // 10s để thiết lập kết nối
    greetingTimeout: 10000,   // 10s chờ SMTP server chào hỏi
    socketTimeout: 10000,     // 10s cho toàn bộ socket, tránh treo vô thời hạn
  });

  const mailOptions = {
    from: '"ShopPro" <admin@tamsu.id.vn>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;