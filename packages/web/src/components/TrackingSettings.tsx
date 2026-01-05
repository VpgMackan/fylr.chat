'use client';

import { useTrackingConsent } from '@/hooks/useTrackingConsent';
import {
  TRACKING_CONSENT,
  identifyUser,
  type TrackingConsent,
} from '../../instrumentation-client';

interface TrackingSettingsProps {
  className?: string;
  /** Current user data for re-identification when enabling full tracking */
  user?: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
  } | null;
}

export function TrackingSettings({
  className = '',
  user,
}: TrackingSettingsProps) {
  const { consent, isLoaded, updateConsent } = useTrackingConsent({
    onFullTrackingEnabled: () => {
      // Re-identify user when they enable full tracking
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          name: user.name,
          role: user.role,
        });
      }
    },
  });

  if (!isLoaded) {
    return null;
  }

  const options: {
    value: TrackingConsent;
    label: string;
    description: string;
  }[] = [
    {
      value: TRACKING_CONSENT.NONE,
      label: 'No tracking',
      description: "We won't collect any analytics data about your usage.",
    },
    {
      value: TRACKING_CONSENT.ANONYMOUS,
      label: 'Anonymous tracking',
      description:
        "Help us improve by sharing anonymous usage data. We won't link data to your account.",
    },
    {
      value: TRACKING_CONSENT.FULL,
      label: 'Full tracking',
      description:
        'Share usage data linked to your account for a more personalized experience and better support.',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Privacy & Analytics
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose how you want to share your usage data with us.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              consent === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="tracking-consent"
              value={option.value}
              checked={consent === option.value}
              onChange={() => updateConsent(option.value)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
