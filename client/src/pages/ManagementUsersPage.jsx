import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { managementApi } from '../api/client.js';
import { ManagementUserEditModal } from '../components/ManagementUserEditModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    downloadBlob,
    exportUsersExcel,
    exportUsersPdf,
    mapUsersForExport
} from '../utils/exportUsers.js';

const ROLE_LABELS = {
    student: 'Student',
    advisor: 'Advisor',
    hod: 'HOD',
    dean: 'Dean',
    super_admin: 'Vice Chancellor'
};

function formatRole(role) {
    return ROLE_LABELS[role] || role;
}

export function ManagementUsersPage() {
    const { user: actor } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [editId, setEditId] = useState(null);
    const [confirmStatus, setConfirmStatus] = useState(null);

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page: String(page),
                limit: '20',
                sortBy,
                sortOrder
            };
            if (search) params.search = search;
            if (role) params.role = role;
            if (department) params.department = department;
            if (status) params.status = status;

            const data = await managementApi.listUsers(params);
            setUsers(data.users || []);
            setTotal(data.total ?? 0);
            setTotalPages(data.totalPages ?? 1);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [page, search, role, department, status, sortBy, sortOrder]);

    useEffect(() => {
        load();
    }, [load]);

    const patchParams = (updates) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([k, v]) => {
            if (v === '' || v == null) next.delete(k);
            else next.set(k, String(v));
        });
        setSearchParams(next, { replace: true });
    };

    const toggleSort = (field) => {
        if (sortBy === field) {
            patchParams({
                sortOrder: sortOrder === 'asc' ? 'desc' : 'asc'
            });
        } else {
            patchParams({ sortBy: field, sortOrder: 'asc' });
        }
    };

    const handleStatusChange = async () => {
        if (!confirmStatus) return;
        try {
            await managementApi.setUserStatus(
                confirmStatus.id,
                confirmStatus.nextActive
            );
            setMessage(
                confirmStatus.nextActive
                    ? 'Account activated.'
                    : 'Account deactivated.'
            );
            setConfirmStatus(null);
            load();
        } catch (err) {
            setError(err.message || 'Status update failed');
            setConfirmStatus(null);
        }
    };

    const exportFiltered = async (format) => {
        setError('');
        try {
            const params = {};
            if (search) params.search = search;
            if (role) params.role = role;
            if (department) params.department = department;
            if (status) params.status = status;

            if (format === 'csv') {
                const blob = await managementApi.exportCsv(params);
                downloadBlob(blob, 'users-export.csv');
                return;
            }

            const data = await managementApi.listUsers({
                ...params,
                page: '1',
                limit: '500'
            });
            const rows = mapUsersForExport(data.users || []);
            if (!rows.length) {
                setError('No users to export for the current filters.');
                return;
            }
            if (format === 'xlsx') {
                await exportUsersExcel(rows);
            } else if (format === 'pdf') {
                exportUsersPdf(rows, 'University Users Export');
            }
        } catch (err) {
            setError(err.message || 'Export failed');
        }
    };

    const actorId = actor?.id || actor?._id;
    const title =
        role === 'student'
            ? 'Students'
            : role === 'staff'
              ? 'Administrators & Staff'
              : 'All Users';

    return (
        <div className="page-stack">
            <header className="page-header page-header--row">
                <div>
                    <h1>{title}</h1>
                    <p>{total} user{total === 1 ? '' : 's'} matching filters.</p>
                </div>
                <div className="page-header__actions">
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => exportFiltered('csv')}
                    >
                        CSV
                    </button>
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => exportFiltered('xlsx')}
                    >
                        Excel
                    </button>
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => exportFiltered('pdf')}
                    >
                        PDF
                    </button>
                </div>
            </header>

            {message ? (
                <p className="form-success" role="status">{message}</p>
            ) : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="filter-bar">
                <input
                    type="search"
                    placeholder="Search name, URN, email…"
                    value={search}
                    onChange={(e) =>
                        patchParams({ search: e.target.value, page: '1' })
                    }
                    aria-label="Search users"
                />
                <select
                    value={role}
                    onChange={(e) =>
                        patchParams({ role: e.target.value, page: '1' })
                    }
                    aria-label="Filter by role"
                >
                    <option value="">All roles</option>
                    <option value="student">Student</option>
                    <option value="staff">Staff (all)</option>
                    <option value="advisor">Advisor</option>
                    <option value="hod">HOD</option>
                    <option value="dean">Dean</option>
                    <option value="super_admin">Vice Chancellor</option>
                </select>
                <input
                    placeholder="Department"
                    value={department}
                    onChange={(e) =>
                        patchParams({ department: e.target.value, page: '1' })
                    }
                    aria-label="Filter by department"
                />
                <select
                    value={status}
                    onChange={(e) =>
                        patchParams({ status: e.target.value, page: '1' })
                    }
                    aria-label="Account status"
                >
                    <option value="">Any status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="panel panel--flush">
                {loading ? (
                    <p className="panel__empty">Loading users…</p>
                ) : users.length === 0 ? (
                    <p className="panel__empty">No users found.</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>
                                    <button
                                        type="button"
                                        className="th-sort"
                                        onClick={() => toggleSort('name')}
                                    >
                                        Name
                                    </button>
                                </th>
                                <th>URN / ID</th>
                                <th>
                                    <button
                                        type="button"
                                        className="th-sort"
                                        onClick={() => toggleSort('email')}
                                    >
                                        Email
                                    </button>
                                </th>
                                <th>
                                    <button
                                        type="button"
                                        className="th-sort"
                                        onClick={() => toggleSort('role')}
                                    >
                                        Role
                                    </button>
                                </th>
                                <th>
                                    <button
                                        type="button"
                                        className="th-sort"
                                        onClick={() => toggleSort('department')}
                                    >
                                        Department
                                    </button>
                                </th>
                                <th>Sem / Sec</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const id = u._id || u.id;
                                const isSelf = id === actorId;
                                return (
                                    <tr key={id}>
                                        <td>{u.name}</td>
                                        <td>{u.rollNumber || '—'}</td>
                                        <td>{u.email}</td>
                                        <td>{formatRole(u.role)}</td>
                                        <td>{u.department || '—'}</td>
                                        <td>
                                            {u.role === 'student'
                                                ? `${u.semester ?? '—'} / ${u.section || '—'}`
                                                : '—'}
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    u.isActive
                                                        ? 'badge--success'
                                                        : 'badge--muted'
                                                }`}
                                            >
                                                {u.isActive
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {u.createdAt
                                                ? new Date(
                                                      u.createdAt
                                                  ).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="table-actions">
                                            <button
                                                type="button"
                                                className="link-teal"
                                                onClick={() => setEditId(id)}
                                            >
                                                Edit
                                            </button>
                                            {!isSelf ? (
                                                <button
                                                    type="button"
                                                    className="link-danger"
                                                    onClick={() =>
                                                        setConfirmStatus({
                                                            id,
                                                            name: u.name,
                                                            nextActive:
                                                                !u.isActive
                                                        })
                                                    }
                                                >
                                                    {u.isActive
                                                        ? 'Deactivate'
                                                        : 'Activate'}
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 ? (
                <nav className="pagination" aria-label="Users pagination">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() =>
                            patchParams({ page: String(page - 1) })
                        }
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() =>
                            patchParams({ page: String(page + 1) })
                        }
                    >
                        Next
                    </button>
                </nav>
            ) : null}

            <ManagementUserEditModal
                userId={editId}
                open={Boolean(editId)}
                onClose={() => setEditId(null)}
                onSaved={() => {
                    setMessage('User updated.');
                    load();
                }}
            />

            {confirmStatus ? (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={() => setConfirmStatus(null)}
                >
                    <div
                        className="modal-panel modal-panel--sm"
                        role="alertdialog"
                        aria-labelledby="confirm-status-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="confirm-status-title">Confirm</h2>
                        <p>
                            {confirmStatus.nextActive ? 'Activate' : 'Deactivate'}{' '}
                            account for <strong>{confirmStatus.name}</strong>?
                            Complaint history is preserved; accounts are not
                            permanently deleted.
                        </p>
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn--outline"
                                onClick={() => setConfirmStatus(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleStatusChange}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
