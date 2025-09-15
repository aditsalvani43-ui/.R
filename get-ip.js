// api/get-ip.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    if (!body.consent) return res.status(400).json({ error: 'Consent required' });

    // ambil ip pengunjung
    const xff = req.headers['x-forwarded-for'];
    const ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : null) || req.socket?.remoteAddress || null;
    const normalizedIp = ip ? ip.replace(/^::ffff:/, '') : null;

    const record = {
      ip: normalizedIp,
      purpose: body.purpose || null,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date().toISOString(),
    };

    // koneksi ke Supabase
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { error: dbError } = await supabase.from('visitor_logs').insert(record);
    if (dbError) console.error('Supabase insert error:', dbError);

    // kirim ke Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const msg = `👤 Visitor baru:
IP: ${record.ip || '-'}
UA: ${record.user_agent || '-'}
Purpose: ${record.purpose || '-'}
Waktu: ${new Date().toLocaleString('id-ID')}`;

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: msg,
        }),
      });
    }

    return res.status(200).json({ success: true, ip: normalizedIp || 'unknown' });
  } catch (err) {
    console.error('get-ip error', err);
    return res.status(500).json({ error: 'Server error' });
  }
                }
