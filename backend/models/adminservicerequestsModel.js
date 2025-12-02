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
    `details->>service_description.ilike.%${s}%`,
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
      d.service_description,
    ];
    return candidates.some((val) => norm(val).includes(q));
  });
}

async function listPending(status = null, limit = 500, search = null) {
  let q = supabaseAdmin
    .from('client_service_request_status')
    .select('id, request_group_id, status, created_at, email_address, info, details, rate, decision_reason, decided_at, reason_choice, reason_other')
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

function combineReason(reason_choice, reason_other) {
  const a = (reason_choice || '').trim();
  const b = (reason_other || '').trim();
  if (a && b) return `${a} — ${b}`;
  return a || b || null;
}

async function markStatus(id, newStatus, payload = {}) {
  const allowed = new Set(['pending', 'approved', 'declined']);
  const next = String(newStatus || '').toLowerCase();
  if (!allowed.has(next)) throw new Error('Invalid status');

  const patch = { status: next };
  if (next === 'declined') {
    const reason = combineReason(payload.reason_choice, payload.reason_other);
    if (reason) patch.decision_reason = reason;
    patch.reason_choice = payload.reason_choice || null;
    patch.reason_other = payload.reason_other || null;
    patch.decided_at = new Date().toISOString();
  } else {
    patch.decision_reason = null;
    patch.reason_choice = null;
    patch.reason_other = null;
    patch.decided_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from('client_service_request_status')
    .update(patch)
    .eq('id', id)
    .select('id, request_group_id, status, created_at, decision_reason, decided_at, reason_choice, reason_other')
    .single();
  if (error) throw error;
  return data;
}

async function countByStatus(status) {
  const { count, error } = await supabaseAdmin
    .from('client_service_request_status')
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
