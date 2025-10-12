const { supabaseAdmin } = require("../supabaseClient");

const TABLE = "user_notifications";

async function ensureTable() {
  try { await supabaseAdmin.from(TABLE).select("id").limit(1); } catch {}
}

async function create({ auth_uid, role, title, message }) {
  await ensureTable();
  const { data, error } = await supabaseAdmin.from(TABLE).insert([{ auth_uid, role, title, message, read: false }]).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function listByUser({ auth_uid, role, limit = 50 }) {
  await ensureTable();
  let q = supabaseAdmin.from(TABLE).select("*").eq("auth_uid", auth_uid).order("created_at", { ascending: false }).limit(limit);
  if (role) q = q.eq("role", role);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function latestByUser({ auth_uid }) {
  await ensureTable();
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").eq("auth_uid", auth_uid).order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function markRead({ id, auth_uid }) {
  await ensureTable();
  const { error } = await supabaseAdmin.from(TABLE).update({ read: true }).eq("id", id).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
}

async function markAllRead({ auth_uid }) {
  await ensureTable();
  const { error } = await supabaseAdmin.from(TABLE).update({ read: true }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
}

async function remove({ id, auth_uid }) {
  await ensureTable();
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
}

async function unreadCount({ auth_uid }) {
  await ensureTable();
  const { count, error } = await supabaseAdmin.from(TABLE).select("*", { count: "exact", head: true }).eq("auth_uid", auth_uid).eq("read", false);
  if (error) throw error;
  return count || 0;
}

module.exports = { create, listByUser, latestByUser, markRead, markAllRead, remove, unreadCount };
