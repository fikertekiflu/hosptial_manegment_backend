// models/appointmentModel.js
const pool = require('../config/db'); // Adjust path
const { format, isValid } = require('date-fns'); // For date formatting in filters

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
        const values = [patient_id, doctor_id, appointment_datetime, reason || null];
        try {
            const [result] = await pool.execute(sql, values);
            return this.findById(result.insertId); // Fetch the full record to return
        } catch (error) {
            console.error("Error creating appointment in model:", error);
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
        // Safety check for undefined or null ID
        if (appointmentId === undefined || appointmentId === null) {
            console.error("AppointmentModel.findById called with undefined or null appointmentId");
            throw new Error("Appointment ID cannot be undefined or null when finding by ID.");
        }
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
     * Retrieves all appointments, with optional filtering.
     * This function is used by ManageAppointmentsPage.
     * @param {object} filters - { dateFrom, dateTo, doctorId, status, patientSearch (for patient name/ID) }
     * @returns {Promise<Array<object>>}
     */
    async getAll(filters = {}) {
        let sql = `
            SELECT 
                a.*, 
                p.first_name as patient_first_name, 
                p.last_name as patient_last_name,
                p.phone_number as patient_phone_number, -- Added for potential display/search
                d.first_name as doctor_first_name,
                d.last_name as doctor_last_name,
                d.specialization as doctor_specialization
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
        `;
        const whereClauses = [];
        const values = [];

        if (filters.dateFrom && isValid(new Date(filters.dateFrom))) {
            whereClauses.push('DATE(a.appointment_datetime) >= ?');
            values.push(format(new Date(filters.dateFrom), 'yyyy-MM-dd'));
        }
        if (filters.dateTo && isValid(new Date(filters.dateTo))) {
            whereClauses.push('DATE(a.appointment_datetime) <= ?');
            values.push(format(new Date(filters.dateTo), 'yyyy-MM-dd'));
        }
        if (filters.doctorId) {
            whereClauses.push('a.doctor_id = ?');
            values.push(filters.doctorId);
        }
        if (filters.status) {
            // Handle multiple statuses if sent as comma-separated string
            const statuses = filters.status.split(',').map(s => s.trim()).filter(s => s);
            if (statuses.length > 0) {
                const placeholders = statuses.map(() => '?').join(',');
                whereClauses.push(`a.status IN (${placeholders})`);
                values.push(...statuses);
            }
        }
        if (filters.patientSearch) {
            // Search by patient's first name, last name, or patient_id (casted to char for LIKE)
            whereClauses.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR CAST(p.patient_id AS CHAR) LIKE ?)');
            const searchTerm = `%${filters.patientSearch}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }
        // Add other filters as needed (e.g., specific patient_id if viewing one patient's history)

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        sql += ' ORDER BY a.appointment_datetime DESC'; // Or your preferred default sort

        // For pagination later:
        // sql += ' LIMIT ? OFFSET ?';
        // values.push(limit, offset);

        try {
            const [rows] = await pool.execute(sql, values);
            return rows;
        } catch (error) {
            console.error("Error getting all appointments in model:", error);
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
     * Finds appointments for a specific doctor, optionally filtering by a single date.
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

        if (date && isValid(new Date(date))) { // Check if date is valid before formatting
            sql += ' AND DATE(a.appointment_datetime) = ?';
            params.push(format(new Date(date), 'yyyy-MM-dd'));
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
     * @param {string} status - New status ('Completed', 'Cancelled', 'No Show', 'Checked-In')
     * @returns {Promise<boolean>} True if successful.
     */
    async updateStatus(appointmentId, status) {
        const allowedStatuses = ['Scheduled', 'Completed', 'Cancelled', 'No Show', 'Checked-In'];
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
        // Also reset status to 'Scheduled' when rescheduling.
        try {
            const [result] = await pool.execute(sql, [newDateTime, appointmentId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating appointment datetime in model:", error);
            throw error;
        }
    }
};

module.exports = AppointmentModel;
