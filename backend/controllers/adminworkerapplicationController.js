const {
  listApplications,
  countAllStatuses,
  markStatus,
} = require("../models/adminworkerapplicationModel");

function cleanStr(s) {
  return String(s || "").trim();
}

exports.list = async (req, res) => {
  try {
    const status = cleanStr(req.query.status || "");
    const q = cleanStr(req.query.q || "");
    const items = await listApplications({ status, q, limit: 500 });
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load applications" });
  }
};

exports.count = async (_req, res) => {
  try {
    const c = await countAllStatuses();
    return res.status(200).json(c);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Failed to load counts" });
  }
};

exports.approve = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Missing id" });
    const row = await markStatus(id, "approved");
    return res.status(200).json({ id: row.id, status: row.status, request_group_id: row.request_group_id });
  } catch (err) {
    const code = err?.status || 400;
    return res.status(code).json({ message: err?.message || "Failed to approve" });
  }
};

exports.decline = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Missing id" });
    const body = req.body || {};
    const reason_choice = String(body.reason_choice || "").trim() || null;
    const reason_other = String(body.reason_other || "").trim() || null;
    const decided_at = new Date().toISOString();
    const decision_reason = [reason_choice, reason_other].filter(Boolean).join(" — ") || null;
    const row = await markStatus(id, "declined", { reason_choice, reason_other, decision_reason, decided_at });
    return res.status(200).json({
      id: row.id,
      status: row.status,
      request_group_id: row.request_group_id,
      reason_choice: row.reason_choice || null,
      reason_other: row.reason_other || null,
      decision_reason: row.decision_reason || null,
      decided_at: row.decided_at || decided_at
    });
  } catch (err) {
    const code = err?.status || 400;
    return res.status(code).json({ message: err?.message || "Failed to decline" });
  }
};
