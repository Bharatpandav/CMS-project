import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { complaintsApi } from '../api/client.js';

export function ComplainantContactPanel({ complaintId, canReveal }) {
    const [visible, setVisible] = useState(false);
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!canReveal) {
        return null;
    }

    const toggle = async () => {
        if (visible) {
            setVisible(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const data = await complaintsApi.getContact(complaintId);
            setContact(data.contact);
            setVisible(true);
        } catch (err) {
            setError(err.message || 'Unable to load contact details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <article className="panel complainant-contact">
            <div className="complainant-contact__head">
                <h2>Complainant contact</h2>
                <button
                    type="button"
                    className="icon-btn"
                    onClick={toggle}
                    disabled={loading}
                    aria-label={
                        visible
                            ? 'Hide complainant contact'
                            : 'Reveal complainant contact'
                    }
                >
                    {visible ? (
                        <EyeOff size={18} aria-hidden />
                    ) : (
                        <Eye size={18} aria-hidden />
                    )}
                </button>
            </div>
            {error ? (
                <p className="form-error" role="alert">{error}</p>
            ) : null}
            {visible && contact ? (
                <dl className="detail-grid">
                    <div>
                        <dt>Name</dt>
                        <dd>{contact.name || '—'}</dd>
                    </div>
                    <div>
                        <dt>Email</dt>
                        <dd>{contact.email || '—'}</dd>
                    </div>
                    <div>
                        <dt>Phone</dt>
                        <dd>{contact.phone || '—'}</dd>
                    </div>
                    <div>
                        <dt>URN / Roll</dt>
                        <dd>{contact.rollNumber || '—'}</dd>
                    </div>
                </dl>
            ) : (
                <p className="empty-state__sub">
                    Contact details are hidden. Use the eye icon to reveal them
                    when authorized.
                </p>
            )}
        </article>
    );
}
