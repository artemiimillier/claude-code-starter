import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { migrate } from '@/lib/db';
import { signToken, COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  await migrate();

  const [rows] = await pool.execute(
    'SELECT id, password_hash FROM users WHERE email = ?',
    [email.toLowerCase().trim()]
  ) as any;

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
  }

  const token = await signToken(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
