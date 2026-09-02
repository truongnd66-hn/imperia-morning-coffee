export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { question, menu, inventory, orders, pin } = body || {};

    // 1. Kiểm tra PIN Admin
    const validPin = process.env.ADMIN_PIN || "536125";
    if (String(pin).trim() !== String(validPin).trim()) {
      return res.status(401).json({ error: 'Mã PIN quản trị không hợp lệ' });
    }

    // 2. Lấy API Key từ Vercel
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel!' });
    }

    const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu hiện tại:
- Menu: ${JSON.stringify(menu || [])}
- Kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời ngắn gọn, thẳng thắn, xưng hô Bạn - Tôi.
2. Nếu người dùng muốn THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, BẬT MÓN, DUYỆT ĐƠN, bắt buộc xuất kèm khối :::ACTION ở cuối:
- Thêm món mới:
:::ACTION
{"type": "ADD_MENU_ITEM", "payload": {"name": "Tên món", "price": 25000, "desc": "Mô tả", "img": ""}}
:::
- Đổi giá:
:::ACTION
{"type": "UPDATE_PRICE", "payload": {"id": 1, "price": 25000}}
:::
- Cập nhật đơn:
:::ACTION
{"type": "UPDATE_ORDER", "payload": {"id": 1, "status": "ĐÃ TREO CỬA"}}
:::`;

    // Sử dụng model chính thức được mở trên tài khoản của bạn
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.2
      })
    });

    const result = await response.json();

    if (result.error) {
      return res.status(400).json({ error: `Lỗi từ Groq: ${result.error.message}` });
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: `Lỗi Serverless: ${err.message}` });
  }
}
