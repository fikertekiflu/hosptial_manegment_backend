// models/billItemModel.js
const pool = require('../config/db');

const BillItemModel = {
    
    async create({ bill_id, service_id, treatment_id, item_description, quantity, unit_price, item_total_price }, connection = pool) {
        const sql = `
            INSERT INTO Bill_Items (bill_id, service_id, treatment_id, item_description, quantity, unit_price, item_total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            bill_id, service_id || null, treatment_id || null, item_description,
            quantity, unit_price, item_total_price
        ];
        try {
            const [result] = await connection.execute(sql, values);
            // To return the created item, you'd ideally fetch it back by ID, but for simplicity here:
            return { bill_item_id: result.insertId, ...values };
        } catch (error) {
            console.error("Error creating bill item in model:", error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error('Invalid bill_id, service_id, or treatment_id provided for bill item.');
            }
            throw new Error("Database error creating bill item.");
        }
    },

    /**
     * Finds all items for a specific bill.
     * @param {number} billId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<Array<object>>}
     */
    async findByBillId(billId, connection = pool) {
        const sql = 'SELECT bi.*, s.service_name, t.treatment_name FROM Bill_Items bi LEFT JOIN Services s ON bi.service_id = s.service_id LEFT JOIN Treatments t ON bi.treatment_id = t.treatment_id WHERE bi.bill_id = ? ORDER BY bi.bill_item_id ASC';
        try {
            const [rows] = await connection.execute(sql, [billId]);
            return rows;
        } catch (error) {
            console.error("Error finding bill items by bill ID:", error);
            throw error;
        }
    }
    // Update/Delete for bill items might be complex or disallowed once a bill is finalized.
};

module.exports = BillItemModel;