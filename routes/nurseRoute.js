// routes/nurseRoutes.js
const express = require('express');
const NurseController = require('../controllers/nurseController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

// All routes below are protected and typically for Admin use only

// POST /api/nurses - Create a new nurse profile
router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    NurseController.createNurse
);

// GET /api/nurses - Get all nurse profiles (potentially wider access for viewing)
router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse']), // Adjust roles as needed for viewing nurses
    NurseController.getAllNurses
);

// GET /api/nurses/:nurseId - Get a specific nurse profile by ID
router.get(
    '/:nurseId',
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse']), // Adjust roles as needed
    NurseController.getNurseById
);

// PUT /api/nurses/:nurseId - Update a nurse's profile
router.put(
    '/:nurseId',
    authenticateToken,
    authorizeRole(['Admin']),
    NurseController.updateNurse
);

// DELETE /api/nurses/:nurseId - Delete a nurse's profile
router.delete(
    '/:nurseId',
    authenticateToken,
    authorizeRole(['Admin']),
    NurseController.deleteNurse
);

module.exports = router;