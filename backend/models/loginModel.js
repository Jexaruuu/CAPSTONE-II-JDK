const db = require('../db');

// Check if a client with the given email exists
const getClientByEmail = async (email) => {
  const query = 'SELECT * FROM user_client WHERE email_address = ?';
  const [results] = await db.query(query, [email]);
  return results[0];
};

// Check if a worker with the given email exists
const getWorkerByEmail = async (email) => {
  const query = 'SELECT * FROM user_worker WHERE email_address = ?';
  const [results] = await db.query(query, [email]);
  return results[0];
};

module.exports = {
  getClientByEmail,
  getWorkerByEmail,
};
