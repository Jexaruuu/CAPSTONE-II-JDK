const { supabaseAdmin } = require('../supabaseClient'); // ✅ Same import style as clientModel.js

// Function to create a new worker in Supabase DB table
const createWorker = async (
  auth_uid,
  firstName,
  lastName,
  sex,
  email,
  password,
  isAgreedToTerms,
  agreedAt
) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_worker')
      .insert([
        {
          auth_uid, // store Supabase Auth UID
          first_name: firstName,
          last_name: lastName,
          sex,
          email_address: email,
          password,                 // ⚠️ kept to not remove existing code
          is_agreed_to_terms: isAgreedToTerms, // ✅ new column
          agreed_at: agreedAt                  // ✅ new column
        }
      ]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error inserting worker:', err);
    throw err;
  }
};

const checkEmailExistence = async (email) => {
  try {
    const { data, error } = await supabaseAdmin
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

const checkEmailExistenceAcrossAllUsers = async (email) => {
  try {
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('user_client')
      .select('*')
      .eq('email_address', email);
    if (clientError) throw clientError;

    const { data: workerData, error: workerError } = await supabaseAdmin
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
