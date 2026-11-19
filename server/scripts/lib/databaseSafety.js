/**
 * Guards development seed scripts from running against unintended databases.
 * Never logs MONGO_URI or secrets.
 */

const ALLOWED_DB_NAMES = new Set([
    'test',
    'dev',
    'development',
    'cms_dev',
    'cms-dev',
    'local',
    'cms_local'
]);

const BLOCKED_DB_NAMES = new Set([
    'production',
    'prod',
    'live',
    'main',
    'cms',
    'cms_production'
]);

const LOCAL_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'host.docker.internal'
]);

export function parseMongoTarget(mongoUri) {
    if (!mongoUri || typeof mongoUri !== 'string') {
        return { ok: false, reason: 'MONGO_URI is not configured' };
    }

    let host = '';
    let dbName = '';

    try {
        const withoutQuery = mongoUri.split('?')[0];
        const pathPart = withoutQuery.includes('@')
            ? withoutQuery.split('@').pop()
            : withoutQuery.replace(/^mongodb(\+srv)?:\/\//, '');
        const slash = pathPart.indexOf('/');
        if (slash >= 0) {
            host = pathPart.slice(0, slash);
            dbName = pathPart.slice(slash + 1);
        } else {
            host = pathPart;
        }
        if (host.includes(':')) {
            host = host.split(':')[0];
        }
    } catch {
        return { ok: false, reason: 'Could not parse MONGO_URI' };
    }

    return { ok: true, host, dbName: dbName || 'test' };
}

export function assertSafeToSeed(mongoUri, options = {}) {
    const parsed = parseMongoTarget(mongoUri);
    if (!parsed.ok) {
        throw new Error(parsed.reason);
    }

    const { host, dbName } = parsed;
    const dbLower = (dbName || '').toLowerCase();
    const allowRemote = process.env.CMS_ALLOW_REMOTE_SEED === '1';

    if (BLOCKED_DB_NAMES.has(dbLower)) {
        throw new Error(
            `Refusing to seed: database name "${dbName}" is blocked. Use a local or explicit dev/test database.`
        );
    }

    const isLocalHost = LOCAL_HOSTS.has(host);
    const isAllowedDb = ALLOWED_DB_NAMES.has(dbLower);

    if (!isLocalHost && !allowRemote) {
        throw new Error(
            `Refusing to seed remote host "${host}". Set CMS_ALLOW_REMOTE_SEED=1 only if this is your dedicated development cluster.`
        );
    }

    if (!isLocalHost && allowRemote && !isAllowedDb) {
        throw new Error(
            `Remote seed allowed, but database "${dbName}" is not in the dev/test allowlist. Rename the database or use a local MongoDB instance.`
        );
    }

    if (isLocalHost && !isAllowedDb && !allowRemote) {
        console.warn(
            `Warning: database "${dbName}" is not in the default allowlist; proceeding because host is local.`
        );
    }

    return { host, dbName, isLocalHost };
}
