import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../StatusBadge.jsx';

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function shortId(id) {
    if (!id) return '—';
    const str = String(id);
    return `#${str.slice(-6).toUpperCase()}`;
}

function assigneeLabel(row) {
    if (row.currentAssigneeName) return row.currentAssigneeName;
    if (row.currentLevel) {
        return String(row.currentLevel).toUpperCase();
    }
    return '—';
}

export function ManagementRecentComplaints({
    complaints = [],
    detailBase = '/management/complaints',
    viewAllPath
}) {
    if (!complaints.length) {
        return (
            <p className="mgmt-chart-empty" style={{ height: 'auto', padding: '2rem' }}>
                No recent complaints in your authorized scope.
            </p>
        );
    }

    return (
        <div className="mgmt-table-wrap">
            <table className="mgmt-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Date</th>
                        <th>Priority</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {complaints.map((row) => (
                        <tr key={row._id}>
                            <td className="mono">{shortId(row._id)}</td>
                            <td className="title-cell">
                                <Link
                                    to={`${detailBase}/${row._id}`}
                                    className="title-link"
                                    title={row.title}
                                >
                                    {row.title}
                                </Link>
                            </td>
                            <td>{row.department || '—'}</td>
                            <td>
                                <StatusBadge status={row.status} />
                            </td>
                            <td>{assigneeLabel(row)}</td>
                            <td>{formatDateTime(row.createdAt || row.Date)}</td>
                            <td>
                                <PriorityBadge priority={row.priority} />
                            </td>
                            <td>
                                <Link
                                    to={`${detailBase}/${row._id}`}
                                    className="link-teal"
                                >
                                    View
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {viewAllPath ? (
                <p style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                    <Link to={viewAllPath} className="link-teal">
                        View All
                    </Link>
                </p>
            ) : null}
        </div>
    );
}
