const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'test123!@#', // FALLBACK if DB_PASSWORD is NOT in .env
    database: process.env.DB_NAME || 'hospitalmangment',
    port: parseInt(process.env.DB_PORT, 10) || 3306, // Ensure port is an integer
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0      
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;