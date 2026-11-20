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
    const isAdvisor = user?.role === 'advisor';
    const isDeptLocked = isHod;
    const lockedDepartment = (user?.department || '').trim();

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
        section: '',
        dateOfBirth: ''
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
        if (isDeptLocked && lockedDepartment) {
            setForm((f) => ({ ...f, department: lockedDepartment }));
        }
    }, [isDeptLocked, lockedDepartment]);

    const homePath =
        user?.role === 'hod'
            ? '/hod/dashboard'
            : user?.role === 'advisor'
              ? '/advisor/dashboard'
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

        if (isHod && !lockedDepartment) {
            setError(
                'Your account has no department assigned. Contact the administrator before registering users.'
            );
            return;
        }

        if (
            isAdvisor &&
            form.role === 'student' &&
            !form.department.trim()
        ) {
            setError('Department is required for student accounts.');
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
                section: form.section.trim() || undefined,
                dateOfBirth:
                    form.role === 'student'
                        ? undefined
                        : form.dateOfBirth.trim() || undefined
            };

            if (isHod) {
                payload.department = lockedDepartment;
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
                    isAdvisor
                        ? 'Register student accounts. Enter the student department on the form.'
                        : isHod
                          ? 'Register students or advisors for your department only.'
                          : 'Create a single user account with generated credentials.'
                }
                breadcrumbs={[
                    { to: homePath, label: 'Dashboard' },
                    { label: 'Register User' }
                ]}
            />

            {isHod && !lockedDepartment ? (
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
                        {isDeptLocked ? (
                            <>
                                <input
                                    value={form.department}
                                    readOnly
                                    disabled
                                    aria-describedby="dept-locked-hint"
                                />
                                <span
                                    id="dept-locked-hint"
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
                                required={
                                    isAdvisor && form.role === 'student'
                                }
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
                    ) : (
                        <label>
                            Date of birth
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={update('dateOfBirth')}
                                required
                                aria-describedby="dob-password-hint"
                            />
                            <span
                                id="dob-password-hint"
                                className="field-hint"
                            >
                                Initial password: first name plus birth year
                                (e.g. Arun, 1990 → Arun1990)
                            </span>
                        </label>
                    )}
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
                        Students log in with URN; staff use email. Initial
                        passwords follow university format (first name + last 4
                        URN digits, or first name + birth year). Share
                        credentials securely; the user must change password on
                        first login.
                    </p>
                </div>
            ) : null}
        </div>
    );
}