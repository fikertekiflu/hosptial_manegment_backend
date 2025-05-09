
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        // 1. Check if req.user and req.user.role are populated by a preceding authentication middleware.
        if (!req.user || !req.user.role) {
            
            console.warn('Role Middleware: req.user or req.user.role is missing. Ensure authentication middleware (like authenticateToken) runs before authorizeRole and populates req.user.');
            return res.status(401).json({ message: 'Authentication required. User information or role not found in request.' });
        }

        const userRole = req.user.role;

        // 2. Check if the authenticated user's role is included in the list of allowed roles for this route.
        if (allowedRoles.includes(userRole)) {
            // User's role is in the allowedRoles array, grant access.
            next(); // Proceed to the next middleware in the stack or the route handler.
        } else {
            // User's role is not permitted for this specific route.
            console.log(`Forbidden Access: User with role '${userRole}' attempted to access a route restricted to roles: [${allowedRoles.join(', ')}].`);
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to access this resource.' });
        }
    };
};

module.exports = { authorizeRole };