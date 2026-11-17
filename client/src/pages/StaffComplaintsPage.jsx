import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    useLocation,
    useOutletContext,
    useSearchParams
} from 'react-router-dom';
import { PageHeader } from '../components/PageHeader.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { useListUiRestore } from '../hooks/useListUiRestore.js';
import { saveListUiState } from '../utils/navigationPaths.js';
import {
    HOD_COMPLAINT_FILTER_OPTIONS,
    hodComplaintFilterLabel
} from '../utils/hodComplaintBuckets.js';

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
];

export function StaffComplaintsPage() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const listStateKey = location.pathname;
    const isHodComplaints = location.pathname.startsWith('/hod/complaints');
    const isVcComplaints = location.pathname.startsWith('/vc/complaints');
    const isDeanComplaints = location.pathname.startsWith('/dean/complaints');
    const usesDashboardBuckets =
        isHodComplaints || isVcComplaints || isDeanComplaints;

    const dashboardTo = location.pathname.startsWith('/hod')
        ? '/hod/dashboard'
        : location.pathname.startsWith('/dean')
          ? '/dean/dashboard'
          : location.pathname.startsWith('/vc')
            ? '/vc/dashboard'
          : location.pathname.startsWith('/management')
            ? '/management/dashboard'
            : '/app/dashboard';
    const { search = '' } = useOutletContext() || {};

    const statusFromUrl = usesDashboardBuckets
        ? searchParams.get('status') || ''
        : '';

    const [statusFilter, setStatusFilter] = useState(
        usesDashboardBuckets ? statusFromUrl : ''
    );

    useEffect(() => {
        if (!usesDashboardBuckets) return;
        setStatusFilter(statusFromUrl);
    }, [usesDashboardBuckets, statusFromUrl]);

    const restoreListUi = useCallback(
        (saved) => {
            if (usesDashboardBuckets) return;
            if (saved.statusFilter !== undefined) {
                setStatusFilter(saved.statusFilter);
            }
        },
        [usesDashboardBuckets]
    );

    useListUiRestore(listStateKey, { onRestore: restoreListUi });

    useEffect(() => {
        saveListUiState(listStateKey, {
            statusFilter: usesDashboardBuckets ? statusFromUrl : statusFilter,
            scrollY: window.scrollY
        });
    }, [listStateKey, statusFilter, statusFromUrl, usesDashboardBuckets]);

    const handleStatusChange = (next) => {
        setStatusFilter(next);
        if (usesDashboardBuckets) {
            if (next) {
                setSearchParams({ status: next }, { replace: false });
            } else {
                setSearchParams({}, { replace: false });
            }
        }
    };

    const { complaints, loading, error, reload } = useComplaintsData({
        limit: 100,
        status: statusFilter || undefined
    });

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return complaints;
        return complaints.filter(
            (c) =>
                c.title?.toLowerCase().includes(q) ||
                c.department?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                String(c._id).toLowerCase().includes(q) ||
                c.publicId?.toLowerCase().includes(q)
        );
    }, [complaints, search]);

    const filterOptions = usesDashboardBuckets
        ? HOD_COMPLAINT_FILTER_OPTIONS
        : STATUS_OPTIONS;

    const activeFilterLabel = usesDashboardBuckets
        ? hodComplaintFilterLabel(statusFilter)
        : null;

    return (
        <div className="page-stack">
            <PageHeader
                breadcrumbs={[
                    { to: dashboardTo, label: 'Dashboard' },
                    { label: 'Complaints' }
                ]}
                title="Complaints"
                description={
                    usesDashboardBuckets
                        ? 'Complaints filtered by dashboard categories.'
                        : 'Complaints you are authorized to view and manage.'
                }
            />

            <div className="staff-filters">
                <label>
                    {usesDashboardBuckets ? 'Category' : 'Status'}
                    <select
                        value={statusFilter}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        aria-label={
                            usesDashboardBuckets
                                ? 'Complaint category filter'
                                : 'Complaint status filter'
                        }
                    >
                        {filterOptions.map((o) => (
                            <option key={o.value || 'all'} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
                {usesDashboardBuckets ? (
                    <p
                        className="staff-filter-summary"
                        aria-live="polite"
                    >
                        Showing: <strong>{activeFilterLabel}</strong>
                        {!loading && !error ? (
                            <span> ({filtered.length} complaint
                                {filtered.length === 1 ? '' : 's'})</span>
                        ) : null}
                    </p>
                ) : null}
            </div>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>
                        Retry
                    </button>
                </div>
            ) : null}

            <article className="panel panel--table">
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={filtered}
                        showViewAll={false}
                        listStateKey={listStateKey}
                        onBeforeDetailNavigate={() => ({
                            statusFilter: usesDashboardBuckets
                                ? statusFromUrl
                                : statusFilter
                        })}
                    />
                )}
            </article>
        </div>
    );
}