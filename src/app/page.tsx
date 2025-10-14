import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Root Page
 * Redirects to dashboard if authenticated, otherwise to login
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
