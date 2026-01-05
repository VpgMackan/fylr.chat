'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getTrackingConsent,
  setTrackingConsent,
  TRACKING_CONSENT,
  type TrackingConsent,
} from '../../instrumentation-client';

interface UseTrackingConsentOptions {
  /**
   * Callback to re-identify the user when switching to full tracking.
   * This should call identifyUser() with the current user's details.
   */
  onFullTrackingEnabled?: () => void;
}

export function useTrackingConsent(options?: UseTrackingConsentOptions) {
  const [consent, setConsent] = useState<TrackingConsent>(
    TRACKING_CONSENT.NONE,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setConsent(getTrackingConsent());
    setIsLoaded(true);
  }, []);

  const updateConsent = useCallback(
    (newConsent: TrackingConsent) => {
      const previousConsent = consent;
      setTrackingConsent(newConsent);
      setConsent(newConsent);

      // If switching to full tracking, trigger re-identification
      if (
        newConsent === TRACKING_CONSENT.FULL &&
        previousConsent !== TRACKING_CONSENT.FULL &&
        options?.onFullTrackingEnabled
      ) {
        options.onFullTrackingEnabled();
      }
    },
    [consent, options],
  );

  const acceptFull = useCallback(() => {
    updateConsent(TRACKING_CONSENT.FULL);
  }, [updateConsent]);

  const acceptAnonymous = useCallback(() => {
    updateConsent(TRACKING_CONSENT.ANONYMOUS);
  }, [updateConsent]);

  const decline = useCallback(() => {
    updateConsent(TRACKING_CONSENT.NONE);
  }, [updateConsent]);

  return {
    consent,
    isLoaded,
    hasConsented: consent !== TRACKING_CONSENT.NONE,
    isAnonymous: consent === TRACKING_CONSENT.ANONYMOUS,
    isFull: consent === TRACKING_CONSENT.FULL,
    acceptFull,
    acceptAnonymous,
    decline,
    updateConsent,
  };
}
