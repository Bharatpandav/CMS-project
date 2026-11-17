import { complaintSubject } from './complaintTitle.js';
import { complaintPublicId } from './complaintPublicId.js';
import { getStaffRoleLabel } from './staffRoles.js';
import { fileTypeLabel } from './complaintActionFiles.js';
import { attachmentPreviewKind } from './attachmentPreview.js';

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function personLine(user, fallbackName = '', fallbackRole = '') {
    if (user && typeof user === 'object') {
        const name = user.name || fallbackName;
        const role = getStaffRoleLabel(user.role || fallbackRole);
        if (name && role) return `${name} (${role})`;
        return name || role || '';
    }
    if (fallbackName && fallbackRole) {
        return `${fallbackName} (${getStaffRoleLabel(fallbackRole)})`;
    }
    return fallbackName || '';
}

function latestLog(logs, predicate) {
    const hits = (logs || []).filter(predicate);
    return hits.length ? hits[hits.length - 1] : null;
}

function mergeAttachmentLists(...lists) {
    const seen = new Set();
    const out = [];
    for (const list of lists) {
        for (const file of list || []) {
            const key = file?.url || file?.filename;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(file);
        }
    }
    return out;
}

export function isClosureReportAvailable(complaint) {
    return complaint?.status === 'closed';
}

/**
 * Build print-ready closure report fields from API complaint + logs.
 */
export function buildClosureReportModel(complaint, logs = []) {
    const profile = complaint?.studentProfile || {};
    const raisedBy =
        complaint?.raisedBy && typeof complaint.raisedBy === 'object'
            ? complaint.raisedBy
            : null;

    const acceptedLog = latestLog(
        logs,
        (l) => l.action === 'accepted' || l.newStatus === 'accepted'
    );
    const assignedLog = latestLog(logs, (l) => l.action === 'assigned');
    const escalatedLog = latestLog(
        logs,
        (l) => l.action === 'escalated' || l.action === 'returned'
    );
    const resolvedLog = latestLog(
        logs,
        (l) => l.action === 'resolved' || l.newStatus === 'resolved'
    );
    const closedLog = latestLog(
        logs,
        (l) => l.action === 'closed' || l.newStatus === 'closed'
    );

    const fromComplaintAttachments = (complaint?.attachments || []).filter(
        (f) =>
            f?.source === 'action' &&
            (f.action === 'resolved' || f.actionType === 'resolved')
    );

    const resolutionAttachments = mergeAttachmentLists(
        resolvedLog?.attachments,
        fromComplaintAttachments
    ).map((file, index) => ({
        ...file,
        filename: file.filename || `resolution-file-${index + 1}`,
        fileType: file.fileType || file.type || '',
        kind: attachmentPreviewKind(file)
    }));

    const resolverUser = complaint?.resolvedBy;
    const resolvedBy =
        personLine(
            resolverUser,
            complaint?.resolvedByName,
            complaint?.resolvedByRole
        ) ||
        personLine(resolvedLog?.actor, '', resolvedLog?.actorRole);

    const closedBy =
        personLine(complaint?.closedBy, '', complaint?.closedBy?.role) ||
        (closedLog?.actor
            ? personLine(closedLog.actor, '', closedLog.actorRole)
            : '');

    const closureNote =
        complaint?.closureType === 'automatic'
            ? 'Closed automatically 24 hours after resolution.'
            : complaint?.closureType === 'manual'
              ? closedBy
                  ? `Closed manually by ${closedBy}.`
                  : 'Closed manually by the authorized HOD.'
              : closedLog?.remarks || '';

    const assignee = complaint?.currentAssignee;
    const advisorName =
        personLine(typeof assignee === 'object' ? assignee : null) ||
        personLine(
            assignedLog?.newAssignee &&
                typeof assignedLog.newAssignee === 'object'
                ? assignedLog.newAssignee
                : null
        );
    const escalatedTo =
        escalatedLog?.newAssignee && typeof escalatedLog.newAssignee === 'object'
            ? personLine(escalatedLog.newAssignee)
            : '';

    return {
        generatedAt: formatDateTime(new Date()),
        publicId: complaintPublicId(complaint) || '—',
        statusBanner: 'RESOLVED & CLOSED',
        complaint: {
            id: complaintPublicId(complaint),
            category: complaint?.category || '',
            type:
                complaint?.complaintType === 'group' ? 'Group' : 'Individual',
            visibility:
                complaint?.visibility === 'private' ? 'Private' : 'Public',
            submittedAt: formatDateTime(
                complaint?.createdAt || complaint?.Date
            ),
            title: complaintSubject(complaint?.title),
            description: complaint?.description || '',
            issue: complaint?.category || '',
            location: complaint?.location || '',
            department: complaint?.department || '',
            finalStatus: 'Closed'
        },
        complainant: {
            name:
                profile.name ||
                complaint?.raisedByName ||
                raisedBy?.name ||
                '',
            roll: profile.rollNumber || raisedBy?.rollNumber || '',
            branch: profile.department || raisedBy?.department || '',
            semester:
                profile.semester != null && profile.semester !== ''
                    ? String(profile.semester)
                    : '',
            section: profile.section || '',
            programme: profile.programme || '',
            email: profile.email || ''
        },
        processing: {
            acceptedAt: formatDateTime(
                acceptedLog?.createdAt || ''
            ),
            advisor: advisorName,
            assignRemarks: assignedLog?.remarks || '',
            escalatedTo,
            escalateRemarks: escalatedLog?.remarks || '',
            resolvedAt: formatDateTime(
                complaint?.resolvedAt ||
                    resolvedLog?.createdAt ||
                    ''
            ),
            resolvedBy,
            resolutionNote:
                (complaint?.resolutionNote || '').trim() ||
                (resolvedLog?.remarks || '').trim() ||
                '',
            closedAt: formatDateTime(
                complaint?.closedAt || closedLog?.createdAt || ''
            ),
            closureDetails: closureNote
        },
        resolutionAttachments,
        participants: (complaint?.participants || []).map((p) => ({
            name: p.name || p.student?.name || 'Member',
            roll: p.rollNumber || p.student?.rollNumber || ''
        }))
    };
}

export { formatDateTime, fileTypeLabel };