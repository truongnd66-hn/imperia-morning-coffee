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

    // 1. Kiểm tra PIN Quản trị
    const validPin = process.env.ADMIN_PIN || "536125";
    if (String(pin).trim() !== String(validPin).trim()) {
      return res.status(401).json({ error: 'Mã PIN quản trị không hợp lệ' });
    }

    // 2. Kiểm tra GROQ_API_KEY
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel!' });
    }

    // 3. TỰ ĐỘNG LẤY DANH SÁCH MODEL MÀ TÀI KHOẢN ĐƯỢC PHÉP DÙNG TỪ GROQ
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const modelsData = await modelsRes.json();

    if (modelsData.error) {
      return res.status(400).json({ error: `Lỗi xác thực Groq: ${modelsData.error.message}` });
    }

    const availableModels = (modelsData.data || []).map(m => m.id);

    // Danh sách ưu tiên các model text ổn định nhất của Groq
    const priorityList = [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "llama3-8b-8192",
      "llama3-70b-8192",
      "gemma2-9b-it",
      "mixtral-8x7b-32768"
    ];

    // Tự động nhặt model tốt nhất có sẵn trong tài khoản của bạn
    let selectedModel = priorityList.find(p => availableModels.includes(p)) 
                     || availableModels.find(id => id.includes("llama") || id.includes("8b"))
                     || availableModels[0];

    if (!selectedModel) {
      return res.status(400).json({ 
        error: `Tài khoản Groq của bạn không có model text nào khả dụng. Danh sách hiện có: ${availableModels.join(', ')}` 
      });
    }

    const systemPrompt = `Bạn là Trợ lý Vận hành quán Cà Phê Treo Cửa (Imperia Sky Garden).
Dữ liệu hiện tại:
- Menu: ${JSON.stringify(menu || [])}
- Kho: ${JSON.stringify(inventory || [])}
- Đơn hàng: ${JSON.stringify(orders || [])}

Quy tắc:
1. Trả lời ngắn gọn, thẳng thắn, chính xác dựa trên danh sách Đơn hàng và Menu.
2. Nếu người dùng muốn THÊM MÓN, ĐỔI GIÁ, TẮT MÓN, DUYỆT ĐƠN, bắt buộc xuất kèm khối :::ACTION ở cuối:
- Thêm món:
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1
      })
    });

    const result = await response.json();

    if (result.error) {
      return res.status(400).json({ 
        error: `Groq từ chối model [${selectedModel}]: ${result.error.message} | Các model tài khoản có: ${availableModels.slice(0, 5).join(', ')}` 
      });
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: `Lỗi Serverless: ${err.message}` });
  }
}
