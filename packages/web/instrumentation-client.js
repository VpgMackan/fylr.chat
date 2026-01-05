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

    opt_out_capturing_by_default: false,
    respect_dnt: true,

    bootstrap: {},
  });
} else if (isTest) {
  posthog.opt_out_capturing();
}

export default posthog;
