import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { room, name, phone, delivery_time, note, items, total_price } = req.body;

  if (!room || !name || !phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin đặt đơn!' });
  }

  try {
    // 1. Ghi đơn vào Database
    const { data, error } = await supabase.from('orders').insert([{
      room, name, phone, delivery_time, note, items, total_price, status: 'CHƯA GIAO'
    }]).select();

    if (error) throw error;

    // 2. Bắn thông báo Telegram thẳng từ Server
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (botToken && chatId) {
      const itemsDetail = items.map(i => `${i.name || 'Món'} x ${i.qty}`).join(', ');
      const teleText = `☕ <b>CÓ ĐƠN CÀ PHÊ MỚI!</b>\n━━━━━━━━━━━━━━━\n📍 <b>Phòng:</b> ${room}\n⏰ <b>Hẹn treo:</b> ${delivery_time}\n👤 <b>Khách:</b> ${name} - ${phone}\n🧾 <b>Món:</b> ${itemsDetail}\n💰 <b>Tổng tiền:</b> ${Number(total_price).toLocaleString('vi-VN')}đ\n📝 <b>Ghi chú:</b> ${note || 'Không'}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: teleText, parse_mode: 'HTML' })
      });
    }

    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
