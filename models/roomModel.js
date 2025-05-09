// models/roomModel.js
const pool = require('../config/db'); // Adjust path

const RoomModel = {
    /**
     * Creates a new room.
     * @param {object} roomData - { room_number, room_type, capacity, notes }
     * @returns {Promise<object>} The newly created room object.
     */
    async create({ room_number, room_type, capacity, notes }) {
        const sql = `
            INSERT INTO Rooms (room_number, room_type, capacity, notes, is_active, current_occupancy)
            VALUES (?, ?, ?, ?, TRUE, 0)
        `;
        // Occupancy starts at 0, room starts active
        const values = [room_number, room_type, capacity || 1, notes || null];
        try {
            const [result] = await pool.execute(sql, values);
            return this.findById(result.insertId);
        } catch (error) {
            console.error("Error creating room in model:", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Room number '${room_number}' already exists.`);
            }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'room_type'")) {
                throw new Error(`Invalid room_type specified.`);
            }
            throw new Error("Database error creating room.");
        }
    },

    /**
     * Finds a room by its ID.
     * @param {number} roomId
     * @returns {Promise<object|null>}
     */
    async findById(roomId) {
        const sql = 'SELECT *, (capacity > current_occupancy) AS is_available FROM Rooms WHERE room_id = ?'; // Calculate availability
        try {
            const [rows] = await pool.execute(sql, [roomId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding room by ID:", error);
            throw error;
        }
    },

    /**
     * Retrieves all rooms, optionally filtering.
     * @param {object} filters - Optional filters like { room_type, is_active, only_available }
     * @returns {Promise<Array<object>>}
     */
    async getAll(filters = {}) {
        let sql = 'SELECT *, (capacity > current_occupancy) AS is_available FROM Rooms';
        const whereClauses = [];
        const values = [];

        if (filters.hasOwnProperty('is_active')) {
            whereClauses.push('is_active = ?');
            values.push(filters.is_active);
        }
        if (filters.room_type) {
            whereClauses.push('room_type = ?');
            values.push(filters.room_type);
        }
         if (filters.only_available === true) {
            whereClauses.push('current_occupancy < capacity');
            // No value needed for this clause
        }


        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        sql += ' ORDER BY room_number ASC';

        try {
            const [rows] = await pool.execute(sql, values);
            return rows;
        } catch (error) {
            console.error("Error getting all rooms:", error);
            throw error;
        }
    },

    /**
     * Updates room details.
     * @param {number} roomId
     * @param {object} dataToUpdate - { room_number, room_type, capacity, notes, is_active }
     * @returns {Promise<boolean>}
     */
    async update(roomId, dataToUpdate) {
        const fields = [];
        const values = [];

        if (dataToUpdate.room_number !== undefined) { fields.push('room_number = ?'); values.push(dataToUpdate.room_number); }
        if (dataToUpdate.room_type !== undefined) { fields.push('room_type = ?'); values.push(dataToUpdate.room_type); }
        if (dataToUpdate.capacity !== undefined) { fields.push('capacity = ?'); values.push(dataToUpdate.capacity); }
        if (dataToUpdate.notes !== undefined) { fields.push('notes = ?'); values.push(dataToUpdate.notes); }
        if (dataToUpdate.is_active !== undefined) { fields.push('is_active = ?'); values.push(dataToUpdate.is_active); }
        // current_occupancy is typically managed by admissions logic, not direct update here

        if (fields.length === 0) throw new Error('No fields provided for room update.');

        values.push(roomId);
        const sql = `UPDATE Rooms SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
             console.error("Error updating room in model:", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Update failed: Room number '${dataToUpdate.room_number}' may already exist.`);
            }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'room_type'")) {
                throw new Error(`Invalid room_type specified.`);
            }
            throw error;
        }
    },

    /**
     * Deletes a room. Use with caution, ensure room is empty first.
     * @param {number} roomId
     * @returns {Promise<boolean>}
     */
    async deleteById(roomId) {
        // IMPORTANT: Add check in controller/service layer to ensure room occupancy is 0 before deleting!
        const sql = 'DELETE FROM Rooms WHERE room_id = ?';
        try {
            const [result] = await pool.execute(sql, [roomId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error deleting room:", error);
             if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete room: It is referenced by admission records. Deactivate it instead.');
            }
            throw error;
        }
    },

    // --- Functions to be called by Admission logic (or use triggers) ---

    /**
     * Increments occupancy for a room. To be called when admitting.
     * @param {number} roomId
     * @param {object} connection - Optional: DB connection for transactions
     * @returns {Promise<boolean>}
     */
    async incrementOccupancy(roomId, connection = pool) {
        const sql = 'UPDATE Rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = ? AND current_occupancy < capacity';
        try {
            const [result] = await connection.execute(sql, [roomId]);
            // If affectedRows is 0, it means occupancy was already at capacity or room didn't exist
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error incrementing room occupancy:", error);
            throw error;
        }
    },

    /**
     * Decrements occupancy for a room. To be called when discharging.
      * @param {number} roomId
      * @param {object} connection - Optional: DB connection for transactions
      * @returns {Promise<boolean>}
     */
    async decrementOccupancy(roomId, connection = pool) {
        const sql = 'UPDATE Rooms SET current_occupancy = current_occupancy - 1 WHERE room_id = ? AND current_occupancy > 0';
        try {
            const [result] = await connection.execute(sql, [roomId]);
             // If affectedRows is 0, it means occupancy was already 0 or room didn't exist
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error decrementing room occupancy:", error);
            throw error;
        }
    }

};

module.exports = RoomModel;