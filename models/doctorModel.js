// models/doctorModel.js
const pool = require('../config/db'); 

const DoctorModel = {
    
    async create(doctorData) {
        const {
            system_user_id, first_name, last_name, specialization,
            phone_number, email, license_number
        } = doctorData;

        const sql = `
            INSERT INTO Doctors (
                system_user_id, first_name, last_name, specialization, 
                phone_number, email, license_number, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `;
        const values = [
            system_user_id || null, first_name, last_name, specialization || null,
            phone_number || null, email || null, license_number || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return { doctor_id: result.insertId, ...doctorData, is_active: true };
        } catch (error) {
            console.error('Error creating doctor in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Duplicate entry for system_user_id, phone_number, email, or license_number.');
            }
            throw new Error('Failed to create doctor profile due to a database error.');
        }
    },

    async findById(doctorId) {
        const sql = 'SELECT * FROM Doctors WHERE doctor_id = ?';
        try {
            const [rows] = await pool.execute(sql, [doctorId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding doctor by ID in model:', error);
            throw error;
        }
    },

    async findBySystemUserId(systemUserId) {
        const sql = 'SELECT * FROM Doctors WHERE system_user_id = ?';
        try {
            const [rows] = await pool.execute(sql, [systemUserId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding doctor by system_user_id in model:', error);
            throw error;
        }
    },

    
    async getAll(showInactive = false) {
        let sql = 'SELECT * FROM Doctors';
        if (!showInactive) {
            sql += ' WHERE is_active = TRUE';
        }
        sql += ' ORDER BY last_name, first_name ASC';
        try {
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error getting all doctors in model:', error);
            throw error;
        }
    },

    async update(doctorId, dataToUpdate) {
        const fields = [];
        const values = [];

        // Add fields from dataToUpdate to arrays
        if (dataToUpdate.hasOwnProperty('system_user_id')) { fields.push('system_user_id = ?'); values.push(dataToUpdate.system_user_id); }
        if (dataToUpdate.first_name !== undefined) { fields.push('first_name = ?'); values.push(dataToUpdate.first_name); }
        if (dataToUpdate.last_name !== undefined) { fields.push('last_name = ?'); values.push(dataToUpdate.last_name); }
        if (dataToUpdate.specialization !== undefined) { fields.push('specialization = ?'); values.push(dataToUpdate.specialization); }
        if (dataToUpdate.phone_number !== undefined) { fields.push('phone_number = ?'); values.push(dataToUpdate.phone_number); }
        if (dataToUpdate.email !== undefined) { fields.push('email = ?'); values.push(dataToUpdate.email); }
        if (dataToUpdate.license_number !== undefined) { fields.push('license_number = ?'); values.push(dataToUpdate.license_number); }
        if (dataToUpdate.is_active !== undefined) { fields.push('is_active = ?'); values.push(dataToUpdate.is_active); }


        if (fields.length === 0) {
            throw new Error('No fields provided for doctor update.');
        }

        values.push(doctorId); // For the WHERE clause
        const sql = `UPDATE Doctors SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating doctor in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Update failed: system_user_id, phone_number, email, or license_number may already exist for another doctor.');
            }
            throw error;
        }
    },

    async deleteById(doctorId) {
        const sql = 'DELETE FROM Doctors WHERE doctor_id = ?';
        try {
            const [result] = await pool.execute(sql, [doctorId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting doctor in model:', error);
            // Handle foreign key constraint errors if doctors are linked elsewhere (e.g., Appointments)
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete doctor: This doctor is referenced in other records (e.g., appointments). Consider deactivating instead.');
            }
            throw error;
        }
    }
};

module.exports = DoctorModel;