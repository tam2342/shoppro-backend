const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'pro214.emailserver.vn',
    port: 465,
    secure: true, // SSL/TLS cho port 465
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