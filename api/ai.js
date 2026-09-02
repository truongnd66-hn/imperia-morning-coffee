module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const { question, menu, inventory, orders, pin } = body;

    // 1. Kiểm tra PIN Quản trị
    const ADMIN_PIN = process.env.ADMIN_PIN || "truonG25@";
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: 'Sai mã PIN quản trị!' });
    }

    // 2. Kiểm tra GROQ Key từ Vercel Environment Variables
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trong cài đặt Vercel!' });
    }

    const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu quán:
- Menu: ${JSON.stringify(menu || [])}
- Kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời ngắn gọn, thẳng thắn bằng tiếng Việt, xưng hô Bạn - Tôi.
2. Nếu người dùng muốn THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, CẬP NHẬT ĐƠN, BẮT BUỘC gắn khối :::ACTION ở cuối:
- Thêm món:
:::ACTION
{"type": "ADD_MENU_ITEM", "payload": {"name": "Tên món", "price": 25000, "desc": "Món mới thêm", "img": ""}}
:::
- Đổi giá:
:::ACTION
{"type": "UPDATE_PRICE", "payload": {"id": 1, "price": 25000}}
:::
- Bật/Tắt món:
:::ACTION
{"type": "TOGGLE_MENU", "payload": {"id": 1, "status": "HẾT MÓN"}}
:::
- Duyệt đơn:
:::ACTION
{"type": "UPDATE_ORDER", "payload": {"id": 1, "status": "ĐÃ TREO CỬA"}}
:::`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(400).json({ error: data.error.message || "Lỗi Groq API" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Lỗi Serverless: " + err.message });
  }
};
