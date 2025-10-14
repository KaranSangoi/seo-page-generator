'use server';

/**
 * Logout Server Actions
 *
 * SCALE: Replace with Clerk's sign-out when migrating
 * import { auth } from '@clerk/nextjs';
 * await auth().signOut();
 */

import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth';

/**
 * Handle user logout
 */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
