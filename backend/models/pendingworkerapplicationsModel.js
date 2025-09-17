// backend/models/pendingworkerapplicationsModel.js
const { supabaseAdmin } = require('../supabaseClient');

async function insertPendingApplication(row) {
  const { data, error } = await supabaseAdmin
    .from('wa_pending')
    .insert([row])
    .select('id, request_group_id, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function listPending(status = 'pending', limit = 200) {
  const q = supabaseAdmin
    .from('wa_pending')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  const { data, error } = status ? await q.eq('status', status) : await q;
  if (error) throw error;
  return data || [];
}

async function countPending() {
  const { count, error } = await supabaseAdmin
    .from('wa_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw error;
  return count || 0;
}

async function getPendingById(id) {
  const { data, error } = await supabaseAdmin
    .from('wa_pending')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function markStatus(id, status, reason = null) {
  const { data, error } = await supabaseAdmin
    .from('wa_pending')
    .update({ status, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status, request_group_id')
    .single();
  if (error) throw error;
  return data;
}

async function countByStatus(status) {
  const { count, error } = await supabaseAdmin
    .from('wa_pending')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw error;
  return count || 0;
}

module.exports = {
  insertPendingApplication,
  listPending,
  countPending,
  getPendingById,
  markStatus,
  countByStatus
};
