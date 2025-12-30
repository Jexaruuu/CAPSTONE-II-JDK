// adminModel.js
const { supabaseAdmin } = require('../supabaseClient');

const ADMIN_TABLE = 'user_admin';
const CLIENT_TABLE = 'user_client';
const WORKER_TABLE = 'user_worker';

function dataOrNull(resp) {
  const { data, error } = resp || {};
  if (error) return null;
  return data ?? null;
}

exports.getByEmail = async (email) => {
  const { data, error } = await supabaseAdmin
    .from(ADMIN_TABLE)
    .select('*')
    .eq('email_address', email)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

exports.getByAdminNo = async (adminNo) => {
  const { data, error } = await supabaseAdmin
    .from(ADMIN_TABLE)
    .select('*')
    .eq('admin_no', adminNo)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

exports.createAdmin = async (profile) => {
  const payload = {
    auth_uid: profile.auth_uid,
    first_name: profile.first_name,
    last_name: profile.last_name,
    sex: profile.sex ?? null,
    email_address: profile.email_address,
    admin_no: profile.admin_no,
    role: profile.role ?? 'admin',
    created_at: profile.created_at || null,
    password: profile.password || null
  };

  const { data, error } = await supabaseAdmin
    .from(ADMIN_TABLE)
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('createAdmin insert error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }
  return data || null;
};

exports.checkEmailExistenceAcrossAllUsers = async (email) => {
  try {
    const [admin, client, worker] = await Promise.all([
      supabaseAdmin.from(ADMIN_TABLE).select('email_address').eq('email_address', email).limit(1),
      supabaseAdmin.from(CLIENT_TABLE).select('email_address').eq('email_address', email).limit(1),
      supabaseAdmin.from(WORKER_TABLE).select('email_address').eq('email_address', email).limit(1),
    ]);

    const a = dataOrNull(admin);
    const c = dataOrNull(client);
    const w = dataOrNull(worker);

    const found =
      (Array.isArray(a) && a.length > 0) ||
      (Array.isArray(c) && a && c.length > 0) ||
      (Array.isArray(w) && w.length > 0);

    return !!found;
  } catch (err) {
    console.error('checkEmailExistenceAcrossAllUsers error:', err);
    return true;
  }
};

exports.adminNoExists = async (adminNo) => {
  const { data, error } = await supabaseAdmin
    .from(ADMIN_TABLE)
    .select('admin_no')
    .eq('admin_no', adminNo)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
};

exports.listClients = async () => {
  const { data, error } = await supabaseAdmin
    .from(CLIENT_TABLE)
    .select('auth_uid, first_name, last_name, sex, email_address, created_at, contact_number, social_facebook, social_instagram');
  if (error) {
    console.error('listClients error:', error);
    return [];
  }
  return data || [];
};

exports.listWorkers = async () => {
  const { data, error } = await supabaseAdmin
    .from(WORKER_TABLE)
    .select('auth_uid, first_name, last_name, sex, email_address, created_at, contact_number, social_facebook, social_instagram');
  if (error) {
    console.error('listWorkers error:', error);
    return [];
  }
  return data || [];
};

exports.listAdmins = async () => {
  const { data, error } = await supabaseAdmin
    .from(ADMIN_TABLE)
    .select('auth_uid, first_name, last_name, sex, email_address, created_at, role');
  if (error) {
    console.error('listAdmins error:', error);
    return [];
  }
  return data || [];
};
