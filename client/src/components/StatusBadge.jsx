import {
    complaintStatusBadgeKey,
    complaintStatusLabel
} from '../utils/complaintStatusDisplay.js';

export function StatusBadge({ status }) {
    const key = complaintStatusBadgeKey(status);
    const label = complaintStatusLabel(status);

    return (
        <span className={`badge badge--status badge--status-${key}`}>
            {label}
        </span>
    );
}
