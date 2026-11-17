/** User-facing status labels (resolved and closed both show as Resolved). */
const LABELS = {
    submitted: 'Submitted',
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    rejected: 'Rejected',
    resolved: 'Resolved',
    closed: 'Resolved',
    escalated: 'Escalated',
    reopened: 'Reopened',
    withdrawn: 'Withdrawn'
};

export function complaintStatusLabel(status) {
    const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
    return LABELS[key] || (status ? String(status) : 'Unknown');
}

/** CSS / badge token — closed uses the same resolved styling. */
export function complaintStatusBadgeKey(status) {
    const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
    if (key === 'closed') return 'resolved';
    return LABELS[key] ? key : 'pending';
}

export function isResolvedLikeStatus(status) {
    const key = String(status || '').toLowerCase();
    return key === 'resolved' || key === 'closed';
}