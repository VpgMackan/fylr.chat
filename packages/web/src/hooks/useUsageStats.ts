'use client';

import { useState, useEffect } from 'react';
import axios from '@/utils/axios';

export interface UsageStats {
  role: 'FREE' | 'PRO';
  limits: {
    libraries: number;
    sourcesPerLibrary: number;
    dailySourceUploads: number;
  };
  usage: {
    dailySourceUploads: number;
  };
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
          dailySourceUploads: 10,
        },
        usage: {
          dailySourceUploads: 0,
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
    ? stats.usage.dailySourceUploads >= stats.limits.dailySourceUploads
    : false;

  const canUploadMore = stats
    ? stats.role === 'PRO' || !hasReachedDailyLimit
    : false;

  const remainingUploads = stats
    ? Math.max(
        0,
        stats.limits.dailySourceUploads - stats.usage.dailySourceUploads,
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
  };
}
