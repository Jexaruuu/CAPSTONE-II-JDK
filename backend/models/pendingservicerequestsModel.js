const { supabaseAdmin } = require('../supabaseClient');

async function insertPendingRequest(row) {
  const { data, error } = await supabaseAdmin
    .from('csr_pending')
    .insert([row])
    .select('id, request_group_id, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function listPending(status = 'pending', limit = 200) {
  const q = supabaseAdmin.from('csr_pending')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  const { data, error } = status ? await q.eq('status', status) : await q;
  if (error) throw error;
  return data || [];
}

async function listByEmail(email, status = null, limit = 200) {
  if (!email) return [];
  let q = supabaseAdmin.from('csr_pending')
    .select('*')
    .eq('email_address', email)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function countPending() {
  const { count, error } = await supabaseAdmin
    .from('csr_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw error;
  return count || 0;
}

async function getPendingById(id) {
  const { data, error } = await supabaseAdmin
    .from('csr_pending')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function markStatus(id, status, reason = null) {
  const { data, error } = await supabaseAdmin
    .from('csr_pending')
    .update({ status, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, request_group_id')
    .single();
  if (error) throw error;
  return data;
}

async function countByStatus(status) {
  const { count, error } = await supabaseAdmin
    .from('csr_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw error;
  return count || 0;
}

module.exports = {
  insertPendingRequest,
  listPending,
  listByEmail,
  countPending,
  getPendingById,
  markStatus,
  countByStatus,
};
