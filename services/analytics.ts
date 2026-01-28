
import { TrackingConfig } from '../types';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    gtag: any;
    dataLayer: any[];
  }
}

// Track seen scripts to avoid duplicate injections
const injectedScripts = new Set<string>();

export const initAnalytics = (config: TrackingConfig) => {
  if (!config) return;

  // Facebook Pixel
  if (config.facebookPixelId && window.fbq) {
    if (!injectedScripts.has('fb-pixel')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
      injectedScripts.add('fb-pixel');
    }

    window.fbq('init', config.facebookPixelId);
    window.fbq('track', 'PageView');
  }

  // Google Analytics 4
  if (config.googleAnalyticsId && window.gtag) {
    if (!injectedScripts.has('ga4')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`;
      document.head.appendChild(script);
      injectedScripts.add('ga4');
    }

    window.gtag('config', config.googleAnalyticsId);
  }
};

export const trackEvent = (eventName: string, params?: any) => {
  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};
