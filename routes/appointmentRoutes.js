// routes/appointmentRoutes.js
const express = require('express');
const AppointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Corrected path
const { authorizeRole } = require('../middlewares/roleMiddleware');   // Corrected path

const router = express.Router();

// POST /api/appointments - Schedule a new appointment
router.post(
    '/',
    authenticateToken,
    authorizeRole(['Receptionist', 'Admin', 'Doctor']), // Doctors might schedule follow-ups
    AppointmentController.scheduleAppointment
);

// GET /api/appointments - Get ALL appointments with filtering (for ManageAppointmentsPage)
router.get(
    '/',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']), // Roles that can view lists of appointments
    AppointmentController.getAllAppointments // <<< CORRECTED: Points to the new controller function
);

// GET /api/appointments/:appointmentId - Get specific appointment details
router.get(
    '/:appointmentId',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']),
    AppointmentController.getAppointmentById
);

// GET /api/appointments/patient/:patientId - Get appointments for a specific patient
router.get(
    '/patient/:patientId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), 
    AppointmentController.getAppointmentsForPatient
);

// GET /api/appointments/doctor/:doctorId - Get appointments for a specific doctor
router.get(
    '/doctor/:doctorId',
    authenticateToken,
    authorizeRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), 
    AppointmentController.getAppointmentsForDoctor
);

// PUT /api/appointments/:appointmentId/status - Update appointment status
router.put(
    '/:appointmentId/status',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']),
    AppointmentController.updateAppointmentStatus
);

// PUT /api/appointments/:appointmentId/reschedule - Reschedule an appointment
router.put(
    '/:appointmentId/reschedule',
    authenticateToken,
    authorizeRole(['Receptionist', 'Admin', 'Doctor']), // Doctors might reschedule
    AppointmentController.rescheduleAppointment
);

module.exports = router;
