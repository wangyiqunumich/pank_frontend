const DEV_GA4_MEASUREMENT_ID = 'G-BEWL9F8CW7';

export const initializeGtag = ({
  stage = process.env.REACT_APP_API_GATEWAY_STAGE_NAME,
} = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // The existing API stage identifies the site, independently of NODE_ENV:
  // a deployed development site also uses an optimized production build.
  if (typeof stage !== 'string' || stage.trim().toLowerCase() !== 'development') return;
  if (document.getElementById('pankgraph-ga4')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', DEV_GA4_MEASUREMENT_ID);

  const script = document.createElement('script');
  script.id = 'pankgraph-ga4';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${DEV_GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

const getPathname = () => {
  if (typeof window === 'undefined') return '';
  return window.location?.pathname || '';
};

export const trackGtagEvent = (eventName, params = {}) => {
  if (!eventName || typeof window === 'undefined') return;

  const payload = {
    page_path: getPathname(),
    ...params,
  };

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, payload);
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...payload,
    });
  }
};
