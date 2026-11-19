import jwt from 'jsonwebtoken';

/**
 * Authenticate SSE connections via `?token=` (EventSource cannot set Authorization).
 */
const sseAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const tokenFromHeader =
        authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : null;
    const token =
        req.query.token ||
        req.cookies?.token ||
        req.headers.token ||
        tokenFromHeader;

    if (!token || typeof token !== 'string') {
        return res.status(401).end();
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: tokenDecode.id,
            ...(tokenDecode.role ? { role: tokenDecode.role } : {})
        };
        next();
    } catch {
        return res.status(401).end();
    }
};

export default sseAuth;