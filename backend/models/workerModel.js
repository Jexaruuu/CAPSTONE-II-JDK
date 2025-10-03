const { supabaseAdmin } = require('../supabaseClient');

const createWorker = async (auth_uid, firstName, lastName, sex, email, password, isAgreedToTerms, agreedAt) => {
  const { data, error } = await supabaseAdmin.from('user_worker').insert([{ auth_uid, first_name: firstName, last_name: lastName, sex, email_address: email, password, is_agreed_to_terms: isAgreedToTerms, agreed_at: agreedAt }]);
  if (error) throw error;
  return data;
};

const checkEmailExistence = async (email) => {
  const { data, error } = await supabaseAdmin.from('user_worker').select('*').eq('email_address', email);
  if (error) throw error;
  return data;
};

const checkEmailExistenceAcrossAllUsers = async (email) => {
  const { data: clientData, error: clientError } = await supabaseAdmin.from('user_client').select('*').eq('email_address', email);
  if (clientError) throw clientError;
  const { data: workerData, error: workerError } = await supabaseAdmin.from('user_worker').select('*').eq('email_address', email);
  if (workerError) throw workerError;
  return [...clientData, ...workerData];
};

module.exports = { createWorker, checkEmailExistence, checkEmailExistenceAcrossAllUsers };
