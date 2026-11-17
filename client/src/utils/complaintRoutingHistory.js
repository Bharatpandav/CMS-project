import { getStaffRoleLabel } from './staffRoles.js';

function personFromRef(ref, roleFallback = '') {
    if (!ref) {
        return { name: '', role: roleFallback };
    }
    if (typeof ref === 'object') {
        return {
            name: (ref.name || '').trim(),
            role: ref.role || roleFallback
        };
    }
    return { name: '', role: roleFallback };
}

function formatRole(role) {
    if (!role) return '';
    const normalized = role === 'vc' ? 'super_admin' : role;
    return getStaffRoleLabel(normalized) || String(role);
}

/** True when remarks were typed by staff for a routing action (not system/backfill). */
export function isUserAuthoredRoutingRemark(remarks) {
    const text = (remarks || '').trim();
    if (!text) return false;
    if (/record backfilled/i.test(text)) return false;
    if (/^\(?(auto|system)[- ]generated/i.test(text)) return false;
    return true;
}

/** Name and designation for authority display (requires a real name). */
export function authorityLine(person, roleFallback = '') {
    const { name, role } = personFromRef(person, roleFallback);
    const trimmedName = (name || '').trim();
    const roleLabel = formatRole(role);
    if (trimmedName && roleLabel) return `${trimmedName} · ${roleLabel}`;
    if (trimmedName) return trimmedName;
    return null;
}

function personLine(person, roleFallback) {
    const { name, role } = personFromRef(person, roleFallback);
    if (!name && !role) return '';
    const roleLabel = formatRole(role);
    if (name && roleLabel) return `${name} (${roleLabel})`;
    return name || roleLabel;
}

export function buildAssignmentEscalationHistory(logs = []) {
    const entries = [];
    for (const log of logs) {
        const action = log?.action;
        if (action !== 'assigned' && action !== 'escalated') continue;

        const recipient =
            log.newAssignee || log.actionRecipient || log.assignedTo;

        entries.push({
            kind: action === 'assigned' ? 'assignment' : 'escalation',
            at: log.createdAt || null,
            actor: log.actor,
            actorRole: log.actorRole || log.actor?.role || '',
            previousAssignee: log.previousAssignee,
            recipient,
            recipientRole:
                (typeof recipient === 'object' && recipient?.role) ||
                log.level ||
                '',
            recipientLevel: log.level || '',
            remarks: (log.remarks || '').trim(),
            attachments: Array.isArray(log.attachments) ? log.attachments : []
        });
    }

    return entries.sort((a, b) => {
        const ta = a.at ? new Date(a.at).getTime() : 0;
        const tb = b.at ? new Date(b.at).getTime() : 0;
        return ta - tb;
    });
}

function isVcComplaintLevel(complaint) {
    const level = String(complaint?.currentLevel || '').toLowerCase();
    if (level === 'vc') return true;
    const assignee = complaint?.currentAssignee;
    if (typeof assignee === 'object' && assignee?.role === 'super_admin') {
        return true;
    }
    return false;
}

function routingEntryTargetsVc(entry) {
    const recipient = entry?.recipient;
    const role =
        entry?.recipientRole ||
        (typeof recipient === 'object' ? recipient?.role : '') ||
        entry?.recipientLevel ||
        '';
    if (role === 'vc' || role === 'super_admin') return true;
    return String(entry?.recipientLevel || '').toLowerCase() === 'vc';
}

/** Latest log entry that routed the complaint to the Vice Chancellor. */
function findLastVcHandoffEvent(history = []) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
        if (routingEntryTargetsVc(history[i])) {
            return history[i];
        }
    }
    return null;
}

function deanAssignerFromComplaint(complaint) {
    if (complaint?.deanHandoffBy?.name) {
        return authorityLine(
            complaint.deanHandoffBy,
            complaint.deanHandoffBy.role || 'dean'
        );
    }

    const assignedBy = complaint?.assignedBy;
    if (!assignedBy || typeof assignedBy !== 'object') return null;
    const role = assignedBy.role;
    if (role && role !== 'dean') return null;
    return authorityLine(assignedBy, role || 'dean');
}

function deanAssignerFromRawLogs(logs = []) {
    for (let i = logs.length - 1; i >= 0; i -= 1) {
        const log = logs[i];
        if (log?.action !== 'escalated') continue;
        const level = String(log.level || '').toLowerCase();
        const actorRole = log.actorRole || log.actor?.role;
        if (level === 'vc' || actorRole === 'dean') {
            const line = authorityLine(log.actor, actorRole || 'dean');
            if (line) return line;
        }
    }
    return null;
}

function resolvePastLabel({ history, complaint, routingEvent, rawLogs }) {
    if (routingEvent) {
        const fromLog = authorityLine(
            routingEvent.actor,
            routingEvent.actorRole
        );
        if (fromLog) return fromLog;
    }

    if (isVcComplaintLevel(complaint)) {
        return (
            deanAssignerFromComplaint(complaint) ||
            deanAssignerFromRawLogs(rawLogs)
        );
    }

    if (routingEvent) {
        return null;
    }

    return null;
}

/**
 * Past/current authorities from routing logs (VC handoff when at VC level).
 */
export function latestRoutingAuthorities(
    history = [],
    complaint = null,
    rawLogs = []
) {
    const atVc = isVcComplaintLevel(complaint);
    const routingEvent = atVc
        ? findLastVcHandoffEvent(history) ||
          (history.length ? history[history.length - 1] : null)
        : history.length
          ? history[history.length - 1]
          : null;

    const assignee = complaint?.currentAssignee;

    if (routingEvent) {
        const pastLabel = resolvePastLabel({
            history,
            complaint,
            routingEvent,
            rawLogs
        });
        const currentLabel =
            authorityLine(routingEvent.recipient, routingEvent.recipientRole) ||
            authorityLine(assignee, assignee?.role || complaint?.currentLevel);

        return {
            pastLabel,
            currentLabel,
            hasPriorAuthority: Boolean(pastLabel)
        };
    }

    if (assignee) {
        const pastLabel = atVc
            ? deanAssignerFromComplaint(complaint) ||
              deanAssignerFromRawLogs(rawLogs)
            : null;
        return {
            pastLabel,
            currentLabel: authorityLine(
                assignee,
                assignee?.role || complaint?.currentLevel
            ),
            hasPriorAuthority: Boolean(pastLabel)
        };
    }

    return {
        pastLabel: null,
        currentLabel: null,
        hasPriorAuthority: false
    };
}

export { personLine, formatRole, personFromRef };