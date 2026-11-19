import { useEffect } from 'react';

/**
 * Warn when closing or refreshing the tab with a dirty form.
 * (In-app route changes need a data router for useBlocker; tab close is covered here.)
 */
export function useUnsavedChangesPrompt(when) {
    useEffect(() => {
        if (!when) return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [when]);
}
