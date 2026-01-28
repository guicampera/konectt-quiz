
import { TrackingConfig } from '../types';

declare global {
  interface Window {
    fbq: any;
    gtag: any;
    dataLayer: any[];
  }
}

export const initAnalytics = (config: TrackingConfig) => {
  if (!config) return;

  // Facebook Pixel
  if (config.facebookPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ?
        n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s)
    }(window, document, 'script',
      'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', config.facebookPixelId);
    window.fbq('track', 'PageView');
  }

  // Google Analytics 4
  if (config.googleAnalyticsId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) { window.dataLayer.push(args); }
    window.gtag = gtag;
    window.gtag('js', new Date());
    window.gtag('config', config.googleAnalyticsId);
  }
};

export const trackEvent = (eventName: string, params?: any) => {
  if (window.fbq) {
    window.fbq('track', eventName, params);
  }
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};
