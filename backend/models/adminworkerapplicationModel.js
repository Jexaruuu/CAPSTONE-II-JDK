const { supabaseAdmin } = require("../supabaseClient");

function likeTerm(q) {
  const t = String(q || "").replace(/[%_]/g, " ").trim();
  return `%${t}%`;
}

async function listApplications({ status = "", q = "", limit = 500 }) {
  let query = supabaseAdmin
    .from("wa_pending")
    .select("id, request_group_id, status, created_at, decided_at, email_address, info, work, rate, docs, reason_choice, reason_other, decision_reason")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(parseInt(limit || 500, 10), 1), 1000));
  if (status && status !== "all") query = query.eq("status", status);
  if (q) {
    const t = likeTerm(q);
    query = query.or(
      [
        `email_address.ilike.${t}`,
        `info->>first_name.ilike.${t}`,
        `info->>last_name.ilike.${t}`,
        `info->>barangay.ilike.${t}`,
        `work->>work_description.ilike.${t}`,
        `work->>service_types.ilike.${t}`,
      ].join(",")
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function countExact(filter) {
  const q = supabaseAdmin.from("wa_pending").select("*", { count: "exact", head: true });
  const { count, error } = filter ? await q.eq("status", filter) : await q;
  if (error) throw error;
  return count || 0;
}

async function countAllStatuses() {
  const [pending, approved, declined, total] = await Promise.all([
    countExact("pending"),
    countExact("approved"),
    countExact("declined"),
    countExact(),
  ]);
  return { pending, approved, declined, total };
}

async function markStatus(id, status, extra = {}) {
  const idKey = Number.isFinite(Number(id)) ? Number(id) : id;

  const { data: existing, error: getErr } = await supabaseAdmin
    .from("wa_pending")
    .select("id, status, request_group_id")
    .eq("id", idKey)
    .maybeSingle();
  if (getErr) throw getErr;
  if (!existing) {
    const e = new Error("Application not found");
    e.status = 404;
    throw e;
  }
  if (existing.status === status && !extra) return existing;

  const update = { status };
  if (status === "declined") {
    update.decided_at = extra.decided_at || new Date().toISOString();
    update.reason_choice = extra.reason_choice ?? null;
    update.reason_other = extra.reason_other ?? null;
    update.decision_reason = extra.decision_reason ?? ([extra.reason_choice, extra.reason_other].filter(Boolean).join(" — ") || null);
  }

  const { data, error } = await supabaseAdmin
    .from("wa_pending")
    .update(update)
    .eq("id", idKey)
    .select("id, status, request_group_id, decided_at, reason_choice, reason_other, decision_reason")
    .maybeSingle();
  if (error) throw error;
  return data || { id: existing.id, status, request_group_id: existing.request_group_id, decided_at: update.decided_at, reason_choice: update.reason_choice, reason_other: update.reason_other, decision_reason: update.decision_reason };
}

module.exports = {
  listApplications,
  countAllStatuses,
  markStatus,
};
