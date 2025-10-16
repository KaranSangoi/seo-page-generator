/**
 * Authentication Utilities
 *
 * CURRENT: Simple bcrypt + JWT session management for MVP
 * SCALE: Migrate to Clerk for production (see migration comments below)
 *
 * Migration Path to Clerk:
 * 1. Install and configure Clerk middleware
 * 2. Replace login/signup flows with Clerk components
 * 3. Update middleware.ts to use Clerk's auth protection
 * 4. Add clerkId field to User model (already prepared in schema)
 * 5. Remove passwordHash field from User model
 * 6. Deprecate this file's password and session functions
 * 7. Keep getUserFromSession but adapt to use Clerk's auth()
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

// =============================================================================
// CONSTANTS
// =============================================================================

const SALT_ROUNDS = 12; // Bcrypt salt rounds (higher = more secure but slower)
const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// JWT secret key (from environment variable)
const getJwtSecretKey = (): Uint8Array | null => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Return null instead of throwing - allows app to run in read-only mode
    // This enables public pages (login/signup) to work even without JWT_SECRET
    console.warn('JWT_SECRET environment variable is not set - authentication will not work');
    return null;
  }
  return new TextEncoder().encode(secret);
};

// =============================================================================
// PASSWORD HASHING
// SCALE: Remove these functions when migrating to Clerk
// =============================================================================

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a bcrypt hash
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// =============================================================================
// SESSION MANAGEMENT (JWT)
// SCALE: Replace with Clerk's session management
// =============================================================================

interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: number;
}

/**
 * Create a JWT token for a user session
 * @param userId - User's unique ID
 * @param email - User's email
 * @returns Promise<string> - Signed JWT token
 */
async function createSessionToken(
  userId: string,
  email: string
): Promise<string> {
  const secretKey = getJwtSecretKey();
  if (!secretKey) {
    throw new Error('Cannot create session: JWT_SECRET not configured');
  }

  const expiresAt = Date.now() + SESSION_DURATION;

  const token = await new SignJWT({ userId, email, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt))
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode a JWT session token
 * @param token - JWT token to verify
 * @returns Promise<SessionPayload | null> - Decoded payload or null if invalid
 */
async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    if (!secretKey) {
      // JWT_SECRET not configured - cannot verify tokens
      return null;
    }

    const { payload } = await jwtVerify(token, secretKey);

    // Validate payload has required fields
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.expiresAt === 'number'
    ) {
      return payload as unknown as SessionPayload;
    }

    return null;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Create a session for a user (sets HTTP-only cookie)
 * @param userId - User's unique ID
 * @param email - User's email
 */
export async function createSession(
  userId: string,
  email: string
): Promise<void> {
  const token = await createSessionToken(userId, email);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get the current session from cookies
 * @returns Promise<SessionPayload | null> - Session data or null if not authenticated
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Destroy the current session (logout)
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// =============================================================================
// USER AUTHENTICATION
// SCALE: Replace with Clerk's auth flows
// =============================================================================

/**
 * Authenticate a user with email and password
 * @param email - User's email
 * @param password - User's plain text password
 * @returns Promise<User | null> - User object if authenticated, null otherwise
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Return user without password hash
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * Create a new user account
 * @param email - User's email
 * @param password - User's plain text password
 * @param name - User's name (optional)
 * @returns Promise<User> - Created user object
 */
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<{ id: string; email: string; name: string | null }> {
  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return user;
}

/**
 * Get the currently authenticated user from the session
 * @returns Promise<User | null> - Current user or null if not authenticated
 *
 * SCALE: When migrating to Clerk, replace with:
 * import { auth } from '@clerk/nextjs';
 * const { userId } = auth();
 * Then fetch user from database using clerkId
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Fetch user from database
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return user;
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean> - True if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate email format
 * @param email - Email to validate
 * @returns boolean - True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns { valid: boolean; error?: string } - Validation result
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  return { valid: true };
}
