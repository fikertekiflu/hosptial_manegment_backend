// models/treatmentModel.js
const pool = require('../config/db'); // Adjust path

const TreatmentModel = {
    /**
     * Creates a new treatment record.
     * @param {object} treatmentData - { patient_id, doctor_id, appointment_id, admission_id, treatment_name, ..., start_datetime }
     * @returns {Promise<object>} The newly created treatment object.
     */
    async create(treatmentData) {
        const {
            patient_id, doctor_id, appointment_id, admission_id, treatment_name,
            diagnosis, treatment_plan, medications_prescribed, start_datetime,
            end_datetime, notes
        } = treatmentData;

        const sql = `
            INSERT INTO Treatments (
                patient_id, doctor_id, appointment_id, admission_id, treatment_name,
                diagnosis, treatment_plan, medications_prescribed, start_datetime,
                end_datetime, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            patient_id, doctor_id, appointment_id || null, admission_id || null, treatment_name || null,
            diagnosis || null, treatment_plan || null, medications_prescribed || null, start_datetime,
            end_datetime || null, notes || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return this.findById(result.insertId); // Fetch the full record to return
        } catch (error) {
            console.error("Error creating treatment in model:", error);
             if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 throw new Error('Invalid patient_id, doctor_id, or appointment_id provided.'); // Add admission_id check later
            }
            throw new Error("Database error creating treatment record.");
        }
    },

    /**
     * Finds a treatment by its ID. Joins with related tables for context.
     * @param {number} treatmentId
     * @returns {Promise<object|null>}
     */
    async findById(treatmentId) {
        const sql = `
            SELECT 
                t.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Treatments t
            JOIN Patients p ON t.patient_id = p.patient_id
            JOIN Doctors d ON t.doctor_id = d.doctor_id
            WHERE t.treatment_id = ?
        `;
        try {
            const [rows] = await pool.execute(sql, [treatmentId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding treatment by ID in model:", error);
            throw error;
        }
    },

    /**
     * Finds all treatments for a specific patient.
     * @param {number} patientId
     * @returns {Promise<Array<object>>}
     */
    async findByPatientId(patientId) {
        const sql = `
            SELECT 
                t.*, 
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Treatments t
            JOIN Doctors d ON t.doctor_id = d.doctor_id
            WHERE t.patient_id = ?
            ORDER BY t.start_datetime DESC
        `;
        try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows;
        } catch (error) {
            console.error("Error finding treatments by patient ID:", error);
            throw error;
        }
    },

    /**
     * Finds all treatments related to a specific appointment.
     * @param {number} appointmentId
     * @returns {Promise<Array<object>>}
     */
    async findByAppointmentId(appointmentId) {
        const sql = `
            SELECT 
                t.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Treatments t
            JOIN Patients p ON t.patient_id = p.patient_id
            JOIN Doctors d ON t.doctor_id = d.doctor_id
            WHERE t.appointment_id = ?
            ORDER BY t.start_datetime DESC
        `;
        try {
            const [rows] = await pool.execute(sql, [appointmentId]);
            return rows;
        } catch (error) {
            console.error("Error finding treatments by appointment ID:", error);
            throw error;
        }
    },

    // Add findByAdmissionId(admissionId) later

    /**
     * Updates an existing treatment record (e.g., add notes, end_datetime).
     * @param {number} treatmentId
     * @param {object} dataToUpdate - Fields to update { treatment_name, diagnosis, ..., notes, end_datetime }
     * @returns {Promise<boolean>} True if update successful.
     */
    async update(treatmentId, dataToUpdate) {
        const fields = [];
        const values = [];

        // Add fields from dataToUpdate dynamically
        if (dataToUpdate.treatment_name !== undefined) { fields.push('treatment_name = ?'); values.push(dataToUpdate.treatment_name); }
        if (dataToUpdate.diagnosis !== undefined) { fields.push('diagnosis = ?'); values.push(dataToUpdate.diagnosis); }
        if (dataToUpdate.treatment_plan !== undefined) { fields.push('treatment_plan = ?'); values.push(dataToUpdate.treatment_plan); }
        if (dataToUpdate.medications_prescribed !== undefined) { fields.push('medications_prescribed = ?'); values.push(dataToUpdate.medications_prescribed); }
        if (dataToUpdate.start_datetime !== undefined) { fields.push('start_datetime = ?'); values.push(dataToUpdate.start_datetime); } // Careful updating start time
        if (dataToUpdate.hasOwnProperty('end_datetime')) { fields.push('end_datetime = ?'); values.push(dataToUpdate.end_datetime); } // Allow setting end_datetime to null
        if (dataToUpdate.notes !== undefined) { fields.push('notes = ?'); values.push(dataToUpdate.notes); }
        // Cannot update patient_id, doctor_id, appointment_id easily, usually fixed once created

        if (fields.length === 0) {
            throw new Error('No fields provided for treatment update.');
        }

        values.push(treatmentId); // For the WHERE clause
        const sql = `UPDATE Treatments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE treatment_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating treatment in model:', error);
            throw error;
        }
    }
    // Delete might not be applicable for medical records. Updates or cancellations are better.
};

module.exports = TreatmentModel;