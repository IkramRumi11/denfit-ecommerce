// Simple analytics helper: pushes to dataLayer when present and optionally POSTs to an endpoint
export async function trackEvent(name: string, payload: Record<string, any> = {}) {
  try {
    // Push to dataLayer if available (Google Tag Manager / GA4)
    try {
      const dl = (window as any).dataLayer;
      if (Array.isArray(dl)) {
        dl.push({ event: name, ...payload });
      }
    } catch (e) {
      // ignore
    }

    // Optional server-side analytics endpoint - set VITE_ANALYTICS_ENDPOINT in env to enable
    const endpoint = (import.meta as any).env?.VITE_ANALYTICS_ENDPOINT;
    if (endpoint) {
      // fire-and-forget
      fetch(endpoint.replace(/\/$/, '') + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: name, payload, ts: Date.now() }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // never throw from analytics
    console.debug('trackEvent failed', err);
  }
}

export default trackEvent;
