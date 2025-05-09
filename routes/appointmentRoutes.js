// routes/appointmentRoutes.js
const express = require('express');
const AppointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

// POST /api/appointments - Schedule a new appointment
// Accessible by: Receptionist, Admin (example)
router.post(
    '/',
    authenticateToken,
    authorizeRole(['Receptionist', 'Admin']),
    AppointmentController.scheduleAppointment
);

// GET /api/appointments/:appointmentId - Get specific appointment details
// Accessible by: User associated with appointment (Patient/Doctor), Receptionist, Nurse, Admin (example)
// Needs more complex check in controller or separate middleware if patient/doctor can only see their own
router.get(
    '/:appointmentId',
    authenticateToken,
    // Add more sophisticated authorization logic in controller if needed
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']),
    AppointmentController.getAppointmentById
);

// GET /api/appointments/patient/:patientId - Get appointments for a specific patient
// Accessible by: The patient themselves (if they have login), Doctor, Nurse, Receptionist, Admin
router.get(
    '/patient/:patientId',
    authenticateToken,
    // Add more sophisticated authorization logic here if needed (e.g., check if logged-in user IS the patient or staff)
    authorizeRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), // Adjust roles
    AppointmentController.getAppointmentsForPatient
);

// GET /api/appointments/doctor/:doctorId - Get appointments for a specific doctor (optional date filter)
// Accessible by: The doctor themselves, Receptionist, Nurse, Admin
router.get(
    '/doctor/:doctorId',
    authenticateToken,
     // Add more sophisticated authorization logic here if needed (e.g., check if logged-in user IS the doctor or allowed staff)
    authorizeRole(['Doctor', 'Nurse', 'Receptionist', 'Admin']), // Adjust roles
    AppointmentController.getAppointmentsForDoctor
);

// PUT /api/appointments/:appointmentId/status - Update appointment status
// Accessible by: Receptionist, Doctor, Nurse, Admin (example)
router.put(
    '/:appointmentId/status',
    authenticateToken,
    authorizeRole(['Receptionist', 'Doctor', 'Nurse', 'Admin']), // Roles allowed to change status
    AppointmentController.updateAppointmentStatus
);

// PUT /api/appointments/:appointmentId/reschedule - Reschedule an appointment
// Accessible by: Receptionist, Admin (example)
router.put(
    '/:appointmentId/reschedule',
    authenticateToken,
    authorizeRole(['Receptionist', 'Admin']), // Roles allowed to reschedule
    AppointmentController.rescheduleAppointment
);

// GET /api/appointments - Maybe an admin route to get ALL appointments (needs careful thought on data volume)
// router.get('/', authenticateToken, authorizeRole(['Admin']), AppointmentController.getAllAppointments); // Needs controller implementation


module.exports = router;