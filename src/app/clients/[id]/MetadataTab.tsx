'use client';

/**
 * Metadata Tab - View and Edit Client Information
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updateClientAction, testConnectionAction } from './actions';
import { useToast } from '@/components/ToastProvider';
import { BUSINESS_TYPES } from '@/lib/schema-generator';

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
  linkColor: string | null;
}

interface MetadataTabProps {
  client: Client;
}

function InfoIcon({ content }: { content: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 border border-gray-700">
          <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 transform rotate-45" />
          <div className="whitespace-pre-line">{content}</div>
        </div>
      )}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

export default function MetadataTab({ client }: MetadataTabProps) {
  const router = useRouter();
  const { showSuccess } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    detectedBuilder?: string | null;
    builderDetails?: string | null;
    builderSupported?: boolean;
  } | null>(null);
  const [businessTypeSearch, setBusinessTypeSearch] = useState('');
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  // Optional default link color (opt-in). Initialized from the saved value.
  const [linkColorEnabled, setLinkColorEnabled] = useState(!!client.linkColor);
  const [linkColor, setLinkColor] = useState(client.linkColor || '#1a73e8');
  const [state, formAction] = useFormState(updateClientAction, null);

  // Handle successful update
  useEffect(() => {
    if (state?.success) {
      showSuccess('Client updated successfully!');
      setIsEditing(false);
      router.refresh();
    }
  }, [state, router, showSuccess]);

  // Initialize business type when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setSelectedBusinessType(client.businessType || '');
      setBusinessTypeSearch(client.businessType || '');
    }
  }, [isEditing, client.businessType]);

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTestingConnection(true);
    setConnectionResult(null);

    const form = e.currentTarget.closest('form');
    if (!form) return;

    const formData = new FormData(form);

    try {
      const result = await testConnectionAction(formData);
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: 'Failed to test connection. Please check your credentials.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Client Metadata
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage WordPress connection settings
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all font-medium"
          >
            Edit
          </button>
        )}
      </div>

      <form action={formAction} className="space-y-6">
        {/* Hidden ID field */}
        <input type="hidden" name="clientId" value={client.id} />

        {/* Hidden builder detection fields */}
        <input type="hidden" name="pageBuilder" value={connectionResult?.detectedBuilder || client.pageBuilder} />
        <input type="hidden" name="builderDetected" value={connectionResult?.detectedBuilder ? 'true' : String(client.builderDetected)} />

        {/* Client Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Client Information
          </h3>
          <div className="space-y-4">
            {/* Client Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Name
                <InfoIcon content="A friendly name to identify this client in your dashboard" />
              </label>
              <input
                name="clientName"
                type="text"
                defaultValue={client.clientName}
                disabled={!isEditing}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Client Website */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Website URL
                <InfoIcon content="The public-facing URL of your client's website" />
              </label>
              <input
                name="clientWebsite"
                type="url"
                defaultValue={client.clientWebsite}
                disabled={!isEditing}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* WordPress Connection */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            WordPress Connection
          </h3>
          <div className="space-y-4">
            {/* WordPress Site URL */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WordPress Site URL
                <InfoIcon content="The base URL of your WordPress site (just the domain, not /wp-admin)" />
              </label>
              <input
                name="wpSiteUrl"
                type="url"
                defaultValue={client.wordpressUrl}
                disabled={!isEditing}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* WordPress Username */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WordPress Username
                <InfoIcon content="WordPress user with Administrator or Editor role" />
              </label>
              <input
                name="wpUsername"
                type="text"
                defaultValue={client.wpUsername}
                disabled={!isEditing}
                autoComplete="off"
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* WordPress Application Password */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                WordPress Application Password
                <InfoIcon content="Generate in WordPress: Users → Profile → Application Passwords" />
              </label>
              <input
                name="wpAppPassword"
                type="text"
                defaultValue={client.wpAppPassword}
                disabled={!isEditing}
                autoComplete="off"
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-mono text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Template Configuration */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Template Configuration
          </h3>
          <div className="space-y-4">
            {/* SEO Plugin */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SEO Plugin
                <InfoIcon content="Which SEO plugin is installed: Yoast SEO or Rank Math" />
              </label>
              <select
                name="seoPlugin"
                defaultValue={client.seoPlugin}
                disabled={!isEditing}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="Yoast">Yoast SEO</option>
                <option value="RankMath">Rank Math</option>
              </select>
            </div>

            {/* Template Page ID */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Page ID
                <InfoIcon content="Find in WordPress: Pages → Edit → URL (post=ID)" />
              </label>
              <input
                name="templatePageId"
                type="text"
                defaultValue={client.templatePageId}
                disabled={!isEditing}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              {client.templatePageId && client.wordpressUrl && (
                <a
                  href={`${client.wordpressUrl}/wp-admin/post.php?post=${client.templatePageId}&action=edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open template page in WordPress
                </a>
              )}
            </div>

            {/* Page Builder Display */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page Builder
                <InfoIcon content="Detected page builder used by your template page" />
              </label>
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                {(() => {
                  // Use detected builder from connection test if available, otherwise use saved value
                  const displayBuilder = connectionResult?.detectedBuilder || client.pageBuilder;
                  const isDetectedNew = connectionResult?.detectedBuilder && connectionResult.detectedBuilder !== client.pageBuilder;

                  return (
                    <>
                      <span className="text-2xl">
                        {displayBuilder === 'elementor' && '🎨'}
                        {displayBuilder === 'divi' && '🔷'}
                        {displayBuilder === 'wpbakery' && '📦'}
                        {displayBuilder === 'fusion' && '⚡'}
                        {displayBuilder === 'gutenberg' && '🧱'}
                        {displayBuilder === 'beaver-builder' && '🦫'}
                        {displayBuilder === 'oxygen' && '💨'}
                        {displayBuilder === 'html' && '📄'}
                        {!displayBuilder && '❓'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {displayBuilder === 'elementor' && 'Elementor'}
                            {displayBuilder === 'divi' && 'Divi Builder'}
                            {displayBuilder === 'wpbakery' && 'WPBakery Page Builder'}
                            {displayBuilder === 'fusion' && 'Avada Fusion Builder'}
                            {displayBuilder === 'gutenberg' && 'Gutenberg (Block Editor)'}
                            {displayBuilder === 'beaver-builder' && 'Beaver Builder'}
                            {displayBuilder === 'oxygen' && 'Oxygen Builder'}
                            {displayBuilder === 'html' && 'Plain HTML'}
                            {!displayBuilder && 'Not Detected'}
                          </span>
                          {displayBuilder === 'elementor' || displayBuilder === 'divi' || displayBuilder === 'wpbakery' || displayBuilder === 'fusion' || displayBuilder === 'classic-editor' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-300">
                              Supported
                            </span>
                          ) : displayBuilder && displayBuilder !== 'html' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
                              Coming Soon
                            </span>
                          ) : null}
                          {isDetectedNew && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                              New Detection
                            </span>
                          )}
                        </div>
                        {client.builderDetected && !isDetectedNew && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Auto-detected from template page
                          </p>
                        )}
                        {isDetectedNew && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Newly detected - click Save Changes to update
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Business Metadata Section */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Business Metadata
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
              Optional
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Enhance your SEO with schema.org structured data. These fields enable FAQ rich snippets, local business info, and improved search visibility.
          </p>
          <div className="space-y-4">
            {/* Business Type */}
            <div>
              <label htmlFor="businessType" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Type
                <InfoIcon content="Select from 90+ business types or type your own. Start typing to search. This helps search engines understand and display your business info correctly in search results." />
              </label>
              {isEditing ? (
                <>
                  <div className="relative">
                    <input
                      id="businessType"
                      name="businessType"
                      type="text"
                      value={selectedBusinessType}
                      onChange={(e) => {
                        setSelectedBusinessType(e.target.value);
                        setBusinessTypeSearch(e.target.value);
                        setBusinessTypeOpen(true);
                      }}
                      onFocus={() => setBusinessTypeOpen(true)}
                      placeholder="Search or select business type (optional)"
                      className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                    {businessTypeOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setBusinessTypeOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 max-h-60 overflow-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                          {BUSINESS_TYPES.filter(type =>
                            type.label.toLowerCase().includes(businessTypeSearch.toLowerCase()) ||
                            type.value.toLowerCase().includes(businessTypeSearch.toLowerCase())
                          ).map((type) => (
                            <div
                              key={type.value}
                              onClick={() => {
                                setSelectedBusinessType(type.value);
                                setBusinessTypeSearch(type.value);
                                setBusinessTypeOpen(false);
                              }}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                            >
                              {type.label}
                            </div>
                          ))}
                          {businessTypeSearch && !BUSINESS_TYPES.find(t =>
                            t.value.toLowerCase() === businessTypeSearch.toLowerCase()
                          ) && (
                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
                              💡 Custom type: "{businessTypeSearch}"
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    💡 Click to see all options, or start typing to search through 90+ business types
                  </p>
                </>
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {client.businessType
                      ? BUSINESS_TYPES.find(t => t.value === client.businessType)?.label || client.businessType
                      : 'Not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Business Phone */}
            <div>
              <label htmlFor="businessPhone" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Phone Number
                <InfoIcon content="Enter phone number in format: +1-555-123-4567. This will appear in local business rich snippets." />
              </label>
              {isEditing ? (
                <input
                  id="businessPhone"
                  name="businessPhone"
                  type="tel"
                  defaultValue={client.businessPhone || ''}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="+1-555-123-4567"
                />
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {client.businessPhone || 'Not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Business Address */}
            <div>
              <label htmlFor="businessAddress" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Address
                <InfoIcon content="Full address including street, city, state, and ZIP code (e.g., '123 Main St, Los Angeles, CA 90001')." />
              </label>
              {isEditing ? (
                <input
                  id="businessAddress"
                  name="businessAddress"
                  type="text"
                  defaultValue={client.businessAddress || ''}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="123 Main St, Los Angeles, CA 90001"
                />
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {client.businessAddress || 'Not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Google Business Profile URL */}
            <div>
              <label htmlFor="gbpUrl" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Business Profile URL
                <InfoIcon content="Link to your Google Business Profile. This boosts local SEO and connects your pages to your Google My Business listing." />
              </label>
              {isEditing ? (
                <input
                  id="gbpUrl"
                  name="gbpUrl"
                  type="url"
                  defaultValue={client.gbpUrl || ''}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="https://maps.google.com/?cid=12345..."
                />
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-900 dark:text-white break-all">
                    {client.gbpUrl || 'Not set'}
                  </span>
                </div>
              )}
            </div>

            {/* Link Color (default for generated internal/external links) */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link Color
                <InfoIcon content="Optional. Color applied to generated internal & external links as an inline style. Leave off to keep your theme's default link styling. Can be overridden per batch when generating." />
              </label>
              {isEditing ? (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={linkColorEnabled}
                      onChange={(e) => setLinkColorEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Set a custom link color
                  </label>
                  {linkColorEnabled && (
                    <>
                      <input
                        type="color"
                        value={linkColor}
                        onChange={(e) => setLinkColor(e.target.value)}
                        className="h-9 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        aria-label="Link color"
                      />
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{linkColor}</span>
                    </>
                  )}
                  {/* Empty when disabled -> server stores null (keep theme default) */}
                  <input type="hidden" name="linkColor" value={linkColorEnabled ? linkColor : ''} />
                </div>
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                  {client.linkColor ? (
                    <>
                      <span className="inline-block h-4 w-4 rounded border border-gray-300 dark:border-gray-600" style={{ backgroundColor: client.linkColor }} />
                      <span className="text-sm font-mono text-gray-900 dark:text-white">{client.linkColor}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-white">Not set (theme default)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Connection Section */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Connection & Detection
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Test WordPress connection and detect page builder
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !isEditing}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Connection Test Result */}
        {connectionResult && (
          <div className="space-y-4">
            {/* Main Connection Status */}
            <div className={`rounded-lg border p-4 ${
              connectionResult.success
                ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {connectionResult.success ? (
                  <svg className="h-5 w-5 text-accent-600 dark:text-accent-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className={`text-sm whitespace-pre-line flex-1 ${
                  connectionResult.success
                    ? 'text-accent-800 dark:text-accent-300'
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  {connectionResult.message}
                </div>
              </div>
            </div>

            {/* Builder Detection Card */}
            {connectionResult.success && connectionResult.detectedBuilder && (
              <div className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4">
                <div className="flex items-start gap-4">
                  {/* Builder Icon */}
                  <div className="text-4xl flex-shrink-0">
                    {connectionResult.detectedBuilder === 'elementor' && '🎨'}
                    {connectionResult.detectedBuilder === 'divi' && '🔷'}
                    {connectionResult.detectedBuilder === 'wpbakery' && '📦'}
                    {connectionResult.detectedBuilder === 'fusion' && '⚡'}
                    {connectionResult.detectedBuilder === 'gutenberg' && '🧱'}
                    {connectionResult.detectedBuilder === 'beaver-builder' && '🦫'}
                    {connectionResult.detectedBuilder === 'oxygen' && '💨'}
                    {connectionResult.detectedBuilder === 'html' && '📄'}
                  </div>

                  {/* Builder Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                        Page Builder Detected
                      </h4>
                      {connectionResult.builderSupported ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-300">
                          Supported
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mb-1">
                      <span className="font-medium">
                        {connectionResult.detectedBuilder === 'elementor' && 'Elementor'}
                        {connectionResult.detectedBuilder === 'divi' && 'Divi Builder'}
                        {connectionResult.detectedBuilder === 'wpbakery' && 'WPBakery Page Builder'}
                        {connectionResult.detectedBuilder === 'fusion' && 'Avada Fusion Builder'}
                        {connectionResult.detectedBuilder === 'gutenberg' && 'Gutenberg (Block Editor)'}
                        {connectionResult.detectedBuilder === 'beaver-builder' && 'Beaver Builder'}
                        {connectionResult.detectedBuilder === 'oxygen' && 'Oxygen Builder'}
                        {connectionResult.detectedBuilder === 'html' && 'Plain HTML'}
                      </span>
                    </p>
                    {connectionResult.builderDetails && (
                      <p className="text-xs text-primary-600 dark:text-primary-400">
                        {connectionResult.builderDetails}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {state?.error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm font-medium text-red-800 dark:text-red-300 whitespace-pre-line">
                {state.error}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditing && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setConnectionResult(null);
              }}
              className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all font-medium"
            >
              Cancel
            </button>
            <SaveButton />
          </div>
        )}
      </form>
    </div>
  );
}
