/** HOD complaints list filter values (must match server bucket keys). */
export const HOD_COMPLAINT_FILTER_OPTIONS = [
    { value: '', label: 'All Complaints' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' }
];

export function hodComplaintFilterLabel(value) {
    const found = HOD_COMPLAINT_FILTER_OPTIONS.find(
        (o) => o.value === (value || '')
    );
    return found?.label || 'All Complaints';
}