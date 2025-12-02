const {
  listPending,
  countPending,
  getPendingById,
  markStatus,
  countByStatus,
  insertPendingRequest,
  listByEmail,
} = require('../models/clientservicerequeststatusModel');

exports.list = async (req, res) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'pending';
    const status = statusRaw === 'all' ? null : statusRaw;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10), 1), 500);
    const items = await listPending(status || null, limit);
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to list pending requests' });
  }
};

exports.count = async (_req, res) => {
  try {
    const total = await countPending();
    return res.status(200).json({ total });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to count pending requests' });
  }
};

exports.counts = async (_req, res) => {
  try {
    const [pending, approved, declined] = await Promise.all([
      countByStatus('pending'),
      countByStatus('approved'),
      countByStatus('declined'),
    ]);
    return res.status(200).json({ pending, approved, declined });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to get counts' });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await getPendingById(id);
    return res.status(200).json({ item });
  } catch (e) {
    return res.status(404).json({ message: e?.message || 'Not found' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const status = String(req.body.status || '').trim().toLowerCase();
    const reason = req.body.reason || null;
    if (!status || !['pending', 'approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const result = await markStatus(id, status, reason);
    return res.status(200).json({ updated: result });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to update status' });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.email_address || !body.request_group_id) {
      return res.status(400).json({ message: 'request_group_id and email_address are required' });
    }
    const row = await insertPendingRequest({
      request_group_id: body.request_group_id,
      email_address: body.email_address,
      info: body.info || {},
      details: body.details || {},
      rate: body.rate || {},
      status: body.status || 'pending',
      decision_reason: body.decision_reason || null,
    });
    return res.status(201).json({ request: row });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to create pending request' });
  }
};

exports.listMine = async (req, res) => {
  try {
    const s = req.session?.user || {};
    const email = s.email_address || null;
    if (!email) return res.status(401).json({ message: 'Unauthorized' });
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'all';
    const status = statusRaw === 'all' ? null : statusRaw;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10), 1), 500);
    const items = await listByEmail(email, status, limit);
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(400).json({ message: e?.message || 'Failed to list your requests' });
  }
};
