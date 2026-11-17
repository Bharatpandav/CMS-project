/**
 * In-process pub/sub for dashboard invalidation over Server-Sent Events.
 * Lightweight cross-session sync without introducing Socket.IO.
 */

/** @type {Set<{ res: import('express').Response, role: string, department: string | null }>} */
const streamClients = new Set();

/**
 * @param {import('express').Response} res
 * @param {{ role: string, department?: string | null }} meta
 * @returns {() => void} cleanup
 */
export function registerDashboardStreamClient(res, meta) {
    const client = {
        res,
        role: meta.role || '',
        department: (meta.department || '').trim() || null
    };
    streamClients.add(client);

    return () => {
        streamClients.delete(client);
    };
}

/**
 * @param {string[]} departments — affected department names; empty means broadcast to all.
 */
export function publishUserStatsInvalidation(departments = []) {
    if (streamClients.size === 0) return;

    const normalized = departments
        .map((d) => (d || '').trim())
        .filter(Boolean);
    const data = JSON.stringify({
        type: 'user_stats',
        departments: normalized,
        at: Date.now()
    });
    const frame = `event: user_stats\ndata: ${data}\n\n`;

    for (const client of streamClients) {
        if (shouldNotifyClient(client, normalized)) {
            try {
                client.res.write(frame);
            } catch {
                streamClients.delete(client);
            }
        }
    }
}

/**
 * @param {{ role: string, department: string | null }} client
 * @param {string[]} departments
 */
function shouldNotifyClient(client, departments) {
    if (departments.length === 0) {
        return true;
    }

    if (client.role === 'dean' || client.role === 'super_admin') {
        return true;
    }

    if (
        (client.role === 'hod' || client.role === 'advisor') &&
        client.department &&
        departments.includes(client.department)
    ) {
        return true;
    }

    // Institution-scoped viewers still get dept-specific events handled above;
    // other roles should not be on this stream.
    return false;
}