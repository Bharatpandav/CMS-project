const STATUS_LABELS = {
    submitted: 'Submitted',
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    rejected: 'Rejected',
    resolved: 'Resolved',
    escalated: 'Escalated',
    reopened: 'Reopened',
    withdrawn: 'Withdrawn'
};

export function StatusBadge({ status }) {
    const key = (status || '').toLowerCase().replace(/\s+/g, '_');
    const safeKey = STATUS_LABELS[key] ? key : 'pending';
    const label = STATUS_LABELS[safeKey] || status || 'Unknown';

    return (
        <span className={`badge badge--status badge--status-${safeKey}`}>
            {label}
        </span>
    );
}
