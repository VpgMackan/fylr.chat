'use client';

import { useState, useEffect } from 'react';
import axios from '@/utils/axios';

export type UsageRecordFeature =
  | 'SUMMARY_GENERATION_MONTHLY'
  | 'PODCAST_GENERATION_MONTHLY'
  | 'CHAT_AUTO_MESSAGES_DAILY'
  | 'CHAT_FAST_MESSAGES_DAILY'
  | 'CHAT_NORMAL_MESSAGES_DAILY'
  | 'CHAT_THOROUGH_MESSAGES_DAILY'
  | 'SOURCE_UPLOAD_DAILY';

export interface UsageStats {
  role: 'FREE' | 'PRO';
  limits: {
    libraries: number;
    sourcesPerLibrary: number;
    features: Partial<Record<UsageRecordFeature, number>>;
  };
  usage: Partial<Record<UsageRecordFeature, number>>;
}

export function useUsageStats() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/auth/usage-stats');
      setStats(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch usage stats:', err);
      setError(err.response?.data?.message || 'Failed to fetch usage stats');
      // Set default stats on error
      setStats({
        role: 'FREE',
        limits: {
          libraries: 10,
          sourcesPerLibrary: 50,
          features: {
            SOURCE_UPLOAD_DAILY: 10,
            CHAT_AUTO_MESSAGES_DAILY: 20,
            CHAT_FAST_MESSAGES_DAILY: 20,
            CHAT_NORMAL_MESSAGES_DAILY: 10,
            CHAT_THOROUGH_MESSAGES_DAILY: 5,
            SUMMARY_GENERATION_MONTHLY: 20,
            PODCAST_GENERATION_MONTHLY: 5,
          },
        },
        usage: {
          SOURCE_UPLOAD_DAILY: 0,
          CHAT_AUTO_MESSAGES_DAILY: 0,
          CHAT_FAST_MESSAGES_DAILY: 0,
          CHAT_NORMAL_MESSAGES_DAILY: 0,
          CHAT_THOROUGH_MESSAGES_DAILY: 0,
          SUMMARY_GENERATION_MONTHLY: 0,
          PODCAST_GENERATION_MONTHLY: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refetch = () => {
    fetchStats();
  };

  const hasReachedDailyLimit = stats
    ? (stats.usage.SOURCE_UPLOAD_DAILY ?? 0) >=
      (stats.limits.features.SOURCE_UPLOAD_DAILY ?? Infinity)
    : false;

  const hasReachedAgenticLimit = stats
    ? stats.role === 'FREE' &&
      (stats.usage.CHAT_AUTO_MESSAGES_DAILY ?? 0) +
        (stats.usage.CHAT_FAST_MESSAGES_DAILY ?? 0) +
        (stats.usage.CHAT_NORMAL_MESSAGES_DAILY ?? 0) +
        (stats.usage.CHAT_THOROUGH_MESSAGES_DAILY ?? 0) >=
        (stats.limits.features.CHAT_AUTO_MESSAGES_DAILY ?? 0) +
          (stats.limits.features.CHAT_FAST_MESSAGES_DAILY ?? 0) +
          (stats.limits.features.CHAT_NORMAL_MESSAGES_DAILY ?? 0) +
          (stats.limits.features.CHAT_THOROUGH_MESSAGES_DAILY ?? 0)
    : false;

  const canUploadMore = stats
    ? stats.role === 'PRO' || !hasReachedDailyLimit
    : false;

  const remainingUploads = stats
    ? Math.max(
        0,
        (stats.limits.features.SOURCE_UPLOAD_DAILY ?? 0) -
          (stats.usage.SOURCE_UPLOAD_DAILY ?? 0),
      )
    : 0;

  return {
    stats,
    loading,
    error,
    refetch,
    hasReachedDailyLimit,
    canUploadMore,
    remainingUploads,
    hasReachedAgenticLimit,
  };
}
