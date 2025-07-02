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

module.exports = {
  createWorker,
  checkEmailExistence,
};
