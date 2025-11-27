const { getSupabaseAdmin } = require('../supabaseClient');
const crypto = require('crypto');

function safeExtFromMime(mime) {
  if (!mime) return 'bin';
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' };
  return map[mime] || 'bin';
}
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || '').trim());
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  return { mime, buffer: Buffer.from(b64, 'base64') };
}
function sanitizeName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}
async function uploadDataUrlToBucket(bucket, dataUrl, filenameBase) {
  if (!dataUrl) return { url: null, name: null };
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return { url: null, name: null };
  const ext = safeExtFromMime(decoded.mime);
  const name = sanitizeName(`${filenameBase}.${ext}`);
  const path = name;
  const { error: upErr } = await getSupabaseAdmin().storage.from(bucket).upload(path, decoded.buffer, { contentType: decoded.mime, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(path);
  return { url: pub?.publicUrl || null, name };
}
async function findWorkerByEmail(email) {
  const e = String(email || '').trim();
  if (!e) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('user_worker')
    .select('id, auth_uid, email_address')
    .ilike('email_address', e)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function findWorkerById(id) {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('user_worker')
    .select('id, auth_uid, email_address')
    .eq('id', n)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function upsertByGroup(table, row, returning = 'id, request_group_id') {
  const db = getSupabaseAdmin();
  const gid = String(row.request_group_id || '').trim();
  if (!gid) throw new Error('request_group_id is required');
  const existing = await db.from(table).select('id, request_group_id').eq('request_group_id', gid).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { data, error } = await db.from(table).update(row).eq('request_group_id', gid).select(returning).maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await db.from(table).insert([row]).select(returning).maybeSingle();
    if (error) throw error;
    return data;
  }
}

async function insertWorkerInformation(row) {
  return upsertByGroup('worker_information', row, 'id, request_group_id');
}
async function insertWorkerWorkInformation(row) {
  const payload = {
    ...row,
    service_types: Array.isArray(row.service_types) ? row.service_types : [],
    job_details: row.job_details && typeof row.job_details === 'object' ? row.job_details : {}
  };
  return upsertByGroup('worker_work_information', payload, 'id, request_group_id');
}
async function insertWorkerRate(row) {
  return upsertByGroup('worker_rate', row, 'id, request_group_id');
}
async function insertWorkerRequiredDocuments(row) {
  const payload = {
    request_group_id: row.request_group_id,
    worker_id: row.worker_id || null,
    docs: row.docs && typeof row.docs === 'object' ? row.docs : {}
  };
  return upsertByGroup('worker_required_documents', payload, 'id, request_group_id');
}
async function insertPendingApplication(row) {
  const payload = {
    ...row,
    email_address: String(row.email_address || '').trim().toLowerCase(),
    status: String(row.status || 'pending').trim() || 'pending'
  };
  const db = getSupabaseAdmin();
  const gid = String(payload.request_group_id || '').trim();
  if (!gid) throw new Error('request_group_id is required');
  const existing = await db.from('wa_pending').select('id, request_group_id, created_at, status').eq('request_group_id', gid).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const { data, error } = await db.from('wa_pending').update(payload).eq('request_group_id', gid).select('id, request_group_id, created_at, status').maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await db.from('wa_pending').insert([payload]).select('id, request_group_id, created_at, status').maybeSingle();
    if (error) throw error;
    return data;
  }
}

function newGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

module.exports = {
  uploadDataUrlToBucket,
  findWorkerByEmail,
  findWorkerById,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId
};
