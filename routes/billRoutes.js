const express = require('express');
const BillController = require('../controllers/billController');
const PaymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post(
    '/generate',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff']), 
    BillController.generateBill
);

router.get(
    '/:billId',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']), // Define appropriate view roles
    BillController.getBillById
);

router.get(
    '/patient/:patientId',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']), // Define appropriate view roles
    BillController.getBillsForPatient
);

router.post(
    '/:billId/payments',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist']),
    PaymentController.recordPayment 
);

router.get(
    '/:billId/payments',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']),
    PaymentController.getPaymentsForBill
);


module.exports = router;