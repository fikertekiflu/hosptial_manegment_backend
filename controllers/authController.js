// controllers/authController.js
const SystemUserModel = require('../models/SystemUsers');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const AuthController = {
    
    async login(req, res) {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }
        try {
            
            const user = await SystemUserModel.findByUsername(username);

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' }); // Generic message
            }

            // 3. Check if account is active
            if (!user.is_active) { // Assumes is_active is 1 for true, 0 for false
                return res.status(403).json({ message: 'Account is inactive. Please contact an administrator.' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials.' }); 
            }

            const payload = {
                userId: user.user_id,
                username: user.username,
                role: user.role,
                ...(user.linked_staff_id && { linkedStaffId: user.linked_staff_id })
            };

            // 6. Sign the JWT
            const token = jwt.sign(
                payload,
                JWT_SECRET,
                { expiresIn: '7h' } // Token expiration (e.g., 1 hour)
            );

            // 7. Send Successful Response
            res.status(200).json({
                message: 'Login successful!',
                token,
                user: {
                    userId: user.user_id,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role,
                    ...(user.linked_staff_id && { linkedStaffId: user.linked_staff_id })
                }
            });

        } catch (error) {
            console.error('Login Error in AuthController:', error);
            res.status(500).json({ message: 'Server error during login process.' });
        }
    }

};

module.exports = AuthController;