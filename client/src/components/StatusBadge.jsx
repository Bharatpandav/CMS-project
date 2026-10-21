const STATUS_STYLES = {
    submitted: { bg: '#e8f4fc', color: '#0e7490', label: 'Submitted' },
    pending: { bg: '#e8f4fc', color: '#0e7490', label: 'Pending' },
    accepted: { bg: '#e0f2fe', color: '#0369a1', label: 'Accepted' },
    assigned: { bg: '#ede9fe', color: '#5b21b6', label: 'Assigned' },
    rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
    resolved: { bg: '#dcfce7', color: '#15803d', label: 'Resolved' },
    escalated: { bg: '#ffedd5', color: '#c2410c', label: 'Escalated' },
    reopened: { bg: '#f3e8ff', color: '#7e22ce', label: 'Reopened' }
};

const PRIORITY_STYLES = {
    low: { bg: '#f1f5f9', color: '#475569', label: 'Low' },
    medium: { bg: '#e0f2fe', color: '#0369a1', label: 'Medium' },
    high: { bg: '#ffedd5', color: '#c2410c', label: 'High' },
    urgent: { bg: '#fee2e2', color: '#b91c1c', label: 'Urgent' }
};

export function StatusBadge({ status }) {
    const key = (status || '').toLowerCase();
    const style = STATUS_STYLES[key] || {
        bg: '#f1f5f9',
        color: '#334155',
        label: status || 'Unknown'
    };

    return (
        <span
            className="badge"
            style={{ backgroundColor: style.bg, color: style.color }}
        >
            {style.label}
        </span>
    );
}

export function PriorityBadge({ priority }) {
    const key = (priority || 'medium').toLowerCase();
    const style = PRIORITY_STYLES[key] || PRIORITY_STYLES.medium;

    return (
        <span
            className="badge"
            style={{ backgroundColor: style.bg, color: style.color }}
        >
            {style.label}
        </span>
    );
}
