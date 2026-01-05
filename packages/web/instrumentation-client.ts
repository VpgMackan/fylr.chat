import posthog from 'posthog-js';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

if (process.env.NEXT_PUBLIC_POSTHOG_KEY && !isTest) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',

    loaded: (posthog) => {
      if (isDevelopment) {
        posthog.debug();
      }
    },

    autocapture: isProduction,
    capture_pageview: false,
    capture_pageleave: isProduction,

    disable_session_recording: !isProduction,

    persistence: 'localStorage+cookie',
    cross_subdomain_cookie: isProduction,

    request_batching: true,

    opt_out_capturing_by_default: true,
    respect_dnt: true,

    bootstrap: {},
  });
} else if (isTest) {
  posthog.opt_out_capturing();
}

export const TRACKING_CONSENT = {
  NONE: 'none',
  ANONYMOUS: 'anonymous',
  FULL: 'full',
} as const;

export type TrackingConsent =
  (typeof TRACKING_CONSENT)[keyof typeof TRACKING_CONSENT];

const CONSENT_KEY = 'posthog_tracking_consent';

export function getTrackingConsent(): TrackingConsent {
  if (typeof window === 'undefined') return TRACKING_CONSENT.NONE;
  return (
    (localStorage.getItem(CONSENT_KEY) as TrackingConsent) ||
    TRACKING_CONSENT.NONE
  );
}

export function setTrackingConsent(consent: TrackingConsent): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CONSENT_KEY, consent);

  switch (consent) {
    case TRACKING_CONSENT.FULL:
      posthog.opt_in_capturing();
      // Re-enable person processing
      posthog.unregister('$process_person_profile');
      break;

    case TRACKING_CONSENT.ANONYMOUS:
      posthog.opt_in_capturing();
      posthog.reset();
      posthog.register({ $process_person_profile: false });
      break;

    case TRACKING_CONSENT.NONE:
    default:
      posthog.opt_out_capturing();
      break;
  }
}

export function initializeTrackingConsent(): void {
  const storedConsent = getTrackingConsent();
  if (storedConsent !== TRACKING_CONSENT.NONE) {
    setTrackingConsent(storedConsent);
  }
}

// User identification for full tracking mode
export interface UserProperties {
  email?: string;
  name?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Identify a user for tracking. Only works if user has consented to FULL tracking.
 * Call this when the user logs in.
 */
export function identifyUser(
  userId: string,
  properties?: UserProperties,
): void {
  const consent = getTrackingConsent();

  // Only identify if user has opted into full tracking
  if (consent !== TRACKING_CONSENT.FULL) {
    return;
  }

  posthog.identify(userId, properties);
}

/**
 * Update properties for the currently identified user.
 * Only works if user has consented to FULL tracking.
 */
export function setUserProperties(properties: UserProperties): void {
  const consent = getTrackingConsent();

  if (consent !== TRACKING_CONSENT.FULL) {
    return;
  }

  posthog.people.set(properties);
}

/**
 * Reset user identity (call on logout).
 * This ensures the next user won't be associated with the previous user's data.
 */
export function resetUser(): void {
  posthog.reset();
}

/**
 * Capture a custom event. Respects user consent settings.
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  const consent = getTrackingConsent();

  if (consent === TRACKING_CONSENT.NONE) {
    return;
  }

  posthog.capture(eventName, properties);
}

export default posthog;
