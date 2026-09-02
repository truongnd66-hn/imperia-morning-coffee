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

    // 1. Xác thực mã PIN
    const ADMIN_PIN = process.env.ADMIN_PIN || "536125";
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: 'Mã PIN quản trị không chính xác!' });
    }

    // 2. Lấy API Key từ Environment Variables
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cài đặt GROQ_API_KEY trên Vercel!' });
    }

    const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu hiện tại:
- Thực đơn: ${JSON.stringify(menu || [])}
- Tồn kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời ngắn gọn, trực diện bằng tiếng Việt.
2. Khi người dùng yêu cầu THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, CẬP NHẬT ĐƠN, BẮT BUỘC gắn kèm khối JSON hành động ở cuối câu trả lời:
- Thêm món:
:::ACTION
{"type": "ADD_MENU_ITEM", "payload": {"name": "Tên món", "price": 25000, "desc": "Mô tả", "img": ""}}
:::
- Đổi giá:
:::ACTION
{"type": "UPDATE_PRICE", "payload": {"id": 1, "price": 25000}}
:::
- Bật/Tắt món:
:::ACTION
{"type": "TOGGLE_MENU", "payload": {"id": 1, "status": "HẾT MÓN"}}
:::
- Cập nhật đơn:
:::ACTION
{"type": "UPDATE_ORDER", "payload": {"id": 1, "status": "ĐÃ TREO CỬA"}}
:::`;

    // Ép tạo model name bằng mã ký tự ASCII 45 để chống lỗi bàn phím tự đổi dấu
    const hyphen = String.fromCharCode(45);
    const safeModel = ["llama", "3.1", "8b", "instant"].join(hyphen);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: safeModel,
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
    return res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
  }
};
