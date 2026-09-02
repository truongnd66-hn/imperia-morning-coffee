export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const { question, menu, inventory, orders, pin } = req.body || {};

    // 1. Kiểm tra mã PIN
    const validPin = process.env.ADMIN_PIN || "536125";
    if (String(pin).trim() !== String(validPin).trim()) {
      return res.status(401).json({ error: 'Mã PIN quản trị không hợp lệ' });
    }

    // 2. Kiểm tra GROQ_API_KEY
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cài đặt GROQ_API_KEY trên Vercel!' });
    }

    const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu hiện tại:
- Menu: ${JSON.stringify(menu || [])}
- Kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời ngắn gọn, thẳng thắn bằng tiếng Việt.
2. Nếu người dùng muốn THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, DUYỆT ĐƠN, bắt buộc xuất kèm khối :::ACTION ở cuối:
- Thêm món mới:
:::ACTION
{"type": "ADD_MENU_ITEM", "payload": {"name": "Tên món", "price": 25000, "desc": "Mô tả", "img": ""}}
:::
- Đổi giá:
:::ACTION
{"type": "UPDATE_PRICE", "payload": {"id": 1, "price": 25000}}
:::`;

    // Giải mã trực tiếp từ Base64: Chuỗi này đảm bảo 100% là "llama-3.1-8b-instant" với 3 dấu gạch nối chuẩn ASCII 45
    const modelName = Buffer.from("bGxhbWEtMy4xLThiLWluc3RhbnQ=", "base64").toString("ascii");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1
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
