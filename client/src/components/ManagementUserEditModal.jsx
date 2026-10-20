import { useEffect, useState } from 'react';
import { managementApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { rolesActorMayAssign } from '../utils/allowedRoles.js';

const ALL_ROLES = ['student', 'advisor', 'hod', 'dean', 'super_admin'];

export function ManagementUserEditModal({ userId, open, onClose, onSaved }) {
    const { user: actor } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);

    const assignable = rolesActorMayAssign(actor?.role);
    const isSelf = actor?.id === userId || actor?._id === userId;

    useEffect(() => {
        if (!open || !userId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = await managementApi.getUser(userId);
                if (!cancelled) {
                    setForm({
                        name: data.user.name || '',
                        email: data.user.email || '',
                        role: data.user.role,
                        department: data.user.department || '',
                        rollNumber: data.user.rollNumber || '',
                        semester: data.user.semester ?? '',
                        section: data.user.section || ''
                    });
                }
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load user');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, userId]);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                department: form.department.trim(),
                rollNumber: form.rollNumber.trim(),
                section: form.section.trim()
            };
            if (!isSelf) {
                payload.role = form.role;
            }
            if (form.role === 'student' && form.semester !== '') {
                payload.semester = Number(form.semester);
            }
            const data = await managementApi.updateUser(userId, payload);
            onSaved?.(data.user);
            onClose();
        } catch (err) {
            setError(err.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const roleOptions = ALL_ROLES.filter(
        (r) =>
            assignable.includes(r) ||
            (form && r === form.role)
    );

    return (
        <div className="modal-backdrop" onClick={onClose} role="presentation">
            <div
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-user-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="modal-panel__close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                <h2 id="edit-user-title">Edit user</h2>
                {loading ? <p>Loading…</p> : null}
                {error ? <p className="form-error">{error}</p> : null}
                {form && !loading ? (
                    <form className="form-grid" onSubmit={handleSubmit}>
                        <label>
                            Full name
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        name: e.target.value
                                    }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Email
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        email: e.target.value
                                    }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Role
                            <select
                                value={form.role}
                                disabled={isSelf}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        role: e.target.value
                                    }))
                                }
                            >
                                {roleOptions.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            URN / Employee ID
                            <input
                                value={form.rollNumber}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        rollNumber: e.target.value
                                    }))
                                }
                            />
                        </label>
                        <label>
                            Department
                            <input
                                value={form.department}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        department: e.target.value
                                    }))
                                }
                            />
                        </label>
                        {form.role === 'student' ? (
                            <>
                                <label>
                                    Semester
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={form.semester}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                semester: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                                <label>
                                    Section
                                    <input
                                        value={form.section}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                section: e.target.value
                                            }))
                                        }
                                    />
                                </label>
                            </>
                        ) : null}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn--outline"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                ) : null}
            </div>
        </div>
    );
}
