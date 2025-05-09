// controllers/serviceController.js
const ServiceModel = require('../models/serviceModel');

const ServiceController = {
    /**
     * Admin: Create a new billable service.
     */
    async createService(req, res) {
        const { service_name, description, cost, service_category } = req.body;

        if (!service_name || cost === undefined) {
            return res.status(400).json({ message: 'service_name and cost are required.' });
        }
        const costValue = parseFloat(cost);
        if (isNaN(costValue) || costValue < 0) {
             return res.status(400).json({ message: 'Cost must be a non-negative number.' });
        }


        try {
            // Check if service name already exists
            const existingService = await ServiceModel.findByName(service_name);
            if (existingService) {
                return res.status(409).json({ message: `Service name '${service_name}' already exists.` });
            }

            const serviceData = { service_name, description, cost: costValue, service_category };
            const newService = await ServiceModel.create(serviceData);
            res.status(201).json({ message: 'Service created successfully!', service: newService });

        } catch (error) {
            console.error("Controller: Error creating service:", error);
            if (error.message.includes('already exists') || error.message.includes('Invalid cost')) {
                return res.status(400).json({ message: error.message }); // Use 400 or 409
            }
            res.status(500).json({ message: error.message || 'Failed to create service.' });
        }
    },

    /**
     * Get all services (Admin/Staff). Optional filters: ?is_active=true, ?service_category=Lab Test
     */
    async getAllServices(req, res) {
        try {
            const filters = {};
             if (req.query.is_active !== undefined) filters.is_active = req.query.is_active === 'true';
             if (req.query.service_category) filters.service_category = req.query.service_category;

            const services = await ServiceModel.getAll(filters);
            res.status(200).json(services);
        } catch (error) {
            console.error("Controller: Error getting all services:", error);
            res.status(500).json({ message: 'Failed to retrieve services.' });
        }
    },

     /**
     * Get service by ID (Admin/Staff).
     */
    async getServiceById(req, res) {
        const { serviceId } = req.params;
        try {
            const service = await ServiceModel.findById(serviceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found.' });
            }
            res.status(200).json(service);
        } catch (error) {
            console.error('Controller: Error getting service by ID:', error);
            res.status(500).json({ message: 'Failed to retrieve service.' });
        }
    },

    /**
     * Admin: Update service details.
     */
    async updateService(req, res) {
        const { serviceId } = req.params;
        const dataToUpdate = req.body;

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No data provided for update.' });
        }
        if (dataToUpdate.cost !== undefined) {
            const costValue = parseFloat(dataToUpdate.cost);
             if (isNaN(costValue) || costValue < 0) {
                return res.status(400).json({ message: 'Cost must be a non-negative number.' });
             }
             dataToUpdate.cost = costValue; // Ensure it's a number
        }

        try {
            const service = await ServiceModel.findById(serviceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found for update.' });
            }

            // Check for duplicate name if name is being changed
            if(dataToUpdate.service_name && dataToUpdate.service_name !== service.service_name) {
                const existingService = await ServiceModel.findByName(dataToUpdate.service_name);
                 if (existingService && existingService.service_id !== parseInt(serviceId)) {
                    return res.status(409).json({ message: `Service name '${dataToUpdate.service_name}' already exists.` });
                }
            }

            const success = await ServiceModel.update(serviceId, dataToUpdate);
            if (!success) {
                return res.status(304).json({ message: 'No changes applied to service details.' });
            }
            const updatedService = await ServiceModel.findById(serviceId);
            res.status(200).json({ message: 'Service updated successfully!', service: updatedService });
        } catch (error) {
            console.error("Controller: Error updating service:", error);
             if (error.message.includes('already exist') || error.message.includes('Invalid cost')) {
                return res.status(409).json({ message: error.message }); // Or 400
            }
            res.status(500).json({ message: error.message || 'Failed to update service.' });
        }
    },

    /**
     * Admin: Delete a service. (Consider deactivating instead)
     */
    async deleteService(req, res) {
        const { serviceId } = req.params;
        try {
            const service = await ServiceModel.findById(serviceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found for deletion.' });
            }

            // *** IMPORTANT: Add check here to see if service is used in Bill_Items ***
            // Example (requires BillItemModel):
            // const usageCount = await BillItemModel.countByServiceId(serviceId);
            // if (usageCount > 0) {
            //     return res.status(400).json({ message: `Cannot delete service '${service.service_name}' because it is used in existing bills. Deactivate it instead.` });
            // }

            // Soft delete is preferred:
            const success = await ServiceModel.update(serviceId, { is_active: false });
            // Or hard delete:
            // const success = await ServiceModel.deleteById(serviceId);

            if (!success) {
                // If using soft delete, this might mean it was already inactive
                 return res.status(404).json({ message: 'Service not found or could not be deactivated/deleted.' });
            }
            // Adjust message based on soft/hard delete
            res.status(200).json({ message: 'Service deactivated successfully.' });
            // res.status(200).json({ message: 'Service deleted successfully.' });

        } catch (error) {
            console.error("Controller: Error deleting service:", error);
            if (error.message.includes('Cannot delete service')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Failed to delete service.' });
        }
    }
};

module.exports = ServiceController;