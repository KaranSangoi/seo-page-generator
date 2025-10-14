'use client';

/**
 * Add New Client Page - Professional Blue Theme
 *
 * SCALE: When migrating to Clerk:
 * - Replace getCurrentUser check with useUser() from @clerk/nextjs
 * - Add organization-level client management
 */

import { useFormState, useFormStatus } from 'react-dom';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientAction, testConnectionAction } from './actions';
import { useToast } from '@/components/ToastProvider';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Client
        </>
      )}
    </button>
  );
}

interface InfoIconProps {
  content: string;
}

function InfoIcon({ content }: InfoIconProps) {
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
          {content}
        </div>
      )}
    </div>
  );
}

export default function NewClientPage() {
  const router = useRouter();
  const { showSuccess } = useToast();
  const [state, formAction] = useFormState(createClientAction, null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Handle redirect after successful client creation
  useEffect(() => {
    if (state?.success) {
      showSuccess('Client created successfully!');
      // Redirect to dashboard
      const timer = setTimeout(() => {
        router.push('/dashboard');
        router.refresh(); // Force refresh to load new data
      }, 500);
      return () => clearTimeout(timer);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Add New Client
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure WordPress site connection and metadata
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form className="space-y-6" action={formAction}>
            {/* Client Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Client Information
              </h2>
              <div className="space-y-4">
                {/* Client Name */}
                <div>
                  <label htmlFor="clientName" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client Name
                    <InfoIcon content="A friendly name to identify this client in your dashboard (e.g., 'Acme Corp', 'John's Plumbing')" />
                  </label>
                  <input
                    id="clientName"
                    name="clientName"
                    type="text"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="e.g., Acme Corp"
                  />
                </div>

                {/* Client Website */}
                <div>
                  <label htmlFor="clientWebsite" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client Website URL
                    <InfoIcon content="The public-facing URL of your client's website (e.g., https://example.com). This is for reference only." />
                  </label>
                  <input
                    id="clientWebsite"
                    name="clientWebsite"
                    type="url"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* WordPress Connection Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                WordPress Connection
              </h2>
              <div className="space-y-4">
                {/* WordPress Site URL */}
                <div>
                  <label htmlFor="wpSiteUrl" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    WordPress Site URL
                    <InfoIcon content="The base URL of your WordPress site (e.g., https://example.com). Do NOT include /wp-admin or /wp-json - just the domain." />
                  </label>
                  <input
                    id="wpSiteUrl"
                    name="wpSiteUrl"
                    type="url"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="https://example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter only the base domain (e.g., https://example.com) - do not include /wp-admin or /wp-json
                  </p>
                </div>

                {/* WordPress Username */}
                <div>
                  <label htmlFor="wpUsername" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    WordPress Username
                    <InfoIcon content="A WordPress user with permissions to create and publish pages (typically an Administrator or Editor role)." />
                  </label>
                  <input
                    id="wpUsername"
                    name="wpUsername"
                    type="text"
                    required
                    autoComplete="off"
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="wordpress_admin"
                  />
                </div>

                {/* WordPress Application Password */}
                <div>
                  <label htmlFor="wpAppPassword" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    WordPress Application Password
                    <InfoIcon content="Generate an Application Password in WordPress under Users → Profile → Application Passwords. Copy the password exactly as shown (spaces will be automatically removed). DO NOT use your regular WordPress password." />
                  </label>
                  <input
                    id="wpAppPassword"
                    name="wpAppPassword"
                    type="text"
                    required
                    autoComplete="off"
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-mono text-sm"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Copy and paste the application password exactly as shown in WordPress (including spaces is OK)
                  </p>
                </div>
              </div>
            </div>

            {/* Template Configuration Section */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Template Configuration
              </h2>
              <div className="space-y-4">
                {/* Template Page URL */}
                <div>
                  <label htmlFor="templatePageUrl" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Page URL
                    <InfoIcon content="The full URL of your template page (e.g., https://example.com/services/template). This page will be used as the base template for generated pages." />
                  </label>
                  <input
                    id="templatePageUrl"
                    name="templatePageUrl"
                    type="url"
                    required
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/services/template"
                  />
                </div>

                {/* Template Page ID */}
                <div>
                  <label htmlFor="templatePageId" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Page ID
                    <InfoIcon content="The numeric WordPress page ID of your template (e.g., 42). You can find this in WordPress admin under Pages → Edit → URL bar (post=ID)." />
                  </label>
                  <input
                    id="templatePageId"
                    name="templatePageId"
                    type="number"
                    required
                    min="1"
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="42"
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
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {isTestingConnection ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>
              <SubmitButton />
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-2">Quick Setup Guide:</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li><strong>WordPress Site URL:</strong> Enter only the base domain (e.g., https://example.com) - NOT /wp-admin or /wp-json</li>
                <li><strong>Username:</strong> Your WordPress login username (must have Editor or Administrator role)</li>
                <li><strong>Application Password:</strong> Generate in WordPress under Users → Profile → Application Passwords (copy exactly as shown)</li>
                <li><strong>Test Connection:</strong> Always test before saving to verify credentials work</li>
                <li><strong>Template Page:</strong> The template page should already exist in WordPress</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
