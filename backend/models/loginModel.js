const supabase = require('../supabaseClient');

// Check user_client
const getClientByEmail = async (email) => {
  const { data, error } = await supabase
    .from('user_client')
    .select('*')
    .eq('email_address', email)
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data || null;
};

// Check user_worker
const getWorkerByEmail = async (email) => {
  const { data, error } = await supabase
    .from('user_worker')
    .select('*')
    .eq('email_address', email)
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
