// routes/treatmentRoutes.js
const express = require('express');
const TreatmentController = require('../controllers/TreatmentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin']), // Roles allowed to log treatments
    TreatmentController.logTreatment
);

// GET /api/treatments/patient/:patientId - Get all treatments for a patient
// Accessible by: Doctor, Nurse, Admin (and maybe the patient themselves if they have login)
router.get(
    '/patient/:patientId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin']), // Define roles
    TreatmentController.getTreatmentsForPatient
);

// GET /api/treatments/:treatmentId - Get details of a specific treatment
// Accessible by: Doctor, Nurse, Admin (example roles)
router.get(
    '/:treatmentId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin']), // Define roles
    TreatmentController.getTreatmentById
);

router.put(
    '/:treatmentId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin']), // Define roles allowed to update
    TreatmentController.updateTreatment
);

module.exports = router;