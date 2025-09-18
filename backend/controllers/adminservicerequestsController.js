const { supabaseAdmin } = require('../supabaseClient');
const { listPending, markStatus, countByStatus } = require('../models/adminservicerequestsModel');

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

async function hydrate(baseRows) {
  const gids = baseRows.map(r => r.request_group_id).filter(Boolean);
  if (gids.length === 0) {
    return baseRows.map(r => ({
      id: r.id,
      request_group_id: r.request_group_id,
      status: r.status,
      created_at: r.created_at,
      info: {},
      details: {},
      rate: {},
    }));
  }

  const [infos, details, rates] = await Promise.all([
    supabaseAdmin
      .from('client_information')
      .select('request_group_id, first_name, last_name, email_address, barangay')
      .in('request_group_id', gids),
    supabaseAdmin
      .from('client_service_request_details')
      .select('request_group_id, preferred_date, preferred_time, service_type, service_task, is_urgent, tools_provided')
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

  return baseRows.map(r => {
    const d0 = detMap.get(r.request_group_id) || {};
    const d = { ...d0 };
    if (d.is_urgent !== undefined) d.is_urgent = yesNo(toBoolStrict(d.is_urgent));
    if (d.tools_provided !== undefined) d.tools_provided = yesNo(toBoolStrict(d.tools_provided));
    return {
      id: r.id,
      request_group_id: r.request_group_id,
      status: r.status,
      created_at: r.created_at,
      info: infoMap.get(r.request_group_id) || {},
      details: d,
      rate: rateMap.get(r.request_group_id) || {},
    };
  });
}

exports.list = async (req, res) => {
  try {
    let status = (req.query.status ?? '').trim().toLowerCase();
    if (!status || status === 'all') status = null;
    const search = (req.query.q || req.query.search || '').trim() || null;
    const base = await listPending(status, 500, search);
    const items = await hydrate(base);
    return res.status(200).json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list service requests', error: err?.message });
  }
};

exports.count = async (_req, res) => {
  try {
    const [pending, approved, declined] = await Promise.all([
      countByStatus('pending'),
      countByStatus('approved'),
      countByStatus('declined'),
    ]);
    return res.status(200).json({ pending, approved, declined, total: (pending + approved + declined) });
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
    const row = await markStatus(id, 'declined');
    return res.status(200).json({ message: 'Declined', request: row });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to decline request', error: err?.message });
  }
};
