// controllers/staffAssignmentController.js
const StaffAssignmentModel = require('../models/staffAssignmentModel');
const PatientModel = require('../models/patientModel');
const AdmissionModel = require('../models/admissionModel');
const NurseModel = require('../models/nurseModel');
const WardBoyModel = require('../models/wardBoysModel');
const DoctorModel = require('../models/doctorModel');

const StaffAssignmentController = {
    
    async createAssignment(req, res) {
       
        const assignerUserId = req.user.userId; // ID of the logged-in user

        const {
            patient_id, admission_id, nurse_id, ward_boy_id, assigned_by_doctor_id,
            task_description, assignment_start_datetime, assignment_end_datetime
        } = req.body;

        // Validation
        if (!patient_id || !task_description || !assignment_start_datetime) {
             return res.status(400).json({ message: 'patient_id, task_description, and assignment_start_datetime are required.' });
        }
        if (!nurse_id && !ward_boy_id) {
            return res.status(400).json({ message: 'Either nurse_id or ward_boy_id must be provided.' });
        }
         if (nurse_id && ward_boy_id) {
            return res.status(400).json({ message: 'Cannot assign both a nurse and a ward boy in the same assignment.' });
        }
         if (isNaN(Date.parse(assignment_start_datetime))) {
             return res.status(400).json({ message: 'Invalid assignment_start_datetime format.' });
         }
         if (assignment_end_datetime && isNaN(Date.parse(assignment_end_datetime))) {
             return res.status(400).json({ message: 'Invalid assignment_end_datetime format.' });
         }


        try {
            // --- Verify existence and status of linked entities ---
            const patient = await PatientModel.findById(patient_id);
            if (!patient) return res.status(404).json({ message: `Patient with ID ${patient_id} not found.` });

            if (admission_id) {
                 const admission = await AdmissionModel.findById(admission_id);
                 if (!admission) return res.status(404).json({ message: `Admission with ID ${admission_id} not found.` });
                 if (admission.patient_id !== parseInt(patient_id)) return res.status(400).json({ message: `Admission ID ${admission_id} does not belong to Patient ID ${patient_id}.`});
                 if (admission.discharge_datetime !== null) return res.status(400).json({ message: `Cannot create assignment for a discharged admission (ID: ${admission_id}).`});
            }

            if (nurse_id) {
                 const nurse = await NurseModel.findById(nurse_id);
                 if (!nurse) return res.status(404).json({ message: `Nurse with ID ${nurse_id} not found.` });
                 if (!nurse.is_active) return res.status(400).json({ message: `Nurse ID ${nurse_id} is not active.` });
            }

             if (ward_boy_id) {
                 const wardBoy = await WardBoyModel.findById(ward_boy_id);
                 if (!wardBoy) return res.status(404).json({ message: `Ward Boy with ID ${ward_boy_id} not found.` });
                 if (!wardBoy.is_active) return res.status(400).json({ message: `Ward Boy ID ${ward_boy_id} is not active.` });
            }

             if (assigned_by_doctor_id) {
                 const doctor = await DoctorModel.findById(assigned_by_doctor_id);
                 if (!doctor) return res.status(404).json({ message: `Assigning Doctor with ID ${assigned_by_doctor_id} not found.` });
                 if (!doctor.is_active) return res.status(400).json({ message: `Assigning Doctor ID ${assigned_by_doctor_id} is not active.` });
            }
            // --- End Verification ---


            const assignmentData = {
                patient_id, admission_id, nurse_id, ward_boy_id, assigned_by_doctor_id,
                task_description, assignment_start_datetime, assignment_end_datetime
            };

            const newAssignment = await StaffAssignmentModel.create(assignmentData);
            res.status(201).json({ message: 'Staff assignment created successfully!', assignment: newAssignment });

        } catch (error) {
            console.error("Controller: Error creating assignment:", error);
            if (error.message.includes('Invalid patient_id') || error.message.includes('Assignment must include')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || "Failed to create staff assignment." });
        }
    },

    /**
     * Get assignment details by ID.
     */
    async getAssignmentById(req, res) {
        const { assignmentId } = req.params;
         try {
            const assignment = await StaffAssignmentModel.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found.' });
            }
             // Add authorization check here if needed
            res.status(200).json(assignment);
        } catch (error) {
            console.error('Controller: Error getting assignment by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve assignment data.' });
        }
    },


    /**
     * Get all assignments for a specific patient.
     */
    async getAssignmentsForPatient(req, res) {
        const { patientId } = req.params;
        try {
            // Verify patient exists
             const patient = await PatientModel.findById(patientId);
             if (!patient) return res.status(404).json({ message: `Patient with ID ${patientId} not found.` });

             // Add authorization checks here

            const assignments = await StaffAssignmentModel.findByPatientId(patientId);
            res.status(200).json(assignments);
        } catch (error) {
            console.error('Controller: Error fetching assignments for patient:', error);
            res.status(500).json({ message: 'Failed to retrieve patient assignments.' });
        }
    },

    /**
     * Get active tasks for the logged-in Nurse or Ward Boy.
     */
    async getMyActiveAssignments(req, res) {
        // User details from JWT payload (set by authenticateToken)
        const { userId, role, linkedStaffId } = req.user;

        if (!['Nurse', 'WardBoy'].includes(role)) {
            return res.status(403).json({ message: 'Access denied. Only Nurses or Ward Boys can view their tasks.' });
        }
        if (!linkedStaffId) {
             return res.status(400).json({ message: 'Logged-in user is not linked to a specific staff profile.' });
        }

        try {
            let assignments = [];
            if (role === 'Nurse') {
                assignments = await StaffAssignmentModel.findActiveByNurseId(linkedStaffId);
            } else if (role === 'WardBoy') {
                assignments = await StaffAssignmentModel.findActiveByWardBoyId(linkedStaffId);
            }
            res.status(200).json(assignments);
        } catch (error) {
             console.error(`Controller: Error fetching active assignments for ${role} ID ${linkedStaffId}:`, error);
            res.status(500).json({ message: `Failed to retrieve active assignments.` });
        }
    },


    /**
     * Update the status of an assignment.
     */
    async updateAssignmentStatus(req, res) {
        const { assignmentId } = req.params;
        const { status, end_datetime } = req.body; // Optional end_datetime
        const { userId, role, linkedStaffId } = req.user; // Logged-in user

        if (!status) {
            return res.status(400).json({ message: 'New status is required.' });
        }
         const allowedStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
         if (!allowedStatuses.includes(status)) {
             return res.status(400).json({ message: `Invalid status value. Must be one of: ${allowedStatuses.join(', ')}` });
         }
         if (end_datetime && isNaN(Date.parse(end_datetime))) {
             return res.status(400).json({ message: 'Invalid end_datetime format.' });
         }

        try {
            const assignment = await StaffAssignmentModel.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({ message: 'Assignment not found.' });
            }

            // --- Authorization Check ---
            // Example: Allow assigned staff, the assigning doctor, or an Admin to update status
            const isAssignedStaff = (role === 'Nurse' && assignment.nurse_id === linkedStaffId) ||
                                    (role === 'WardBoy' && assignment.ward_boy_id === linkedStaffId);
            const isAssigningDoctor = role === 'Doctor' && assignment.assigned_by_doctor_id === linkedStaffId;
            const isAdmin = role === 'Admin';

            // Define who can set which status (example logic)
            let authorized = false;
            if (isAdmin || isAssigningDoctor) { // Admin or assigner can do anything maybe
                authorized = true;
            } else if (isAssignedStaff) {
                 // Assigned staff can maybe move to 'In Progress' or 'Completed'
                 if (['In Progress', 'Completed'].includes(status)) {
                     authorized = true;
                 }
            }

            if (!authorized) {
                 return res.status(403).json({ message: 'Forbidden: You are not authorized to update the status of this assignment.' });
            }
            // --- End Authorization Check ---

            // Set end time automatically if completing/cancelling and not provided?
            let finalEndTime = end_datetime;
            if (['Completed', 'Cancelled'].includes(status) && end_datetime === undefined) {
                 finalEndTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // Set to now if not provided
            }


            const success = await StaffAssignmentModel.updateStatus(assignmentId, status, finalEndTime);
            if (!success) {
                 // Should be rare if findById worked
                 return res.status(404).json({ message: 'Assignment not found or status could not be updated.' });
            }

            const updatedAssignment = await StaffAssignmentModel.findById(assignmentId);
            res.status(200).json({ message: `Assignment status updated to ${status}.`, assignment: updatedAssignment });
        } catch (error) {
            console.error("Controller: Error updating assignment status:", error);
            if (error.message.includes('Invalid status value')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to update assignment status.' });
        }
    }
};

module.exports = StaffAssignmentController;