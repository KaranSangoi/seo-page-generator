import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

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
