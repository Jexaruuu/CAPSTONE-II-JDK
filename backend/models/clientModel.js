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
        email_address: String(email || '').trim().toLowerCase(),
        password,
        is_agreed_to_terms: isAgreedToTerms,
        agreed_at: agreedAt,
        contact_number: null,
        social_facebook: null,
        social_instagram: null,
        created_at: new Date().toISOString()
      }]);
    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
};

const checkEmailExistence = async (email) => {
  const e = String(email || '').trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('user_client')
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
  return [...clientData, ...workerData];
};

const getByAuthUid = async (auth_uid) => {
  const { data, error } = await supabaseAdmin.from('user_client').select('*').eq('auth_uid', auth_uid).limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

const updateAvatarUrl = async (auth_uid, avatar_url) => {
  const { data, error } = await supabaseAdmin.from('user_client').update({ avatar_url, client_avatar: avatar_url }).eq('auth_uid', auth_uid);
  if (error) throw error;
  return data;
};

const updatePassword = async (auth_uid, password) => {
  const { data, error } = await supabaseAdmin.from('user_client').update({ password }).eq('auth_uid', auth_uid);
  if (error) throw error;
  return data;
};

module.exports = {
  createClient,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers,
  getByAuthUid,
  updateAvatarUrl,
  updatePassword
};
