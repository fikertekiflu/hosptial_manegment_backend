// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const systemUserRoutes =  require('./routes/systemUserRoutes')
const authRoute =  require('./routes/authRoute')
const patientRoute =  require('./routes/patientRoute')
const doctorRoute =  require('./routes/doctorRoute')
const nurseRoute =  require('./routes/nurseRoute')
const wardBoysRoute =  require('./routes/wardBoysRoute')
const appointmentRoutes =  require('./routes/appointmentRoutes')
const treatmentRoutes =  require('./routes/treatmentRoutes')
const roomRoutes =  require('./routes/roomRoutes')
const admissionRoutes =  require('./routes/admissionRoutes')
const staffAssignmentRoutes =  require('./routes/staffAssignmentRoutes')
const serviceRoutes =  require('./routes/serviceRoute')
const billRoutes =  require('./routes/billRoutes')
const paymentRoutes = require('./routes/paymentRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoute);
app.use('/api/users', systemUserRoutes)
app.use('/api/patient', patientRoute)
app.use('/api/doctor', doctorRoute)
app.use('/api/nurse', nurseRoute)
app.use('/api/wardBoys', wardBoysRoute)
app.use('/api/appointment', appointmentRoutes)
app.use('/api/treatment', treatmentRoutes)
app.use('/api/room', roomRoutes)
app.use('/api/admission', admissionRoutes)
app.use('/api/assignment', staffAssignmentRoutes)
app.use('/api/service', serviceRoutes)
app.use('/api/bill', billRoutes)
app.use('/api/payment', paymentRoutes)

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hospital Management System API is running!' });
});

app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    console.error(`[Global Error Handler] ${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : '🥞 Server Error',
    });
});

const startServer = async () => {
    console.log(`[Server] Running on port ${PORT} (http://localhost:${PORT})`);
    let dbConnection;
    try {
        dbConnection = await pool.getConnection();
        console.log("[Server] >>> Successfully connected to the MySQL database on startup! <<<");
    } catch (error) {
        console.error("[Server] >>> CRITICAL: FAILED to connect to the MySQL database on startup! <<<");
        console.error("[Server] Error details:", error.message);
        // process.exit(1); 
    } finally {
        if (dbConnection) dbConnection.release();
    }
};

const expressServer = app.listen(PORT, startServer);

const gracefulShutdown = (signal, serverInstance) => {
    console.info(`[Server] ${signal} signal received. Closing HTTP server...`);
    serverInstance.close(async () => {
        console.log('[Server] HTTP server closed.');
        if (pool && pool.end) {
            try {
                await pool.end();
                console.log('[Server] Database pool closed.');
            } catch (error) {
                console.error('[Server] Error closing database pool:', error);
            }
        }
        process.exit(0);
    });
};

process.on('SIGTERM', (signal) => gracefulShutdown(signal, expressServer));
process.on('SIGINT', (signal) => gracefulShutdown(signal, expressServer));