import { useEffect, useRef } from 'react';
import { getAuthToken } from '../api/client.js';
import { COMPLAINTS_DATA_EVENT } from '../utils/complaintSync.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Subscribes to SSE notification invalidation and local complaint events, then calls onInvalidate.
 */
export function useComplaintsDataSync(onInvalidate, enabled = true) {
    const handlerRef = useRef(onInvalidate);
    handlerRef.current = onInvalidate;

    useEffect(() => {
        if (!enabled) return undefined;

        const run = () => {
            handlerRef.current?.();
        };

        window.addEventListener(COMPLAINTS_DATA_EVENT, run);

        const token = getAuthToken();
        let source = null;

        if (token) {
            const url = `${API_BASE}/api/user/notifications/stream?token=${encodeURIComponent(token)}`;
            source = new EventSource(url, { withCredentials: true });
            source.addEventListener('notification', run);
        }

        return () => {
            window.removeEventListener(COMPLAINTS_DATA_EVENT, run);
            if (source) {
                source.removeEventListener('notification', run);
                source.close();
            }
        };
    }, [enabled]);
}