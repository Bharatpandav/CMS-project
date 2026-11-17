import { useEffect, useRef } from 'react';
import { getAuthToken } from '../api/client.js';
import { DASHBOARD_USER_STATS_EVENT } from '../utils/dashboardSync.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Subscribes to SSE invalidation and local user-management events, then calls onInvalidate.
 */
export function useDashboardUserStatsSync(onInvalidate, enabled = true) {
    const handlerRef = useRef(onInvalidate);
    handlerRef.current = onInvalidate;

    useEffect(() => {
        if (!enabled) return undefined;

        const run = () => {
            handlerRef.current?.();
        };

        window.addEventListener(DASHBOARD_USER_STATS_EVENT, run);

        const token = getAuthToken();
        let source = null;

        if (token) {
            const url = `${API_BASE}/api/dashboard/stream?token=${encodeURIComponent(token)}`;
            source = new EventSource(url, { withCredentials: true });
            source.addEventListener('user_stats', run);
        }

        return () => {
            window.removeEventListener(DASHBOARD_USER_STATS_EVENT, run);
            if (source) {
                source.removeEventListener('user_stats', run);
                source.close();
            }
        };
    }, [enabled]);
}