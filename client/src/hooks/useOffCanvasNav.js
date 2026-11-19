import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Body scroll lock, Escape to close, and auto-close on route change.
 */
export function useOffCanvasNav(open, setOpen) {
    const location = useLocation();

    useEffect(() => {
        setOpen(false);
    }, [location.pathname, setOpen]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, setOpen]);
}
