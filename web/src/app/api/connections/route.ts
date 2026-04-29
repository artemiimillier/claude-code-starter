import { NextRequest, NextResponse } from 'next/server';
import pool, { migrate } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';

const SENSITIVE_FIELDS = ['session_string', 'api_key', 'bot_token'];

export async function GET() {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await migrate();

  const [rows] = await pool.execute(
    'SELECT type, config_json FROM connections WHERE user_id = ?',
    [userId]
  ) as any;

  const result: Record<string, any> = {};
  for (const row of rows) {
    const config = JSON.parse(row.config_json);
    for (const field of SENSITIVE_FIELDS) {
      if (config[field]) config[field] = '••••••••';
    }
    result[row.type] = config;
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const userId = await getSession();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, config } = await req.json();
  if (!['ai', 'tg_bot', 'tg_account'].includes(type)) {
    return NextResponse.json({ error: 'Неверный тип' }, { status: 400 });
  }

  await migrate();

  const encrypted: Record<string, any> = { ...config };
  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field] && encrypted[field] !== '••••••••') {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }

  await pool.execute(
    `INSERT INTO connections (user_id, type, config_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE config_json = VALUES(config_json), updated_at = NOW()`,
    [userId, type, JSON.stringify(encrypted)]
  );

  return NextResponse.json({ ok: true });
}
