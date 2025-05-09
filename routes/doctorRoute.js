// routes/doctorRoutes.js
const express = require('express');
const DoctorController = require('../controllers/doctorController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    DoctorController.createDoctor
);

// GET /api/doctors - Get all doctor profiles
router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'Receptionist', 'Doctor', 'Nurse']), // Or more roles if needed for viewing
    DoctorController.getAllDoctors
);

// GET /api/doctors/:doctorId - Get a specific doctor profile by ID
router.get(
    '/:doctorId',
    authenticateToken,
    authorizeRole(['Admin', 'Receptionist', 'Doctor', 'Nurse']), // Or more roles
    DoctorController.getDoctorById
);

// PUT /api/doctors/:doctorId - Update a doctor's profile
router.put(
    '/:doctorId',
    authenticateToken,
    authorizeRole(['Admin']),
    DoctorController.updateDoctor
);

// DELETE /api/doctors/:doctorId - Delete a doctor's profile
router.delete(
    '/:doctorId',
    authenticateToken,
    authorizeRole(['Admin']),
    DoctorController.deleteDoctor
);

module.exports = router;