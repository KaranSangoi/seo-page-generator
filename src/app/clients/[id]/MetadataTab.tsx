'use client';

/**
 * Metadata Tab - View and Edit Client Information
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updateClientAction, testConnectionAction } from './actions';
import { useToast } from '@/components/ToastProvider';

interface Client {
  id: string;
  clientName: string;
  clientWebsite: string;
  wordpressUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  seoPlugin: string;
  templatePageId: string;
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
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [state, formAction] = useFormState(updateClientAction, null);

  // Handle successful update
  useEffect(() => {
    if (state?.success) {
      showSuccess('Client updated successfully!');
      setIsEditing(false);
      router.refresh();
    }
  }, [state, router, showSuccess]);

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
            </div>
          </div>
        </div>

        {/* Connection Test Result */}
        {connectionResult && (
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
              <div className={`text-sm whitespace-pre-line ${
                connectionResult.success
                  ? 'text-accent-800 dark:text-accent-300'
                  : 'text-red-800 dark:text-red-300'
              }`}>
                {connectionResult.message}
              </div>
            </div>
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
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
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
