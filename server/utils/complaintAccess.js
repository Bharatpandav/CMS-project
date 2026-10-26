const COMPLAINT_TYPES = new Set(['solo', 'individual', 'group']);
const VISIBILITIES = new Set(['public', 'private']);

/**
 * Stored complaint type stays `solo` or `group`.
 * `individual` is accepted as the public name for a solo complaint.
 */
export function resolveComplaintAccess({ complaintType, visibility } = {}) {
    const typeRaw = String(complaintType ?? 'solo').trim().toLowerCase();
    const visibilityRaw =
        visibility == null || String(visibility).trim() === ''
            ? 'public'
            : String(visibility).trim().toLowerCase();

    if (!COMPLAINT_TYPES.has(typeRaw)) {
        return {
            ok: false,
            message: 'Complaint type must be individual or group'
        };
    }
    if (!VISIBILITIES.has(visibilityRaw)) {
        return {
            ok: false,
            message: 'Visibility must be public or private'
        };
    }

    const storedType = typeRaw === 'group' ? 'group' : 'solo';
    if (storedType === 'group' && visibilityRaw === 'private') {
        return {
            ok: false,
            message: 'Group complaints must be public'
        };
    }

    return {
        ok: true,
        complaintType: storedType,
        visibility: visibilityRaw
    };
}

export function complaintAccessLabel(complaint) {
    if (complaint?.complaintType === 'group') {
        return 'Group · Public';
    }
    const visibility =
        complaint?.visibility === 'private' ? 'Private' : 'Public';
    return `Individual · ${visibility}`;
}

export function canJoinStoredComplaint(complaint, userId) {
    if (!complaint) {
        return { ok: false, status: 404, message: 'Complaint not found' };
    }
    if (complaint.visibility !== 'public') {
        return {
            ok: false,
            status: 400,
            message: 'Only public complaints can be joined'
        };
    }
    if (String(complaint.raisedBy?._id || complaint.raisedBy) === String(userId)) {
        return {
            ok: false,
            status: 400,
            message: 'You cannot join your own complaint'
        };
    }
    if (['resolved', 'rejected', 'withdrawn'].includes(complaint.status)) {
        return {
            ok: false,
            status: 400,
            message: 'Cannot join a closed complaint'
        };
    }
    return { ok: true };
}
