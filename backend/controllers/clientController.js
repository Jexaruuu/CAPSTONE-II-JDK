const clientModel = require('../models/clientModel'); // Adjust the path if necessary

// Controller to register a new client
const registerClient = async (req, res) => {
  const { first_name, last_name, sex, email_address, password } = req.body; // ✅ Include sex

  try {
 // Replace email check line with the new function
const emailExists = await clientModel.checkEmailExistenceAcrossAllUsers(email_address);
if (emailExists.length > 0) {
  return res.status(400).json({ message: 'Email already in use' });
}

    // Register the new client with sex
    const result = await clientModel.createClient(first_name, last_name, sex, email_address, password); // ✅ Pass sex

    return res.status(201).json({
      message: 'Client registered successfully',
      data: { first_name, last_name, sex }, // ✅ Optionally return sex in the response
    });
  } catch (error) {
    console.error('Error during client registration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  registerClient,
};

clientModel.js
const supabase = require('../supabaseClient');

// Function to create a new client in Supabase
const createClient = async (firstName, lastName, sex, email, password) => {
  try {
    const { data, error } = await supabase
      .from('user_client')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          sex,
          email_address: email,
          password
        }
      ]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error inserting client:', err);
    throw err;
  }
};

const checkEmailExistence = async (email) => {
  try {
    const { data, error } = await supabase
      .from('user_client')
      .select('*')
      .eq('email_address', email);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error checking email existence:', err);
    throw err;
  }
};

const checkEmailExistenceAcrossAllUsers = async (email) => {
  try {
    // Check in user_client
    const { data: clientData, error: clientError } = await supabase
      .from('user_client')
      .select('*')
      .eq('email_address', email);
    if (clientError) throw clientError;

    // Check in user_worker
    const { data: workerData, error: workerError } = await supabase
      .from('user_worker')
      .select('*')
      .eq('email_address', email);
    if (workerError) throw workerError;

    return [...clientData, ...workerData];
  } catch (err) {
    console.error('Error checking cross-user email existence:', err);
    throw err;
  }
};

module.exports = {
  createClient,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers,
  registerClient,
};