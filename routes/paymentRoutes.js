// routes/paymentRoutes.js
const express = require('express');
const PaymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

// --- Payment Routes ---

// POST /api/payments - Record a new payment for a bill
// Accessible by: BillingStaff, Cashier (if role exists), Admin
router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist']), // Roles allowed to record payments
    PaymentController.recordPayment
);

// GET /api/payments/bill/:billId - Get all payments for a specific bill
// (Alternative to /api/bills/:billId/payments if you prefer to group by payment)
router.get(
    '/bill/:billId',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']), // Define appropriate view roles
    PaymentController.getPaymentsForBill
);

// GET /api/payments/:paymentId - Get details of a specific payment
// Accessible by: BillingStaff, Admin, etc.
router.get(
    '/:paymentId',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist']), // Define appropriate view roles
    PaymentController.getPaymentById
);

module.exports = router;