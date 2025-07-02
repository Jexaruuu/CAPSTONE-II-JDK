const db = require('../db');  // Correct path to db.js

// Function to create a new client in the database
const createClient = async (firstName, lastName, sex, email, password) => {
  try {
    const query = 'INSERT INTO user_client (first_name, last_name, sex, email_address, password) VALUES (?, ?, ?, ?, ?)';
    const [results] = await db.query(query, [firstName, lastName, sex, email, password]); // Note: added `sex`
    return results;
  } catch (err) {
    console.error('Error inserting client:', err);
    throw err;
  }
};

// Function to check if the email already exists in the database
const checkEmailExistence = async (email) => {
  try {
    const query = 'SELECT * FROM user_client WHERE email_address = ?';
    const [results] = await db.query(query, [email]);
    return results;
  } catch (err) {
    console.error('Error checking email existence:', err);
    throw err;
  }
};

// Add this function
const checkEmailExistenceAcrossAllUsers = async (email) => {
  try {
    const clientQuery = 'SELECT * FROM user_client WHERE email_address = ?';
    const workerQuery = 'SELECT * FROM user_worker WHERE email_address = ?';

    const [clientResults] = await db.query(clientQuery, [email]);
    const [workerResults] = await db.query(workerQuery, [email]);

    return [...clientResults, ...workerResults]; // return combined result
  } catch (err) {
    console.error('Error checking cross-user email existence:', err);
    throw err;
  }
};

module.exports = {
  createClient,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers, // export new method
};