const buckets = new Map();

/**
 * Simple in-memory rate limiter (per process).
 * @returns {boolean} true if allowed
 */
export function rateLimit(key, { windowMs = 15 * 60 * 1000, max = 5 } = {}) {
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || now - entry.start > windowMs) {
        entry = { start: now, count: 0 };
        buckets.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= max;
}
