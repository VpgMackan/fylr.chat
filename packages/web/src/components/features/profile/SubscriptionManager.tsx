'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import {
  Subscription,
  getSubscription,
  redeemGiftCard,
  pauseSubscription,
  resumeSubscription,
} from '@/services/api/subscription.api';
import { validateGiftCardCode } from '@/utils/giftCardValidator';

const SubscriptionStatusBadge = ({
  status,
}: {
  status: Subscription['status'];
}) => {
  const config = {
    ACTIVE: {
      text: 'Pro',
      color: 'bg-white/20 text-white backdrop-blur-sm border border-white/30',
      icon: 'mdi:crown',
    },
    PAUSED: {
      text: 'Paused',
      color:
        'bg-amber-500/20 text-amber-100 backdrop-blur-sm border border-amber-300/30',
      icon: 'mdi:pause-circle',
    },
    EXPIRED: {
      text: 'Expired',
      color:
        'bg-red-500/20 text-red-100 backdrop-blur-sm border border-red-300/30',
      icon: 'mdi:alert-circle',
    },
    INACTIVE: {
      text: 'Free',
      color: 'bg-white/20 text-white backdrop-blur-sm border border-white/30',
      icon: 'mdi:account',
    },
  };
  const { text, color, icon } = config[status] || config.INACTIVE;
  return (
    <div
      className={`px-4 py-1.5 flex items-center gap-2 rounded-full ${color}`}
    >
      <Icon icon={icon} className="w-4 h-4" />
      <span className="text-sm font-semibold">{text}</span>
    </div>
  );
};

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Check if the current input is valid (for UI feedback)
  const isCodeValid =
    giftCardCode.trim() === '' || validateGiftCardCode(giftCardCode.trim());

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
      toast.success('Subscription updated successfully!');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Action failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRedeemGiftCard = async () => {
    const trimmedCode = giftCardCode.trim();

    if (!trimmedCode) {
      toast.error('Please enter a gift card code');
      return;
    }

    // Validate format before making API call
    if (!validateGiftCardCode(trimmedCode)) {
      toast.error('Invalid gift card code format');
      return;
    }

    setIsActionLoading(true);
    try {
      const updatedSub = await redeemGiftCard(trimmedCode);
      setSubscription(updatedSub);
      setGiftCardCode('');
      toast.success('Gift card redeemed successfully!');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to redeem gift card';
      toast.error(errorMessage);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="h-72 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
        <div className="h-16 bg-gray-100 animate-pulse mt-1 rounded-b-2xl" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12 px-6 bg-gray-50 rounded-2xl border border-gray-200">
        <Icon
          icon="mdi:alert-circle-outline"
          className="w-12 h-12 mx-auto text-gray-400 mb-4"
        />
        <p className="text-gray-500 font-medium">
          Could not load subscription details.
        </p>
        <button
          onClick={fetchSubscription}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const { status, expiresAt, remainingDurationOnPause } = subscription;

  const getGradient = () => {
    switch (status) {
      case 'ACTIVE':
        return 'from-violet-600 via-purple-600 to-fuchsia-600';
      case 'PAUSED':
        return 'from-amber-500 via-orange-500 to-yellow-500';
      case 'EXPIRED':
        return 'from-gray-500 via-gray-600 to-gray-700';
      default:
        return 'from-slate-600 via-slate-700 to-slate-800';
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      {/* Main Card */}
      <div
        className={`relative bg-gradient-to-br ${getGradient()} p-6 text-white min-h-[280px] flex flex-col`}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Header */}
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-1">
              Your Plan
            </p>
            <h3 className="text-2xl font-bold">
              {status === 'ACTIVE' || status === 'PAUSED'
                ? 'Fylr Pro'
                : 'Fylr Free'}
            </h3>
          </div>
          <SubscriptionStatusBadge status={status} />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-end relative z-10 mt-6">
          {status === 'ACTIVE' && expiresAt && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Icon icon="mdi:calendar-clock" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Valid until</p>
                  <p className="text-lg font-bold">
                    {new Date(expiresAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'PAUSED' && remainingDurationOnPause && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Icon icon="mdi:timer-pause" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">
                    Time remaining when resumed
                  </p>
                  <p className="text-lg font-bold">
                    {Math.ceil(remainingDurationOnPause / 86400)} days of Pro
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'EXPIRED' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Icon icon="mdi:clock-alert" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/90 font-medium">
                    Your subscription has expired
                  </p>
                  <p className="text-white/70 text-sm">
                    Redeem a gift card to regain Pro features
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'INACTIVE' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Icon icon="mdi:rocket-launch" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/90 font-medium">Upgrade to Pro</p>
                  <p className="text-white/70 text-sm">
                    Unlimited access and advanced features
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="bg-gray-50 p-4 space-y-4">
        {status === 'ACTIVE' && (
          <button
            onClick={() => handleAction(pauseSubscription)}
            disabled={isActionLoading}
            className="w-full bg-white text-amber-600 font-semibold py-3 px-4 rounded-xl hover:bg-amber-50 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 border border-amber-200 shadow-sm"
          >
            {isActionLoading ? (
              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
            ) : (
              <Icon icon="mdi:pause-circle" className="w-5 h-5" />
            )}
            {isActionLoading ? 'Processing...' : 'Pause Subscription'}
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            onClick={() => handleAction(resumeSubscription)}
            disabled={isActionLoading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isActionLoading ? (
              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
            ) : (
              <Icon icon="mdi:play-circle" className="w-5 h-5" />
            )}
            {isActionLoading ? 'Processing...' : 'Resume Subscription'}
          </button>
        )}

        {/* Gift Card Section - Always visible */}
        <div className="space-y-3">
          {(status === 'ACTIVE' || status === 'PAUSED') && (
            <div className="border-t border-gray-200 pt-4 mt-2" />
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Icon icon="mdi:gift" className="w-4 h-4" />
            <span>
              {status === 'ACTIVE' || status === 'PAUSED'
                ? 'Redeem a gift card to extend your subscription'
                : 'Have a gift card? Enter it below'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="FYLR-XXXX-XXXX-XXXX-XX"
                className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-200 font-mono text-sm ${
                  isCodeValid
                    ? 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                }`}
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isActionLoading &&
                    giftCardCode.trim() &&
                    isCodeValid
                  ) {
                    handleRedeemGiftCard();
                  }
                }}
              />
              {giftCardCode && isCodeValid && (
                <Icon
                  icon="mdi:check-circle"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500"
                />
              )}
              {giftCardCode && !isCodeValid && (
                <Icon
                  icon="mdi:alert-circle"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500"
                />
              )}
            </div>
            <button
              onClick={handleRedeemGiftCard}
              disabled={isActionLoading || !giftCardCode.trim() || !isCodeValid}
              className="sm:w-auto w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isActionLoading ? (
                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
              ) : (
                <Icon icon="mdi:gift-open" className="w-5 h-5" />
              )}
              {isActionLoading ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
