'use client';

import { useTrackingConsent } from '@/hooks/useTrackingConsent';

interface TrackingConsentBannerProps {
  className?: string;
}

export function TrackingConsentBanner({
  className = '',
}: TrackingConsentBannerProps) {
  const {
    consent,
    isLoaded,
    hasConsented,
    acceptFull,
    acceptAnonymous,
    decline,
  } = useTrackingConsent();

  // Don't show banner if not loaded or already consented/declined
  if (!isLoaded || hasConsented || consent !== 'none') {
    return null;
  }

  // Check if user has already made a choice (even if it's "none")
  const hasDeclined =
    typeof window !== 'undefined' &&
    localStorage.getItem('posthog_tracking_consent') === 'none';

  if (hasDeclined) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Help us improve your experience
            </h3>
            <p className="text-sm text-gray-600">
              We use analytics to understand how you use our app and improve it.
              You can choose to share data anonymously or with your account, or
              opt out entirely.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={decline}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Decline
            </button>
            <button
              onClick={acceptAnonymous}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Anonymous only
            </button>
            <button
              onClick={acceptFull}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
