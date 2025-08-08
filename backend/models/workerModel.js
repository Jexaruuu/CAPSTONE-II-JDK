const supabase = require('../supabaseClient');

// Function to create a new worker in Supabase
const createWorker = async (firstName, lastName, sex, email, password) => {
  try {
    const { data, error } = await supabase
      .from('user_worker')
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
    console.error('Error inserting worker:', err);
    throw err;
  }
};

// Function to check if the email already exists in user_worker
const checkEmailExistence = async (email) => {
  try {
    const { data, error } = await supabase
      .from('user_worker')
      .select('*')
      .eq('email_address', email);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error checking worker email:', err);
    throw err;
  }
};

// Function to check if the email exists across both user_client and user_worker
const checkEmailExistenceAcrossAllUsers = async (email) => {
  try {
    const { data: clientData, error: clientError } = await supabase
      .from('user_client')
      .select('*')
      .eq('email_address', email);
    if (clientError) throw clientError;

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
  createWorker,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers,
};
