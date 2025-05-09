// controllers/doctorController.js
const DoctorModel = require('../models/doctorModel');
const SystemUserModel = require('../models/SystemUsers'); 

const DoctorController = {
    
    async createDoctor(req, res) {
        const {
            system_user_id, first_name, last_name, specialization,
            phone_number, email, license_number
        } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }

        try {
            // Optional: Validate if system_user_id (if provided) exists and is a 'Doctor'
            if (system_user_id) {
                const systemUser = await SystemUserModel.findById(system_user_id);
                if (!systemUser) {
                    return res.status(404).json({ message: `SystemUser with ID ${system_user_id} not found.` });
                }
                // Optionally check if systemUser.role is 'Doctor' or if already linked
                const existingDoctorProfile = await DoctorModel.findBySystemUserId(system_user_id);
                if (existingDoctorProfile) {
                    return res.status(409).json({ message: `SystemUser ID ${system_user_id} is already linked to doctor ID ${existingDoctorProfile.doctor_id}.` });
                }
            }

            const doctorData = {
                system_user_id, first_name, last_name, specialization,
                phone_number, email, license_number
            };
            const newDoctor = await DoctorModel.create(doctorData);
            res.status(201).json({ message: 'Doctor profile created successfully!', doctor: newDoctor });
        } catch (error) {
            console.error('Controller: Error creating doctor:', error);
            if (error.message.includes('already exist') || error.message.includes('Duplicate entry')) {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to create doctor profile.' });
        }
    },

    /**
     * Admin: Get all doctor profiles.
     */
    async getAllDoctors(req, res) {
        try {
            const showInactive = req.query.inactive === 'true';
            const doctors = await DoctorModel.getAll(showInactive);
            res.status(200).json(doctors);
        } catch (error) {
            console.error('Controller: Error getting all doctors:', error);
            res.status(500).json({ message: 'Failed to retrieve doctor profiles.' });
        }
    },

    /**
     * Admin: Get a doctor profile by ID.
     */
    async getDoctorById(req, res) {
        const { doctorId } = req.params;
        try {
            const doctor = await DoctorModel.findById(doctorId);
            if (!doctor) {
                return res.status(404).json({ message: 'Doctor profile not found.' });
            }
            res.status(200).json(doctor);
        } catch (error) {
            console.error('Controller: Error getting doctor by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve doctor profile.' });
        }
    },

    /**
     * Admin: Update a doctor's profile.
     */
    async updateDoctor(req, res) {
        const { doctorId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }

        try {
            const doctorExists = await DoctorModel.findById(doctorId);
            if (!doctorExists) {
                return res.status(404).json({ message: 'Doctor profile not found for update.' });
            }

            // Optional: If system_user_id is being changed/set, validate it
            if (dataToUpdate.hasOwnProperty('system_user_id') && dataToUpdate.system_user_id !== null) {
                const systemUser = await SystemUserModel.findById(dataToUpdate.system_user_id);
                if (!systemUser) {
                    return res.status(404).json({ message: `SystemUser with ID ${dataToUpdate.system_user_id} not found.` });
                }
                const existingDoctorProfile = await DoctorModel.findBySystemUserId(dataToUpdate.system_user_id);
                if (existingDoctorProfile && existingDoctorProfile.doctor_id !== parseInt(doctorId)) {
                    return res.status(409).json({ message: `SystemUser ID ${dataToUpdate.system_user_id} is already linked to another doctor.` });
                }
            }


            const success = await DoctorModel.update(doctorId, dataToUpdate);
            if (!success) {
                // Might mean data was same or user not found (though checked above)
                return res.status(304).json({ message: 'No changes applied to doctor profile.' });
            }
            const updatedDoctor = await DoctorModel.findById(doctorId);
            res.status(200).json({ message: 'Doctor profile updated successfully!', doctor: updatedDoctor });
        } catch (error) {
            console.error('Controller: Error updating doctor:', error);
             if (error.message.includes('already exist') || error.message.includes('Duplicate entry')) {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to update doctor profile.' });
        }
    },

    /**
     * Admin: Delete a doctor profile.
     */
    async deleteDoctor(req, res) {
        const { doctorId } = req.params;
        try {
            const doctorExists = await DoctorModel.findById(doctorId);
            if (!doctorExists) {
                return res.status(404).json({ message: 'Doctor profile not found for deletion.' });
            }

            // Soft delete is preferred: update is_active to false
            // const success = await DoctorModel.update(doctorId, { is_active: false });
            // For hard delete:
            const success = await DoctorModel.deleteById(doctorId);

            if (!success) {
                return res.status(404).json({ message: 'Doctor profile not found or already deleted.' });
            }
            res.status(200).json({ message: 'Doctor profile deleted successfully.' });
            // Or use res.status(204).send(); for successful deletions with no content returned.
        } catch (error) {
            console.error('Controller: Error deleting doctor:', error);
            if (error.message.includes('Cannot delete doctor')) {
                 return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Failed to delete doctor profile.' });
        }
    }
};

module.exports = DoctorController;