const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`🚀 MongoDB Atlas đã kết nối thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1); // Dừng server nếu không kết nối được DB
  }
};

module.exports = connectDB;