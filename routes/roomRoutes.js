// routes/roomRoutes.js
const express = require('express');
const RoomController = require('../controllers/roomController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    RoomController.createRoom
);

router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'Receptionist', 'Doctor', 'Nurse']), // Adjust roles as needed
    RoomController.getAllRooms
);

router.get(
    '/:roomId',
    authenticateToken,
    authorizeRole(['Admin', 'Receptionist', 'Doctor', 'Nurse']), // Adjust roles as needed
    RoomController.getRoomById
);

router.put(
    '/:roomId',
    authenticateToken,
    authorizeRole(['Admin']),
    RoomController.updateRoom
);

// DELETE /api/rooms/:roomId - Delete a room (Admin only)
router.delete(
    '/:roomId',
    authenticateToken,
    authorizeRole(['Admin']),
    RoomController.deleteRoom
);

module.exports = router;