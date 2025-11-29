const {
  insertPendingApplication,
  listPending,
  countPending,
  getPendingById,
  markStatus,
  countByStatus
} = require("../models/workerapplicationstatusModel");

function cleanStr(s) {
  return String(s || "").trim();
}

exports.create = async (req, res) => {
  try {
    const row = req.body || {};
    const data = await insertPendingApplication(row);
    return res.status(201).json(data);
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Failed to create application status" });
  }
};

exports.list = async (req, res) => {
  try {
    const status = cleanStr(req.query.status || "");
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 1), 1000);
    const email = cleanStr(req.query.email || "");
    const items = await listPending(status || undefined, limit);
    const filtered = email ? items.filter(it => cleanStr(it.email_address) === email) : items;
    return res.status(200).json({ items: filtered });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load application statuses" });
  }
};

exports.count = async (req, res) => {
  try {
    const status = cleanStr(req.query.status || "");
    if (!status) {
      const c = await countPending();
      return res.status(200).json({ status: "pending", count: c });
    }
    const c = await countByStatus(status);
    return res.status(200).json({ status, count: c });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load count" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const id = cleanStr(req.params.id || "");
    if (!id) return res.status(400).json({ message: "Missing id" });
    const row = await getPendingById(id);
    return res.status(200).json(row);
  } catch (err) {
    return res.status(404).json({ message: err?.message || "Not found" });
  }
};

exports.approve = async (req, res) => {
  try {
    const id = cleanStr(req.params.id || "");
    if (!id) return res.status(400).json({ message: "Missing id" });
    const row = await markStatus(id, "approved");
    return res.status(200).json({ id: row.id, status: row.status });
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Failed to approve" });
  }
};

exports.decline = async (req, res) => {
  try {
    const id = cleanStr(req.params.id || "");
    if (!id) return res.status(400).json({ message: "Missing id" });
    const reason = cleanStr(req.body?.reason || "");
    const row = await markStatus(id, "declined", reason || null);
    return res.status(200).json({ id: row.id, status: row.status });
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Failed to decline" });
  }
};

exports.stats = async (_req, res) => {
  try {
    const pending = await countByStatus("pending");
    const approved = await countByStatus("approved");
    const declined = await countByStatus("declined");
    const total = pending + approved + declined;
    return res.status(200).json({ pending, approved, declined, total });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load stats" });
  }
};
