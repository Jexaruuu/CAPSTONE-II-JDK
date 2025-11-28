const { supabaseAdmin, getSupabaseAdmin } = require('../supabaseClient');
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
function newGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : [Date.now().toString(36), Math.random().toString(36).slice(2)].join('-');
}

async function uploadDataUrlToBucket(bucket, dataUrl, baseName) {
  const admin = supabaseAdmin;
  const parsed = decodeDataUrl(dataUrl);
  if (!parsed) return { url: null, name: null };
  const ext = safeExtFromMime(parsed.mime);
  const safeBase = sanitizeName(baseName || `file_${Date.now()}`);
  const path = `${safeBase}.${ext}`;
  const { data: up, error: upErr } = await admin.storage.from(bucket).upload(path, parsed.buffer, { contentType: parsed.mime, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(up.path);
  return { url: pub.publicUrl || null, name: path };
}

async function insertWorkerInformation(row) {
  const admin = supabaseAdmin;
  const { data, error } = await admin.from('worker_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertWorkerWorkInformation(row) {
  const admin = supabaseAdmin;
  const { data, error } = await admin.from('worker_work_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertWorkerRate(row) {
  const admin = supabaseAdmin;
  const { data, error } = await admin.from('worker_rate').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertWorkerRequiredDocuments(row) {
  const admin = supabaseAdmin;
  const { data, error } = await admin.from('worker_required_documents').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertPendingApplication(row) {
  const admin = supabaseAdmin;
  const { data, error } = await admin.from('wa_pending').insert([row]).select('id,created_at').single();
  if (error) throw error;
  return data;
}

async function findWorkerByEmail(email) {
  const admin = supabaseAdmin;
  const { data, error } = await admin
    .from('worker_information')
    .select('id, auth_uid, email_address')
    .ilike('email_address', String(email || '').trim())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findWorkerById(id) {
  const admin = supabaseAdmin;
  const { data, error } = await admin
    .from('worker_information')
    .select('id, auth_uid, email_address')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById
};
