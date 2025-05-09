// controllers/appointmentController.js
const AppointmentModel = require('../models/appointmentModel');
const PatientModel = require('../models/patientModel'); // Needed to check if patient exists
const DoctorModel = require('../models/doctorModel');   // Needed to check if doctor exists

const AppointmentController = {
    /**
     * Schedule a new appointment.
     */
    async scheduleAppointment(req, res) {
        const { patient_id, doctor_id, appointment_datetime, reason } = req.body;

        // Basic Validation
        if (!patient_id || !doctor_id || !appointment_datetime) {
            return res.status(400).json({ message: 'patient_id, doctor_id, and appointment_datetime are required.' });
        }
        // Add more validation: check datetime format, ensure it's in the future, etc.
        // Example: Basic format check (doesn't validate date correctness fully)
        if (isNaN(Date.parse(appointment_datetime))) {
             return res.status(400).json({ message: 'Invalid appointment_datetime format.' });
        }

        try {
            // Check if patient and doctor exist
            const patient = await PatientModel.findById(patient_id);
            if (!patient) {
                return res.status(404).json({ message: `Patient with ID ${patient_id} not found.` });
            }
            const doctor = await DoctorModel.findById(doctor_id);
            if (!doctor) {
                return res.status(404).json({ message: `Doctor with ID ${doctor_id} not found.` });
            }
             if (!doctor.is_active) {
                return res.status(400).json({ message: `Doctor with ID ${doctor_id} is not active.` });
            }

            // Optional: Basic check for doctor availability (more complex logic needed for real system)
            // This is very basic - doesn't check for overlaps or working hours.
            const existingAppointments = await AppointmentModel.findByDoctorId(doctor_id, appointment_datetime.split('T')[0]); // Check appointments for that day
            const conflictingAppointment = existingAppointments.find(appt =>
                new Date(appt.appointment_datetime).toISOString() === new Date(appointment_datetime).toISOString() &&
                appt.status === 'Scheduled'
            );
            if (conflictingAppointment) {
                 return res.status(409).json({ message: 'Doctor already has an appointment scheduled at this exact date and time.' });
            }


            const appointmentData = { patient_id, doctor_id, appointment_datetime, reason };
            const newAppointment = await AppointmentModel.create(appointmentData);
            res.status(201).json({ message: 'Appointment scheduled successfully!', appointment: newAppointment });
        } catch (error) {
            console.error('Controller: Error scheduling appointment:', error);
            // Handle specific errors from model if needed (like invalid FK)
            if (error.message.includes('Invalid patient_id or doctor_id')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to schedule appointment.' });
        }
    },

    /**
     * Get appointment details by ID.
     */
    async getAppointmentById(req, res) {
        const { appointmentId } = req.params;
        try {
            const appointment = await AppointmentModel.findById(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found.' });
            }
            res.status(200).json(appointment);
        } catch (error) {
            console.error('Controller: Error fetching appointment by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve appointment data.' });
        }
    },

    /**
     * Get all appointments for a specific patient.
     */
    async getAppointmentsForPatient(req, res) {
        const { patientId } = req.params;
        try {
             // Optional: Check if patient exists
             const patient = await PatientModel.findById(patientId);
             if (!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.` });

            const appointments = await AppointmentModel.findByPatientId(patientId);
            res.status(200).json(appointments);
        } catch (error) {
            console.error('Controller: Error fetching appointments for patient:', error);
            res.status(500).json({ message: 'Failed to retrieve patient appointments.' });
        }
    },

    /**
     * Get appointments for a specific doctor (optionally filter by date YYYY-MM-DD).
     */
    async getAppointmentsForDoctor(req, res) {
        const { doctorId } = req.params;
        const { date } = req.query; // e.g., /api/appointments/doctor/5?date=2025-05-10

         // Optional: Check if doctor exists
         // const doctor = await DoctorModel.findById(doctorId);
         // if (!doctor) return res.status(404).json({ message: `Doctor with ID ${doctorId} not found.` });

        try {
            const appointments = await AppointmentModel.findByDoctorId(doctorId, date);
            res.status(200).json(appointments);
        } catch (error) {
            console.error('Controller: Error fetching appointments for doctor:', error);
            res.status(500).json({ message: 'Failed to retrieve doctor appointments.' });
        }
    },

    /**
     * Update the status of an appointment.
     */
    async updateAppointmentStatus(req, res) {
        const { appointmentId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }
        // Model already validates allowed status values

        try {
            const appointment = await AppointmentModel.findById(appointmentId);
             if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

            // Optional: Add logic here - e.g., cannot cancel/complete an already completed/cancelled appt
            if (['Completed', 'Cancelled'].includes(appointment.status)) {
                 return res.status(400).json({ message: `Cannot update status of an already ${appointment.status} appointment.`});
            }

            const success = await AppointmentModel.updateStatus(appointmentId, status);
            if (!success) {
                // Should be rare if findById worked, but maybe DB issue
                 return res.status(404).json({ message: 'Appointment not found or status could not be updated.' });
            }
            const updatedAppointment = await AppointmentModel.findById(appointmentId);
            res.status(200).json({ message: `Appointment status updated to ${status}.`, appointment: updatedAppointment });
        } catch (error) {
            console.error('Controller: Error updating appointment status:', error);
             if (error.message.includes('Invalid status value')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to update appointment status.' });
        }
    },

     /**
     * Reschedule an appointment (update datetime).
     */
    async rescheduleAppointment(req, res) {
        const { appointmentId } = req.params;
        const { newDateTime } = req.body;

        if (!newDateTime) {
            return res.status(400).json({ message: 'newDateTime is required.' });
        }
         if (isNaN(Date.parse(newDateTime))) {
             return res.status(400).json({ message: 'Invalid newDateTime format.' });
         }
         // Add future date validation, conflict checks etc.

        try {
            const appointment = await AppointmentModel.findById(appointmentId);
             if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

             // Optional: Add logic - e.g., cannot reschedule completed/cancelled appointments
             if (['Completed', 'Cancelled'].includes(appointment.status)) {
                 return res.status(400).json({ message: `Cannot reschedule a ${appointment.status} appointment.`});
             }

             // Add conflict check logic here similar to create appointment if needed

            const success = await AppointmentModel.updateDateTime(appointmentId, newDateTime);
            if (!success) {
                 return res.status(404).json({ message: 'Appointment not found or datetime could not be updated.' });
            }
             const updatedAppointment = await AppointmentModel.findById(appointmentId);
            res.status(200).json({ message: 'Appointment rescheduled successfully.', appointment: updatedAppointment });
        } catch (error) {
            console.error('Controller: Error rescheduling appointment:', error);
            res.status(500).json({ message: error.message || 'Failed to reschedule appointment.' });
        }
    }
};

module.exports = AppointmentController;