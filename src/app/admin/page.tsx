'use client';

/**
 * Admin Dashboard
 * Real-time system monitoring, error tracking, and usage stats
 * Only accessible to users in ADMIN_EMAILS environment variable
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SystemHealth {
  claudeApi: boolean;
  queue: boolean;
  database: boolean;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
  activeJobs: Array<{
    id: string;
    batchId: string;
    pageName: string;
    progress: number;
    elapsed: number;
  }>;
}

interface UsageStats {
  today: {
    pages: number;
    successful: number;
    failed: number;
    successRate: number;
    avgTimePerPage: number;
    estimatedCost: number;
  };
  week: {
    pages: number;
  };
  month: {
    pages: number;
    estimatedCost: number;
  };
}

interface ActivityData {
  activeUsers: number;
  recentBatches: Array<{
    id: string;
    userId: string;
    user: string;
    client: string;
    status: string;
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    createdAt: string;
  }>;
}

interface ErrorLog {
  id: string;
  userId: string;
  user: string;
  client: string;
  type: string;
  message: string;
  createdAt: string;
}

interface ErrorData {
  data: ErrorLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminStats {
  systemHealth: SystemHealth;
  queue: QueueStats;
  usage: UsageStats;
  activity: ActivityData;
  errors: ErrorData;
  users: User[];
  filterUserId: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [errorPage, setErrorPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (userFilter !== 'all') {
        params.set('userId', userFilter);
      }
      params.set('errorPage', errorPage.toString());
      params.set('errorLimit', '20');

      const url = `/api/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (response.status === 403) {
        setError('Access Denied: Admin privileges required');
        return;
      }

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userFilter, errorPage]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, userFilter, errorPage]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to login as ${userName}? You will be redirected to their dashboard.`)) {
      return;
    }

    setImpersonating(userId);

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Impersonation failed');
      }

      // Redirect to dashboard after successful impersonation
      router.push('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to impersonate user');
      setImpersonating(null);
    }
  };

  const filteredErrors =
    stats?.errors.data.filter((err) => errorTypeFilter === 'all' || err.type === errorTypeFilter) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Error</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Real-time system monitoring and analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setErrorPage(1); // Reset to first page when changing filter
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="all">All Users</option>
                {stats?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (10s)
              </label>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Refresh Now
              </button>
            </div>
          </div>
          {userFilter !== 'all' && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              Showing stats for: <strong>{stats?.users.find(u => u.id === userFilter)?.name}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              System Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HealthIndicator
                label="Claude API"
                healthy={stats.systemHealth.claudeApi}
                description="Anthropic API connection"
              />
              <HealthIndicator
                label="Job Queue"
                healthy={stats.systemHealth.queue}
                description="Redis & Bull queue"
              />
              <HealthIndicator
                label="Database"
                healthy={stats.systemHealth.database}
                description="PostgreSQL connection"
              />
            </div>
          </div>

          {/* Real-time Monitoring */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Real-time Monitoring
            </h2>

            {/* Queue Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatCard label="Waiting" value={stats.queue.waiting} color="yellow" />
              <StatCard label="Active" value={stats.queue.active} color="blue" />
              <StatCard label="Completed" value={stats.queue.completed} color="green" />
              <StatCard label="Failed" value={stats.queue.failed} color="red" />
              <StatCard label="Delayed" value={stats.queue.delayed} color="gray" />
            </div>

            {/* Active Jobs */}
            {stats.queue.activeJobs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Active Generation Jobs
                </h3>
                <div className="space-y-2">
                  {stats.queue.activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {job.pageName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Batch: {job.batchId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {job.progress}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(job.elapsed)}
                          </p>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.queue.activeJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm">No active jobs</p>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UsageCard
              title="Today"
              pages={stats.usage.today.pages}
              successful={stats.usage.today.successful}
              failed={stats.usage.today.failed}
              successRate={stats.usage.today.successRate}
              avgTime={stats.usage.today.avgTimePerPage}
              cost={stats.usage.today.estimatedCost}
            />
            <UsageCard
              title="This Week"
              pages={stats.usage.week.pages}
            />
            <UsageCard
              title="This Month"
              pages={stats.usage.month.pages}
              cost={stats.usage.month.estimatedCost}
            />
          </div>

          {/* User Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                User Activity
              </h2>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                {stats.activity.activeUsers} active (24h)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Client
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Pages
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.activity.recentBatches.map((batch) => (
                    <tr key={batch.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{batch.user}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{batch.client}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        <span className="text-green-600 dark:text-green-400">
                          {batch.successfulPages}
                        </span>
                        {batch.failedPages > 0 && (
                          <span className="text-red-600 dark:text-red-400 ml-1">
                            / {batch.failedPages} failed
                          </span>
                        )}
                        <span className="text-gray-500 ml-1">of {batch.totalPages}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {formatDate(batch.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                User Management
              </h2>
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                {stats.users.length} total users
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {user.name || 'No name'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleImpersonate(user.id, user.name || user.email)}
                          disabled={impersonating === user.id}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          {impersonating === user.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Login as User
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Logs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Error Logs</h2>
                {stats?.errors.pagination && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({stats.errors.pagination.total} total)
                  </span>
                )}
              </div>
              <select
                value={errorTypeFilter}
                onChange={(e) => setErrorTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="all">All Error Types</option>
                <option value="generation">Generation</option>
                <option value="validation">Validation</option>
                <option value="wordpress">WordPress</option>
                <option value="api">API</option>
                <option value="queue">Queue</option>
                <option value="user_input">User Input</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredErrors.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm">No errors to display</p>
                </div>
              )}

              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-xs font-medium">
                        {error.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(error.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white mb-2 font-medium">
                    {error.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>User: {error.user}</span>
                    <span>•</span>
                    <span>Client: {error.client}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {stats?.errors.pagination && stats.errors.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {stats.errors.pagination.page} of {stats.errors.pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setErrorPage(errorPage - 1)}
                    disabled={!stats.errors.pagination.hasPrev}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setErrorPage(errorPage + 1)}
                    disabled={!stats.errors.pagination.hasNext}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scaling Notes */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Scaling Recommendations
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Consider DataDog or New Relic for production monitoring</li>
                  <li>• Set up PagerDuty or Opsgenie for alerting</li>
                  <li>• Use Sentry for advanced error tracking and stack traces</li>
                  <li>• Implement log aggregation with LogDNA or Papertrail</li>
                  <li>• Add Redis Sentinel or Cluster for queue high availability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function HealthIndicator({
  label,
  healthy,
  description,
}: {
  label: string;
  healthy: boolean;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <div
        className={`w-3 h-3 rounded-full ${
          healthy
            ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
        }`}
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span className={`text-xs font-medium ${healthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {healthy ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
    gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300',
  };

  return (
    <div className={`p-4 rounded-lg ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function UsageCard({
  title,
  pages,
  successful,
  failed,
  successRate,
  avgTime,
  cost,
}: {
  title: string;
  pages: number;
  successful?: number;
  failed?: number;
  successRate?: number;
  avgTime?: number;
  cost?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        <div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{pages}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pages generated</p>
        </div>

        {successful !== undefined && failed !== undefined && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400">{successful} success</span>
            <span className="text-red-600 dark:text-red-400">{failed} failed</span>
          </div>
        )}

        {successRate !== undefined && (
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{successRate}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Success rate</p>
          </div>
        )}

        {avgTime !== undefined && (
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{avgTime}s</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg time per page</p>
          </div>
        )}

        {cost !== undefined && (
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">${cost.toFixed(2)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimated API cost</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    processing: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    in_progress: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    failed: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.processing}`}>
      {status}
    </span>
  );
}
