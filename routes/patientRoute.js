// routes/patientRoutes.js
const express = require('express');
const PatientController = require('../controllers/patientController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Your JWT authentication middleware
const { authorizeRole } = require('../middlewares/roleMiddleware');   // Your role authorization middleware (you'll need to create this)

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Receptionist', 'Admin']), // Define which roles can create
    PatientController.registerPatient
);

router.get(
    '/',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']), // Define roles
    PatientController.getAllPatients
);

router.get(
    '/:patientId',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']), // Define roles
    PatientController.getPatientById
);

router.put(
    '/:patientId',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Admin']), // Define roles (Admin might have more update capabilities)
    PatientController.updatePatient
);


module.exports = router;