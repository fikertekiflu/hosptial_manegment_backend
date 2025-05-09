// models/billModel.js
const pool = require('../config/db');

const BillModel = {
    /**
     * Creates a new bill record.
     * @param {object} billData - { patient_id, admission_id, bill_date, total_amount, due_date, notes, payment_status }
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object>} The newly created bill object.
     */
    async create({ patient_id, admission_id, bill_date, total_amount, due_date, notes, payment_status = 'Pending' }, connection = pool) {
        const sql = `
            INSERT INTO Bills (patient_id, admission_id, bill_date, total_amount, amount_paid, payment_status, due_date, notes)
            VALUES (?, ?, ?, ?, 0.00, ?, ?, ?)
        `;
        const values = [
            patient_id, admission_id || null, bill_date, total_amount,
            payment_status, due_date || null, notes || null
        ];
        try {
            const [result] = await connection.execute(sql, values);
            return this.findById(result.insertId, connection);
        } catch (error) {
            console.error("Error creating bill in model:", error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error('Invalid patient_id or admission_id provided.');
            }
            throw new Error("Database error creating bill.");
        }
    },

    /**
     * Finds a bill by its ID, including its items.
     * @param {number} billId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object|null>}
     */
    async findById(billId, connection = pool) {
        const billSql = 'SELECT * FROM Bills WHERE bill_id = ?';
        const itemsSql = 'SELECT bi.*, s.service_name, t.treatment_name FROM Bill_Items bi LEFT JOIN Services s ON bi.service_id = s.service_id LEFT JOIN Treatments t ON bi.treatment_id = t.treatment_id WHERE bi.bill_id = ? ORDER BY bi.bill_item_id ASC';
        try {
            const [billRows] = await connection.execute(billSql, [billId]);
            if (billRows.length === 0) {
                return null;
            }
            const bill = billRows[0];
            const [itemRows] = await connection.execute(itemsSql, [billId]);
            bill.items = itemRows;
            return bill;
        } catch (error) {
            console.error("Error finding bill by ID:", error);
            throw error;
        }
    },

    /**
     * Finds all bills for a specific patient.
     * @param {number} patientId
     * @returns {Promise<Array<object>>}
     */
    async findByPatientId(patientId) {
        // Does not fetch line items for list view for performance, fetch individually if needed
        const sql = 'SELECT * FROM Bills WHERE patient_id = ? ORDER BY bill_date DESC';
        try {
            const [rows] = await pool.execute(sql, [patientId]);
            return rows;
        } catch (error) {
            console.error("Error finding bills by patient ID:", error);
            throw error;
        }
    },

    /**
     * Updates a bill's total_amount, amount_paid, and payment_status.
     * Typically called after adding items or recording payments.
     * @param {number} billId
     * @param {object} data - { total_amount, amount_paid, payment_status }
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<boolean>}
     */
    async updateAmountsAndStatus(billId, { total_amount, amount_paid, payment_status }, connection = pool) {
        const fields = [];
        const values = [];

        if (total_amount !== undefined) { fields.push('total_amount = ?'); values.push(total_amount); }
        if (amount_paid !== undefined) { fields.push('amount_paid = ?'); values.push(amount_paid); }
        if (payment_status !== undefined) { fields.push('payment_status = ?'); values.push(payment_status); }

        if (fields.length === 0) return false; // No actual update

        values.push(billId);
        const sql = `UPDATE Bills SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE bill_id = ?`;
        try {
            const [result] = await connection.execute(sql, values);
            return result.affectedRows > 0;
        } catch (error) {
            console.error("Error updating bill amounts/status:", error);
            throw error;
        }
    }
    // Add getAll for admin overview later if needed
};

module.exports = BillModel;