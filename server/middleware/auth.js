import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    const token = req.cookies.token || req.headers.token || tokenFromHeader;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not Authorized, Login Again' });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: tokenDecode.id,
            ...(tokenDecode.role ? { role: tokenDecode.role } : {}),
        };
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ success: false, message: error.message });
    }
}






export default authUser;
// This code defines a middleware function for user authentication in an Express application.