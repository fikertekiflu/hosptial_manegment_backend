// controllers/admissionController.js
const AdmissionModel = require('../models/admissionModel');
const PatientModel = require('../models/patientModel');
const DoctorModel = require('../models/doctorModel');
const RoomModel = require('../models/roomModel');
const pool = require('../config/db'); // Required for transactions

const AdmissionController = {

    /**
     * Admit a patient to a room.
     */
    async admitPatient(req, res) {
        const { patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission } = req.body;

        // Validation
        if (!patient_id || !room_id || !admitting_doctor_id || !admission_datetime) {
            return res.status(400).json({ message: 'patient_id, room_id, admitting_doctor_id, and admission_datetime are required.' });
        }
        if (isNaN(Date.parse(admission_datetime))) {
            return res.status(400).json({ message: 'Invalid admission_datetime format.' });
        }

        let connection;
        try {
            // --- Pre-checks ---
            const patient = await PatientModel.findById(patient_id);
            if (!patient) return res.status(404).json({ message: `Patient with ID ${patient_id} not found.` });

            const doctor = await DoctorModel.findById(admitting_doctor_id);
            if (!doctor) return res.status(404).json({ message: `Doctor with ID ${admitting_doctor_id} not found.` });
            if (!doctor.is_active) return res.status(400).json({ message: `Admitting Doctor ID ${admitting_doctor_id} is not active.` });

            const room = await RoomModel.findById(room_id);
            if (!room) return res.status(404).json({ message: `Room with ID ${room_id} not found.` });
            if (!room.is_active) return res.status(400).json({ message: `Room ${room.room_number} is not currently active.` });

             // Check availability explicitly before trying to admit
             if (room.current_occupancy >= room.capacity) {
                  return res.status(409).json({ message: `Room ${room.room_number} is already full (Capacity: ${room.capacity}, Occupancy: ${room.current_occupancy}).` });
             }

             // Check if patient is already actively admitted
             const currentAdmission = await AdmissionModel.findCurrentByPatientId(patient_id);
             if (currentAdmission) {
                 return res.status(409).json({ message: `Patient (ID: ${patient_id}) is already admitted (Admission ID: ${currentAdmission.admission_id}). Discharge first before admitting again.` });
             }

            // --- Perform admission within a transaction ---
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const admissionData = { patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission };
            // Pass connection to model methods
            const newAdmission = await AdmissionModel.create(admissionData, connection);

            await connection.commit(); // If both model steps inside create() succeeded, commit

            res.status(201).json({ message: 'Patient admitted successfully!', admission: newAdmission });

        } catch (error) {
            // If anything failed, roll back the transaction
            if (connection) await connection.rollback();
            console.error("Controller: Error admitting patient:", error);
             // Send specific errors based on model exceptions
             if (error.message.includes('full capacity') || error.message.includes('already actively admitted')) {
                 return res.status(409).json({ message: error.message });
             }
             if (error.message.includes('Invalid patient_id, room_id, or admitting_doctor_id')) {
                 return res.status(400).json({ message: error.message });
             }
            res.status(500).json({ message: error.message || 'Failed to admit patient due to a server error.' });
        } finally {
            // Always release the connection back to the pool
            if (connection) connection.release();
        }
    },

     
    async dischargePatient(req, res) {
        const { admissionId } = req.params;
        const { discharge_datetime } = req.body;

        if (!discharge_datetime) {
            return res.status(400).json({ message: 'discharge_datetime is required.' });
        }
        if (isNaN(Date.parse(discharge_datetime))) {
             return res.status(400).json({ message: 'Invalid discharge_datetime format.' });
         }

        let connection;
        try {
            // Find the admission record first to get room_id and check status
            const admission = await AdmissionModel.findById(admissionId);
            if (!admission) {
                return res.status(404).json({ message: `Admission record with ID ${admissionId} not found.` });
            }
            if (admission.discharge_datetime !== null) {
                return res.status(400).json({ message: `Patient for admission ID ${admissionId} was already discharged on ${admission.discharge_datetime}.` });
            }
            // Basic validation: discharge time should be after admission time
            if (new Date(discharge_datetime) < new Date(admission.admission_datetime)) {
                 return res.status(400).json({ message: 'Discharge datetime cannot be before admission datetime.' });
            }


            // --- Perform discharge within a transaction ---
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Pass connection to model methods
            const success = await AdmissionModel.discharge(admissionId, discharge_datetime, admission.room_id, connection);

            if (!success) {
                // This case should be rare if findById worked, but maybe concurrency issue
                await connection.rollback();
                return res.status(404).json({ message: 'Admission not found or already discharged during update.' });
            }

            await connection.commit(); // If both model steps inside discharge() succeeded, commit

            const updatedAdmission = await AdmissionModel.findById(admissionId); // Fetch final state
            res.status(200).json({ message: 'Patient discharged successfully!', admission: updatedAdmission });

        } catch (error) {
             if (connection) await connection.rollback();
             console.error("Controller: Error discharging patient:", error);
             res.status(500).json({ message: error.message || 'Failed to discharge patient due to a server error.' });
        } finally {
            if (connection) connection.release();
        }
    },

    /**
     * Get details of a specific admission.
     */
    async getAdmissionDetails(req, res) {
        const { admissionId } = req.params;
        try {
            const admission = await AdmissionModel.findById(admissionId);
            if (!admission) {
                return res.status(404).json({ message: 'Admission record not found.' });
            }
             // Add authorization logic if needed (e.g., only involved staff/patient/admin can view)
            res.status(200).json(admission);
        } catch (error) {
            console.error('Controller: Error getting admission details:', error);
            res.status(500).json({ message: 'Failed to retrieve admission data.' });
        }
    },

    /**
     * Get admission history for a specific patient.
     */
    async getPatientAdmissions(req, res) {
        const { patientId } = req.params;
        try {
            // Verify patient exists first
            const patient = await PatientModel.findById(patientId);
            if (!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.` });

            // Add authorization logic if needed

            const admissions = await AdmissionModel.findByPatientId(patientId);
            res.status(200).json(admissions);
        } catch (error) {
            console.error('Controller: Error fetching admissions for patient:', error);
            res.status(500).json({ message: 'Failed to retrieve patient admissions.' });
        }
    }
};

module.exports = AdmissionController;