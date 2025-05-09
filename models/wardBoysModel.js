// models/wardBoyModel.js
const pool = require('../config/db');

const WardBoyModel = {
    
    async create(wardBoyData) {
        const {
            system_user_id, first_name, last_name, assigned_ward, shift, phone_number
        } = wardBoyData;

        const sql = `
            INSERT INTO WardBoys (
                system_user_id, first_name, last_name, assigned_ward, shift, phone_number, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `;
        const values = [
            system_user_id || null, first_name, last_name, assigned_ward || null, shift || null, phone_number || null
        ];

        try {
            const [result] = await pool.execute(sql, values);
            return { ward_boy_id: result.insertId, ...wardBoyData, is_active: true };
        } catch (error) {
            console.error('Error creating ward boy in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Duplicate entry for system_user_id or phone_number.');
            }
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'shift'")) {
                throw new Error(`Invalid value provided for shift. Must be one of: Day, Evening, Night, Rotating (or NULL).`);
            }
            throw new Error('Failed to create ward boy profile due to a database error.');
        }
    },

    async findById(wardBoyId) {
        const sql = 'SELECT * FROM WardBoys WHERE ward_boy_id = ?';
        try {
            const [rows] = await pool.execute(sql, [wardBoyId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding ward boy by ID in model:', error);
            throw error;
        }
    },

    async findBySystemUserId(systemUserId) {
        const sql = 'SELECT * FROM WardBoys WHERE system_user_id = ?';
        try {
            const [rows] = await pool.execute(sql, [systemUserId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding ward boy by system_user_id in model:', error);
            throw error;
        }
    },

    async getAll(showInactive = false) {
        let sql = 'SELECT * FROM WardBoys';
        if (!showInactive) {
            sql += ' WHERE is_active = TRUE';
        }
        sql += ' ORDER BY last_name, first_name ASC';
        try {
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error getting all ward boys in model:', error);
            throw error;
        }
    },

    async update(wardBoyId, dataToUpdate) {
        const fields = [];
        const values = [];

        if (dataToUpdate.hasOwnProperty('system_user_id')) { fields.push('system_user_id = ?'); values.push(dataToUpdate.system_user_id); }
        if (dataToUpdate.first_name !== undefined) { fields.push('first_name = ?'); values.push(dataToUpdate.first_name); }
        if (dataToUpdate.last_name !== undefined) { fields.push('last_name = ?'); values.push(dataToUpdate.last_name); }
        if (dataToUpdate.assigned_ward !== undefined) { fields.push('assigned_ward = ?'); values.push(dataToUpdate.assigned_ward); }
        if (dataToUpdate.shift !== undefined) { fields.push('shift = ?'); values.push(dataToUpdate.shift); }
        if (dataToUpdate.phone_number !== undefined) { fields.push('phone_number = ?'); values.push(dataToUpdate.phone_number); }
        if (dataToUpdate.is_active !== undefined) { fields.push('is_active = ?'); values.push(dataToUpdate.is_active); }


        if (fields.length === 0) {
            throw new Error('No fields provided for ward boy update.');
        }

        values.push(wardBoyId); // For the WHERE clause
        const sql = `UPDATE WardBoys SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE ward_boy_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating ward boy in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Update failed: system_user_id or phone_number may already exist for another ward boy.');
            }
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'shift'")) {
                throw new Error(`Invalid value provided for shift. Must be one of: Day, Evening, Night, Rotating (or NULL).`);
            }
            throw error;
        }
    },

    async deleteById(wardBoyId) {
        const sql = 'DELETE FROM WardBoys WHERE ward_boy_id = ?';
        try {
            const [result] = await pool.execute(sql, [wardBoyId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting ward boy in model:', error);
             if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete ward boy: This ward boy is referenced in other records. Consider deactivating instead.');
            }
            throw error;
        }
    }
};

module.exports = WardBoyModel;