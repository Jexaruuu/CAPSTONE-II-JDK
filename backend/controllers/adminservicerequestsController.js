const { supabaseAdmin } = require('../supabaseClient');
const { listPending, markStatus } = require('../models/adminservicerequestsModel');

function toBoolStrict(v) {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  const s = String(v ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', 't'].includes(s)) return true;
  if (['no', 'n', 'false', 'f'].includes(s)) return false;
  return false;
}
const yesNo = (b) => (b ? 'Yes' : 'No');

function dateOnlyFrom(val) {
  if (!val) return null;
  const raw = String(val).trim();
  const token = raw.split('T')[0].split(' ')[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token))) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isExpired(val) {
  const d = dateOnlyFrom(val);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

async function cancelledSet(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return new Set();
  const { data } = await supabaseAdmin.from('client_cancel_request').select('request_group_id').in('request_group_id', groupIds);
  const s = new Set();
  (data || []).forEach(r => { if (r.request_group_id) s.add(r.request_group_id); });
  return s;
}

async function cancelledTimes(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return new Map();
  const { data } = await supabaseAdmin.from('client_cancel_request').select('request_group_id,canceled_at').in('request_group_id', groupIds);
  const m = new Map();
  (data || []).forEach(r => { if (r.request_group_id) m.set(r.request_group_id, r.canceled_at || null); });
  return m;
}

async function cancelledReasons(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return new Map();
  const { data } = await supabaseAdmin.from('client_cancel_request').select('request_group_id,reason_choice,reason_other,canceled_at').in('request_group_id', groupIds);
  const m = new Map();
  (data || []).forEach(r => { if (r.request_group_id) m.set(r.request_group_id, { reason_choice: r.reason_choice || null, reason_other: r.reason_other || null, canceled_at: r.canceled_at || null }); });
  return m;
}

async function hydrate(baseRows) {
  const gids = baseRows.map(r => r.request_group_id).filter(Boolean);
  if (gids.length === 0) {
    return baseRows.map(r => ({
      id: r.id,
      request_group_id: r.request_group_id,
      status: r.status,
      created_at: r.created_at,
      decision_reason: r.decision_reason,
      decided_at: r.decided_at,
      reason_choice: r.reason_choice,
      reason_other: r.reason_other,
      info: {},
      details: {},
      rate: {},
    }));
  }

  const [infos, details, rates] = await Promise.all([
    supabaseAdmin
      .from('client_information')
      .select('request_group_id, first_name, last_name, email_address, barangay, street, additional_address, profile_picture_url, profile_picture_name')
      .in('request_group_id', gids),
    supabaseAdmin
      .from('client_service_request_details')
      .select('request_group_id, preferred_date, preferred_time, service_type, service_task, service_description, is_urgent, tools_provided, request_image_url, image_name')
      .in('request_group_id', gids),
    supabaseAdmin
      .from('client_service_rate')
      .select('request_group_id, rate_type, rate_from, rate_to, rate_value')
      .in('request_group_id', gids),
  ]);

  const toMap = (res) => {
    const m = new Map();
    (res?.data || []).forEach(row => m.set(row.request_group_id, row));
    return m;
  };
  const infoMap = toMap(infos);
  const detMap  = toMap(details);
  const rateMap = toMap(rates);
  const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';

  return baseRows.map(r => {
    const d0 = detMap.get(r.request_group_id) || {};
    const d = { ...d0 };
    if (d.is_urgent !== undefined) d.is_urgent = yesNo(toBoolStrict(d.is_urgent));
    if (d.tools_provided !== undefined) d.tools_provided = yesNo(toBoolStrict(d.tools_provided));
    if (!d.image_url && d.image_name) {
      const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(d.image_name);
      d.image_url = pub?.publicUrl || null;
    }
    return {
      id: r.id,
      request_group_id: r.request_group_id,
      status: r.status,
      created_at: r.created_at,
      decision_reason: r.decision_reason,
      decided_at: r.decided_at,
      reason_choice: r.reason_choice,
      reason_other: r.reason_other,
      info: infoMap.get(r.request_group_id) || {},
      details: d,
      rate: rateMap.get(r.request_group_id) || {},
    };
  });
}

exports.list = async (req, res) => {
  try {
    let rawStatus = (req.query.status ?? '').trim().toLowerCase();
    let status = rawStatus && rawStatus !== 'all' ? rawStatus : null;
    const search = (req.query.q || req.query.search || '').trim() || null;

    const base = status === 'cancelled' ? await listPending(null, 500, search) : await listPending(status, 500, search);
    const items0 = await hydrate(base);
    const gids = items0.map(r => r.request_group_id).filter(Boolean);
    const cancelled = await cancelledSet(gids);
    const cancelMap = await cancelledTimes(gids);
    const cancelReasonMap = await cancelledReasons(gids);
    const items = items0.map(r => {
      if (cancelled.has(r.request_group_id)) {
        const cr = cancelReasonMap.get(r.request_group_id) || {};
        return { ...r, status: 'cancelled', canceled_at: cr.canceled_at || cancelMap.get(r.request_group_id) || null, reason_choice: cr.reason_choice || null, reason_other: cr.reason_other || null };
      }
      return r;
    });

    let out;
    if (status === 'cancelled') {
      out = items.filter(r => String(r.status || '').toLowerCase() === 'cancelled');
    } else if (status) {
      out = items.filter(r => String(r.status || '').toLowerCase() === status);
    } else {
      out = items.filter(r => String(r.status || '').toLowerCase() !== 'cancelled');
    }

    return res.status(200).json({ items: out, total: out.length });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list service requests', error: err?.message });
  }
};

exports.count = async (_req, res) => {
  try {
    const base = await listPending(null, 2000, null);
    const items0 = await hydrate(base);
    const gids = items0.map(r => r.request_group_id).filter(Boolean);
    const cancelled = await cancelledSet(gids);
    let pending = 0, approved = 0, declined = 0;
    for (const r of items0) {
      const gid = r.request_group_id;
      if (cancelled.has(gid)) continue;
      const s = String(r.status || 'pending').toLowerCase();
      const expired = isExpired(r?.details?.preferred_date);
      if (s === 'approved') approved++;
      else if (s === 'declined') declined++;
      else if (!expired) pending++;
    }
    return res.status(200).json({ pending, approved, declined, total: pending + approved + declined });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to get counts', error: err?.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await markStatus(id, 'approved');
    return res.status(200).json({ message: 'Approved', request: row });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to approve request', error: err?.message });
  }
};

exports.decline = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason_choice = null, reason_other = null } = req.body || {};
    const row = await markStatus(id, 'declined', { reason_choice, reason_other });
    return res.status(200).json({ message: 'Declined', request: row });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to decline request', error: err?.message });
  }
};
