// controllers/billController.js
const BillModel = require('../models/billModel');
const BillItemModel = require('../models/billItemModel');
const PatientModel = require('../models/patientModel');
const AdmissionModel = require('../models/admissionModel');
const TreatmentModel = require('../models/treatmentModel');
const ServiceModel = require('../models/serviceModel'); // To get service costs
const RoomModel = require('../models/roomModel'); // To potentially get room type for room charges
const pool = require('../config/db'); // For transactions

const BillController = {
    /**
     * Generates a new bill for a patient, potentially based on an admission.
     * This is a complex operation and should be transactional.
     */
    async generateBill(req, res) {
        const { patient_id, admission_id, bill_date, due_date, notes } = req.body;
        // bill_date is required. admission_id is optional (for outpatient bills vs inpatient)

        if (!patient_id || !bill_date) {
            return res.status(400).json({ message: 'patient_id and bill_date are required.' });
        }
        if (isNaN(Date.parse(bill_date))) {
             return res.status(400).json({ message: 'Invalid bill_date format.' });
        }
         if (due_date && isNaN(Date.parse(due_date))) {
             return res.status(400).json({ message: 'Invalid due_date format.' });
         }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const patient = await PatientModel.findById(patient_id);
            if (!patient) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: `Patient with ID ${patient_id} not found.` });
            }

            let admissionDetails = null;
            if (admission_id) {
                admissionDetails = await AdmissionModel.findById(admission_id, connection); // pass connection
                if (!admissionDetails) {
                    await connection.rollback();
                    connection.release();
                    return res.status(404).json({ message: `Admission with ID ${admission_id} not found.` });
                }
                if (admissionDetails.patient_id !== parseInt(patient_id)) {
                    await connection.rollback();
                    connection.release();
                    return res.status(400).json({ message: 'Admission does not belong to the specified patient.' });
                }
            }

            // --- Logic to gather billable items ---
            const billItemsData = [];
            let calculatedTotalAmount = 0;

            // 1. Add Room Charges (if an admission_id is provided and patient was discharged or for ongoing interim bill)
            if (admissionDetails && admissionDetails.discharge_datetime) { // Only bill for discharged or for interim
                const room = await RoomModel.findById(admissionDetails.room_id, connection);
                const serviceForRoomCharge = await ServiceModel.findByName(`${room.room_type} Daily Charge`); // Assumes service exists

                if (serviceForRoomCharge && serviceForRoomCharge.cost > 0) {
                    const admissionDate = new Date(admissionDetails.admission_datetime);
                    const dischargeDate = new Date(admissionDetails.discharge_datetime);
                    // Calculate number of days (simplified - real calculation might be per night or more complex)
                    const durationMs = dischargeDate - admissionDate;
                    let daysStayed = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
                    if (daysStayed === 0) daysStayed = 1; // Minimum 1 day charge

                    billItemsData.push({
                        // no service_id directly if we take cost from elsewhere or custom desc
                        service_id: serviceForRoomCharge.service_id,
                        item_description: `${room.room_type} Charge for ${daysStayed} day(s) (Room: ${room.room_number})`,
                        quantity: daysStayed,
                        unit_price: serviceForRoomCharge.cost,
                        item_total_price: daysStayed * serviceForRoomCharge.cost,
                    });
                    calculatedTotalAmount += daysStayed * serviceForRoomCharge.cost;
                }
            }


            // 2. Add Treatments (linked to this patient, and optionally this admission or within a billable period)
            // This is simplified. You might filter treatments by date range or only those linked to the admission_id.
            const treatments = await TreatmentModel.findByPatientId(patient_id); // Potentially filter further
            for (const treatment of treatments) {
                // How to price treatments?
                // Option A: Treatment name matches a service in Services table
                const serviceForTreatment = await ServiceModel.findByName(treatment.treatment_name);
                if (serviceForTreatment && serviceForTreatment.cost > 0) {
                    billItemsData.push({
                        service_id: serviceForTreatment.service_id,
                        treatment_id: treatment.treatment_id,
                        item_description: treatment.treatment_name || serviceForTreatment.service_name,
                        quantity: 1, // Assuming one instance of this treatment record
                        unit_price: serviceForTreatment.cost,
                        item_total_price: serviceForTreatment.cost,
                    });
                    calculatedTotalAmount += serviceForTreatment.cost;
                } else if (treatment.treatment_name) { // Or log as a $0 item if no matching service, or custom price
                    // For now, only bill if a matching service with cost exists
                    console.warn(`No matching service found or zero cost for treatment: ${treatment.treatment_name}`);
                }
            }

            // TODO: Add other manual services if provided in req.body (e.g., req.body.manual_services = [{service_id, quantity}])

            if (billItemsData.length === 0) {
                 await connection.rollback();
                 connection.release();
                 return res.status(400).json({ message: 'No billable items found for this patient/admission.' });
            }

            // --- Create Bill and Bill Items ---
            const billData = {
                patient_id,
                admission_id,
                bill_date,
                total_amount: calculatedTotalAmount,
                due_date,
                notes
            };
            const newBill = await BillModel.create(billData, connection);

            for (const itemData of billItemsData) {
                await BillItemModel.create({ ...itemData, bill_id: newBill.bill_id }, connection);
            }

            await connection.commit();
            connection.release();

            const fullBillDetails = await BillModel.findById(newBill.bill_id); // Get bill with items
            res.status(201).json({ message: 'Bill generated successfully!', bill: fullBillDetails });

        } catch (error) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            console.error("Controller: Error generating bill:", error);
            res.status(500).json({ message: error.message || 'Failed to generate bill due to a server error.' });
        }
    },

    /**
     * Get bill details by Bill ID.
     */
    async getBillById(req, res) {
        const { billId } = req.params;
        try {
            const bill = await BillModel.findById(billId);
            if (!bill) {
                return res.status(404).json({ message: 'Bill not found.' });
            }
            // Add authorization checks if needed
            res.status(200).json(bill);
        } catch (error) {
            console.error('Controller: Error fetching bill by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve bill data.' });
        }
    },

    /**
     * Get all bills for a specific patient.
     */
    async getBillsForPatient(req, res) {
        const { patientId } = req.params;
        try {
            const patient = await PatientModel.findById(patientId);
            if(!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.`});

            const bills = await BillModel.findByPatientId(patientId);
            // Add authorization logic
            res.status(200).json(bills);
        } catch (error) {
            console.error('Controller: Error fetching bills for patient:', error);
            res.status(500).json({ message: 'Failed to retrieve patient bills.' });
        }
    }
};

module.exports = BillController;