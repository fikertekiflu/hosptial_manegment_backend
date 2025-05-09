
const pool = require('../config/db'); // Your database connection pool
const bcrypt = require('bcryptjs');

const SystemUserModel = {
   
    async create({ username, password, role, full_name, linked_staff_id }) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO SystemUsers (username, password_hash, role, full_name, linked_staff_id, is_active)
            VALUES (?, ?, ?, ?, ?, TRUE)
        `;
        const values = [username, hashedPassword, role, full_name, linked_staff_id || null];

        try {
            const [result] = await pool.execute(sql, values);
            return { userId: result.insertId, username, role };
        } catch (error) {
            console.error('Error creating system user in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Username '${username}' already exists.`);
            }
            throw new Error('Failed to create system user due to a database error.');
        }
    },

    /**
     * Finds a user by their username.
     * @param {string} username - The username to search for.
     * @returns {Promise<object|null>} The user object (including password_hash for login checks) or null if not found.
     */
    async findByUsername(username) {
        const sql = 'SELECT user_id, username, password_hash, role, linked_staff_id, full_name, is_active FROM SystemUsers WHERE username = ?';
        try {
            const [rows] = await pool.execute(sql, [username]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding user by username in model:', error);
            throw error;
        }
    },

    async findById(userId) {
        const sql = 'SELECT user_id, username, role, full_name, linked_staff_id, is_active, created_at, updated_at FROM SystemUsers WHERE user_id = ?';
        try {
            const [rows] = await pool.execute(sql, [userId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Error finding user by ID in model:', error);
            throw error;
        }
    },

    /**
     * Retrieves all system users. (Typically used by an Admin)
     * Excludes password_hash for security.
     * @returns {Promise<Array<object>>} An array of user objects.
     */
    async getAll() {
        const sql = 'SELECT user_id, username, role, full_name, linked_staff_id, is_active, created_at, updated_at FROM SystemUsers ORDER BY full_name ASC';
        try {
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error getting all users in model:', error);
            throw error;
        }
    },

    /**
     * Updates a user's details. (Typically used by an Admin)
     * Does NOT update the password here (use updatePassword for that).
     * @param {number} userId - The ID of the user to update.
     * @param {object} userDataToUpdate - Object containing fields to update { username, role, full_name, linked_staff_id, is_active }.
     * @returns {Promise<boolean>} True if update was successful (at least one row affected), false otherwise.
     */
    async update(userId, { username, role, full_name, linked_staff_id, is_active }) {
        // Build the query dynamically based on provided fields
        const fieldsToUpdate = [];
        const values = [];

        if (username !== undefined) {
            fieldsToUpdate.push('username = ?');
            values.push(username);
        }
        if (role !== undefined) {
            fieldsToUpdate.push('role = ?');
            values.push(role);
        }
        if (full_name !== undefined) {
            fieldsToUpdate.push('full_name = ?');
            values.push(full_name);
        }
        if (linked_staff_id !== undefined) { // Allows setting to null
            fieldsToUpdate.push('linked_staff_id = ?');
            values.push(linked_staff_id);
        }
        if (is_active !== undefined) {
            fieldsToUpdate.push('is_active = ?');
            values.push(is_active);
        }

        if (fieldsToUpdate.length === 0) {
            throw new Error('No fields provided for update.');
        }

        values.push(userId); // For the WHERE clause

        const sql = `UPDATE SystemUsers SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user in model:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Update failed: Username '${username}' may already exist for another user.`);
            }
            throw new Error('Failed to update user due to a database error.');
        }
    },

    /**
     * Updates a user's password. (Typically used by an Admin for reset or by user themselves)
     * @param {number} userId - The ID of the user whose password is to be updated.
     * @param {string} newPassword - The new plain text password.
     * @returns {Promise<boolean>} True if password update was successful, false otherwise.
     */
    async updatePassword(userId, newPassword) {
        if (!newPassword || newPassword.length < 6) { // Basic validation
            throw new Error('New password must be at least 6 characters long.');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const sql = 'UPDATE SystemUsers SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
        try {
            const [result] = await pool.execute(sql, [hashedPassword, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating password in model:', error);
            throw new Error('Failed to update password due to a database error.');
        }
    },

    /**
     * Deletes a user by their ID (Hard Delete).
     * Note: Often, deactivating a user (is_active = false) via the update method is preferred.
     * @param {number} userId - The ID of the user to delete.
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    async deleteById(userId) {
        const sql = 'DELETE FROM SystemUsers WHERE user_id = ?';
        try {
            const [result] = await pool.execute(sql, [userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user by ID in model:', error);
            // Consider foreign key constraints: if this user is referenced elsewhere, deletion might fail.
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete user: User is referenced in other parts of the system. Consider deactivating instead.');
            }
            throw new Error('Failed to delete user due to a database error.');
        }
    }
};

module.exports = SystemUserModel;