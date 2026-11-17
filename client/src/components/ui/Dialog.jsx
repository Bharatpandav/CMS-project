import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** @type {Array<{ onClose: () => void }>} */
const openModalLayers = [];

function lockBodyScroll() {
    if (openModalLayers.length === 1) {
        document.body.style.overflow = 'hidden';
    }
}

function unlockBodyScrollIfIdle() {
    if (openModalLayers.length === 0) {
        document.body.style.overflow = '';
    }
}

function onDocumentEscape(event) {
    if (event.key !== 'Escape' || openModalLayers.length === 0) return;
    const top = openModalLayers[openModalLayers.length - 1];
    event.preventDefault();
    event.stopPropagation();
    top.onClose();
}

let escapeListenerAttached = false;

function ensureEscapeListener() {
    if (escapeListenerAttached) return;
    document.addEventListener('keydown', onDocumentEscape);
    escapeListenerAttached = true;
}

function teardownEscapeListenerIfIdle() {
    if (openModalLayers.length === 0 && escapeListenerAttached) {
        document.removeEventListener('keydown', onDocumentEscape);
        escapeListenerAttached = false;
    }
}

export function Dialog({
    open,
    onClose,
    titleId,
    descId,
    ariaLabel,
    children,
    className = '',
    backdropClassName = '',
    showClose = true,
    closeLabel = 'Close dialog',
    initialFocusRef
}) {
    const panelRef = useRef(null);
    const wasOpenRef = useRef(false);
    const layerRef = useRef(null);

    useEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return undefined;
        }

        const layer = { onClose };
        layerRef.current = layer;
        openModalLayers.push(layer);
        lockBodyScroll();
        ensureEscapeListener();

        if (!wasOpenRef.current) {
            const focusTarget = initialFocusRef?.current;
            if (focusTarget) {
                focusTarget.focus();
            } else {
                panelRef.current?.focus();
            }
            wasOpenRef.current = true;
        }

        return () => {
            const idx = openModalLayers.indexOf(layer);
            if (idx >= 0) {
                openModalLayers.splice(idx, 1);
            }
            layerRef.current = null;
            unlockBodyScrollIfIdle();
            teardownEscapeListenerIfIdle();
        };
    }, [open, onClose, initialFocusRef]);

    if (!open) return null;

    return createPortal(
        <div
            className={`ui-dialog-backdrop ${backdropClassName}`.trim()}
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
        </div>,
        document.body
    );
}