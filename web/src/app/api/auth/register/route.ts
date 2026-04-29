import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { migrate } from '@/lib/db';
import { signToken, COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  await migrate();

  const hash = await bcrypt.hash(password, 12);

  try {
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email.toLowerCase().trim(), hash]
    ) as any;

    const token = await signToken(result.insertId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Email уже занят' }, { status: 409 });
    }
    throw e;
  }
}
