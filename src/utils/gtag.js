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
