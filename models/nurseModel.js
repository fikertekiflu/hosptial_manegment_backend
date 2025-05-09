// models/nurseModel.js
const pool = require('../config/db'); // Adjust path if needed

const NurseModel = {
    
    async create(nurseData) {
        const {
            system_user_id, first_name, last_name, department, shift,
            phone_number, email, license_number
        } = nurseData;

        const sql = `
            INSERT INTO Nurses (
                system_user_id, first_name, last_name, department, shift,
                phone_number, email, license_number, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;
        const values = [
            system_user_id || null, first_name, last_name, department || null, shift || null,
            phone_number || null, email || null, license_number || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return { nurse_id: result.insertId, ...nurseData, is_active: true };
        } catch (error) {
            console.error('Error creating nurse in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Duplicate entry for system_user_id, phone_number, email, or license_number.');
            }
            // Handle potential ENUM error for shift if needed
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'shift'")) {
                throw new Error(`Invalid value provided for shift. Must be one of: Day, Evening, Night, Rotating (or NULL).`);
            }
            throw new Error('Failed to create nurse profile due to a database error.');
        }
    },

    async findById(nurseId) {
        const sql = 'SELECT * FROM Nurses WHERE nurse_id = ?';
        try {
            const [rows] = await pool.execute(sql, [nurseId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding nurse by ID in model:', error);
            throw error;
        }
    },

    async findBySystemUserId(systemUserId) {
        const sql = 'SELECT * FROM Nurses WHERE system_user_id = ?';
        try {
            const [rows] = await pool.execute(sql, [systemUserId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding nurse by system_user_id in model:', error);
            throw error;
        }
    },

    async getAll(showInactive = false) {
        let sql = 'SELECT * FROM Nurses';
        if (!showInactive) {
            sql += ' WHERE is_active = TRUE';
        }
        sql += ' ORDER BY last_name, first_name ASC';
        try {
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error getting all nurses in model:', error);
            throw error;
        }
    },

    async update(nurseId, dataToUpdate) {
        const fields = [];
        const values = [];

        if (dataToUpdate.hasOwnProperty('system_user_id')) { fields.push('system_user_id = ?'); values.push(dataToUpdate.system_user_id); }
        if (dataToUpdate.first_name !== undefined) { fields.push('first_name = ?'); values.push(dataToUpdate.first_name); }
        if (dataToUpdate.last_name !== undefined) { fields.push('last_name = ?'); values.push(dataToUpdate.last_name); }
        if (dataToUpdate.department !== undefined) { fields.push('department = ?'); values.push(dataToUpdate.department); }
        if (dataToUpdate.shift !== undefined) { fields.push('shift = ?'); values.push(dataToUpdate.shift); }
        if (dataToUpdate.phone_number !== undefined) { fields.push('phone_number = ?'); values.push(dataToUpdate.phone_number); }
        if (dataToUpdate.email !== undefined) { fields.push('email = ?'); values.push(dataToUpdate.email); }
        if (dataToUpdate.license_number !== undefined) { fields.push('license_number = ?'); values.push(dataToUpdate.license_number); }
        if (dataToUpdate.is_active !== undefined) { fields.push('is_active = ?'); values.push(dataToUpdate.is_active); }

        if (fields.length === 0) {
            throw new Error('No fields provided for nurse update.');
        }

        values.push(nurseId); // For the WHERE clause
        const sql = `UPDATE Nurses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE nurse_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating nurse in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Update failed: system_user_id, phone_number, email, or license_number may already exist for another nurse.');
            }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'shift'")) {
                throw new Error(`Invalid value provided for shift. Must be one of: Day, Evening, Night, Rotating (or NULL).`);
            }
            throw error;
        }
    },

    /**
     * Deletes a nurse profile by ID (Hard Delete).
     * Consider using update to set is_active = false for soft delete.
     * @param {number} nurseId
     * @returns {Promise<boolean>} True if deletion successful.
     */
    async deleteById(nurseId) {
        const sql = 'DELETE FROM Nurses WHERE nurse_id = ?';
        try {
            const [result] = await pool.execute(sql, [nurseId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting nurse in model:', error);
             if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete nurse: This nurse is referenced in other records. Consider deactivating instead.');
            }
            throw error;
        }
    }
};

module.exports = NurseModel;