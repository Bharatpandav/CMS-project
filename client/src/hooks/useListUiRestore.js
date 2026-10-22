import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { readListUiState } from '../utils/navigationPaths.js';

/**
 * Restore scroll position when returning to a complaints (or similar) list.
 */
export function useListUiRestore(listStateKey, { onRestore } = {}) {
    const location = useLocation();
    const key = listStateKey || location.pathname;

    useEffect(() => {
        const saved = readListUiState(key);
        if (!saved) return;

        if (saved.statusFilter !== undefined && onRestore) {
            onRestore(saved);
        }

        if (typeof saved.scrollY === 'number' && saved.scrollY > 0) {
            const y = saved.scrollY;
            requestAnimationFrame(() => {
                window.scrollTo(0, y);
            });
        }
    }, [key, onRestore]);
}
