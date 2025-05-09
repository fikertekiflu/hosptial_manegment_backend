// models/staffAssignmentModel.js
const pool = require('../config/db'); // Adjust path

const StaffAssignmentModel = {
    /**
     * Creates a new staff assignment.
     * @param {object} assignmentData - { patient_id, admission_id, nurse_id, ward_boy_id, assigned_by_doctor_id, task_description, assignment_start_datetime, assignment_end_datetime }
     * @returns {Promise<object>} The newly created assignment object.
     */
    async create(assignmentData) {
        const {
            patient_id, admission_id, nurse_id, ward_boy_id, assigned_by_doctor_id,
            task_description, assignment_start_datetime, assignment_end_datetime
        } = assignmentData;

        // Ensure at least one staff ID is provided (though DB constraint should catch it too)
        if (!nurse_id && !ward_boy_id) {
            throw new Error("Assignment must include either a nurse_id or a ward_boy_id.");
        }

        const sql = `
            INSERT INTO Patient_Staff_Assignments (
                patient_id, admission_id, nurse_id, ward_boy_id, assigned_by_doctor_id,
                task_description, assignment_start_datetime, assignment_end_datetime, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;
        const values = [
            patient_id, admission_id || null, nurse_id || null, ward_boy_id || null, assigned_by_doctor_id || null,
            task_description, assignment_start_datetime, assignment_end_datetime || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return this.findById(result.insertId); // Fetch the full record
        } catch (error) {
            console.error("Error creating staff assignment in model:", error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error('Invalid patient_id, admission_id, nurse_id, ward_boy_id, or assigned_by_doctor_id provided.');
            }
             if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || (error.sqlState && error.sqlState.startsWith('23'))) { // Constraint violation codes can vary
                 throw new Error('Assignment must include either a nurse_id or a ward_boy_id.');
            }
            throw new Error("Database error creating staff assignment.");
        }
    },

    /**
     * Finds an assignment by its ID, joining relevant names.
     * @param {number} assignmentId
     * @returns {Promise<object|null>}
     */
    async findById(assignmentId) {
        // Join with multiple tables to get relevant names
        const sql = `
            SELECT
                psa.*,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                a.admission_datetime, a.discharge_datetime, -- Example from Admissions
                n.first_name AS nurse_first_name, n.last_name AS nurse_last_name,
                wb.first_name AS ward_boy_first_name, wb.last_name AS ward_boy_last_name,
                d.first_name AS assigner_first_name, d.last_name AS assigner_last_name
            FROM Patient_Staff_Assignments psa
            JOIN Patients p ON psa.patient_id = p.patient_id
            LEFT JOIN Admissions a ON psa.admission_id = a.admission_id -- LEFT JOIN for optional links
            LEFT JOIN Nurses n ON psa.nurse_id = n.nurse_id
            LEFT JOIN WardBoys wb ON psa.ward_boy_id = wb.ward_boy_id
            LEFT JOIN Doctors d ON psa.assigned_by_doctor_id = d.doctor_id
            WHERE psa.assignment_id = ?
        `;
        try {
            const [rows] = await pool.execute(sql, [assignmentId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding assignment by ID:", error);
            throw error;
        }
    },

    /**
     * Finds all assignments for a specific patient.
     * @param {number} patientId
     * @returns {Promise<Array<object>>}
     */
    async findByPatientId(patientId) {
         const sql = `
            SELECT
                psa.*,
                n.first_name AS nurse_first_name, n.last_name AS nurse_last_name,
                wb.first_name AS ward_boy_first_name, wb.last_name AS ward_boy_last_name,
                d.first_name AS assigner_first_name, d.last_name AS assigner_last_name
            FROM Patient_Staff_Assignments psa
            LEFT JOIN Nurses n ON psa.nurse_id = n.nurse_id
            LEFT JOIN WardBoys wb ON psa.ward_boy_id = wb.ward_boy_id
            LEFT JOIN Doctors d ON psa.assigned_by_doctor_id = d.doctor_id
            WHERE psa.patient_id = ?
            ORDER BY psa.assignment_start_datetime DESC
        `;
        try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows;
        } catch (error) {
            console.error("Error finding assignments by patient ID:", error);
            throw error;
        }
    },

    // Add findByAdmissionId(admissionId) similarly if needed

    /**
     * Finds active (Pending or In Progress) assignments for a specific Nurse.
     * @param {number} nurseId
     * @returns {Promise<Array<object>>}
     */
    async findActiveByNurseId(nurseId) {
        const sql = `
            SELECT 
                psa.*,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
            FROM Patient_Staff_Assignments psa
            JOIN Patients p ON psa.patient_id = p.patient_id
            WHERE psa.nurse_id = ? AND psa.status IN ('Pending', 'In Progress')
            ORDER BY psa.assignment_start_datetime ASC
        `;
         try {
            const [rows] = await pool.execute(sql, [nurseId]);
            return rows;
        } catch (error) {
            console.error("Error finding active assignments by nurse ID:", error);
            throw error;
        }
    },

    /**
     * Finds active (Pending or In Progress) assignments for a specific Ward Boy.
     * @param {number} wardBoyId
     * @returns {Promise<Array<object>>}
     */
    async findActiveByWardBoyId(wardBoyId) {
         const sql = `
            SELECT 
                psa.*,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
            FROM Patient_Staff_Assignments psa
            JOIN Patients p ON psa.patient_id = p.patient_id
            WHERE psa.ward_boy_id = ? AND psa.status IN ('Pending', 'In Progress')
            ORDER BY psa.assignment_start_datetime ASC
        `;
         try {
            const [rows] = await pool.execute(sql, [wardBoyId]);
            return rows;
        } catch (error) {
            console.error("Error finding active assignments by ward boy ID:", error);
            throw error;
        }
    },


    /**
     * Updates the status of an assignment. Optionally sets end time if completed/cancelled.
     * @param {number} assignmentId
     * @param {string} status - New status ('In Progress', 'Completed', 'Cancelled')
     * @param {string|null} [end_datetime] - Optional end time.
     * @returns {Promise<boolean>} True if successful.
     */
    async updateStatus(assignmentId, status, end_datetime = undefined) {
        const allowedStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
        if (!allowedStatuses.includes(status)) {
             throw new Error(`Invalid status value. Must be one of: ${allowedStatuses.join(', ')}`);
        }

        const fields = ['status = ?'];
        const values = [status];

        // Automatically set end_datetime if status is Completed or Cancelled and end_datetime is provided or not already set
        // Or simply allow end_datetime to be set explicitly if provided
         if (end_datetime !== undefined) {
            fields.push('assignment_end_datetime = ?');
            values.push(end_datetime); // Allows setting null or a specific time
         } else if (['Completed', 'Cancelled'].includes(status)) {
             // Optionally set end time automatically if not provided
             // fields.push('assignment_end_datetime = COALESCE(assignment_end_datetime, CURRENT_TIMESTAMP)');
             // For now, require explicit end time setting or leave it null
         }


        values.push(assignmentId);
        const sql = `UPDATE Patient_Staff_Assignments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE assignment_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating assignment status in model:", error);
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'status'")) {
                throw new Error(`Invalid status value provided.`);
            }
            throw error;
        }
    },

     /**
     * Updates assignment details (e.g., task description, times).
     * @param {number} assignmentId
     * @param {object} dataToUpdate - { task_description, assignment_start_datetime, assignment_end_datetime }
     * @returns {Promise<boolean>}
     */
    async updateDetails(assignmentId, dataToUpdate) {
        const fields = [];
        const values = [];

        if(dataToUpdate.task_description !== undefined) { fields.push('task_description = ?'); values.push(dataToUpdate.task_description); }
        if(dataToUpdate.assignment_start_datetime !== undefined) { fields.push('assignment_start_datetime = ?'); values.push(dataToUpdate.assignment_start_datetime); }
        if(dataToUpdate.hasOwnProperty('assignment_end_datetime')) { fields.push('assignment_end_datetime = ?'); values.push(dataToUpdate.assignment_end_datetime); }

        if (fields.length === 0) throw new Error('No fields provided for assignment update.');

        values.push(assignmentId);
        const sql = `UPDATE Patient_Staff_Assignments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE assignment_id = ?`;

         try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating assignment details:", error);
            throw error;
        }
    }

};

module.exports = StaffAssignmentModel;