const Product = require('../models/Product');
const axios = require('axios');

const handleChatConsultant = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Tin nhắn không được để trống' });

        // 1. Lấy data sản phẩm
        const products = await Product.find({ countInStock: { $gt: 0 } })
            .select('_id name price description brand');

        const productContext = products.map(p => 
            `[ID: ${p._id}] - Tên: ${p.name} | Giá: ${p.price}đ | Hãng: ${p.brand}`
        ).join('\n');

        // 2. Prompt cực mạnh để buộc trả về JSON sạch
        // 2. Prompt cực mạnh để buộc trả về JSON sạch
const finalPrompt = `Bạn là trợ lý ảo ShopPro. Hãy trả lời mọi câu hỏi của khách hàng một cách vui vẻ và hữu ích.

DANH SÁCH SẢN PHẨM HIỆN CÓ:
${productContext}

QUY TẮC BẮT BUỘC - PHẢI TUÂN THỦ NGHIÊM NGẮT:
1. CHỈ TRẢ VỀ ĐÚNG MỘT KHỐI JSON, KHÔNG có bất kỳ chữ, ký tự, hoặc giải thích nào bên ngoài JSON.
2. JSON phải hợp lệ 100%, không trailing comma.
3. TUYỆT ĐỐI KHÔNG SỬ DỤNG DẤU NGOẶC KÉP (") BÊN TRONG NỘI DUNG CỦA TRƯỜNG "reply". Nếu cần nhấn mạnh từ ngữ, HÃY DÙNG DẤU NHÁY ĐƠN ('). 
(Ví dụ: Sai: "bạn trai". Đúng: 'bạn trai').
4. Cấu trúc JSON bắt buộc:

{
  "reply": "Câu trả lời thân thiện, tự nhiên và phù hợp với câu hỏi của khách...",
  "recommendedProductIds": ["id1", "id2"] 
}

Câu hỏi của khách: "${message}"`;

        // 3. Gọi API
        const apiKey = process.env.GEMINI_API_KEY;
        const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let response = null;
        let lastError = null;

        for (let modelName of models) {
            const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    response = await axios.post(apiUrl, {
                        contents: [{ parts: [{ text: finalPrompt }] }]
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 30000
                    });
                    console.log(`✅ Sử dụng model: ${modelName}`);
                    break;
                } catch (err) {
                    lastError = err;
                    attempts++;
                    if (err.response?.status === 503 && attempts < maxAttempts) {
                        console.log(`🚨 Lỗi 503 với ${modelName} - Thử lại lần ${attempts}...`);
                        await new Promise(r => setTimeout(r, 2000 * attempts));
                        continue;
                    }
                    break;
                }
            }
            if (response) break;
        }

        if (!response) {
            throw lastError || new Error('Không thể kết nối với AI');
        }

        // 4. Xử lý response + trích xuất JSON mạnh mẽ hơn
        let rawText = response.data.candidates[0].content.parts[0].text || '';

        // Xóa markdown
        rawText = rawText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

        // Tìm khối JSON trong text (phòng trường hợp AI thêm chữ thừa)
        const jsonMatch = rawText.match(/(\{[\s\S]*\})/);
        const jsonString = jsonMatch ? jsonMatch[1] : rawText;

        let aiResponse;
        try {
            aiResponse = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError.message);
            console.error("Raw text:", jsonString);
            
            // Fallback trả lời mặc định khi parse lỗi
            return res.json({
                reply: "Xin chào! Mình là trợ lý ShopPro. Bạn đang cần tư vấn sản phẩm gì hôm nay? 😊",
                products: []
            });
        }

        // 5. Lấy sản phẩm gợi ý
        let recommendedProducts = [];
        if (aiResponse.recommendedProductIds && Array.isArray(aiResponse.recommendedProductIds) && aiResponse.recommendedProductIds.length > 0) {
            recommendedProducts = await Product.find({
                _id: { $in: aiResponse.recommendedProductIds }
            }).select('_id name price images image description brand');
        }

        // 6. Trả về
        res.json({
            reply: aiResponse.reply || "Cảm ơn bạn đã hỏi! Bạn cần mình tư vấn thêm gì không?",
            products: recommendedProducts
        });

    } catch (error) {
        console.error("🚨 LỖI CHATBOT AI:", error.response ? error.response.data : error.message);

        if (error.response?.status === 503) {
            return res.status(503).json({ 
                message: 'AI đang quá tải, vui lòng thử lại sau vài giây.',
                retry: true
            });
        }

        res.status(500).json({ 
            message: 'Lỗi hệ thống trợ lý AI. Vui lòng thử lại sau.' 
        });
    }
};

module.exports = { handleChatConsultant };