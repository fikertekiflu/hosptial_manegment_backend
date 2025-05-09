// controllers/wardBoyController.js
const WardBoyModel = require('../models/wardBoysModel');
const SystemUserModel = require('../models/SystemUsers'); // To validate system_user_id if provided

const WardBoyController = {
    /**
     * Admin: Create a new ward boy profile.
     */
    async createWardBoy(req, res) {
        const {
            system_user_id, first_name, last_name, assigned_ward, shift, phone_number
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }
        const allowedShifts = ['Day', 'Evening', 'Night', 'Rotating', null, undefined];
         if (!allowedShifts.includes(shift)) {
             return res.status(400).json({ message: 'Invalid shift value.' });
         }


        try {
            // Optional: Validate if system_user_id (if provided) exists and is a 'WardBoy'
            if (system_user_id) {
                const systemUser = await SystemUserModel.findById(system_user_id);
                if (!systemUser) {
                    return res.status(404).json({ message: `SystemUser with ID ${system_user_id} not found.` });
                }
                // Optionally check role: if (systemUser.role !== 'WardBoy') { /* handle */ }
                const existingProfile = await WardBoyModel.findBySystemUserId(system_user_id);
                if (existingProfile) {
                    return res.status(409).json({ message: `SystemUser ID ${system_user_id} is already linked to ward boy ID ${existingProfile.ward_boy_id}.` });
                }
            }

            const wardBoyData = {
                system_user_id, first_name, last_name, assigned_ward, shift, phone_number
            };
            const newWardBoy = await WardBoyModel.create(wardBoyData);
            res.status(201).json({ message: 'Ward boy profile created successfully!', wardBoy: newWardBoy });
        } catch (error) {
            console.error('Controller: Error creating ward boy:', error);
            if (error.message.includes('already exist') || error.message.includes('Duplicate entry') || error.message.includes('Invalid value provided for shift')) {
                return res.status(409).json({ message: error.message }); // Use 409 or 400
            }
            res.status(500).json({ message: error.message || 'Failed to create ward boy profile.' });
        }
    },

    /**
     * Admin: Get all ward boy profiles. Accepts ?inactive=true query param.
     */
    async getAllWardBoys(req, res) {
        try {
            const showInactive = req.query.inactive === 'true';
            const wardBoys = await WardBoyModel.getAll(showInactive);
            res.status(200).json(wardBoys);
        } catch (error) {
            console.error('Controller: Error getting all ward boys:', error);
            res.status(500).json({ message: 'Failed to retrieve ward boy profiles.' });
        }
    },

    /**
     * Admin: Get a ward boy profile by ID.
     */
    async getWardBoyById(req, res) {
        const { wardBoyId } = req.params;
        try {
            const wardBoy = await WardBoyModel.findById(wardBoyId);
            if (!wardBoy) {
                return res.status(404).json({ message: 'Ward boy profile not found.' });
            }
            res.status(200).json(wardBoy);
        } catch (error) {
            console.error('Controller: Error getting ward boy by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve ward boy profile.' });
        }
    },

    /**
     * Admin: Update a ward boy's profile.
     */
    async updateWardBoy(req, res) {
        const { wardBoyId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }
         // Add validation for shift ENUM if included in update
        if (dataToUpdate.shift && !['Day', 'Evening', 'Night', 'Rotating'].includes(dataToUpdate.shift)){
             // Allow setting to null if needed, might require explicit check
             return res.status(400).json({ message: 'Invalid shift value.' });
        }

        try {
            const exists = await WardBoyModel.findById(wardBoyId);
            if (!exists) {
                return res.status(404).json({ message: 'Ward boy profile not found for update.' });
            }

             // Optional: If system_user_id is being changed/set, validate it
            if (dataToUpdate.hasOwnProperty('system_user_id') && dataToUpdate.system_user_id !== null) {
                const systemUser = await SystemUserModel.findById(dataToUpdate.system_user_id);
                if (!systemUser) return res.status(404).json({ message: `SystemUser with ID ${dataToUpdate.system_user_id} not found.` });
                const existingProfile = await WardBoyModel.findBySystemUserId(dataToUpdate.system_user_id);
                if (existingProfile && existingProfile.ward_boy_id !== parseInt(wardBoyId)) {
                    return res.status(409).json({ message: `SystemUser ID ${dataToUpdate.system_user_id} is already linked to another ward boy.` });
                }
            }

            const success = await WardBoyModel.update(wardBoyId, dataToUpdate);
            if (!success) {
                return res.status(304).json({ message: 'No changes applied to ward boy profile.' });
            }
            const updatedWardBoy = await WardBoyModel.findById(wardBoyId);
            res.status(200).json({ message: 'Ward boy profile updated successfully!', wardBoy: updatedWardBoy });
        } catch (error) {
            console.error('Controller: Error updating ward boy:', error);
             if (error.message.includes('already exist') || error.message.includes('Duplicate entry') || error.message.includes('Invalid value provided for shift')) {
                return res.status(409).json({ message: error.message }); // Or 400
            }
            res.status(500).json({ message: error.message || 'Failed to update ward boy profile.' });
        }
    },

    /**
     * Admin: Delete a ward boy profile.
     */
    async deleteWardBoy(req, res) {
        const { wardBoyId } = req.params;
        try {
            const exists = await WardBoyModel.findById(wardBoyId);
            if (!exists) {
                return res.status(404).json({ message: 'Ward boy profile not found for deletion.' });
            }

            // Prefer soft delete: await WardBoyModel.update(wardBoyId, { is_active: false });
            // Hard delete:
            const success = await WardBoyModel.deleteById(wardBoyId);

            if (!success) {
                return res.status(404).json({ message: 'Ward boy profile not found or already deleted.' });
            }
            res.status(200).json({ message: 'Ward boy profile deleted successfully.' });
        } catch (error) {
            console.error('Controller: Error deleting ward boy:', error);
             if (error.message.includes('Cannot delete ward boy')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Failed to delete ward boy profile.' });
        }
    }
};

module.exports = WardBoyController;