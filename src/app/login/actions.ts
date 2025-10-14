'use server';

/**
 * Login Server Actions
 *
 * SCALE: Replace with Clerk's sign-in components when migrating
 */

import { redirect } from 'next/navigation';
import { authenticateUser, createSession, isValidEmail } from '@/lib/auth';

interface LoginResult {
  success: boolean;
  error?: string;
}

/**
 * Handle user login form submission
 * @param formData - Form data from login form
 */
export async function loginAction(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  try {
    // Extract form data
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validate input
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Create session
    await createSession(user.id, user.email);

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);

    // Handle redirect errors (they throw in Next.js)
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
