const STATUS_IN_TITLE =
    /\b(submitted|pending|accepted|assigned|rejected|resolved|escalated|reopened|awaiting)\b/gi;

const ASSIGNED_TO_IN_TITLE =
    /\bassigned\s+to\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,3}\b/gi;

const ASSIGNED_ROLE_IN_TITLE =
    /\bto\s+(?:the\s+|an?\s+)?(?:advisor|hod|dean|vc|vice\s+chancellor)\b/gi;

const GROUP_INVITE_IN_TITLE =
    /\b(?:group\s*(?:[—–-]\s*)?)?invite\s+to\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,3}\b/gi;

export function titleMentionsStatus(value) {
    STATUS_IN_TITLE.lastIndex = 0;
    return STATUS_IN_TITLE.test(String(value || ''));
}

export function titleMentionsAssignee(value) {
    const text = String(value || '');
    ASSIGNED_TO_IN_TITLE.lastIndex = 0;
    ASSIGNED_ROLE_IN_TITLE.lastIndex = 0;
    return (
        ASSIGNED_TO_IN_TITLE.test(text) || ASSIGNED_ROLE_IN_TITLE.test(text)
    );
}

export function titleMentionsGroupInvite(value) {
    GROUP_INVITE_IN_TITLE.lastIndex = 0;
    return GROUP_INVITE_IN_TITLE.test(String(value || ''));
}

export function complaintSubject(title) {
    const cleaned = String(title || '')
        .replace(ASSIGNED_TO_IN_TITLE, ' ')
        .replace(ASSIGNED_ROLE_IN_TITLE, ' ')
        .replace(GROUP_INVITE_IN_TITLE, ' ')
        .replace(STATUS_IN_TITLE, ' ')
        .replace(/\s+[—–-]+\s+|\s*[—–]\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,.;:]+|[\s,.;:]+$/g, '')
        .trim();
    return cleaned || 'Complaint';
}
