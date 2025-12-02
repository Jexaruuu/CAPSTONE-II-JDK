// clientservicerequestsModel.js
const { supabaseAdmin } = require('../supabaseClient');
const crypto = require('crypto');

function safeExtFromMime(mime) {
  if (!mime) return 'bin';
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
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
async function findClientByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('user_client')
    .select('id, auth_uid, email_address')
    .eq('email_address', email)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function findClientById(id) {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  const { data, error } = await supabaseAdmin
    .from('user_client')
    .select('id, auth_uid, email_address')
    .eq('id', n)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function insertClientInformation(row) {
  const { data, error } = await supabaseAdmin.from('client_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertServiceRequestDetails(row) {
  const { data, error } = await supabaseAdmin.from('client_service_request_details').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertServiceRate(row) {
  const { data, error } = await supabaseAdmin.from('client_service_rate').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertServiceRequestStatus(row) {
  const { data, error } = await supabaseAdmin.from('client_service_request_status').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}
async function insertClientCancelRequest(row) {
  const payload = { ...row, canceled_at: row.canceled_at || new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from('client_cancel_request').insert([payload]).select('id').single();
  if (error) throw error;
  return data;
}
function newGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}
async function listDetailsByEmail(email, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('client_service_request_details')
    .select('id, request_group_id, created_at, email_address, service_type, service_task, service_description, preferred_date, preferred_time, is_urgent, tools_provided, request_image_url, image_name')
    .eq('email_address', email)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
async function getCombinedByGroupId(request_group_id) {
  const [infoRes, detRes, rateRes] = await Promise.all([
    supabaseAdmin.from('client_information').select('*').eq('request_group_id', request_group_id).maybeSingle(),
    supabaseAdmin.from('client_service_request_details').select('*').eq('request_group_id', request_group_id).maybeSingle(),
    supabaseAdmin.from('client_service_rate').select('*').eq('request_group_id', request_group_id).maybeSingle()
  ]);
  if (infoRes.error) throw infoRes.error;
  if (detRes.error) throw detRes.error;
  if (rateRes.error) throw rateRes.error;
  if (!detRes.data && !infoRes.data && !rateRes.data) return null;
  return { info: infoRes.data || {}, details: detRes.data || {}, rate: rateRes.data || {} };
}
async function getCancelledByGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('client_cancel_request')
    .select('request_group_id')
    .in('request_group_id', groupIds);
  if (error) throw error;
  return (data || []).map(x => x.request_group_id).filter(Boolean);
}
async function getCancelledMapByGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from('client_cancel_request')
    .select('request_group_id,canceled_at')
    .in('request_group_id', groupIds);
  if (error) throw error;
  const m = {};
  (data || []).forEach(x => { if (x.request_group_id) m[x.request_group_id] = x.canceled_at || null; });
  return m;
}
async function listPendingByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('client_service_request_status')
    .select('id, request_group_id, status, created_at, details')
    .eq('email_address', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
async function getCancelledReasonsByGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from('client_cancel_request')
    .select('*')
    .in('request_group_id', groupIds);
  if (error) throw error;
  const m = {};
  (data || []).forEach(x => {
    if (x.request_group_id) {
      m[x.request_group_id] = {
        reason_choice: x.reason_choice || null,
        reason_other: x.reason_other || null,
        canceled_at: x.canceled_at || null
      };
    }
  });
  return m;
}

module.exports = {
  uploadDataUrlToBucket,
  findClientByEmail,
  findClientById,
  insertClientInformation,
  insertServiceRequestDetails,
  insertServiceRate,
  insertServiceRequestStatus,
  insertClientCancelRequest,
  newGroupId,
  listDetailsByEmail,
  getCombinedByGroupId,
  getCancelledByGroupIds,
  getCancelledMapByGroupIds,
  listPendingByEmail,
  getCancelledReasonsByGroupIds
};
