
const SystemUserModel = require('../models/SystemUsers'); // Adjust path if needed

const SystemUserController = {
    
    async createUser(req, res) {
        const { username, password, role, full_name, linked_staff_id } = req.body;
        if (!username || !password || !role || !full_name) {
            return res.status(400).json({ message: 'Username, password, role, and full name are required.' });
        }
        const allowedRoles = ['Admin', 'Doctor', 'Nurse', 'WardBoy', 'Receptionist', 'BillingStaff'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: `Invalid role specified. Allowed roles are: ${allowedRoles.join(', ')}` });
        }
        if (password.length < 6) { // Example: enforce minimum password length
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        try {
            const existingUser = await SystemUserModel.findByUsername(username);
            if (existingUser) {
                return res.status(409).json({ message: `Username '${username}' already exists.` });
            }

            const newUserInput = { username, password, role, full_name, linked_staff_id: linked_staff_id || null };
            const createdUser = await SystemUserModel.create(newUserInput); // Model handles password hashing

            // Send back non-sensitive created user info
            const userResponse = {
                userId: createdUser.userId,
                username: createdUser.username,
                role: createdUser.role,
                full_name: full_name,
                linked_staff_id: linked_staff_id || null
            };

            res.status(201).json({
                message: 'System user created successfully!',
                user: userResponse
            });

        } catch (error) {
            console.error('Controller: Error creating system user:', error);
            if (error.message.includes('already exists')) {
                return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to create system user.' });
        }
    },

    /**
     * Admin: Gets a list of all system users.
     */
    async getAllUsers(req, res) {
        // Assumes this route is protected and only accessible by 'Admin'
        try {
            const users = await SystemUserModel.getAll(); // Model excludes password_hash
            res.status(200).json(users);
        } catch (error) {
            console.error('Controller: Error getting all users:', error);
            res.status(500).json({ message: 'Failed to retrieve users.' });
        }
    },

    /**
     * Admin: Gets a single system user by ID.
     */
    async getUserById(req, res) {
        // Assumes this route is protected and only accessible by 'Admin'
        const { userId } = req.params;
        try {
            const user = await SystemUserModel.findById(userId); // Model excludes password_hash
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Controller: Error getting user by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve user.' });
        }
    },

    
    async updateUser(req, res) {
        
        const { userId } = req.params;
        const { username, role, full_name, linked_staff_id, is_active } = req.body;

        if (username === undefined && role === undefined && full_name === undefined && linked_staff_id === undefined && is_active === undefined) {
            return res.status(400).json({ message: 'No update information provided.' });
        }
        if (role && !['Admin', 'Doctor', 'Nurse', 'WardBoy', 'Receptionist', 'BillingStaff'].includes(role)) {
             return res.status(400).json({ message: 'Invalid role specified.' });
        }

        try {
            const userDataToUpdate = {};
            if (username !== undefined) userDataToUpdate.username = username;
            if (role !== undefined) userDataToUpdate.role = role;
            if (full_name !== undefined) userDataToUpdate.full_name = full_name;
            // Ensure linked_staff_id can be set to null if explicitly provided as such
            if (req.body.hasOwnProperty('linked_staff_id')) userDataToUpdate.linked_staff_id = linked_staff_id;
            if (is_active !== undefined) userDataToUpdate.is_active = is_active;


            const success = await SystemUserModel.update(userId, userDataToUpdate);
            if (!success) {
                const userExists = await SystemUserModel.findById(userId);
                if (!userExists) return res.status(404).json({ message: 'User not found for update.' });
                // If user exists but no rows affected, it might mean data was same
                return res.status(200).json({ message: 'No changes applied or user not found.', updated: false });
            }

            const updatedUser = await SystemUserModel.findById(userId); // Fetch updated user details
            res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
        } catch (error) {
            console.error('Controller: Error updating user:', error);
            if (error.message.includes('already exist')) { // From model's ER_DUP_ENTRY check
                 return res.status(409).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Failed to update user.' });
        }
    },

    async updateUserPassword(req, res) {
       
        const { userId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: 'New password is required.' });
        }
        if (newPassword.length < 6) { 
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        try {
            const success = await SystemUserModel.updatePassword(userId, newPassword); // Model handles hashing
            if (!success) {
                
                const userExists = await SystemUserModel.findById(userId);
                if (!userExists) return res.status(404).json({ message: 'User not found.' });
                return res.status(500).json({ message: 'Password could not be updated for an unknown reason.'});
            }
            res.status(200).json({ message: 'User password updated successfully!' });
        } catch (error) {
            console.error('Controller: Error updating user password:', error);
            res.status(500).json({ message: error.message || 'Failed to update user password.' });
        }
    },

    async deleteUserById(req, res) {
        
        const { userId } = req.params;
        try {
            const success = await SystemUserModel.deleteById(userId);
            if (!success) {
                return res.status(404).json({ message: 'User not found or already deleted.' });
            }
            res.status(200).json({ message: 'User deleted successfully.' });
        } catch (error) {
            console.error('Controller: Error deleting user:', error);
            if (error.message.includes('Cannot delete user: User is referenced')) {
                return res.status(400).json({ message: error.message + " Consider deactivating the user instead." });
            }
            res.status(500).json({ message: 'Failed to delete user.' });
        }
    },

    async getCurrentUserProfile(req, res) {
        if (!req.user || !req.user.userId) {
           
            return res.status(401).json({ message: 'Authentication required to access profile.' });
        }
        try {
            // req.user.userId comes from the JWT payload processed by authenticateToken middleware
            const user = await SystemUserModel.findById(req.user.userId);
            if (!user) {
                // Should be rare if token is valid, but good to check
                return res.status(404).json({ message: 'User profile not found.' });
            }
            res.status(200).json(user); // Model's findById excludes password_hash
        } catch (error) {
            console.error('Controller: Error getting current user profile:', error);
            res.status(500).json({ message: 'Failed to retrieve user profile.' });
        }
    }
};

module.exports = SystemUserController;