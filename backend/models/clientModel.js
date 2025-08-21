const { supabaseAdmin } = require('../supabaseClient');

const createClient = async (auth_uid, firstName, lastName, sex, email, password, isAgreedToTerms, agreedAt) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_client')
      .insert([{
        auth_uid,
        first_name: firstName,
        last_name: lastName,
        sex,
        email_address: email,
        password,                 // ⚠️ Plaintext in DB (kept as per your existing code)
        is_agreed_to_terms: isAgreedToTerms,   // ✅ new column
        agreed_at: agreedAt                    // ✅ new column
      }]);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error inserting client:', err);
    throw err;
  }
};

const checkEmailExistence = async (email) => {
  const { data, error } = await supabaseAdmin
    .from('user_client')
    .select('*')
    .eq('email_address', email);
  if (error) throw error;
  return data;
};

const checkEmailExistenceAcrossAllUsers = async (email) => {
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
};

module.exports = {
  createClient,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers
};
