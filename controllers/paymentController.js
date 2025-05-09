// controllers/paymentController.js
const PaymentModel = require('../models/paymentModel');
const BillModel = require('../models/billModel'); // To update bill status and amount_paid
const SystemUserModel = require('../models/SystemUsers'); // To validate received_by_user_id
const pool = require('../config/db'); // For transactions

const PaymentController = {
    
    async recordPayment(req, res) {
        const { bill_id, payment_date, amount, payment_method, transaction_reference, notes } = req.body;
        const received_by_user_id = req.user.userId; // Logged-in user making the record

        // Validation
        if (!bill_id || !payment_date || amount === undefined || !payment_method) {
            return res.status(400).json({ message: 'bill_id, payment_date, amount, and payment_method are required.' });
        }
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }
        if (isNaN(Date.parse(payment_date))) {
            return res.status(400).json({ message: 'Invalid payment_date format.' });
        }
        const allowedMethods = ['Cash', 'E-Banking', 'Credit Card', 'Debit Card', 'Insurance', 'Other'];
        if (!allowedMethods.includes(payment_method)) {
            return res.status(400).json({ message: `Invalid payment_method. Allowed methods: ${allowedMethods.join(', ')}` });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Verify the bill exists and is not fully paid or cancelled
            const bill = await BillModel.findById(bill_id, connection); // Pass connection for transaction
            if (!bill) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: `Bill with ID ${bill_id} not found.` });
            }
            if (['Paid', 'Cancelled'].includes(bill.payment_status)) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ message: `Bill is already ${bill.payment_status}. Cannot record further payments.` });
            }
            if (paymentAmount > (bill.total_amount - bill.amount_paid)) {
                // Optionally allow overpayment or adjust, for now, restrict
                // await connection.rollback();
                // connection.release();
                // return res.status(400).json({ message: `Payment amount ${paymentAmount} exceeds remaining balance of ${bill.total_amount - bill.amount_paid}.` });
                console.warn(`Payment amount ${paymentAmount} exceeds remaining balance of ${bill.total_amount - bill.amount_paid} for bill ID ${bill_id}. Recording payment as is.`);
            }


            // 2. Record the payment
            const paymentData = { bill_id, payment_date, amount: paymentAmount, payment_method, transaction_reference, notes, received_by_user_id };
            const newPayment = await PaymentModel.create(paymentData, connection);

            // 3. Update the bill's amount_paid and payment_status
            const newTotalPaid = await PaymentModel.getTotalPaidForBill(bill_id, connection);
            let newPaymentStatus = 'Partially Paid';
            if (newTotalPaid >= bill.total_amount) {
                newPaymentStatus = 'Paid';
            } else if (newTotalPaid <= 0 && bill.total_amount > 0) { // Should not happen if amount is positive
                newPaymentStatus = 'Pending';
            }


            await BillModel.updateAmountsAndStatus(
                bill_id,
                { amount_paid: newTotalPaid, payment_status: newPaymentStatus },
                connection
            );

            await connection.commit();
            connection.release();

            const updatedBill = await BillModel.findById(bill_id); // Fetch final state
            res.status(201).json({
                message: 'Payment recorded successfully!',
                payment: newPayment,
                updatedBill: updatedBill
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            console.error("Controller: Error recording payment:", error);
            if (error.message.includes('Invalid bill_id') || error.message.includes('Invalid payment_method')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to record payment due to a server error.' });
        }
    },

    /**
     * Get all payments for a specific bill.
     */
    async getPaymentsForBill(req, res) {
        const { billId } = req.params;
        try {
            const bill = await BillModel.findById(billId); // Check if bill exists
            if (!bill) {
                return res.status(404).json({ message: `Bill with ID ${billId} not found.` });
            }
            // Add authorization logic here

            const payments = await PaymentModel.findByBillId(billId);
            res.status(200).json(payments);
        } catch (error) {
            console.error('Controller: Error fetching payments for bill:', error);
            res.status(500).json({ message: 'Failed to retrieve payments.' });
        }
    },

    /**
     * Get details of a specific payment.
     */
    async getPaymentById(req, res) {
        const { paymentId } = req.params;
        try {
            const payment = await PaymentModel.findById(paymentId);
            if (!payment) {
                return res.status(404).json({ message: 'Payment record not found.' });
            }
            // Add authorization logic here
            res.status(200).json(payment);
        } catch (error) {
            console.error('Controller: Error fetching payment by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve payment data.' });
        }
    }
};

module.exports = PaymentController;