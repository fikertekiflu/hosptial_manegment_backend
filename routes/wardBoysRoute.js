// routes/wardBoyRoutes.js
const express = require('express');
const WardBoyController = require('../controllers/wardBodysController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

// All routes below are protected and typically for Admin use only

// POST /api/wardboys - Create a new ward boy profile
router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    WardBoyController.createWardBoy
);

// GET /api/wardboys - Get all ward boy profiles
router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'Nurse']), // Example: Nurses might also need to see ward boys
    WardBoyController.getAllWardBoys
);

// GET /api/wardboys/:wardBoyId - Get a specific ward boy profile by ID
router.get(
    '/:wardBoyId',
    authenticateToken,
    authorizeRole(['Admin', 'Nurse']), // Example: Nurses might also need to see ward boys
    WardBoyController.getWardBoyById
);

// PUT /api/wardboys/:wardBoyId - Update a ward boy's profile
router.put(
    '/:wardBoyId',
    authenticateToken,
    authorizeRole(['Admin']),
    WardBoyController.updateWardBoy
);

// DELETE /api/wardboys/:wardBoyId - Delete a ward boy's profile
router.delete(
    '/:wardBoyId',
    authenticateToken,
    authorizeRole(['Admin']),
    WardBoyController.deleteWardBoy
);

module.exports = router;