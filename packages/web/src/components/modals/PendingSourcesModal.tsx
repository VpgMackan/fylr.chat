'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import axios from '@/utils/axios';
import SmallModal from './SmallModal';
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

interface PendingSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PendingSourcesModal({
  isOpen,
  onClose,
}: PendingSourcesModalProps) {
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
    if (isOpen) {
      fetchPendingSources();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const footerText = ``;

  return (
    <SmallModal
      onClose={onClose}
      accent="blue"
      title="Pending Sources"
      icon="mdi:database-arrow-right"
      footerText={footerText}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:alert-circle" className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {stats && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Daily Upload Usage
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
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
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <Icon icon="mdi:refresh" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon
              icon="mdi:loading"
              className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2"
            />
            <p className="text-gray-600 dark:text-gray-400">
              Loading pending sources...
            </p>
          </div>
        </div>
      ) : pendingSources.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <Icon
            icon="mdi:check-circle-outline"
            className="text-6xl text-green-500 mx-auto mb-4"
          />
          <p className="text-gray-900 dark:text-white text-lg mb-2 font-semibold">
            No Pending Sources
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Library
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingSources.map((source) => (
                  <tr
                    key={source.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Icon
                          icon="mdi:file-document"
                          className="w-5 h-5 text-gray-400 dark:text-white mr-3"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
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
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatFileSize(source.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
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
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Icon
              icon="mdi:information"
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
            />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Daily Upload Limit
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Your daily upload limit will reset at midnight. You can process
                pending sources then, or{' '}
                <Link
                  href="/settings?tab=subscription"
                  className="font-medium underline hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  upgrade to Pro
                </Link>{' '}
                for unlimited uploads.
              </p>
            </div>
          </div>
        </div>
      )}
    </SmallModal>
  );
}
