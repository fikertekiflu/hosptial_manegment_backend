// controllers/appointmentController.js
const AppointmentModel = require('../models/appointmentModel');
const PatientModel = require('../models/patientModel'); 
const DoctorModel = require('../models/doctorModel');   

const AppointmentController = {
    /**
     * Schedule a new appointment.
     */
    async scheduleAppointment(req, res) {
        const { patient_id, doctor_id, appointment_datetime, reason } = req.body;

        if (!patient_id || !doctor_id || !appointment_datetime) {
            return res.status(400).json({ message: 'patient_id, doctor_id, and appointment_datetime are required.' });
        }
        if (isNaN(Date.parse(appointment_datetime))) {
             return res.status(400).json({ message: 'Invalid appointment_datetime format.' });
        }

        try {
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

            // Basic conflict check (can be enhanced)
            const datePart = appointment_datetime.split('T')[0];
            const existingAppointments = await AppointmentModel.findByDoctorId(doctor_id, datePart);
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
            if (error.message.includes('Invalid patient_id or doctor_id')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to schedule appointment.' });
        }
    },

    /**
     * Get all appointments with filtering.
     * Used by ManageAppointmentsPage.
     * Filters are passed as query parameters: dateFrom, dateTo, doctorId, status, patientSearch
     */
    async getAllAppointments(req, res) {
        try {
            // Extract filters from query parameters
            const filters = {
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                doctorId: req.query.doctorId,
                status: req.query.status,
                patientSearch: req.query.patientSearch
                // Add more filters as your model supports them
            };
            
            // Remove undefined filters to avoid issues
            Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

            const appointments = await AppointmentModel.getAll(filters);
            res.status(200).json(appointments);
        } catch (error) {
            console.error('Controller: Error fetching all appointments:', error);
            res.status(500).json({ message: 'Failed to retrieve appointments.' });
        }
    },

    /**
     * Get appointment details by ID.
     */
    async getAppointmentById(req, res) {
        const { appointmentId } = req.params;
        if (!appointmentId || isNaN(parseInt(appointmentId))) {
            return res.status(400).json({ message: 'Valid appointmentId parameter is required.' });
        }
        try {
            const appointment = await AppointmentModel.findById(parseInt(appointmentId));
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
        if (!patientId || isNaN(parseInt(patientId))) {
            return res.status(400).json({ message: 'Valid patientId parameter is required.' });
        }
        try {
             const patient = await PatientModel.findById(parseInt(patientId));
             if (!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.` });

            const appointments = await AppointmentModel.findByPatientId(parseInt(patientId));
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
        const { date } = req.query; 

        if (!doctorId || isNaN(parseInt(doctorId))) {
            return res.status(400).json({ message: 'Valid doctorId parameter is required.' });
        }
        // Optional: Validate date format if provided
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
        }

        try {
            const appointments = await AppointmentModel.findByDoctorId(parseInt(doctorId), date);
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

        if (!appointmentId || isNaN(parseInt(appointmentId))) {
            return res.status(400).json({ message: 'Valid appointmentId parameter is required.' });
        }
        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }
        
        try {
            const appointment = await AppointmentModel.findById(parseInt(appointmentId));
             if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

            if (['Completed', 'Cancelled'].includes(appointment.status) && appointment.status !== status) { // Allow re-setting same status
                 return res.status(400).json({ message: `Cannot update status of an already ${appointment.status} appointment to a different one.`});
            }

            const success = await AppointmentModel.updateStatus(parseInt(appointmentId), status);
            if (!success) {
                 return res.status(404).json({ message: 'Appointment not found or status could not be updated.' });
            }
            const updatedAppointment = await AppointmentModel.findById(parseInt(appointmentId));
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

        if (!appointmentId || isNaN(parseInt(appointmentId))) {
            return res.status(400).json({ message: 'Valid appointmentId parameter is required.' });
        }
        if (!newDateTime) {
            return res.status(400).json({ message: 'newDateTime is required.' });
        }
         if (isNaN(Date.parse(newDateTime))) {
             return res.status(400).json({ message: 'Invalid newDateTime format.' });
         }
         
        try {
            const appointment = await AppointmentModel.findById(parseInt(appointmentId));
             if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

             if (['Completed', 'Cancelled'].includes(appointment.status)) {
                 return res.status(400).json({ message: `Cannot reschedule a ${appointment.status} appointment.`});
             }
            
            // Add conflict check logic here similar to create appointment if needed for the newDateTime

            const success = await AppointmentModel.updateDateTime(parseInt(appointmentId), newDateTime);
            if (!success) {
                 return res.status(404).json({ message: 'Appointment not found or datetime could not be updated.' });
            }
             const updatedAppointment = await AppointmentModel.findById(parseInt(appointmentId));
            res.status(200).json({ message: 'Appointment rescheduled successfully.', appointment: updatedAppointment });
        } catch (error) {
            console.error('Controller: Error rescheduling appointment:', error);
            res.status(500).json({ message: error.message || 'Failed to reschedule appointment.' });
        }
    }
};

module.exports = AppointmentController;
