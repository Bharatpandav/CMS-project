const STATUS_LABELS = {
    submitted: 'Submitted',
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    rejected: 'Rejected',
    resolved: 'Resolved',
    escalated: 'Escalated',
    reopened: 'Reopened'
};

const PRIORITY_LABELS = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
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

export function PriorityBadge({ priority }) {
    const key = (priority || 'medium').toLowerCase();
    const safeKey = PRIORITY_LABELS[key] ? key : 'medium';

    return (
        <span className={`badge badge--priority badge--priority-${safeKey}`}>
            {PRIORITY_LABELS[safeKey]}
        </span>
    );
}
