'use server';

/**
 * Server Actions for Dashboard
 *
 * SCALE: When migrating to Clerk:
 * - Replace getCurrentUser() with auth() from @clerk/nextjs
 * - Update authorization checks to use clerkId
 */

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Delete a client and all associated data
 *
 * SCALE: Add organization-level permissions with Clerk
 */
export async function deleteClientAction(clientId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify the client belongs to this user
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    if (client.userId !== user.id) {
      throw new Error('Unauthorized to delete this client');
    }

    // Delete client (cascade will delete generationBatches and generatedPages)
    await prisma.client.delete({
      where: { id: clientId },
    });

    // Revalidate the dashboard to reflect the deletion
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}
