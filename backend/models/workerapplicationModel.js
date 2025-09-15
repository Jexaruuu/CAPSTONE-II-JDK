const { supabaseAdmin } = require('../supabaseClient');
const crypto = require('crypto');

function safeExtFromMime(mime) {
  if (!mime) return 'bin';
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'application/pdf': 'pdf' };
  return map[mime] || 'bin';
}
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  return { mime, buffer: Buffer.from(b64, 'base64') };
}
async function uploadDataUrlToBucket(bucket, dataUrl, filenameBase) {
  if (!dataUrl) return { url: null, name: null };
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return { url: null, name: null };
  const ext = safeExtFromMime(decoded.mime);
  const name = `${filenameBase}.${ext}`;
  const path = name;
  const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(path, decoded.buffer, { contentType: decoded.mime, upsert: false });
  if (upErr) throw upErr;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return { url: pub?.publicUrl || null, name };
}
async function findWorkerByEmail(email) {
  const { data, error } = await supabaseAdmin.from('user_worker').select('id, auth_uid').eq('email_address', email).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}
async function insertWorkerInformation(row) {
  const { data, error } = await supabaseAdmin.from('worker_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerWorkInformation(row) {
  const { data, error } = await supabaseAdmin.from('worker_work_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerRate(row) {
  const { data, error } = await supabaseAdmin.from('worker_rate').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerRequiredDocuments(row) {
  const { data, error } = await supabaseAdmin.from('worker_required_documents').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertPendingApplication(row) {
  const { data, error } = await supabaseAdmin.from('wa_pending').insert([row]).select('id, created_at').single();
  if (error) throw error;
  return data;
}
function newGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

module.exports = {
  uploadDataUrlToBucket,
  findWorkerByEmail,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId
};
