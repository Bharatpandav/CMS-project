import { useState } from 'react';
import { usersApi } from '../api/client.js';

const ROLES = ['student', 'advisor', 'hod', 'dean'];

export function RegisterUserPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'student',
        department: '',
        rollNumber: '',
        semester: '',
        section: ''
    });
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                department: form.department.trim() || undefined,
                rollNumber: form.rollNumber.trim() || undefined,
                semester: form.semester
                    ? Number(form.semester)
                    : undefined,
                section: form.section.trim() || undefined
            };
            const data = await usersApi.create(payload);
            setResult(data);
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Register User</h1>
                <p>Create a single user account with generated credentials.</p>
            </header>

            <form className="form-card" onSubmit={handleSubmit}>
                {error ? (
                    <p className="form-error" role="alert">{error}</p>
                ) : null}
                <div className="form-grid">
                    <label>
                        Full name
                        <input
                            value={form.name}
                            onChange={update('name')}
                            required
                        />
                    </label>
                    <label>
                        Email
                        <input
                            type="email"
                            value={form.email}
                            onChange={update('email')}
                            required
                        />
                    </label>
                    <label>
                        Role
                        <select
                            value={form.role}
                            onChange={update('role')}
                        >
                            {ROLES.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Department
                        <input
                            value={form.department}
                            onChange={update('department')}
                        />
                    </label>
                    {form.role === 'student' ? (
                        <>
                            <label>
                                Roll number / URN
                                <input
                                    value={form.rollNumber}
                                    onChange={update('rollNumber')}
                                    required
                                />
                            </label>
                            <label>
                                Semester
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={form.semester}
                                    onChange={update('semester')}
                                />
                            </label>
                            <label>
                                Section
                                <input
                                    value={form.section}
                                    onChange={update('section')}
                                />
                            </label>
                        </>
                    ) : null}
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Creating…' : 'Create user'}
                </button>
            </form>

            {result?.temporaryPassword ? (
                <div className="result-card">
                    <h2>User created</h2>
                    <p>
                        Login ID:{' '}
                        <strong>{result.loginIdentifier}</strong>
                    </p>
                    <p>
                        Temporary password:{' '}
                        <strong>{result.temporaryPassword}</strong>
                    </p>
                    <p className="hint">
                        Share credentials securely. The user must change
                        their password on first login.
                    </p>
                </div>
            ) : null}
        </div>
    );
}
