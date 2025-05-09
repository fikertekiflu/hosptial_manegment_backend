// controllers/nurseController.js
const NurseModel = require('../models/nurseModel');
const SystemUserModel = require('../models/SystemUsers'); // To validate system_user_id if provided

const NurseController = {
    /**
     * Admin: Create a new nurse profile.
     */
    async createNurse(req, res) {
        const {
            system_user_id, first_name, last_name, department, shift,
            phone_number, email, license_number
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }
        // Add validation for shift ENUM if desired here or rely on model/DB error
        const allowedShifts = ['Day', 'Evening', 'Night', 'Rotating', null, undefined]; // Allowed inputs
         if (!allowedShifts.includes(shift)) {
             return res.status(400).json({ message: 'Invalid shift value.' });
         }

        try {
            // Optional: Validate if system_user_id (if provided) exists and is a 'Nurse'
            if (system_user_id) {
                const systemUser = await SystemUserModel.findById(system_user_id);
                if (!systemUser) {
                    return res.status(404).json({ message: `SystemUser with ID ${system_user_id} not found.` });
                }
                 // Optionally check role: if (systemUser.role !== 'Nurse') { /* handle */ }
                const existingNurseProfile = await NurseModel.findBySystemUserId(system_user_id);
                if (existingNurseProfile) {
                    return res.status(409).json({ message: `SystemUser ID ${system_user_id} is already linked to nurse ID ${existingNurseProfile.nurse_id}.` });
                }
            }

            const nurseData = {
                system_user_id, first_name, last_name, department, shift,
                phone_number, email, license_number
            };
            const newNurse = await NurseModel.create(nurseData);
            res.status(201).json({ message: 'Nurse profile created successfully!', nurse: newNurse });
        } catch (error) {
            console.error('Controller: Error creating nurse:', error);
            if (error.message.includes('already exist') || error.message.includes('Duplicate entry') || error.message.includes('Invalid value provided for shift')) {
                return res.status(409).json({ message: error.message }); // Use 409 Conflict or 400 Bad Request
            }
            res.status(500).json({ message: error.message || 'Failed to create nurse profile.' });
        }
    },

    /**
     * Admin: Get all nurse profiles. Accepts ?inactive=true query param.
     */
    async getAllNurses(req, res) {
        try {
            const showInactive = req.query.inactive === 'true';
            const nurses = await NurseModel.getAll(showInactive);
            res.status(200).json(nurses);
        } catch (error) {
            console.error('Controller: Error getting all nurses:', error);
            res.status(500).json({ message: 'Failed to retrieve nurse profiles.' });
        }
    },

    /**
     * Admin: Get a nurse profile by ID.
     */
    async getNurseById(req, res) {
        const { nurseId } = req.params;
        try {
            const nurse = await NurseModel.findById(nurseId);
            if (!nurse) {
                return res.status(404).json({ message: 'Nurse profile not found.' });
            }
            res.status(200).json(nurse);
        } catch (error) {
            console.error('Controller: Error getting nurse by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve nurse profile.' });
        }
    },

    /**
     * Admin: Update a nurse's profile.
     */
    async updateNurse(req, res) {
        const { nurseId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }
        // Add validation for shift ENUM if included in update
        if (dataToUpdate.shift && !['Day', 'Evening', 'Night', 'Rotating'].includes(dataToUpdate.shift)){
            // Allow setting to null if needed, might require explicit check:
            // if (dataToUpdate.shift !== null && !['Day',...].includes(dataToUpdate.shift))
             return res.status(400).json({ message: 'Invalid shift value.' });
        }


        try {
            const nurseExists = await NurseModel.findById(nurseId);
            if (!nurseExists) {
                return res.status(404).json({ message: 'Nurse profile not found for update.' });
            }

             // Optional: If system_user_id is being changed/set, validate it
            if (dataToUpdate.hasOwnProperty('system_user_id') && dataToUpdate.system_user_id !== null) {
                const systemUser = await SystemUserModel.findById(dataToUpdate.system_user_id);
                 if (!systemUser) return res.status(404).json({ message: `SystemUser with ID ${dataToUpdate.system_user_id} not found.` });
                const existingNurseProfile = await NurseModel.findBySystemUserId(dataToUpdate.system_user_id);
                if (existingNurseProfile && existingNurseProfile.nurse_id !== parseInt(nurseId)) {
                    return res.status(409).json({ message: `SystemUser ID ${dataToUpdate.system_user_id} is already linked to another nurse.` });
                }
            }

            const success = await NurseModel.update(nurseId, dataToUpdate);
            if (!success) {
                return res.status(304).json({ message: 'No changes applied to nurse profile.' });
            }
            const updatedNurse = await NurseModel.findById(nurseId);
            res.status(200).json({ message: 'Nurse profile updated successfully!', nurse: updatedNurse });
        } catch (error) {
            console.error('Controller: Error updating nurse:', error);
             if (error.message.includes('already exist') || error.message.includes('Duplicate entry') || error.message.includes('Invalid value provided for shift')) {
                return res.status(409).json({ message: error.message }); // Or 400
            }
            res.status(500).json({ message: error.message || 'Failed to update nurse profile.' });
        }
    },

    /**
     * Admin: Delete a nurse profile.
     */
    async deleteNurse(req, res) {
        const { nurseId } = req.params;
        try {
            const nurseExists = await NurseModel.findById(nurseId);
            if (!nurseExists) {
                return res.status(404).json({ message: 'Nurse profile not found for deletion.' });
            }

            // Prefer soft delete: await NurseModel.update(nurseId, { is_active: false });
            // Hard delete:
            const success = await NurseModel.deleteById(nurseId);

            if (!success) {
                return res.status(404).json({ message: 'Nurse profile not found or already deleted.' });
            }
            res.status(200).json({ message: 'Nurse profile deleted successfully.' });
        } catch (error) {
            console.error('Controller: Error deleting nurse:', error);
            if (error.message.includes('Cannot delete nurse')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Failed to delete nurse profile.' });
        }
    }
};

module.exports = NurseController;