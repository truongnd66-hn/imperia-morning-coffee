export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { question, menu, inventory, orders, pin } = req.body;

  if (pin !== (process.env.ADMIN_PIN || "truonG25@")) {
    return res.status(401).json({ error: 'Sai mã PIN quản trị!' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Lỗi: GROQ_API_KEY chưa được cài trên Vercel!' });
  }

  const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu hiện tại:
- Menu: ${JSON.stringify(menu || [])}
- Kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời thẳng thắn, ngắn gọn, xưng hô Bạn - Tôi.
2. Nếu người dùng muốn THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, NHẬP KHO, BẮT BUỘC xuất kèm khối :::ACTION ở cuối:
- Thêm món mới:
:::ACTION
{"type": "ADD_MENU_ITEM", "payload": {"name": "Tên món", "price": 25000, "desc": "Mô tả ngắn", "img": ""}}
:::
- Đổi giá:
:::ACTION
{"type": "UPDATE_PRICE", "payload": {"id": 1, "price": 25000}}
:::
- Đổi trạng thái món:
:::ACTION
{"type": "TOGGLE_MENU", "payload": {"id": 1, "status": "HẾT MÓN"}}
:::
- Cập nhật đơn:
:::ACTION
{"type": "UPDATE_ORDER", "payload": {"id": 1, "status": "ĐÃ TREO CỬA"}}
:::`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
    if (data.error) return res.status(400).json({ error: data.error.message || "Lỗi Groq API" });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
