import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const userId = await getSession();
  redirect(userId ? '/dashboard/connections' : '/auth');
}
