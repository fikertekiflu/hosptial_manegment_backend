
const express = require('express');
const SystemUserController = require('../controllers/systemUserController');
const { authenticateToken } = require('../middlewares/authMiddleware'); 

const authorizeRole = (allowedRolesArray) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            
            return res.status(401).json({ message: 'Authentication required.' });
        }
        if (allowedRolesArray.includes(req.user.role)) {
            next(); 
        } else {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
        }
    };
};

const router = express.Router();

router.get(
    '/me',
    authenticateToken, 
    SystemUserController.getCurrentUserProfile
);

router.post(
    '/',
    authenticateToken,        
    authorizeRole(['Admin']), 
    SystemUserController.createUser
);

router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    SystemUserController.getAllUsers
);

router.get(
    '/:userId',
    authenticateToken,
    authorizeRole(['Admin']),
    SystemUserController.getUserById
);

router.put(
    '/:userId',
    authenticateToken,
    authorizeRole(['Admin']),
    SystemUserController.updateUser
);

router.put(
    '/:userId/password',
    authenticateToken,
    authorizeRole(['Admin']),
    SystemUserController.updateUserPassword
);

router.delete(
    '/:userId',
    authenticateToken,
    authorizeRole(['Admin']),
    SystemUserController.deleteUserById
);

module.exports = router;