// routes/admissionRoutes.js
const express = require('express');
const AdmissionController = require('../controllers/admissionController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), // Adjust roles as needed
    AdmissionController.admitPatient
);

router.put(
    '/:admissionId/discharge',
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse']), // Adjust roles as needed
    AdmissionController.dischargePatient
);

router.get(
    '/:admissionId',
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), // Adjust roles as needed
    AdmissionController.getAdmissionDetails
);

router.get(
    '/patient/:patientId', // Alternative path structure
    authenticateToken,
    authorizeRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), // Adjust roles
    AdmissionController.getPatientAdmissions
);


module.exports = router;