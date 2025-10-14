'use server';

/**
 * Signup Server Actions
 *
 * SCALE: Replace with Clerk's sign-up components when migrating
 */

import { redirect } from 'next/navigation';
import {
  createUser,
  createSession,
  isValidEmail,
  validatePassword,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SignupResult {
  success: boolean;
  error?: string;
}

/**
 * Handle user signup form submission
 * @param formData - Form data from signup form
 */
export async function signupAction(
  _prevState: SignupResult | null,
  formData: FormData
): Promise<SignupResult> {
  try {
    // Extract form data
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate input
    if (!email || !password || !confirmPassword) {
      return {
        success: false,
        error: 'All fields are required',
      };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match',
      };
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.error,
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      };
    }

    // Create user
    const user = await createUser(email, password, name || undefined);

    // Create session
    await createSession(user.id, user.email);

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    console.error('Signup error:', error);

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
