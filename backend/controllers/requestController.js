const { supabaseAdmin } = require("../supabaseClient");

const clean = (v) => String(v ?? "").trim();

async function applyRequest(req, res) {
  try {
    const body = req.body || {};

    const client_id = clean(body.client_id || body.clientId || body.id);
    const worker_id = clean(body.worker_id || body.worker_Id || body.workerId);

    // if (!client_id) return res.status(400).json({ message: "client_id is required" });
    // if (!worker_id) return res.status(400).json({ message: "worker_id is required" });

    const service_task = clean(body.service_task || body.serviceTask);
    const service_type = clean(body.service_type || body.serviceType);

    const address = clean(body.addressLine || body.address);
    const price = clean(body.price);

    const schedule =
      clean(body.schedule) ||
      `${clean(body.preferred_date)} ${clean(body.preferred_time)}`.trim();

    const rate = clean(body.rate || body.totalRate || body.total_rate || "");
    const status = clean(body.status) || "pending";

    const payload = {
      client_id,
      worker_id,
      service_task,
      service_type,
      rate,
      address,
      schedule,
      price,
      status
    };

    const { data, error } = await supabaseAdmin
      .from("request")
      .insert([payload])
      .select()
      .single();

    if (error) return res.status(400).json({ message: error.message });

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
}

module.exports = { applyRequest };
