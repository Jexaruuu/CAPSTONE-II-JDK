const mysql = require('mysql2');

// Create a pool of connections
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',    // Update with your MySQL username
  password: '',    // Update with your MySQL password
  database: 'capstone_db',  // Ensure this is the correct database name
});

// Promise API for better async/await support
module.exports = pool.promise();  // Use promise-based queries
