const STATUS_IN_TITLE =
    /\b(submitted|pending|accepted|assigned|rejected|resolved|escalated|reopened|awaiting)\b/gi;

const ASSIGNED_TO_IN_TITLE =
    /\bassigned\s+to\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,3}\b/gi;

const ASSIGNED_ROLE_IN_TITLE =
    /\bto\s+(?:the\s+|an?\s+)?(?:advisor|hod|dean|vc|vice\s+chancellor)\b/gi;

const GROUP_INVITE_IN_TITLE =
    /\b(?:group\s*(?:[—–-]\s*)?)?invite\s+to\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,3}\b/gi;

function mentions(pattern, title) {
    pattern.lastIndex = 0;
    return pattern.test(String(title || ''));
}

export function titleMentionsStatus(title) {
    return mentions(STATUS_IN_TITLE, title);
}

export function titleMentionsAssignee(title) {
    return (
        mentions(ASSIGNED_TO_IN_TITLE, title) ||
        mentions(ASSIGNED_ROLE_IN_TITLE, title)
    );
}

export function titleMentionsGroupInvite(title) {
    return mentions(GROUP_INVITE_IN_TITLE, title);
}

export function titleWithoutStatus(title) {
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
