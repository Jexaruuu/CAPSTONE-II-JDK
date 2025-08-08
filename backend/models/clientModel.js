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
};