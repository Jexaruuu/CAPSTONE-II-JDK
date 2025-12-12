const { supabaseAdmin } = require('../supabaseClient');
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
  const parsed = decodeDataUrl(dataUrl);
  if (!parsed) return { url: null, name: null };
  const ext = safeExtFromMime(parsed.mime);
  const safeBase = sanitizeName(baseName || `file_${Date.now()}`);
  const uniq = `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const path = `${uniq}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(path, parsed.buffer, { contentType: parsed.mime, upsert: true });
  if (upErr) throw upErr;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return { url: pub?.publicUrl || null, name: path };
}
async function insertWorkerInformation(row) {
  const { data, error } = await supabaseAdmin.from('worker_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function updateWorkerInformationWorkerId(id, workerId) {
  const { error } = await supabaseAdmin.from('worker_information').update({ worker_id: workerId }).eq('id', id);
  if (error) throw error;
  return true;
}
async function insertWorkerWorkInformation(row) {
  const { data, error } = await supabaseAdmin.from('worker_work_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerRate(row) {
  const { data, error } = await supabaseAdmin.from('worker_service_rate').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerRequiredDocuments(row) {
  const { data, error } = await supabaseAdmin.from('worker_required_documents').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertWorkerTermsAndAgreements(row) {
  const { data, error } = await supabaseAdmin.from('worker_agreements').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertPendingApplication(row) {
  const { data, error } = await supabaseAdmin.from('worker_application_status').insert([row]).select('id,created_at').single();
  if (error) throw error;
  return data;
}
async function findWorkerByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .select('id, auth_uid, email_address')
    .ilike('email_address', String(email || '').trim())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function findWorkerById(id) {
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .select('id, auth_uid, email_address')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function findWorkerByAuthUid(auth_uid) {
  const { data, error } = await supabaseAdmin
    .from('user_worker')
    .select('id, auth_uid, email_address')
    .eq('auth_uid', String(auth_uid || '').trim())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function insertWorkerPaymentFee(row) {
  const payload = {
    request_group_id: row.request_group_id || null,
    worker_id: row.worker_id || null,
    auth_uid: row.auth_uid || null,
    email_address: row.email_address || null,
    payment: typeof row.payment === 'string' ? row.payment : JSON.stringify(row.payment || null),
    proof_of_payment: row.proof_of_payment || '',
    reference_no: row.reference_no || '',
    gcash_name: row.gcash_name || '',
    gcash_number: row.gcash_number || ''
  };
  const { data, error } = await supabaseAdmin
    .from('worker_payment_fee')
    .insert([payload])
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  updateWorkerInformationWorkerId,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertWorkerTermsAndAgreements,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById,
  findWorkerByAuthUid,
  insertWorkerPaymentFee
};
