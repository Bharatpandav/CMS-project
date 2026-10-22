import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
    buildListReturnState,
    resolveComplaintsListPath,
    saveListUiState
} from '../utils/navigationPaths.js';
import { IconMoreVertical } from './icons.jsx';
import { PriorityBadge, StatusBadge } from './StatusBadge.jsx';
import { EmptyState } from './ui/index.js';

function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function shortId(id) {
    if (!id) return '—';
    const str = String(id);
    return str.length > 8 ? `#${str.slice(-8).toUpperCase()}` : `#${str}`;
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
    const [openMenu, setOpenMenu] = useState(null);
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
                        <th>Priority</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {complaints.map((row) => (
                        <tr key={row._id}>
                            <td className="mono">{shortId(row._id)}</td>
                            <td className="title-cell" title={row.title}>
                                {row.title}
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
                            <td>
                                <PriorityBadge priority={row.priority} />
                            </td>
                            <td className="action-cell">
                                <div className="row-menu">
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        aria-label="Actions"
                                        onClick={() =>
                                            setOpenMenu(
                                                openMenu === row._id
                                                    ? null
                                                    : row._id
                                            )
                                        }
                                    >
                                        <IconMoreVertical />
                                    </button>
                                    {openMenu === row._id ? (
                                        <div className="row-menu__dropdown">
                                            <Link
                                                to={`${complaintDetailBase}/${row._id}`}
                                                state={listReturn}
                                                onClick={() => {
                                                    setOpenMenu(null);
                                                    persistListUi();
                                                }}
                                            >
                                                View details
                                            </Link>
                                        </div>
                                    ) : null}
                                </div>
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
