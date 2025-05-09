// routes/serviceRoutes.js
const express = require('express');
const ServiceController = require('../controllers/serviceContoller');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post(
    '/',
    authenticateToken,
    authorizeRole(['Admin']),
    ServiceController.createService
);
router.get(
    '/',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']),
    ServiceController.getAllServices
);

router.get(
    '/:serviceId',
    authenticateToken,
    authorizeRole(['Admin', 'BillingStaff', 'Receptionist', 'Doctor', 'Nurse']),
    ServiceController.getServiceById
);

router.put(
    '/:serviceId',
    authenticateToken,
    authorizeRole(['Admin']),
    ServiceController.updateService
);

router.delete(
    '/:serviceId',
    authenticateToken,
    authorizeRole(['Admin']),
    ServiceController.deleteService
);

module.exports = router;