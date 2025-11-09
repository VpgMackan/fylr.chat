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
    ACTIVE: { text: 'Pro', color: 'bg-green-100 text-green-800' },
    PAUSED: { text: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    EXPIRED: { text: 'Expired', color: 'bg-red-100 text-red-800' },
    INACTIVE: { text: 'Free', color: 'bg-gray-100 text-gray-800' },
  };
  const { text, color } = config[status] || config.INACTIVE;
  return (
    <div className={`px-3 py-1 flex items-center rounded-full ${color}`}>
      {status === 'ACTIVE' && (
        <Icon icon="mdi:check-circle" className="w-5 h-5 mr-2" />
      )}
      <span className=" text-sm font-medium">{text}</span>
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
    return <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>;
  }

  if (!subscription) {
    return (
      <div className="text-center text-gray-500">
        Could not load subscription details.
      </div>
    );
  }

  const { status, expiresAt, remainingDurationOnPause } = subscription;

  return (
    <>
      <div className="space-y-4 bg-gradient-to-br from-purple-400 to-pink-400 p-3 text-white rounded-t-2xl h-64 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">Your Plan</h3>
          </div>
          <SubscriptionStatusBadge status={status} />
        </div>

        <div className="flex-1 flex flex-col justify-end">
          {status === 'ACTIVE' && expiresAt && (
            <>
              <p className="text-sm font-semibold">Expiration date:</p>
              <p className="text-xl font-bold">
                {new Date(expiresAt).toLocaleDateString()}
              </p>
            </>
          )}
          {status === 'PAUSED' && remainingDurationOnPause && (
            <>
              <p className="text-xl font-bold">
                {Math.ceil(remainingDurationOnPause / 86400)} days of Pro left
                when you resume
              </p>
            </>
          )}
          {status === 'EXPIRED' && (
            <p className="text-xl font-bold">
              Your subscription has expired. Renew to regain premium features
            </p>
          )}
          {status === 'INACTIVE' && (
            <p className="text-xl font-bold">
              Upgrade to Pro for unlimited access and advanced features
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        {status === 'ACTIVE' && (
          <button
            onClick={() => handleAction(pauseSubscription)}
            disabled={isActionLoading}
            className="flex-1 bg-yellow-500 text-white font-medium py-2 px-4 rounded-b-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:pause" className="w-5 h-5" />
            Pause Subscription
          </button>
        )}
        {status === 'PAUSED' && (
          <button
            onClick={() => handleAction(resumeSubscription)}
            disabled={isActionLoading}
            className="flex-1 bg-green-500 text-white font-medium py-2 px-4 rounded-b-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:play" className="w-5 h-5" />
            Resume Subscription
          </button>
        )}
        {(status === 'INACTIVE' || status === 'EXPIRED') && (
          <>
            <input
              type="text"
              placeholder="Enter Gift Card Code (FYLR-XXXX-XXXX-XXXX-XX)"
              className={`flex-1 border rounded-bl-lg px-4 py-2 focus:outline-none focus:ring-2 transition-colors ${
                isCodeValid
                  ? 'border-gray-300 focus:ring-blue-500'
                  : 'border-red-500 focus:ring-red-500'
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
            <button
              onClick={handleRedeemGiftCard}
              disabled={isActionLoading || !giftCardCode.trim() || !isCodeValid}
              className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-br-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Icon icon="mdi:gift" className="w-5 h-5" />
              {isActionLoading ? 'Redeeming...' : 'Redeem Gift Card'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
