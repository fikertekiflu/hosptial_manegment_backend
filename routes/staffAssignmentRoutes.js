// routes/staffAssignmentRoutes.js
const express = require('express');
const StaffAssignmentController = require('../controllers/staffAssignmentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin']), 
    StaffAssignmentController.createAssignment
);

router.get(
    '/my-tasks',
    authenticateToken,
    authorizeRole(['Nurse', 'WardBoy']), 
    StaffAssignmentController.getMyActiveAssignments
);

router.get(
    '/patient/:patientId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Admin', 'Receptionist']), // Broader view access?
    StaffAssignmentController.getAssignmentsForPatient
);

router.get(
    '/:assignmentId',
    authenticateToken,
    
    authorizeRole(['Doctor', 'Nurse', 'WardBoy', 'Admin', 'Receptionist']), // Example broad access
    StaffAssignmentController.getAssignmentById
);

router.put(
    '/:assignmentId/status',
    authenticateToken,
    // Role check ensures user type, controller checks if they are related to *this specific* assignment
    authorizeRole(['Doctor', 'Nurse', 'WardBoy', 'Admin']),
    StaffAssignmentController.updateAssignmentStatus
);


module.exports = router;