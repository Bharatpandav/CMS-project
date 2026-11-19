import { useId } from 'react';
import { Dialog } from './ui/Dialog.jsx';

export function StaffComplaintActionModal({
    open,
    onClose,
    busy = false,
    title,
    description,
    error = '',
    children,
    confirmLabel,
    onConfirm,
    confirmDisabled = false,
    confirmTone = 'primary'
}) {
    const titleId = useId();
    const descId = useId();

    const handleClose = () => {
        if (busy) return;
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            titleId={titleId}
            descId={descId}
            className="staff-action-modal"
            backdropClassName="staff-action-modal-backdrop"
            closeLabel="Close action dialog"
        >
            <header className="staff-action-modal__header">
                <h2 id={titleId}>{title}</h2>
                {description ? (
                    <p id={descId}>{description}</p>
                ) : null}
            </header>

            {error ? (
                <p className="form-error staff-action-modal__error" role="alert">
                    {error}
                </p>
            ) : null}

            <div className="staff-action-modal__body">{children}</div>

            <footer className="staff-action-modal__footer">
                <button
                    type="button"
                    className="staff-actions__btn staff-actions__btn--secondary"
                    onClick={handleClose}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={`staff-actions__btn staff-actions__btn--${confirmTone}`}
                    onClick={onConfirm}
                    disabled={busy || confirmDisabled}
                >
                    {busy ? 'Please wait…' : confirmLabel}
                </button>
            </footer>
        </Dialog>
    );
}