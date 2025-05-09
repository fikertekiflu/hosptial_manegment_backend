// models/admissionModel.js
const pool = require('../config/db');
const RoomModel = require('./roomModel'); // Needed to update occupancy

const AdmissionModel = {
    /**
     * Admits a patient: Creates admission record AND updates room occupancy.
     * IMPORTANT: Ideally run within a transaction managed by the Controller/Service layer.
     * @param {object} admissionData - { patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission }
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object>} The newly created admission record.
     */
    async create(admissionData, connection = pool) {
         const { patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission } = admissionData;
        // 1. Increment room occupancy (check if possible first)
        const incrementSuccess = await RoomModel.incrementOccupancy(room_id, connection);
        if (!incrementSuccess) {
            // This means room was full or didn't exist
            throw new Error(`Failed to admit: Room ${room_id} is already at full capacity or does not exist.`);
        }

        // 2. Create the admission record
        const sql = `
            INSERT INTO Admissions (patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [patient_id, room_id, admitting_doctor_id, admission_datetime, reason_for_admission || null];

        try {
            const [result] = await connection.execute(sql, values);
            // Fetch the created record to return
            const newAdmission = await this.findById(result.insertId, connection);
            return newAdmission;
        } catch (error) {
            console.error("Error creating admission record:", error);
             // If insert fails, we should ideally roll back the occupancy increment (requires transaction)
             if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 throw new Error('Invalid patient_id, room_id, or admitting_doctor_id provided.');
             }
             if (error.code === 'ER_DUP_ENTRY' && error.message.includes('unique_active_admission')) {
                  throw new Error('Patient is already actively admitted (discharge_datetime is NULL).');
             }
            throw new Error("Database error creating admission.");
            // Consider rolling back occupancy increment in controller if transaction fails
        }
    },

    /**
     * Finds an admission by its ID. Includes joined data.
     * @param {number} admissionId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object|null>}
     */
    async findById(admissionId, connection = pool) {
        const sql = `
            SELECT 
                ad.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                r.room_number, r.room_type,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Admissions ad
            JOIN Patients p ON ad.patient_id = p.patient_id
            JOIN Rooms r ON ad.room_id = r.room_id
            JOIN Doctors d ON ad.admitting_doctor_id = d.doctor_id
            WHERE ad.admission_id = ?
        `;
        try {
            const [rows] = await connection.execute(sql, [admissionId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
             console.error("Error finding admission by ID:", error);
             throw error;
        }
    },

    /**
     * Finds all admissions for a specific patient.
     * @param {number} patientId
     * @returns {Promise<Array<object>>}
     */
    async findByPatientId(patientId) {
        const sql = `
             SELECT 
                ad.*,
                r.room_number, r.room_type,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Admissions ad
            JOIN Rooms r ON ad.room_id = r.room_id
            JOIN Doctors d ON ad.admitting_doctor_id = d.doctor_id
            WHERE ad.patient_id = ?
            ORDER BY ad.admission_datetime DESC
        `;
         try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows;
        } catch (error) {
             console.error("Error finding admissions by patient ID:", error);
             throw error;
        }
    },

     /**
     * Finds the current (active) admission for a specific patient.
     * @param {number} patientId
     * @returns {Promise<object|null>}
     */
    async findCurrentByPatientId(patientId) {
        const sql = `
             SELECT 
                ad.*,
                r.room_number, r.room_type,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
            FROM Admissions ad
            JOIN Rooms r ON ad.room_id = r.room_id
            JOIN Doctors d ON ad.admitting_doctor_id = d.doctor_id
            WHERE ad.patient_id = ? AND ad.discharge_datetime IS NULL
            LIMIT 1 
        `; // Limit 1 just in case unique constraint fails/isn't perfect
         try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
             console.error("Error finding current admission by patient ID:", error);
             throw error;
        }
    },


    /**
     * Discharges a patient: Updates discharge time AND decrements room occupancy.
     * IMPORTANT: Ideally run within a transaction managed by the Controller/Service layer.
     * @param {number} admissionId
     * @param {string} dischargeDateTime - ISO format or 'YYYY-MM-DD HH:MM:SS'
     * @param {number} roomId - The ID of the room being vacated.
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<boolean>} True if discharge successful.
     */
    async discharge(admissionId, dischargeDateTime, roomId, connection = pool) {
        // 1. Update discharge time
        const sqlUpdate = 'UPDATE Admissions SET discharge_datetime = ?, updated_at = CURRENT_TIMESTAMP WHERE admission_id = ? AND discharge_datetime IS NULL';
        try {
            const [result] = await connection.execute(sqlUpdate, [dischargeDateTime, admissionId]);

            if (result.affectedRows > 0) {
                // 2. Decrement room occupancy only if discharge was successful
                const decrementSuccess = await RoomModel.decrementOccupancy(roomId, connection);
                 if (!decrementSuccess) {
                     // This is tricky - discharge time was set, but occupancy failed (e.g., already 0).
                     // Requires transaction rollback ideally. Log a warning for now.
                     console.warn(`Admission ${admissionId} discharged, but failed to decrement occupancy for room ${roomId}. Occupancy might be inconsistent.`);
                     // Depending on policy, you might still return true or throw specific error
                 }
                return true; // Discharge time was set
            } else {
                // Admission not found or already discharged
                return false;
            }
        } catch (error) {
            console.error("Error discharging patient in model:", error);
            // Consider rolling back occupancy decrement if it happened before error
            throw error;
        }
    }
};

module.exports = AdmissionModel;