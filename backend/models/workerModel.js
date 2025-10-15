const { supabaseAdmin } = require('../supabaseClient');

const createWorker = async (auth_uid, firstName, lastName, sex, email, password, isAgreedToTerms, agreedAt) => {
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .insert([{
      auth_uid,
      first_name: firstName,
      last_name: lastName,
      sex,
      email_address: String(email || '').trim().toLowerCase(),
      password,
      is_agreed_to_terms: isAgreedToTerms,
      agreed_at: agreedAt,
      contact_number: null,
      social_facebook: null,
      social_instagram: null,
      worker_avatar: null,
      created_at: new Date().toISOString()
    }]);
  if (error) throw error;
  return data;
};

const checkEmailExistence = async (email) => {
  const e = String(email || '').trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .select('*')
    .ilike('email_address', e);
  if (error) throw error;
  return data;
};

const checkEmailExistenceAcrossAllUsers = async (email) => {
  const e = String(email || '').trim().toLowerCase();
  const { data: clientData, error: clientError } = await supabaseAdmin
    .from('user_client')
    .select('*')
    .ilike('email_address', e);
  if (clientError) throw clientError;
  const { data: workerData, error: workerError } = await supabaseAdmin
    .from('user_worker')
    .select('*')
    .ilike('email_address', e);
  if (workerError) throw workerError;
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('user_admin')
    .select('*')
    .ilike('email_address', e);
  if (adminError) throw adminError;
  return [...clientData, ...workerData, ...adminData];
};

module.exports = { createWorker, checkEmailExistence, checkEmailExistenceAcrossAllUsers };
