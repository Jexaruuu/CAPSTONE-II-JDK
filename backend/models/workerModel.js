const db = require('../db');

// Function to create a new worker in the database
const createWorker = async (firstName, lastName, sex, email, password) => {
  try {
    const query = 'INSERT INTO user_worker (first_name, last_name, sex, email_address, password) VALUES (?, ?, ?, ?, ?)';
    const [results] = await db.query(query, [firstName, lastName, sex, email, password]);
    return results;
  } catch (err) {
    console.error('Error inserting worker:', err);
    throw err;
  }
};

// Function to check if the email already exists
const checkEmailExistence = async (email) => {
  try {
    const query = 'SELECT * FROM user_worker WHERE email_address = ?';
    const [results] = await db.query(query, [email]);
    return results;
  } catch (err) {
    console.error('Error checking worker email:', err);
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

    return [...clientResults, ...workerResults]; // return combined
  } catch (err) {
    console.error('Error checking cross-user email existence:', err);
    throw err;
  }
};

module.exports = {
  createWorker,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers,
};
