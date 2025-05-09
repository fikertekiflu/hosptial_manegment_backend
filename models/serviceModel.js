// models/serviceModel.js
const pool = require('../config/db'); // Adjust path

const ServiceModel = {
    /**
     * Creates a new service.
     * @param {object} serviceData - { service_name, description, cost, service_category }
     * @returns {Promise<object>} The newly created service object.
     */
    async create({ service_name, description, cost, service_category }) {
        const sql = `
            INSERT INTO Services (service_name, description, cost, service_category, is_active)
            VALUES (?, ?, ?, ?, TRUE)
        `;
        const values = [service_name, description || null, cost, service_category || null];
        try {
            const [result] = await pool.execute(sql, values);
            return this.findById(result.insertId);
        } catch (error) {
            console.error("Error creating service in model:", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Service name '${service_name}' already exists.`);
            }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE') { // Error for invalid decimal
                 throw new Error(`Invalid cost value provided.`);
             }
            throw new Error("Database error creating service.");
        }
    },

    /**
     * Finds a service by its ID.
     * @param {number} serviceId
     * @returns {Promise<object|null>}
     */
    async findById(serviceId) {
        const sql = 'SELECT * FROM Services WHERE service_id = ?';
        try {
            const [rows] = await pool.execute(sql, [serviceId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding service by ID:", error);
            throw error;
        }
    },

     /**
     * Finds a service by its exact name.
     * @param {string} serviceName
     * @returns {Promise<object|null>}
     */
    async findByName(serviceName) {
        const sql = 'SELECT * FROM Services WHERE service_name = ?';
        try {
            const [rows] = await pool.execute(sql, [serviceName]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding service by name:", error);
            throw error;
        }
    },

    /**
     * Retrieves all services, optionally filtering.
     * @param {object} filters - Optional filters like { is_active, service_category }
     * @returns {Promise<Array<object>>}
     */
    async getAll(filters = {}) {
        let sql = 'SELECT * FROM Services';
        const whereClauses = [];
        const values = [];

        if (filters.hasOwnProperty('is_active')) {
            whereClauses.push('is_active = ?');
            values.push(filters.is_active);
        }
        if (filters.service_category) {
            whereClauses.push('service_category = ?');
            values.push(filters.service_category);
        }

        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        sql += ' ORDER BY service_category, service_name ASC';

        try {
            const [rows] = await pool.execute(sql, values);
            return rows;
        } catch (error) {
            console.error("Error getting all services:", error);
            throw error;
        }
    },

    /**
     * Updates an existing service.
     * @param {number} serviceId
     * @param {object} dataToUpdate - { service_name, description, cost, service_category, is_active }
     * @returns {Promise<boolean>} True if update successful.
     */
    async update(serviceId, dataToUpdate) {
        const fields = [];
        const values = [];

        if (dataToUpdate.service_name !== undefined) { fields.push('service_name = ?'); values.push(dataToUpdate.service_name); }
        if (dataToUpdate.description !== undefined) { fields.push('description = ?'); values.push(dataToUpdate.description); }
        if (dataToUpdate.cost !== undefined) { fields.push('cost = ?'); values.push(dataToUpdate.cost); }
        if (dataToUpdate.service_category !== undefined) { fields.push('service_category = ?'); values.push(dataToUpdate.service_category); }
        if (dataToUpdate.is_active !== undefined) { fields.push('is_active = ?'); values.push(dataToUpdate.is_active); }

        if (fields.length === 0) throw new Error('No fields provided for service update.');

        values.push(serviceId);
        const sql = `UPDATE Services SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE service_id = ?`;

        try {
            const [result] = await pool.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating service in model:", error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error(`Update failed: Service name '${dataToUpdate.service_name}' may already exist.`);
            }
             if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
                 throw new Error(`Invalid cost value provided during update.`);
             }
            throw error;
        }
    },

    /**
     * Deletes a service by ID (Hard Delete). Consider deactivating instead.
     * @param {number} serviceId
     * @returns {Promise<boolean>} True if deletion successful.
     */
    async deleteById(serviceId) {
         // IMPORTANT: Check if this service is used in any Bill_Items before deleting.
         // This check should happen in the Controller/Service layer before calling delete.
        const sql = 'DELETE FROM Services WHERE service_id = ?';
        try {
            const [result] = await pool.execute(sql, [serviceId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error deleting service:", error);
            // Handle foreign key issues if Services are linked from Bill_Items
             if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                throw new Error('Cannot delete service: It is referenced in existing bills. Consider deactivating it instead.');
            }
            throw error;
        }
    }
};

module.exports = ServiceModel;