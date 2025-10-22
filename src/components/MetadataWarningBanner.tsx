'use client';

/**
 * Metadata Warning Banner Component
 * Shows a dismissible warning when clients have incomplete business metadata
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { hasCompleteMetadata, getMissingMetadataFields } from '@/lib/schema-generator';

interface Client {
  id: string;
  clientName: string;
  businessPhone: string | null;
  businessAddress: string | null;
  businessType: string | null;
  gbpUrl: string | null;
}

interface MetadataWarningBannerProps {
  clients: Client[];
}

export default function MetadataWarningBanner({ clients }: MetadataWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('metadata-warning-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Find clients with incomplete metadata
  const incompleteClients = clients.filter(client => !hasCompleteMetadata(client));

  // Don't show banner if no incomplete clients or if dismissed
  if (incompleteClients.length === 0 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('metadata-warning-dismissed', 'true');
  };

  // Get example of missing fields from first incomplete client
  const exampleClient = incompleteClients[0];
  const missingFields = getMissingMetadataFields(exampleClient);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Boost Your SEO with Business Metadata
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
            <p className="mb-2">
              <strong>{incompleteClients.length}</strong> {incompleteClients.length === 1 ? 'client needs' : 'clients need'} business information for enhanced SEO rich snippets:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li><strong>FAQ Rich Snippets:</strong> Show your content directly in search results</li>
              <li><strong>Local Business Info:</strong> Appear in Google Maps and local packs</li>
              <li><strong>Better Click Rates:</strong> Rich snippets get 20-35% more clicks</li>
            </ul>
            <p className="text-xs">
              Missing fields for <strong>{exampleClient.clientName}</strong>: {missingFields.join(', ')}
              {incompleteClients.length > 1 && ` (and ${incompleteClients.length - 1} more)`}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={`/clients/${exampleClient.id}?tab=metadata`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update {exampleClient.clientName}
            </Link>
            <button
              onClick={handleDismiss}
              className="text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 font-medium transition-colors"
            >
              Dismiss for now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
