// controllers/patientController.js
const PatientModel = require('../models/patientModel');

const PatientController = {
    
    async registerPatient(req, res) {
        const patientData = req.body;

        // Basic Server-Side Validation (more robust validation recommended for production)
        if (!patientData.first_name || !patientData.last_name || !patientData.date_of_birth || !patientData.phone_number) {
            return res.status(400).json({ message: 'Missing required fields: first_name, last_name, date_of_birth, phone_number.' });
        }
        // Add more validation: date format, phone format, email format, gender enum etc.

        try {
            // Optional: Check if patient with the same phone number already exists
            const existingPatientByPhone = await PatientModel.findByPhoneNumber(patientData.phone_number);
            if (existingPatientByPhone) {
                return res.status(409).json({ message: `Patient with phone number '${patientData.phone_number}' already exists.` });
            }
            if (patientData.email) {
                // Optional: Check for existing email if provided
                // const existingPatientByEmail = await PatientModel.findByEmail(patientData.email);
                // if (existingPatientByEmail) { /* handle duplicate email */ }
            }

            const newPatient = await PatientModel.create(patientData);
            res.status(201).json({
                message: 'Patient registered successfully!',
                patient: newPatient
            });
        } catch (error) {
            console.error('Controller: Error registering patient:', error);
            // Model might throw specific errors like duplicate entry
            if (error.message.includes('already exists')) {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to register patient on the server.' });
        }
    },

    /**
     * Gets all patients.
     */
    async getAllPatients(req, res) {
        try {
            const patients = await PatientModel.getAll();
            res.status(200).json(patients);
        } catch (error) {
            console.error('Controller: Error fetching all patients:', error);
            res.status(500).json({ message: 'Failed to retrieve patients.' });
        }
    },

    /**
     * Gets a single patient by their ID.
     */
    async getPatientById(req, res) {
        const { patientId } = req.params;
        if (isNaN(parseInt(patientId))) {
            return res.status(400).json({ message: 'Invalid patient ID format.' });
        }

        try {
            const patient = await PatientModel.findById(patientId);
            if (!patient) {
                return res.status(404).json({ message: 'Patient not found.' });
            }
            res.status(200).json(patient);
        } catch (error) {
            console.error('Controller: Error fetching patient by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve patient data.' });
        }
    },

    /**
     * Updates an existing patient's details.
     */
    async updatePatient(req, res) {
        const { patientId } = req.params;
        const patientDataToUpdate = req.body;

        if (isNaN(parseInt(patientId))) {
            return res.status(400).json({ message: 'Invalid patient ID format.' });
        }
        if (Object.keys(patientDataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }

        try {
            // Check if patient exists before attempting update
            const patientExists = await PatientModel.findById(patientId);
            if (!patientExists) {
                return res.status(404).json({ message: 'Patient not found for update.' });
            }

            // If phone_number is being updated, check if the new one is already taken by another patient
            if (patientDataToUpdate.phone_number && patientDataToUpdate.phone_number !== patientExists.phone_number) {
                const existingPatientByPhone = await PatientModel.findByPhoneNumber(patientDataToUpdate.phone_number);
                if (existingPatientByPhone && existingPatientByPhone.patient_id !== parseInt(patientId)) {
                    return res.status(409).json({ message: `Phone number '${patientDataToUpdate.phone_number}' is already in use by another patient.` });
                }
            }
            // Similar check for email if it's being updated

            const success = await PatientModel.update(patientId, patientDataToUpdate);
            if (!success) {
                // This case might be rare if existence is checked above, but could happen if data didn't change
                return res.status(304).json({ message: 'No changes applied to patient details.' }); // Not Modified
            }

            const updatedPatient = await PatientModel.findById(patientId); // Fetch the updated record
            res.status(200).json({ message: 'Patient details updated successfully!', patient: updatedPatient });
        } catch (error) {
            console.error('Controller: Error updating patient:', error);
            if (error.message.includes('already exist')) {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to update patient details on the server.' });
        }
    }
};

module.exports = PatientController;