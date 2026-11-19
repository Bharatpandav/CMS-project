import { getAuthToken } from '../api/client.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const hubs = new Map();

export function subscribeNotificationStream(onEvent, enabled = true) {
    if (!enabled) return () => {};

    const token = getAuthToken();
    if (!token) return () => {};

    const url = `${API_BASE}/api/user/notifications/stream?token=${encodeURIComponent(token)}`;
    let hub = hubs.get(url);

    if (!hub) {
        const source = new EventSource(url, { withCredentials: true });
        hub = { source, listeners: new Set() };
        source.addEventListener('notification', () => {
            hub.listeners.forEach((fn) => {
                try {
                    fn();
                } catch {
                    /* noop */
                }
            });
        });
        hubs.set(url, hub);
    }

    hub.listeners.add(onEvent);

    return () => {
        hub.listeners.delete(onEvent);
        if (hub.listeners.size === 0) {
            hub.source.close();
            hubs.delete(url);
        }
    };
}