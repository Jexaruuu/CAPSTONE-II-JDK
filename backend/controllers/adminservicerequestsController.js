// backend/controllers/adminservicerequestsController.js
const { supabaseAdmin } = require('../supabaseClient');
const {
  listPending,
  markStatus,
  countByStatus,
} = require('../models/adminservicerequestsModel'); // ⬅️ new model

// Batch-hydrate incoming rows with info/details/rate by request_group_id
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

  return baseRows.map(r => ({
    id: r.id,
    request_group_id: r.request_group_id,
    status: r.status,
    created_at: r.created_at,
    info: infoMap.get(r.request_group_id) || {},
    details: detMap.get(r.request_group_id) || {},
    rate: rateMap.get(r.request_group_id) || {},
  }));
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
