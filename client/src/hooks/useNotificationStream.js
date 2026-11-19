import { useEffect, useRef } from 'react';
import { getAuthToken } from '../api/client.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Subscribes to SSE notification invalidation and calls onInvalidate.
 */
export function useNotificationStream(onInvalidate, enabled = true) {
    const handlerRef = useRef(onInvalidate);
    handlerRef.current = onInvalidate;

    useEffect(() => {
        if (!enabled) return undefined;

        const run = () => {
            handlerRef.current?.();
        };

        const token = getAuthToken();
        let source = null;

        if (token) {
            const url = `${API_BASE}/api/user/notifications/stream?token=${encodeURIComponent(token)}`;
            source = new EventSource(url, { withCredentials: true });
            source.addEventListener('notification', run);
        }

        return () => {
            if (source) {
                source.removeEventListener('notification', run);
                source.close();
            }
        };
    }, [enabled]);
}