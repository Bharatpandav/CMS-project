import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({
    open,
    onClose,
    titleId,
    descId,
    ariaLabel,
    children,
    className = '',
    showClose = true,
    closeLabel = 'Close dialog',
    initialFocusRef
}) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusTarget = initialFocusRef?.current;
        if (focusTarget) {
            focusTarget.focus();
        } else {
            panelRef.current?.focus();
        }

        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [open, onClose, initialFocusRef]);

    if (!open) return null;

    return (
        <div
            className="ui-dialog-backdrop"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                className={`ui-dialog ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                aria-label={ariaLabel}
                onClick={(e) => e.stopPropagation()}
            >
                {showClose ? (
                    <button
                        type="button"
                        className="ui-dialog__close"
                        onClick={onClose}
                        aria-label={closeLabel}
                    >
                        <X size={18} strokeWidth={1.75} aria-hidden />
                    </button>
                ) : null}
                {children}
            </div>
        </div>
    );
}
