'use client';

/**
 * Batch Detail Modal
 * Shows detailed information about a generation batch including all pages
 */

import { useState, useEffect } from 'react';
import { getBatchDetailsAction } from './actions';

interface BatchDetailModalProps {
  batchId: string;
  onClose: () => void;
}

interface GeneratedPage {
  id: string;
  pageName: string;
  pageType: string;
  publishedUrl: string | null;
  status: string;
  errorMessage: string | null;
  timeElapsed: number;
  service: string | null;
  location: string | null;
  primaryKeyword: string | null;
  createdAt: string;
}

interface BatchDetails {
  id: string;
  csvFilename: string;
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  timeTakenSeconds: number;
  status: string;
  createdAt: string;
  client: {
    clientName: string;
    clientWebsite: string;
  };
  generatedPages: GeneratedPage[];
}

export default function BatchDetailModal({ batchId, onClose }: BatchDetailModalProps) {
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch batch details
  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const result = await getBatchDetailsAction(batchId);

        if (result.error) {
          setError(result.error);
        } else if (result.batch) {
          // Convert Date objects to ISO strings for state
          const batchWithStrings = {
            ...result.batch,
            createdAt: result.batch.createdAt.toISOString(),
            generatedPages: result.batch.generatedPages.map(page => ({
              ...page,
              createdAt: page.createdAt.toISOString(),
            })),
          };
          setBatch(batchWithStrings);
        }
      } catch (err) {
        console.error('Error fetching batch details:', err);
        setError('Failed to load batch details');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [batchId]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format time duration
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format milliseconds to seconds
  const formatTimeElapsed = (milliseconds: number) => {
    const seconds = Math.round(milliseconds / 1000);
    return `${seconds}s`;
  };

  // Download detailed report
  const downloadDetailedReport = () => {
    if (!batch) return;

    const csvRows = [
      // Header
      ['Batch Report - Detailed'],
      [],
      // Batch info
      ['Batch Information'],
      ['CSV File', batch.csvFilename],
      ['Client', batch.client.clientName],
      ['Date', formatDate(batch.createdAt)],
      ['Total Pages', batch.totalPages.toString()],
      ['Successful', batch.successfulPages.toString()],
      ['Failed', batch.failedPages.toString()],
      ['Total Time', formatDuration(batch.timeTakenSeconds)],
      ['Status', batch.status],
      [],
      // Page details header
      ['Page Details'],
      ['Page Name', 'Type', 'Service', 'Location', 'Status', 'URL', 'Time Taken', 'Error'],
      // Page rows
      ...batch.generatedPages.map((page) => [
        page.pageName,
        page.pageType,
        page.service || '',
        page.location || '',
        page.status,
        page.publishedUrl || '',
        formatTimeElapsed(page.timeElapsed),
        page.errorMessage || '',
      ]),
    ];

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-detailed-${batch.id}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case 'pending':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      case 'generating':
      case 'validating':
      case 'publishing':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'generating':
      case 'validating':
      case 'publishing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Batch Details
            </h2>
            {batch && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {batch.csvFilename}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading details...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {batch && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Pages</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{batch.totalPages}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">Successful</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{batch.successfulPages}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="text-sm text-red-600 dark:text-red-400 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{batch.failedPages}</div>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                  <div className="text-sm text-primary-600 dark:text-primary-400 mb-1">Time Taken</div>
                  <div className="text-2xl font-bold text-primary-700 dark:text-primary-400">{formatDuration(batch.timeTakenSeconds)}</div>
                </div>
              </div>

              {/* Batch Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Batch Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Client:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-medium">{batch.client.clientName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-medium">{formatDate(batch.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>{' '}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      batch.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : batch.status === 'failed'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Average Time/Page:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-medium">
                      {batch.totalPages > 0 ? formatDuration(Math.round(batch.timeTakenSeconds / batch.totalPages)) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pages Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    All Pages ({batch.generatedPages.length})
                  </h3>
                  <button
                    onClick={downloadDetailedReport}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Report
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Page Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {batch.generatedPages.map((page) => (
                          <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {page.pageName}
                              </div>
                              {page.errorMessage && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {page.errorMessage}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {page.pageType}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusBadge(page.status)}`}>
                                {getStatusIcon(page.status)}
                                {page.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {page.publishedUrl ? (
                                <a
                                  href={page.publishedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                                >
                                  View
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatTimeElapsed(page.timeElapsed)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Future Feature: Retry Failed Pages */}
              {batch.failedPages > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                        Failed Pages Detected
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                        This batch has {batch.failedPages} failed page{batch.failedPages !== 1 ? 's' : ''}. You can review the error messages in the table above.
                      </p>
                      {/* FUTURE FEATURE: Retry Failed Pages Button */}
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed opacity-50"
                        title="This feature is coming soon"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Failed Pages (Coming Soon)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
