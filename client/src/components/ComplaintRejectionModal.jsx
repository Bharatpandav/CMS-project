import { useId, useState } from 'react';
import { COMPLAINT_REJECTION_REASONS } from '../constants/complaintRejectionReasons.js';
import { Dialog } from './ui/Dialog.jsx';

export function ComplaintRejectionModal({
    open,
    onClose,
    onConfirm,
    busy = false
}) {
    const titleId = useId();
    const descId = useId();
    const [code, setCode] = useState('');
    const [otherText, setOtherText] = useState('');
    const [localError, setLocalError] = useState('');

    const reset = () => {
        setCode('');
        setOtherText('');
        setLocalError('');
    };

    const handleClose = () => {
        if (busy) return;
        reset();
        onClose();
    };

    const handleConfirm = () => {
        setLocalError('');
        if (!code) {
            setLocalError('Select a rejection reason.');
            return;
        }
        if (code === 'other' && !otherText.trim()) {
            setLocalError('Enter a short explanation for Other.');
            return;
        }
        onConfirm({
            rejectionReasonCode: code,
            rejectionReasonOther:
                code === 'other' ? otherText.trim() : otherText.trim()
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            titleId={titleId}
            descId={descId}
            className="rejection-modal"
            backdropClassName="rejection-modal-backdrop"
        >
            <div className="rejection-modal__scroll">
                <header className="rejection-modal__header">
                    <h2 id={titleId}>Reject complaint</h2>
                    <p id={descId}>
                        Choose one reason. The student will see this on the
                        complaint record.
                    </p>
                </header>

                {localError ? (
                    <p className="form-error" role="alert">
                        {localError}
                    </p>
                ) : null}

                <fieldset className="rejection-modal__options" disabled={busy}>
                    <legend className="rejection-modal__legend">
                        Rejection reason
                    </legend>
                    {COMPLAINT_REJECTION_REASONS.map((reason) => (
                        <label key={reason.code} className="rejection-option">
                            <input
                                type="radio"
                                name="rejection-reason"
                                value={reason.code}
                                checked={code === reason.code}
                                onChange={() => setCode(reason.code)}
                            />
                            <span>{reason.label}</span>
                        </label>
                    ))}
                </fieldset>

                {code === 'other' ? (
                    <label className="rejection-modal__other">
                        Explanation
                        <textarea
                            rows={3}
                            value={otherText}
                            onChange={(e) => setOtherText(e.target.value)}
                            disabled={busy}
                            placeholder="Brief explanation (required)"
                        />
                    </label>
                ) : null}
            </div>

            <div className="rejection-modal__actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleClose}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="profile-btn-primary"
                    onClick={handleConfirm}
                    disabled={busy}
                >
                    {busy ? 'Rejecting…' : 'Confirm rejection'}
                </button>
            </div>
        </Dialog>
    );
}