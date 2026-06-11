// backend/seeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product'); 

dotenv.config({ path: path.join(__dirname, '.env') });

const SELLER_IDS = [
  "6a131dfe018f60df166b6a1f",
  "6a131de6018f60df166b6a1c",
  "6a131db8018f60df166b6a18",
  "6a08a0dcfdb4ca5c3cdd9d98"
];

// 👉 SỬ DỤNG PICSUM.PHOTOS: Cam kết không bao giờ lỗi 404
const categoryTemplates = {
  "Điện Thoại & Phụ Kiện": { brands: ["Apple", "Samsung", "Xiaomi", "Oppo", "Baseus"], items: ["Điện thoại", "Ốp lưng", "Cáp sạc", "Tai nghe", "Pin dự phòng"], images: ["https://picsum.photos/seed/phone1/800/600", "https://picsum.photos/seed/phone2/800/600", "https://picsum.photos/seed/phone3/800/600"] },
  "Máy Tính & Laptop": { brands: ["Dell", "HP", "Asus", "Lenovo", "Logitech"], items: ["Laptop", "Chuột", "Bàn phím", "Màn hình", "Giá đỡ"], images: ["https://picsum.photos/seed/laptop1/800/600", "https://picsum.photos/seed/laptop2/800/600", "https://picsum.photos/seed/laptop3/800/600"] },
  "Thời Trang Nam": { brands: ["Coolmate", "Owen", "Biluxury", "Routine", "Nike"], items: ["Áo thun", "Quần Jean", "Sơ mi", "Áo khoác", "Quần Short"], images: ["https://picsum.photos/seed/manfashion1/800/600", "https://picsum.photos/seed/manfashion2/800/600", "https://picsum.photos/seed/manfashion3/800/600"] },
  "Thời Trang Nữ": { brands: ["Gumac", "Elise", "Zara", "H&M", "Nem"], items: ["Váy", "Áo sơ mi", "Quần ống rộng", "Áo thun", "Chân váy"], images: ["https://picsum.photos/seed/womanfashion1/800/600", "https://picsum.photos/seed/womanfashion2/800/600", "https://picsum.photos/seed/womanfashion3/800/600"] },
  "Mẹ & Bé": { brands: ["Bobby", "Huggies", "Pigeon", "Meiji", "Moony"], items: ["Tã dán", "Bình sữa", "Sữa bột", "Khăn ướt", "Ghế ăn"], images: ["https://picsum.photos/seed/baby1/800/600", "https://picsum.photos/seed/baby2/800/600", "https://picsum.photos/seed/baby3/800/600"] },
  "Nhà Cửa & Đời Sống": { brands: ["Lock&Lock", "Inochi", "Sunhouse", "Philips", "Kalpen"], items: ["Nồi chiên", "Hộp cơm", "Chảo", "Cây lau nhà", "Máy xay"], images: ["https://picsum.photos/seed/home1/800/600", "https://picsum.photos/seed/home2/800/600", "https://picsum.photos/seed/home3/800/600"] },
  "Sắc Đẹp": { brands: ["Mac", "L'Oreal", "Innisfree", "La Roche-Posay", "Dior"], items: ["Son", "Kem chống nắng", "Tẩy trang", "Serum", "Sữa rửa mặt"], images: ["https://picsum.photos/seed/beauty1/800/600", "https://picsum.photos/seed/beauty2/800/600", "https://picsum.photos/seed/beauty3/800/600"] },
  "Sức Khỏe": { brands: ["Blackmores", "DHC", "Kirkland", "Centrum", "Nature Made"], items: ["Vitamin C", "Dầu cá", "Viên uống", "Bổ xương", "Nhân sâm"], images: ["https://picsum.photos/seed/health1/800/600", "https://picsum.photos/seed/health2/800/600", "https://picsum.photos/seed/health3/800/600"] },
  "Giày Dép Nam": { brands: ["Nike", "Adidas", "Biti's", "Converse", "Vans"], items: ["Giày chạy bộ", "Sneaker", "Giày tây", "Dép", "Sandal"], images: ["https://picsum.photos/seed/shoes1/800/600", "https://picsum.photos/seed/shoes2/800/600", "https://picsum.photos/seed/shoes3/800/600"] },
  "Phụ Kiện Nữ": { brands: ["Swarovski", "Pandora", "Daniel Wellington", "Charles & Keith"], items: ["Dây chuyền", "Bông tai", "Vòng tay", "Kính râm", "Túi xách"], images: ["https://picsum.photos/seed/acc1/800/600", "https://picsum.photos/seed/acc2/800/600", "https://picsum.photos/seed/acc3/800/600"] },
  "Đồng Hồ": { brands: ["Casio", "Rolex", "Seiko", "Orient", "Citizen"], items: ["Đồng hồ cơ", "Điện tử", "Dây da", "Thể thao", "Smartwatch"], images: ["https://picsum.photos/seed/watch1/800/600", "https://picsum.photos/seed/watch2/800/600", "https://picsum.photos/seed/watch3/800/600"] },
  "Thể Thao & Du Lịch": { brands: ["Decathlon", "Yonex", "Lining", "Coleman", "Naturehike"], items: ["Vợt", "Lều", "Balo", "Thảm Yoga", "Kính bơi"], images: ["https://picsum.photos/seed/sport1/800/600", "https://picsum.photos/seed/sport2/800/600", "https://picsum.photos/seed/sport3/800/600"] },
  "Ô Tô & Xe Máy": { brands: ["Honda", "Yamaha", "Michelin", "Motul", "Brembo"], items: ["Mũ bảo hiểm", "Nhớt", "Camera", "Giá đỡ", "Gương"], images: ["https://picsum.photos/seed/car1/800/600", "https://picsum.photos/seed/car2/800/600", "https://picsum.photos/seed/car3/800/600"] },
  "Bách Hóa Online": { brands: ["Chinsu", "Omo", "Acecook", "Vinamilk", "Nescafe"], items: ["Mì tôm", "Nước mắm", "Nước giặt", "Cà phê", "Sữa"], images: ["https://picsum.photos/seed/grocery1/800/600", "https://picsum.photos/seed/grocery2/800/600", "https://picsum.photos/seed/grocery3/800/600"] }
};

const categories = Object.keys(categoryTemplates);

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Kết nối thành công!');

    const productsToInsert = [];

    for (const cat of categories) {
      const template = categoryTemplates[cat];
      
      for (let i = 1; i <= 10; i++) {
        const randomBrand = template.brands[Math.floor(Math.random() * template.brands.length)];
        const randomItem = template.items[Math.floor(Math.random() * template.items.length)];
        
        // Luân phiên lấy ảnh từ mảng 3 ảnh để tránh lặp và không lỗi
        const imageToUse = template.images[(i - 1) % template.images.length];
        const randomSeller = SELLER_IDS[Math.floor(Math.random() * SELLER_IDS.length)];
        
        productsToInsert.push({
          name: `${randomItem} ${randomBrand} Chính Hãng - Mẫu ${2026 + i}`,
          description: `Sản phẩm ${randomItem} thương hiệu ${randomBrand}. Cam kết chính hãng.`,
          price: Math.floor(Math.random() * 4950000) + 50000,
          category: cat,
          brand: randomBrand,
          images: [imageToUse],
          countInStock: Math.floor(Math.random() * 100) + 5,
          seller: randomSeller
        });
      }
    }

    await Product.insertMany(productsToInsert);
    console.log(`🎉 Bơm thành công ${productsToInsert.length} sản phẩm.`);
    process.exit();
  } catch (error) {
    console.error('🚨 Lỗi:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Product.deleteMany();
    console.log('🗑️ Đã xóa sạch dữ liệu!');
    process.exit();
  } catch (error) {
    console.error('🚨 Lỗi:', error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') destroyData(); else seedData();