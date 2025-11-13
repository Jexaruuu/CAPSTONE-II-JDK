const { supabaseAdmin } = require('../supabaseClient');

const getClientByEmail = async (email) => {
  const e = String(email || '').trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('user_client')
    .select('*')
    .eq('email_address', e)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
};

const getWorkerByEmail = async (email) => {
  const e = String(email || '').trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .select('*')
    .eq('email_address', e)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
};

module.exports = {
  getClientByEmail,
  getWorkerByEmail,
};
