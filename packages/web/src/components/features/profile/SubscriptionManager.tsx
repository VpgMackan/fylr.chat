'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import {
  Subscription,
  getSubscription,
  activateSubscription,
  pauseSubscription,
  resumeSubscription,
} from '@/services/api/subscription.api';

const SubscriptionStatusBadge = ({
  status,
}: {
  status: Subscription['status'];
}) => {
  const config = {
    ACTIVE: { text: 'Pro', color: 'bg-green-100 text-green-800' },
    PAUSED: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    EXPIRED: { text: 'Expired', color: 'bg-red-100 text-red-800' },
    INACTIVE: { text: 'Free', color: 'bg-gray-100 text-gray-800' },
  };
  const { text, color } = config[status] || config.INACTIVE;
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${color}`}>
      {text}
    </span>
  );
};

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      const data = await getSubscription();
      setSubscription(data);
    } catch (error) {
      toast.error('Failed to load subscription status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: () => Promise<Subscription>) => {
    setIsActionLoading(true);
    try {
      const updatedSub = await action();
      setSubscription(updatedSub);
    } catch (error) {
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>;
  }

  if (!subscription) {
    return (
      <div className="text-center text-gray-500">
        Could not load subscription details.
      </div>
    );
  }

  const { status, expiresAt } = subscription;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Your Plan</h3>
        <SubscriptionStatusBadge status={status} />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        {status === 'ACTIVE' && expiresAt && (
          <p className="text-sm text-gray-700">
            Your Pro access expires on:{' '}
            <strong>{new Date(expiresAt).toLocaleDateString()}</strong>
          </p>
        )}
        {status === 'PAUSED' && (
          <p className="text-sm text-gray-700">
            Your subscription is currently paused. Resume to continue enjoying
            Pro benefits.
          </p>
        )}
        {(status === 'INACTIVE' || status === 'EXPIRED') && (
          <p className="text-sm text-gray-700">
            You are on the Free plan. Upgrade to Pro for unlimited access and
            advanced features.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {status === 'ACTIVE' && (
          <button
            onClick={() => handleAction(pauseSubscription)}
            disabled={isActionLoading}
            className="flex-1 bg-yellow-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            Pause Subscription
          </button>
        )}
        {status === 'PAUSED' && (
          <button
            onClick={() => handleAction(resumeSubscription)}
            disabled={isActionLoading}
            className="flex-1 bg-green-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            Resume Subscription
          </button>
        )}
        {(status === 'INACTIVE' || status === 'EXPIRED') && (
          <button
            onClick={() => handleAction(() => activateSubscription(30))}
            disabled={isActionLoading}
            className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Upgrade to Pro (30 Days)
          </button>
        )}
      </div>
    </div>
  );
}
