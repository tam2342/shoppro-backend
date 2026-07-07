const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Cấu hình SMTP (Ví dụ cấu hình của Hostinger/cPanel, hãy đổi host/port tương ứng nếu dùng bên khác)
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com', 
    port: 465,
    secure: true, // sử dụng SSL/TLS
    auth: {
      user: 'admin@tamsu.id.vn', 
      pass: process.env.EMAIL_PASSWORD 
    },
  });

  const mailOptions = {
    from: '"Shop Tâm Sự" <admin@tamsu.id.vn>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;