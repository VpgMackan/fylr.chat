'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import { useUsageStats } from '@/hooks/useUsageStats';
import Link from 'next/link';

interface PendingSource {
  id: string;
  name: string;
  size: number;
  uploadTime: string;
  status: string;
  library: {
    id: string;
    title: string;
  };
}

export default function PendingSourcesView() {
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { stats, refetch: refetchStats } = useUsageStats();

  const fetchPendingSources = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/source/pending-ingestion');
      setPendingSources(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch pending sources:', err);
      setError(
        err.response?.data?.message || 'Failed to fetch pending sources',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSources();
  }, []);

  const handleTriggerIngestion = async (sourceId: string) => {
    setProcessingIds((prev) => new Set(prev).add(sourceId));
    setError(null);

    try {
      await axios.post(`/source/${sourceId}/trigger-ingestion`);

      // Remove from pending list
      setPendingSources((prev) => prev.filter((s) => s.id !== sourceId));

      // Refetch stats
      refetchStats();
    } catch (err: any) {
      console.error('Failed to trigger ingestion:', err);
      setError(err.response?.data?.message || 'Failed to trigger ingestion');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Icon
            icon="mdi:loading"
            className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2"
          />
          <p className="text-gray-600">Loading pending sources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pending Sources
        </h1>
        <p className="text-gray-600">
          These files have been uploaded but are waiting to be processed due to
          daily upload limits.
        </p>
      </div>

      {/* Usage Stats Card */}
      {stats && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Daily Upload Usage
              </h3>
              <p className="text-sm text-gray-600">
                {stats.usage.SOURCE_UPLOAD_DAILY} of{' '}
                {stats.limits.features.SOURCE_UPLOAD_DAILY === Infinity
                  ? 'unlimited'
                  : stats.limits.features.SOURCE_UPLOAD_DAILY}{' '}
                uploads used today
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stats.role === 'FREE' && (
                <Link
                  href="/settings?tab=subscription"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Upgrade to Pro
                </Link>
              )}
              <button
                onClick={() => {
                  refetchStats();
                  fetchPendingSources();
                }}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <Icon icon="mdi:refresh" className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:alert-circle" className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {pendingSources.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Icon
            icon="mdi:check-circle"
            className="w-16 h-16 text-green-500 mx-auto mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Pending Sources
          </h3>
          <p className="text-gray-600 mb-4">
            All your uploaded files have been processed!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Icon icon="mdi:home" />
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Library
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingSources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Icon
                          icon="mdi:file-document"
                          className="w-5 h-5 text-gray-400 mr-3"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {source.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/library/${source.library.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {source.library.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFileSize(source.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(source.uploadTime)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleTriggerIngestion(source.id)}
                        disabled={
                          processingIds.has(source.id) ||
                          (stats
                            ? (stats.usage.SOURCE_UPLOAD_DAILY ?? 0) >=
                              (stats.limits.features.SOURCE_UPLOAD_DAILY ??
                                Infinity)
                            : false)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                      >
                        {processingIds.has(source.id) ? (
                          <>
                            <Icon
                              icon="mdi:loading"
                              className="w-4 h-4 animate-spin"
                            />
                            Processing...
                          </>
                        ) : stats &&
                          (stats.usage.SOURCE_UPLOAD_DAILY ?? 0) >=
                            (stats.limits.features.SOURCE_UPLOAD_DAILY ??
                              Infinity) ? (
                          <>
                            <Icon icon="mdi:lock" className="w-4 h-4" />
                            Limit Reached
                          </>
                        ) : (
                          <>
                            <Icon icon="mdi:play" className="w-4 h-4" />
                            Process Now
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
      )}

      {pendingSources.length > 0 && stats && stats.role === 'FREE' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Icon
              icon="mdi:information"
              className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
            />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">
                Daily Upload Limit
              </p>
              <p className="text-yellow-700">
                Your daily upload limit will reset at midnight. You can process
                pending sources then, or{' '}
                <Link
                  href="/settings?tab=subscription"
                  className="font-medium underline hover:text-yellow-800"
                >
                  upgrade to Pro
                </Link>{' '}
                for unlimited uploads.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
