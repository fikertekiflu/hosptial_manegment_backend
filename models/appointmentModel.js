// models/appointmentModel.js
const pool = require('../config/db'); // Adjust path

const AppointmentModel = {
    /**
     * Creates a new appointment.
     * @param {object} apptData - { patient_id, doctor_id, appointment_datetime, reason }
     * @returns {Promise<object>} The newly created appointment object.
     */
    async create({ patient_id, doctor_id, appointment_datetime, reason }) {
        const sql = `
            INSERT INTO Appointments (patient_id, doctor_id, appointment_datetime, reason, status) 
            VALUES (?, ?, ?, ?, 'Scheduled') 
        `;
        // Status defaults to 'Scheduled'
        const values = [patient_id, doctor_id, appointment_datetime, reason || null];
        try {
            const [result] = await pool.execute(sql, values);
            // Fetch the newly created appointment to return it
            return this.findById(result.insertId);
        } catch (error) {
            console.error("Error creating appointment in model:", error);
            // Handle potential foreign key constraint errors etc.
             if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 throw new Error('Invalid patient_id or doctor_id provided.');
            }
            throw new Error("Database error creating appointment.");
        }
    },

    /**
     * Finds an appointment by its ID.
     * @param {number} appointmentId
     * @returns {Promise<object|null>}
     */
    async findById(appointmentId) {
        // Example: Join with Patients and Doctors to get names
        const sql = `
            SELECT 
                a.*, 
                p.first_name as patient_first_name, 
                p.last_name as patient_last_name,
                d.first_name as doctor_first_name,
                d.last_name as doctor_last_name,
                d.specialization as doctor_specialization
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            WHERE a.appointment_id = ?
        `;
        try {
            const [rows] = await pool.execute(sql, [appointmentId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding appointment by ID in model:", error);
            throw error;
        }
    },

    /**
     * Finds all appointments for a specific patient.
     * @param {number} patientId
     * @returns {Promise<Array<object>>}
     */
    async findByPatientId(patientId) {
         const sql = `
            SELECT 
                a.*, 
                d.first_name as doctor_first_name,
                d.last_name as doctor_last_name,
                d.specialization as doctor_specialization
            FROM Appointments a
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_datetime DESC
        `;
        try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows;
        } catch (error) {
            console.error("Error finding appointments by patient ID:", error);
            throw error;
        }
    },

    /**
     * Finds appointments for a specific doctor, optionally filtering by date.
     * @param {number} doctorId
     * @param {string} [date] - Optional date string 'YYYY-MM-DD'
     * @returns {Promise<Array<object>>}
     */
    async findByDoctorId(doctorId, date = null) {
        let sql = `
            SELECT 
                a.*, 
                p.first_name as patient_first_name, 
                p.last_name as patient_last_name 
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? 
        `;
        const params = [doctorId];

        if (date) {
            // Filter for appointments on a specific date
            sql += ' AND DATE(a.appointment_datetime) = ?';
            params.push(date);
        }

        sql += ' ORDER BY a.appointment_datetime ASC';

        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error("Error finding appointments by doctor ID:", error);
            throw error;
        }
    },

    /**
     * Updates the status of an appointment.
     * @param {number} appointmentId
     * @param {string} status - New status ('Completed', 'Cancelled', 'No Show')
     * @returns {Promise<boolean>} True if successful.
     */
    async updateStatus(appointmentId, status) {
        const allowedStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No Show'];
        if (!allowedStatuses.includes(status)) {
            throw new Error(`Invalid status value. Must be one of: ${allowedStatuses.join(', ')}`);
        }

        const sql = "UPDATE Appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?";
        try {
            const [result] = await pool.execute(sql, [status, appointmentId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating appointment status in model:", error);
            throw error;
        }
    },

    /**
     * Updates the date and time of an appointment (reschedule).
     * @param {number} appointmentId
     * @param {string} newDateTime - ISO format string or 'YYYY-MM-DD HH:MM:SS'
     * @returns {Promise<boolean>} True if successful.
     */
     async updateDateTime(appointmentId, newDateTime) {
        const sql = "UPDATE Appointments SET appointment_datetime = ?, status = 'Scheduled', updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?";
        // Also reset status to 'Scheduled' when rescheduling? Or handle in controller. Let's reset here.
        try {
            const [result] = await pool.execute(sql, [newDateTime, appointmentId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating appointment datetime in model:", error);
            throw error;
        }
    }

    // deleteById could be added if needed, but cancelling is usually better.
};

module.exports = AppointmentModel;