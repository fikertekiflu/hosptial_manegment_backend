// models/patientModel.js
const pool = require('../config/db'); 

const PatientModel = {
    
    async create(patientData) {
        const {
            first_name, last_name, date_of_birth, gender, phone_number,
            email, address, emergency_contact_name, emergency_contact_phone
        } = patientData;

        const sql = `
            INSERT INTO Patients (
                first_name, last_name, date_of_birth, gender, phone_number,
                email, address, emergency_contact_name, emergency_contact_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            first_name, last_name, date_of_birth, gender || null, phone_number,
            email || null, address || null, emergency_contact_name || null, emergency_contact_phone || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return { patient_id: result.insertId, ...patientData };
        } catch (error) {
            console.error('Error creating patient in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                // Determine which field caused the duplicate entry if possible
                if (error.message.includes(phone_number)) {
                    throw new Error(`Patient with phone number '${phone_number}' already exists.`);
                } else if (email && error.message.includes(email)) {
                    throw new Error(`Patient with email '${email}' already exists.`);
                }
                throw new Error('Duplicate entry for phone number or email.');
            }
            throw new Error('Failed to register patient due to a database error.');
        }
    },

    /**
     * Finds a patient by their ID.
     * @param {number} patientId - The ID of the patient to find.
     * @returns {Promise<object|null>} The patient object if found, otherwise null.
     */
    async findById(patientId) {
        const sql = 'SELECT * FROM Patients WHERE patient_id = ?';
        try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding patient by ID in model:', error);
            throw new Error('Database query failed while finding patient by ID.');
        }
    },

    /**
     * Finds a patient by their phone number.
     * @param {string} phoneNumber - The phone number to search for.
     * @returns {Promise<object|null>} The patient object if found, otherwise null.
     */
    async findByPhoneNumber(phoneNumber) {
        const sql = 'SELECT * FROM Patients WHERE phone_number = ?';
        try {
            const [rows] = await pool.execute(sql, [phoneNumber]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding patient by phone number in model:', error);
            throw new Error('Database query failed while finding patient by phone number.');
        }
    },

    /**
     * Retrieves all patients from the database.
     * (In a real app, you'd add pagination, filtering, and sorting here)
     * @returns {Promise<Array<object>>} An array of patient objects.
     */
    async getAll() {
        const sql = 'SELECT * FROM Patients ORDER BY last_name, first_name ASC';
        try {
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error getting all patients in model:', error);
            throw new Error('Database query failed while retrieving all patients.');
        }
    },

    /**
     * Updates an existing patient's record.
     * @param {number} patientId - The ID of the patient to update.
     * @param {object} patientDataToUpdate - Object containing fields to update.
     * @returns {Promise<boolean>} True if update was successful (at least one row affected), false otherwise.
     */
    async update(patientId, patientDataToUpdate) {
        // Build the query dynamically based on provided fields
        const fields = [];
        const values = [];

        // Add more fields as needed from your patientDataToUpdate object
        if (patientDataToUpdate.first_name !== undefined) { fields.push('first_name = ?'); values.push(patientDataToUpdate.first_name); }
        if (patientDataToUpdate.last_name !== undefined) { fields.push('last_name = ?'); values.push(patientDataToUpdate.last_name); }
        if (patientDataToUpdate.date_of_birth !== undefined) { fields.push('date_of_birth = ?'); values.push(patientDataToUpdate.date_of_birth); }
        if (patientDataToUpdate.gender !== undefined) { fields.push('gender = ?'); values.push(patientDataToUpdate.gender); }
        if (patientDataToUpdate.phone_number !== undefined) { fields.push('phone_number = ?'); values.push(patientDataToUpdate.phone_number); }
        if (patientDataToUpdate.email !== undefined) { fields.push('email = ?'); values.push(patientDataToUpdate.email); }
        if (patientDataToUpdate.address !== undefined) { fields.push('address = ?'); values.push(patientDataToUpdate.address); }
        if (patientDataToUpdate.emergency_contact_name !== undefined) { fields.push('emergency_contact_name = ?'); values.push(patientDataToUpdate.emergency_contact_name); }
        if (patientDataToUpdate.emergency_contact_phone !== undefined) { fields.push('emergency_contact_phone = ?'); values.push(patientDataToUpdate.emergency_contact_phone); }

        if (fields.length === 0) {
            throw new Error('No fields provided for update.');
        }

        values.push(patientId); // For the WHERE clause

        const sql = `UPDATE Patients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE patient_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating patient in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Update failed: Phone number or email may already exist for another patient.');
            }
            throw new Error('Failed to update patient due to a database error.');
        }
    }
};

module.exports = PatientModel;