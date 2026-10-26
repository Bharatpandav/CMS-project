import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
    buildListReturnState,
    resolveComplaintsListPath,
    saveListUiState
} from '../utils/navigationPaths.js';
import { StatusBadge } from './StatusBadge.jsx';
import { complaintSubject } from '../utils/complaintTitle.js';
import { complaintPublicId } from '../utils/complaintPublicId.js';
import { complaintAccessLabel } from '../utils/complaintAccess.js';
import { EmptyState } from './ui/index.js';

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function RecentComplaintsTable({
    complaints = [],
    showViewAll = true,
    viewAllPath = '/complaints',
    complaintDetailBase: complaintDetailBaseProp,
    listStateKey: listStateKeyProp,
    onBeforeDetailNavigate
}) {
    const { user } = useAuth();
    const location = useLocation();
    const complaintDetailBase =
        complaintDetailBaseProp ||
        resolveComplaintsListPath(user?.role, location.pathname);
    const listStateKey = listStateKeyProp || location.pathname;
    const listReturn = buildListReturnState(
        location.pathname,
        location.search
    );

    const persistListUi = () => {
        const extra =
            typeof onBeforeDetailNavigate === 'function'
                ? onBeforeDetailNavigate()
                : {};
        saveListUiState(listStateKey, {
            scrollY: window.scrollY,
            ...extra
        });
    };

    if (!complaints.length) {
        return (
            <EmptyState
                icon="clipboard-list"
                title="No complaints in your authorized scope yet"
            >
                New complaints will appear here when they are routed to your
                role.
            </EmptyState>
        );
    }

    return (
        <div className="table-scroll">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Complaint ID</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {complaints.map((row) => (
                        <tr
                            key={row._id}
                            className={
                                row.status === 'withdrawn' ? 'is-withdrawn' : undefined
                            }
                        >
                            <td className="mono">{complaintPublicId(row) || '—'}</td>
                            <td className="title-cell" title={complaintSubject(row.title)}>
                                <span className="title-cell__line">
                                    {row.status === 'withdrawn' ? (
                                        <StatusBadge status="withdrawn" />
                                    ) : null}
                                    <span className="title-cell__text">
                                        {complaintSubject(row.title)}
                                    </span>
                                </span>
                                <span className="title-cell__access">
                                    {complaintAccessLabel(row)}
                                </span>
                            </td>
                            <td>{row.department || '—'}</td>
                            <td>
                                <StatusBadge status={row.status} />
                            </td>
                            <td>
                                {row.currentLevel
                                    ? row.currentLevel.toUpperCase()
                                    : '—'}
                            </td>
                            <td>{formatDate(row.createdAt)}</td>
                            <td className="action-cell">
                                <Link
                                    className="view-details-btn cms-btn-reflect"
                                    to={`${complaintDetailBase}/${row._id}`}
                                    state={listReturn}
                                    onClick={persistListUi}
                                    aria-label={`View details for ${complaintSubject(row.title)}`}
                                >
                                    <ArrowUpRight size={16} aria-hidden />
                                    View details
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {showViewAll ? (
                <div className="table-footer">
                    <Link to={viewAllPath} className="link-teal">
                        View All
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
