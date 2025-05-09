// models/paymentModel.js
const pool = require('../config/db'); // Adjust path

const PaymentModel = {
    /**
     * Records a new payment.
     * @param {object} paymentData - { bill_id, payment_date, amount, payment_method, transaction_reference, notes, received_by_user_id }
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object>} The newly created payment object.
     */
    async create({ bill_id, payment_date, amount, payment_method, transaction_reference, notes, received_by_user_id }, connection = pool) {
        const sql = `
            INSERT INTO Payments (bill_id, payment_date, amount, payment_method, transaction_reference, notes, received_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            bill_id, payment_date, amount, payment_method,
            transaction_reference || null, notes || null, received_by_user_id || null
        ];
        try {
            const [result] = await connection.execute(sql, values);
            return this.findById(result.insertId, connection); // Fetch the full record to return
        } catch (error) {
            console.error("Error creating payment in model:", error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error('Invalid bill_id or received_by_user_id provided.');
            }
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' && error.message.includes("'payment_method'")) {
                throw new Error(`Invalid payment_method specified.`);
            }
            throw new Error("Database error recording payment.");
        }
    },

    /**
     * Finds a payment by its ID.
     * @param {number} paymentId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<object|null>}
     */
    async findById(paymentId, connection = pool) {
        const sql = `
            SELECT p.*, u.username as received_by_username
            FROM Payments p
            LEFT JOIN SystemUsers u ON p.received_by_user_id = u.user_id
            WHERE p.payment_id = ?
        `;
        try {
            const [rows] = await connection.execute(sql, [paymentId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding payment by ID:", error);
            throw error;
        }
    },

    /**
     * Finds all payments for a specific bill.
     * @param {number} billId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<Array<object>>}
     */
    async findByBillId(billId, connection = pool) {
        const sql = `
            SELECT p.*, u.username as received_by_username
            FROM Payments p
            LEFT JOIN SystemUsers u ON p.received_by_user_id = u.user_id
            WHERE p.bill_id = ?
            ORDER BY p.payment_date DESC
        `;
        try {
            const [rows] = await connection.execute(sql, [billId]);
            return rows;
        } catch (error) {
            console.error("Error finding payments by bill ID:", error);
            throw error;
        }
    },

    /**
     * Calculates the total amount paid for a specific bill.
     * @param {number} billId
     * @param {object} connection - Optional DB connection for transactions
     * @returns {Promise<number>} Total amount paid for the bill.
     */
    async getTotalPaidForBill(billId, connection = pool) {
        const sql = 'SELECT SUM(amount) AS total_paid FROM Payments WHERE bill_id = ?';
        try {
            const [rows] = await connection.execute(sql, [billId]);
            return rows.length > 0 && rows[0].total_paid !== null ? parseFloat(rows[0].total_paid) : 0.00;
        } catch (error) {
            console.error("Error calculating total paid for bill:", error);
            throw error;
        }
    }
};

module.exports = PaymentModel;