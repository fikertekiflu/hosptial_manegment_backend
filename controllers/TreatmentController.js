// controllers/treatmentController.js
const TreatmentModel = require('../models/treatmentModel');
const PatientModel = require('../models/patientModel'); // To validate patient_id
const DoctorModel = require('../models/doctorModel');   // To validate doctor_id
const AppointmentModel = require('../models/appointmentModel'); // To validate appointment_id
// const AdmissionModel = require('../models/admissionModel'); // Add later

const TreatmentController = {
    
    async logTreatment(req, res) {
        // User performing the action (usually doctor or nurse) identified by auth middleware
        const loggedInUserId = req.user.userId; // from authenticateToken
        const loggedInUserRole = req.user.role; // from authenticateToken

        const {
            patient_id, // Required
            doctor_id,  // Required (doctor responsible, might be different from loggedInUser if nurse is logging)
            appointment_id, // Optional
            admission_id,   // Optional
            treatment_name,
            diagnosis,
            treatment_plan,
            medications_prescribed,
            start_datetime, // Required
            end_datetime,
            notes
        } = req.body;

        // Validation
        if (!patient_id || !doctor_id || !start_datetime) {
            return res.status(400).json({ message: 'patient_id, doctor_id, and start_datetime are required.' });
        }
         if (isNaN(Date.parse(start_datetime))) {
             return res.status(400).json({ message: 'Invalid start_datetime format.' });
        }
        if (end_datetime && isNaN(Date.parse(end_datetime))) {
             return res.status(400).json({ message: 'Invalid end_datetime format.' });
        }

        try {
            // Verify existence of linked entities
            const patient = await PatientModel.findById(patient_id);
            if (!patient) return res.status(404).json({ message: `Patient with ID ${patient_id} not found.` });

            const doctor = await DoctorModel.findById(doctor_id);
            if (!doctor) return res.status(404).json({ message: `Doctor with ID ${doctor_id} not found.` });
             if (!doctor.is_active) return res.status(400).json({ message: `Doctor ID ${doctor_id} is not active.` });

            if (appointment_id) {
                const appointment = await AppointmentModel.findById(appointment_id);
                if (!appointment) return res.status(404).json({ message: `Appointment with ID ${appointment_id} not found.` });
                // Optional: Check if appointment patient/doctor match the provided patient/doctor IDs
                if(appointment.patient_id !== parseInt(patient_id) || appointment.doctor_id !== parseInt(doctor_id)){
                     return res.status(400).json({ message: 'Provided appointment does not match the specified patient and doctor.' });
                }
            }
            // Add similar check for admission_id when AdmissionModel exists

            const treatmentData = {
                patient_id, doctor_id, appointment_id, admission_id, treatment_name,
                diagnosis, treatment_plan, medications_prescribed, start_datetime,
                end_datetime, notes
             };

            const newTreatment = await TreatmentModel.create(treatmentData);
            res.status(201).json({ message: 'Treatment logged successfully!', treatment: newTreatment });

        } catch (error) {
            console.error("Controller: Error logging treatment:", error);
             if (error.message.includes('Invalid patient_id, doctor_id, or appointment_id')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || "Failed to log treatment." });
        }
    },

    /**
     * Get details of a specific treatment.
     */
    async getTreatmentById(req, res) {
        const { treatmentId } = req.params;
        try {
            const treatment = await TreatmentModel.findById(treatmentId);
            if (!treatment) {
                return res.status(404).json({ message: 'Treatment record not found.' });
            }
            // Add authorization check: can the logged-in user view this?
            // e.g., check if req.user.role is Admin/Doctor/Nurse OR if req.user.userId matches linked doctor/patient system_user_id
            res.status(200).json(treatment);
        } catch (error) {
            console.error('Controller: Error getting treatment by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve treatment data.' });
        }
    },

    /**
     * Get all treatments for a specific patient.
     */
    async getTreatmentsForPatient(req, res) {
        const { patientId } = req.params;
        try {
             // Verify patient exists
             const patient = await PatientModel.findById(patientId);
             if (!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.` });

             // Add authorization checks here

            const treatments = await TreatmentModel.findByPatientId(patientId);
            res.status(200).json(treatments);
        } catch (error) {
            console.error('Controller: Error fetching treatments for patient:', error);
            res.status(500).json({ message: 'Failed to retrieve patient treatments.' });
        }
    },

     /**
     * Update an existing treatment record (e.g., add notes, set end time).
     */
    async updateTreatment(req, res) {
        const { treatmentId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }
        // Add validation for specific fields being updated if needed

        try {
            const treatment = await TreatmentModel.findById(treatmentId);
            if (!treatment) {
                return res.status(404).json({ message: 'Treatment record not found for update.' });
            }

             // Add authorization checks - e.g., only the doctor who created it or an admin can update?

            const success = await TreatmentModel.update(treatmentId, dataToUpdate);
            if (!success) {
                return res.status(304).json({ message: 'No changes applied to treatment record.' });
            }
            const updatedTreatment = await TreatmentModel.findById(treatmentId);
            res.status(200).json({ message: 'Treatment record updated successfully!', treatment: updatedTreatment });
        } catch (error) {
            console.error("Controller: Error updating treatment:", error);
            res.status(500).json({ message: error.message || "Failed to update treatment record." });
        }
    }
};

module.exports = TreatmentController;