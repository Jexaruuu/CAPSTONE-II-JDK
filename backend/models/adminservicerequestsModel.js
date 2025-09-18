const { supabaseAdmin } = require('../supabaseClient');

function escapeForOrValue(v) {
  return String(v ?? '').replace(/([,()])/g, '\\$1');
}
function buildSearchOr(term) {
  const s = escapeForOrValue(term);
  return [
    `email_address.ilike.%${s}%`,
    `request_group_id.ilike.%${s}%`,
    `info->>first_name.ilike.%${s}%`,
    `info->>last_name.ilike.%${s}%`,
    `info->>barangay.ilike.%${s}%`,
    `details->>service_type.ilike.%${s}%`,
    `details->>service_task.ilike.%${s}%`,
  ].join(',');
}

function localSearchFilter(rows, term) {
  if (!term) return rows;
  const q = String(term).trim().toLowerCase();
  if (!q) return rows;
  const norm = (v) => (v === null || v === undefined ? '' : String(v).toLowerCase());
  return rows.filter((r) => {
    const i = r.info || {};
    const d = r.details || {};
    const candidates = [
      r.email_address,
      r.request_group_id,
      i.first_name,
      i.last_name,
      i.barangay,
      d.service_type,
      d.service_task,
    ];
    return candidates.some((val) => norm(val).includes(q));
  });
}

async function listPending(status = null, limit = 500, search = null) {
  let q = supabaseAdmin
    .from('csr_pending')
    .select('id, request_group_id, status, created_at, email_address, info, details, rate')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status && status !== 'all') {
    q = q.eq('status', status);
  }
  const { data, error } = await q;
  if (error) throw error;
  const baseRows = Array.isArray(data) ? data : [];
  const filtered = localSearchFilter(baseRows, search);
  return filtered;
}

async function markStatus(id, newStatus) {
  const allowed = new Set(['pending', 'approved', 'declined']);
  const next = String(newStatus || '').toLowerCase();
  if (!allowed.has(next)) throw new Error('Invalid status');
  const { data, error } = await supabaseAdmin
    .from('csr_pending')
    .update({ status: next })
    .eq('id', id)
    .select('id, request_group_id, status, created_at')
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
  listPending,
  markStatus,
  countByStatus,
};
