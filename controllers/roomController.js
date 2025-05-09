// controllers/roomController.js
const RoomModel = require('../models/roomModel');

const RoomController = {
    /**
     * Admin: Create a new room.
     */
    async createRoom(req, res) {
        const { room_number, room_type, capacity, notes } = req.body;
        if (!room_number || !room_type || !capacity) {
            return res.status(400).json({ message: 'room_number, room_type, and capacity are required.' });
        }
        if (isNaN(parseInt(capacity)) || capacity < 1) {
            return res.status(400).json({ message: 'Capacity must be a positive number.' });
        }

        try {
            const roomData = { room_number, room_type, capacity: parseInt(capacity), notes };
            const newRoom = await RoomModel.create(roomData);
            res.status(201).json({ message: 'Room created successfully!', room: newRoom });
        } catch (error) {
            console.error("Controller: Error creating room:", error);
            if (error.message.includes('already exists') || error.message.includes('Invalid room_type')) {
                return res.status(409).json({ message: error.message }); // Conflict or Bad Request
            }
            res.status(500).json({ message: error.message || 'Failed to create room.' });
        }
    },

    /**
     * Get all rooms (Admin/Staff). Filters can be applied via query params.
     * e.g., ?is_active=true&room_type=Private&only_available=true
     */
    async getAllRooms(req, res) {
        try {
            const filters = {};
            if (req.query.is_active !== undefined) filters.is_active = req.query.is_active === 'true';
            if (req.query.room_type) filters.room_type = req.query.room_type;
            if (req.query.only_available !== undefined) filters.only_available = req.query.only_available === 'true';

            const rooms = await RoomModel.getAll(filters);
            res.status(200).json(rooms);
        } catch (error) {
            console.error("Controller: Error getting all rooms:", error);
            res.status(500).json({ message: 'Failed to retrieve rooms.' });
        }
    },

     /**
     * Get room by ID (Admin/Staff).
     */
    async getRoomById(req, res) {
        const { roomId } = req.params;
        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                return res.status(404).json({ message: 'Room not found.' });
            }
            res.status(200).json(room);
        } catch (error) {
            console.error('Controller: Error getting room by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve room.' });
        }
    },

    /**
     * Admin: Update room details.
     */
    async updateRoom(req, res) {
        const { roomId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }
        // Add validation for capacity, room_type ENUM etc. if provided

        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                return res.status(404).json({ message: 'Room not found for update.' });
            }
            // Prevent direct update of occupancy
            if (dataToUpdate.hasOwnProperty('current_occupancy')) {
                 return res.status(400).json({ message: 'Cannot update current_occupancy directly. It is managed by admissions/discharges.' });
            }

            const success = await RoomModel.update(roomId, dataToUpdate);
            if (!success) {
                return res.status(304).json({ message: 'No changes applied to room details.' });
            }
            const updatedRoom = await RoomModel.findById(roomId);
            res.status(200).json({ message: 'Room updated successfully!', room: updatedRoom });
        } catch (error) {
            console.error("Controller: Error updating room:", error);
             if (error.message.includes('already exist') || error.message.includes('Invalid room_type')) {
                return res.status(409).json({ message: error.message }); // Or 400
            }
            res.status(500).json({ message: error.message || 'Failed to update room.' });
        }
    },

    /**
     * Admin: Delete a room.
     */
    async deleteRoom(req, res) {
        const { roomId } = req.params;
        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                return res.status(404).json({ message: 'Room not found for deletion.' });
            }
            // *** CRITICAL CHECK: Ensure room is empty before deleting ***
            if (room.current_occupancy > 0) {
                return res.status(400).json({ message: `Cannot delete room ${room.room_number} because it is currently occupied.` });
            }

            const success = await RoomModel.deleteById(roomId);
            if (!success) {
                return res.status(404).json({ message: 'Room not found or already deleted.' });
            }
            res.status(200).json({ message: 'Room deleted successfully.' });
        } catch (error) {
            console.error("Controller: Error deleting room:", error);
             if (error.message.includes('Cannot delete room')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Failed to delete room.' });
        }
    }
};

module.exports = RoomController;