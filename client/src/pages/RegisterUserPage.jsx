import { useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { notifyDashboardUserStatsChanged } from '../utils/dashboardSync.js';
import { rolesActorMayAssign } from '../utils/allowedRoles.js';

const ROLE_LABELS = {
    student: 'Student',
    advisor: 'Advisor',
    hod: 'HOD',
    dean: 'Dean',
    super_admin: 'Vice Chancellor'
};

const DEFAULT_ROLES = ['student', 'advisor', 'hod', 'dean'];

export function RegisterUserPage() {
    const { user } = useAuth();
    const isHod = user?.role === 'hod';
    const hodDepartment = (user?.department || '').trim();

    const roleOptions = useMemo(() => {
        const allowed = rolesActorMayAssign(user?.role);
        return allowed.length ? allowed : DEFAULT_ROLES;
    }, [user?.role]);

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

    useEffect(() => {
        document.title = 'Register User | SBSSU CMS';
    }, []);

    useEffect(() => {
        if (!roleOptions.includes(form.role)) {
            setForm((f) => ({ ...f, role: roleOptions[0] || 'student' }));
        }
    }, [form.role, roleOptions]);

    useEffect(() => {
        if (isHod && hodDepartment) {
            setForm((f) => ({ ...f, department: hodDepartment }));
        }
    }, [isHod, hodDepartment]);

    const homePath =
        user?.role === 'hod'
            ? '/hod/dashboard'
            : user?.role === 'dean'
              ? '/dean/dashboard'
              : user?.role === 'super_admin'
                ? '/vc/dashboard'
                : '/app/dashboard';

    const update = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (isHod && !hodDepartment) {
            setError(
                'Your account has no department assigned. Contact the administrator before registering users.'
            );
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                rollNumber: form.rollNumber.trim() || undefined,
                semester: form.semester
                    ? Number(form.semester)
                    : undefined,
                section: form.section.trim() || undefined
            };

            if (isHod) {
                payload.department = hodDepartment;
            } else if (form.department.trim()) {
                payload.department = form.department.trim();
            }

            const data = await usersApi.create(payload);
            setResult(data);
            notifyDashboardUserStatsChanged();
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-stack">
            <PageHeader
                title="Register User"
                description={
                    isHod
                        ? 'Register students or advisors for your department only.'
                        : 'Create a single user account with generated credentials.'
                }
                breadcrumbs={[
                    { to: homePath, label: 'Dashboard' },
                    { label: 'Register User' }
                ]}
            />

            {isHod && !hodDepartment ? (
                <p className="form-error" role="alert">
                    Your HOD account does not have a department assigned. You
                    cannot register users until an administrator configures your
                    department.
                </p>
            ) : null}

            <form className="form-card" onSubmit={handleSubmit}>
                {error ? (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
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
                            {roleOptions.map((r) => (
                                <option key={r} value={r}>
                                    {ROLE_LABELS[r] || r}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Department
                        {isHod ? (
                            <>
                                <input
                                    value={form.department}
                                    readOnly
                                    disabled
                                    aria-describedby="dept-hod-hint"
                                />
                                <span
                                    id="dept-hod-hint"
                                    className="field-hint"
                                >
                                    Automatically assigned to your department
                                    and cannot be changed.
                                </span>
                            </>
                        ) : (
                            <input
                                value={form.department}
                                onChange={update('department')}
                            />
                        )}
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
                <button
                    type="submit"
                    disabled={
                        loading || (isHod && !hodDepartment)
                    }
                >
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
                        Share credentials securely. The user must change their
                        password on first login.
                    </p>
                </div>
            ) : null}
        </div>
    );
}