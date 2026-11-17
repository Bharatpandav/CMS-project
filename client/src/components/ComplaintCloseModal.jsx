import { useId } from 'react';
import { Dialog } from './ui/Dialog.jsx';

export function ComplaintCloseModal({
    open,
    onClose,
    onConfirm,
    busy = false,
    error = ''
}) {
    const titleId = useId();
    const descId = useId();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            titleId={titleId}
            descId={descId}
            className="rejection-modal"
            backdropClassName="rejection-modal-backdrop"
            disabled={busy}
        >
            <div className="rejection-modal__scroll">
                <header className="rejection-modal__header">
                    <h2 id={titleId}>Close complaint?</h2>
                    <p id={descId}>
                        Closing will complete this complaint&apos;s workflow. The
                        resolution note and attachments remain available for
                        authorized users. This cannot be undone.
                    </p>
                </header>
                {error ? (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>
            <div className="rejection-modal__actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={onClose}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="profile-btn-primary"
                    onClick={onConfirm}
                    disabled={busy}
                >
                    {busy ? 'Closing…' : 'Confirm closure'}
                </button>
            </div>
        </Dialog>
    );
}