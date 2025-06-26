const db = require('../db');  // Correct path to db.js

// Function to create a new client in the database
const createClient = async (firstName, lastName, email, password) => {
  try {
    const query = 'INSERT INTO clients (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
    const [results] = await db.query(query, [firstName, lastName, email, password]);  // Use await here
    return results;
  } catch (err) {
    console.error('Error inserting client:', err);
    throw err;
  }
};

// Function to check if the email already exists in the database
const checkEmailExistence = async (email) => {
  try {
    const query = 'SELECT * FROM clients WHERE email = ?';
    const [results] = await db.query(query, [email]);  // Use await here
    return results;
  } catch (err) {
    console.error('Error checking email existence:', err);
    throw err;
  }
};

module.exports = {
  createClient,
  checkEmailExistence,
};
