import { io } from 'socket.io-client';

// Keep socket instance on window to survive HMR/module reloads in dev.
const globalObj = typeof window !== 'undefined' ? window : globalThis;
globalObj.__APP_SOCKET__ = globalObj.__APP_SOCKET__ || { socket: null };
let socket = globalObj.__APP_SOCKET__.socket || null;

// Prefer explicit backend URL via VITE_API_URL. If not present, build using
// window.location.hostname and VITE_API_PORT (fallback 3002).
const resolveBackendUrl = () => {
  try {
    const env = import.meta && import.meta.env ? import.meta.env : {};
    const envUrl = env.VITE_API_URL || null;
    if (envUrl && String(envUrl).trim()) {
      // If developer provided a URL that includes the API path (e.g. /api or /api/v1),
      // strip that path so socket.io connects to the server root.
      return String(envUrl).replace(/\/$/, '').replace(/\/api(\/v1)?$/i, '');
    }

    const backendPort = env.VITE_API_PORT || '3002';
    const proto = window.location.protocol; // e.g. 'http:'
    const host = window.location.hostname;
    const url = `${proto}//${host}:${backendPort}`;
    console.debug('[socket] resolved backend url ->', url);
    return url;
  } catch (e) {
    console.warn('[socket] resolveBackendUrl failed', e);
    return '/';
  }
};

export const initSocket = (token) => {
  try {
    const url = resolveBackendUrl() || '/';
    // If we already have an active, connected socket, reuse it.
    if (socket && socket.connected) {
      // update auth token if provided
      if (token) socket.auth = { token };
      return socket;
    }

    // If a socket exists but is not connected, attempt to disconnect/cleanup before creating a new one
    try { if (socket) { socket.off(); socket.disconnect(); } } catch (e) {}

    // By default allow both polling and websocket so the client can upgrade when possible.
    // If you want to force polling-only, set `VITE_FORCE_POLLING=true` in your env.
    const forcePollingFlag = import.meta && import.meta.env ? String(import.meta.env.VITE_FORCE_POLLING || '').toLowerCase() : '';
    const forcePolling = forcePollingFlag === 'true';
    const transports = forcePolling ? ['polling'] : ['polling', 'websocket'];

    console.debug('[socket] attempting connect', { url, transports, forcePolling });

    socket = io(url, {
      path: '/socket.io',
      auth: { token },
      // allow polling fallback — some environments block websockets
      transports,
      timeout: 20000,
      withCredentials: true,
      // reconnection/backoff tuned to avoid reconnect storms in flaky networks or HMR
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    // persist socket reference across HMR
    globalObj.__APP_SOCKET__.socket = socket;

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error', err?.message || err);
      try {
        console.debug('[socket] transport state', {
          connected: socket.connected,
          id: socket.id,
          transport: socket?.io?.engine?.transport?.name,
          handshake: socket?.io?.engine?.transport && socket.io.engine.transport.query
        });
      } catch (e) {}
    });
    socket.on('connect', () => {
      console.debug('[socket] connected', socket.id, 'transport=', socket?.io?.engine?.transport?.name);
      try {
        // monitor engine-level packets for debugging upgrade issues
        const engine = socket.io && socket.io.engine;
        if (engine && !engine.__debug_attached) {
          engine.__debug_attached = true;
          engine.on('packet', (pkt) => {
            // only log higher-level events to avoid noisy output
            if (pkt && pkt.type && ['open','ping','pong','message','upgrade'].includes(String(pkt.type))) {
              console.debug('[socket][engine] packet', pkt && (pkt.type || pkt));
            }
          });
        }
      } catch (e) {}
    });
    socket.on('reconnect_attempt', (n) => console.debug('[socket] reconnect attempt', n));
    socket.on('reconnect_failed', () => console.warn('[socket] reconnect failed'));
    socket.on('reconnect_error', (err) => console.warn('[socket] reconnect error', err));
    socket.on('reconnect_attempt', (n) => console.debug('[socket] reconnect attempt', n));
    socket.on('disconnect', (reason) => console.debug('[socket] disconnected', reason));

    return socket;
  } catch (e) {
    console.warn('Socket init failed', e?.message || e);
    return null;
  }
};

const api = {
  initSocket,
  on: (ev, cb) => { try { return socket && socket.on(ev, cb); } catch (e) { return null; } },
  off: (ev, cb) => { try { return socket && socket.off(ev, cb); } catch (e) { return null; } },
  emit: (ev, payload) => { try { return socket && socket.emit(ev, payload); } catch (e) { return null; } },
  disconnect: () => {
    try {
      if (socket) {
        socket.off();
        socket.disconnect();
      }
      globalObj.__APP_SOCKET__.socket = null;
      socket = null;
    } catch (e) { console.debug('socket disconnect failed', e); }
  },
  connected: () => !!(socket && socket.connected)
};

export default api;


