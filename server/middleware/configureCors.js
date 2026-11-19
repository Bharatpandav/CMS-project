import cors from 'cors';

function parseAllowedOrigins() {
    const raw =
        process.env.CLIENT_URL ||
        process.env.CORS_ORIGINS ||
        '';
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function configureCors(app) {
    const allowed = parseAllowedOrigins();
    const isProd = process.env.NODE_ENV === 'production';

    const originOption =
        allowed.length > 0 ? allowed : isProd ? false : true;

    app.use(
        cors({
            origin: originOption,
            credentials: true,
            methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'token']
        })
    );
}