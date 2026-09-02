export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question, menu, inventory, orders, pin } = req.body;

  // Chặn truy cập nếu mã PIN gửi lên không khớp với Vercel Environment
  if (pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Mã PIN quản trị không hợp lệ' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel' });
  }

  const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu Supabase hiện tại:
- Menu: ${JSON.stringify(menu || [])}
- Tồn kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

1. Trả lời ngắn gọn, thẳng thắn, chính xác.
2. Nếu yêu cầu thay đổi dữ liệu, BẮT BUỘC xuất kèm khối JSON hành động ở cuối câu trả lời theo mẫu:
:::ACTION
{
  "type": "UPDATE_PRICE" | "TOGGLE_MENU" | "IMPORT_STOCK" | "UPDATE_ORDER",
  "payload": { ... }
}
:::`;

  try {
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

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
