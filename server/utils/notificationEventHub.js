/**
 * Per-user SSE fan-out for notification invalidation (no Socket.IO dependency).
 */

/** @type {Set<{ res: import('express').Response, userId: string }>} */
const streamClients = new Set();

/**
 * @param {import('express').Response} res
 * @param {string} userId
 * @returns {() => void}
 */
export function registerNotificationStreamClient(res, userId) {
    const id = String(userId || '');
    const client = { res, userId: id };
    streamClients.add(client);
    return () => {
        streamClients.delete(client);
    };
}

/**
 * @param {string} userId
 * @param {{ at?: number }} [payload]
 */
export function publishNotificationEvent(userId, payload = {}) {
    const id = String(userId || '');
    if (!id || streamClients.size === 0) return;

    const data = JSON.stringify({
        type: 'notification',
        at: payload.at ?? Date.now()
    });
    const frame = `event: notification\ndata: ${data}\n\n`;

    for (const client of streamClients) {
        if (client.userId !== id) continue;
        try {
            client.res.write(frame);
        } catch {
            streamClients.delete(client);
        }
    }
}

export function publishNotificationEvents(userIds) {
    const unique = [...new Set((userIds || []).map((id) => String(id || '')))].filter(
        Boolean
    );
    for (const userId of unique) {
        publishNotificationEvent(userId);
    }
}