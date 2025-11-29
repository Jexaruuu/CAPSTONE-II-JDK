const { getSupabaseAdmin } = require('../supabaseClient');

async function listApplications({ status, q, limit = 500 }) {
  const db = getSupabaseAdmin();
  let qry = db
    .from('worker_application_status')
    .select('id, status, created_at, decided_at, email_address, worker_id, reason_choice, reason_other, decision_reason')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(parseInt(limit || 500, 10), 1), 1000));

  if (status) qry = qry.eq('status', String(status).toLowerCase());
  if (q) qry = qry.ilike('email_address', String(q).trim());
  const { data, error } = await qry;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function countAllStatuses() {
  const db = getSupabaseAdmin();
  const statuses = ['pending','approved','declined','cancelled'];
  const out = {};
  for (const s of statuses) {
    const { count, error } = await db
      .from('worker_application_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', s);
    if (error) throw error;
    out[s] = count || 0;
  }
  out.total = (out.pending||0)+(out.approved||0)+(out.declined||0)+(out.cancelled||0);
  return out;
}

async function markStatus(id, status, decision_reason = null) {
  const db = getSupabaseAdmin();
  const payload = { status: String(status).toLowerCase(), decided_at: new Date().toISOString(), decision_reason: decision_reason || null };
  const { data, error } = await db
    .from('worker_application_status')
    .update(payload)
    .eq('id', id)
    .select('id, status, decided_at, email_address, worker_id, decision_reason')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  listApplications,
  countAllStatuses,
  markStatus
};
