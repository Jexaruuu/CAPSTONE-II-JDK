const { supabase, supabaseAdmin, ensureStorageBucket } = require("../supabaseClient");

const CLIENT_BUCKET = "client-avatars";
const WORKER_BUCKET = "worker-avatars";

function parseDataUrl(s) {
  const m = /^data:(.+?);base64,(.*)$/i.exec(String(s || "").trim());
  if (!m) return null;
  return { contentType: m[1], buf: Buffer.from(m[2], "base64") };
}

function extFrom(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  return "bin";
}

async function getClientByAuthOrEmail({ auth_uid, email }) {
  let q = supabaseAdmin.from("user_client").select("*").limit(1);
  if (auth_uid) q = q.eq("auth_uid", auth_uid);
  else if (email) q = q.eq("email_address", email);
  const { data, error } = await q;
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function getWorkerByAuthOrEmail({ auth_uid, email }) {
  let q = supabaseAdmin.from("user_worker").select("*").limit(1);
  if (auth_uid) q = q.eq("auth_uid", auth_uid);
  else if (email) q = q.eq("email_address", email);
  const { data, error } = await q;
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function getAuthUserById(auth_uid) {
  if (!auth_uid) return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(auth_uid);
  if (error) return null;
  return data?.user || null;
}

async function getClientAccountProfile({ auth_uid, email }) {
  const row = await getClientByAuthOrEmail({ auth_uid, email });
  const user = await getAuthUserById(row?.auth_uid || auth_uid);
  const created_at = row?.created_at || user?.created_at || null;
  return {
    first_name: row?.first_name || user?.user_metadata?.first_name || "",
    last_name: row?.last_name || user?.user_metadata?.last_name || "",
    email_address: row?.email_address || user?.email || email || "",
    sex: row?.sex || user?.user_metadata?.sex || "",
    avatar_url: row?.client_avatar || row?.avatar_url || user?.user_metadata?.avatar_url || "",
    phone: row?.contact_number ?? row?.phone ?? "",
    facebook: row?.social_facebook ?? row?.facebook ?? "",
    instagram: row?.social_instagram ?? row?.instagram ?? "",
    auth_uid: row?.auth_uid || auth_uid || "",
    created_at
  };
}

async function getWorkerAccountProfile({ auth_uid, email }) {
  const row = await getWorkerByAuthOrEmail({ auth_uid, email });
  const user = await getAuthUserById(row?.auth_uid || auth_uid);
  const created_at = row?.created_at || user?.created_at || null;
  return {
    first_name: row?.first_name || user?.user_metadata?.first_name || "",
    last_name: row?.last_name || user?.user_metadata?.last_name || "",
    email_address: row?.email_address || user?.email || email || "",
    sex: row?.sex || user?.user_metadata?.sex || "",
    avatar_url: row?.worker_avatar || row?.avatar_url || user?.user_metadata?.avatar_url || "",
    phone: row?.contact_number ?? row?.phone ?? "",
    facebook: row?.social_facebook ?? row?.facebook ?? "",
    instagram: row?.social_instagram ?? row?.instagram ?? "",
    auth_uid: row?.auth_uid || auth_uid || "",
    created_at
  };
}

async function uploadClientAvatarDataUrl(auth_uid, data_url) {
  const parsed = parseDataUrl(data_url);
  if (!parsed) throw new Error("Invalid image");
  await ensureStorageBucket(CLIENT_BUCKET, true);
  const key = `clients/${auth_uid || "unknown"}/${Date.now()}.${extFrom(parsed.contentType)}`;
  const abuf = parsed.buf.buffer.slice(parsed.buf.byteOffset, parsed.buf.byteOffset + parsed.buf.byteLength);
  const { error: upErr } = await supabaseAdmin.storage.from(CLIENT_BUCKET).upload(key, abuf, { contentType: parsed.contentType, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = supabaseAdmin.storage.from(CLIENT_BUCKET).getPublicUrl(key);
  return pub?.publicUrl || "";
}

async function uploadWorkerAvatarDataUrl(auth_uid, data_url) {
  const parsed = parseDataUrl(data_url);
  if (!parsed) throw new Error("Invalid image");
  await ensureStorageBucket(WORKER_BUCKET, true);
  const key = `workers/${auth_uid || "unknown"}/${Date.now()}.${extFrom(parsed.contentType)}`;
  const abuf = parsed.buf.buffer.slice(parsed.buf.byteOffset, parsed.buf.byteOffset + parsed.buf.byteLength);
  const { error: upErr } = await supabaseAdmin.storage.from(WORKER_BUCKET).upload(key, abuf, { contentType: parsed.contentType, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = supabaseAdmin.storage.from(WORKER_BUCKET).getPublicUrl(key);
  return pub?.publicUrl || "";
}

async function updateClientAvatarUrl(auth_uid, avatar_url) {
  const r1 = await supabaseAdmin.from("user_client").update({ client_avatar: avatar_url }).eq("auth_uid", auth_uid);
  if (r1.error) throw r1.error;
  try { await supabaseAdmin.from("user_client").update({ avatar_url }).eq("auth_uid", auth_uid); } catch {}
  return true;
}

async function updateWorkerAvatarUrl(auth_uid, avatar_url) {
  const r1 = await supabaseAdmin.from("user_worker").update({ worker_avatar: avatar_url }).eq("auth_uid", auth_uid);
  if (r1.error) throw r1.error;
  try { await supabaseAdmin.from("user_worker").update({ avatar_url }).eq("auth_uid", auth_uid); } catch {}
  return true;
}

async function clearClientAvatar(auth_uid) {
  const r1 = await supabaseAdmin.from("user_client").update({ client_avatar: null }).eq("auth_uid", auth_uid);
  if (r1.error) throw r1.error;
  try { await supabaseAdmin.from("user_client").update({ avatar_url: null }).eq("auth_uid", auth_uid); } catch {}
  return true;
}

async function clearWorkerAvatar(auth_uid) {
  const r1 = await supabaseAdmin.from("user_worker").update({ worker_avatar: null }).eq("auth_uid", auth_uid);
  if (r1.error) throw r1.error;
  try { await supabaseAdmin.from("user_worker").update({ avatar_url: null }).eq("auth_uid", auth_uid); } catch {}
  return true;
}

async function updateAuthUserAvatarMeta(auth_uid, avatar_url) {
  const meta = avatar_url ? { avatar_url } : { avatar_url: null };
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_uid, { user_metadata: meta });
  if (error) throw error;
  return true;
}

async function verifyCurrentPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { ok: !error, data, error };
}

async function updateAuthPassword(auth_uid, new_password) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_uid, { password: new_password });
  if (error) throw error;
  return true;
}

async function updateClientPassword(auth_uid, new_password) {
  const { error } = await supabaseAdmin.from("user_client").update({ password: new_password }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
}

async function updateWorkerPassword(auth_uid, new_password) {
  const { error } = await supabaseAdmin.from("user_worker").update({ password: new_password }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
}

async function updateClientProfile(auth_uid, patch) {
  const { data, error } = await supabaseAdmin.from("user_client").update(patch).eq("auth_uid", auth_uid).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function updateWorkerProfile(auth_uid, patch) {
  const { data, error } = await supabaseAdmin.from("user_worker").update(patch).eq("auth_uid", auth_uid).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function updateAuthUserMeta(auth_uid, patch) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_uid, { user_metadata: patch });
  if (error) throw error;
  return true;
}

module.exports = {
  getClientByAuthOrEmail,
  getWorkerByAuthOrEmail,
  getAuthUserById,
  getClientAccountProfile,
  getWorkerAccountProfile,
  uploadClientAvatarDataUrl,
  uploadWorkerAvatarDataUrl,
  updateClientAvatarUrl,
  updateWorkerAvatarUrl,
  clearClientAvatar,
  clearWorkerAvatar,
  updateAuthUserAvatarMeta,
  verifyCurrentPassword,
  updateAuthPassword,
  updateClientPassword,
  updateWorkerPassword,
  updateClientProfile,
  updateWorkerProfile,
  updateAuthUserMeta
};
