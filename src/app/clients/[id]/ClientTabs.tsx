'use client';

/**
 * Client Detail Tabs Component
 * Manages tabs: Metadata, Generate Pages, History
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MetadataTab from './MetadataTab';
import GeneratePagesTab from './GeneratePagesTab';
import HistoryTab from './HistoryTab';

interface Client {
  id: string;
  clientName: string;
  clientWebsite: string;
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  seoPlugin: string;
  templatePageId: string;
  pageBuilder: string;
  builderDetected: boolean;
  // Business metadata (optional)
  businessPhone: string | null;
  businessAddress: string | null;
  businessType: string | null;
  gbpUrl: string | null;
}

interface ClientTabsProps {
  client: Client;
}

type TabType = 'metadata' | 'generate' | 'history';

export default function ClientTabs({ client }: ClientTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;

  // Set initial tab from URL query parameter, default to 'metadata'
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['metadata', 'generate', 'history'].includes(tabParam)
      ? tabParam
      : 'metadata'
  );

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['metadata', 'generate', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const tabs = [
    { id: 'metadata' as TabType, name: 'Metadata', icon: '📋' },
    { id: 'generate' as TabType, name: 'Generate Pages', icon: '⚡' },
    { id: 'history' as TabType, name: 'History', icon: '📊' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'metadata' && <MetadataTab client={client} />}
        {activeTab === 'generate' && <GeneratePagesTab clientId={client.id} />}
        {activeTab === 'history' && <HistoryTab clientId={client.id} />}
      </div>
    </div>
  );
}
