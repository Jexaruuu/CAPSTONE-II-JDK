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
  const { data, error } = await supabaseAdmin.from('user_client').select('id, auth_uid, email_address').eq('email_address', email).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findClientById(id) {
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  const { data, error } = await supabaseAdmin.from('user_client').select('id, auth_uid, email_address').eq('id', n).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function insertClientInformation(row) {
  const { data, error } = await supabaseAdmin.from('client_information').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

function isMissingColumn(err, col) {
  if (!col) return false;
  const raw = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''} ${err?.code || ''}`;
  const s = String(raw || '');
  const a = new RegExp(`column\\s+.*${col}.*does\\s+not\\s+exist`, 'i');
  const b = new RegExp(`"${col}"`, 'i');
  const c = new RegExp(`'${col}'`, 'i');
  const d = new RegExp(`could\\s+not\\s+find\\s+the\\s+'${col}'\\s+column`, 'i');
  const e = /schema\s+cache/i;
  if (a.test(s)) return true;
  if ((b.test(s) || c.test(s)) && /does not exist/i.test(s)) return true;
  if (d.test(s)) return true;
  if ((b.test(s) || c.test(s)) && e.test(s)) return true;
  return false;
}

function isNonWritableColumn(err, col) {
  if (!col) return false;
  const raw = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''} ${err?.code || ''}`;
  const s = String(raw || '');
  const a = new RegExp(`cannot\\s+insert\\s+into\\s+column\\s+"?${col}"?`, 'i');
  const b = new RegExp(`column\\s+"?${col}"?\\s+is\\s+generated`, 'i');
  const c = /generated\s+always/i;
  if (a.test(s)) return true;
  if (b.test(s)) return true;
  if (c.test(s) && new RegExp(`"${col}"`, 'i').test(s)) return true;
  return false;
}

function withWorkersColumn(row, target) {
  const out = { ...(row || {}) };
  const val =
    out.workers_needed !== undefined
      ? out.workers_needed
      : out.workers_need !== undefined
        ? out.workers_need
        : undefined;

  delete out.workers_needed;
  delete out.workers_need;

  if (val !== undefined) out[target] = val;
  return out;
}

async function insertServiceRequestDetails(row) {
  try {
    const { data, error } = await supabaseAdmin.from('client_service_request_details').insert([row]).select('id').single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (isMissingColumn(e, 'workers_needed')) {
      const r2 = withWorkersColumn(row, 'workers_need');
      const { data, error } = await supabaseAdmin.from('client_service_request_details').insert([r2]).select('id').single();
      if (error) throw error;
      return data;
    }
    if (isMissingColumn(e, 'workers_need')) {
      const r2 = withWorkersColumn(row, 'workers_needed');
      const { data, error } = await supabaseAdmin.from('client_service_request_details').insert([r2]).select('id').single();
      if (error) throw error;
      return data;
    }
    throw e;
  }
}

async function insertServiceRequestStatus(row) {
  const { data, error } = await supabaseAdmin.from('client_service_request_status').insert([row]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertClientServiceRate(row) {
  const base = { ...(row || {}) };
  const optionalCols = [
    'preferred_time_fee_php',
    'extra_workers_fee_php',
    'units',
    'unit_kg',
    'payment_method',
    'total_rate_php'
  ];

  let payload = { ...base };
  for (let i = 0; i < optionalCols.length + 2; i++) {
    try {
      const { data, error } = await supabaseAdmin.from('client_service_rate').insert([payload]).select('id').single();
      if (error) throw error;
      return data;
    } catch (e) {
      let removed = false;
      for (const c of optionalCols) {
        if (payload[c] !== undefined && (isMissingColumn(e, c) || isNonWritableColumn(e, c))) {
          const next = { ...payload };
          delete next[c];
          payload = next;
          removed = true;
          break;
        }
      }
      if (!removed) throw e;
    }
  }

  const { data, error } = await supabaseAdmin.from('client_service_rate').insert([payload]).select('id').single();
  if (error) throw error;
  return data;
}

async function insertClientCancelRequest(row) {
  const payload = {
    request_group_id: row.request_group_id,
    client_id: row.client_id ?? null,
    auth_uid: row.auth_uid ?? null,
    email_address: row.email_address ?? null,
    reason_choice: row.reason_choice ?? null,
    reason_other: row.reason_other ?? null,
    canceled_at: row.canceled_at || new Date().toISOString()
  };
  const { data, error } = await supabaseAdmin.from('client_cancel_request').insert([payload]).select('id').single();
  if (error) throw error;
  return data;
}

function newGroupId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function normalizeWorkersNeededRow(r) {
  if (!r || typeof r !== 'object') return r;
  if (r.workers_needed === undefined && r.workers_need !== undefined) return { ...r, workers_needed: r.workers_need };
  return r;
}

async function listDetailsByEmail(email, limit = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('client_service_request_details')
      .select(
        'id, request_group_id, created_at, email_address, service_type, service_task, service_description, preferred_date, preferred_time, is_urgent, tools_provided, workers_needed, request_image_url, image_name'
      )
      .eq('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(normalizeWorkersNeededRow);
  } catch (e) {
    if (isMissingColumn(e, 'workers_needed')) {
      const { data, error } = await supabaseAdmin
        .from('client_service_request_details')
        .select(
          'id, request_group_id, created_at, email_address, service_type, service_task, service_description, preferred_date, preferred_time, is_urgent, tools_provided, workers_need, request_image_url, image_name'
        )
        .eq('email_address', email)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(normalizeWorkersNeededRow);
    }
    throw e;
  }
}

async function getCombinedByGroupId(request_group_id) {
  const [infoRes, detRes] = await Promise.all([
    supabaseAdmin.from('client_information').select('*').eq('request_group_id', request_group_id).maybeSingle(),
    supabaseAdmin.from('client_service_request_details').select('*').eq('request_group_id', request_group_id).maybeSingle()
  ]);
  if (infoRes.error) throw infoRes.error;
  if (detRes.error) throw detRes.error;
  if (!detRes.data && !infoRes.data) return null;
  return { info: infoRes.data || {}, details: normalizeWorkersNeededRow(detRes.data || {}) || {} };
}

async function getCancelledByGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return [];
  const { data, error } = await supabaseAdmin.from('client_cancel_request').select('request_group_id').in('request_group_id', groupIds);
  if (error) throw error;
  return (data || []).map((x) => x.request_group_id).filter(Boolean);
}

async function getCancelledMapByGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return {};
  const { data, error } = await supabaseAdmin.from('client_cancel_request').select('request_group_id,canceled_at').in('request_group_id', groupIds);
  if (error) throw error;
  const m = {};
  (data || []).forEach((x) => {
    if (x.request_group_id) m[x.request_group_id] = x.canceled_at || null;
  });
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
  const { data, error } = await supabaseAdmin.from('client_cancel_request').select('*').in('request_group_id', groupIds);
  if (error) throw error;
  const m = {};
  (data || []).forEach((x) => {
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

async function updateClientInformation(request_group_id, fields) {
  const payload = {};
  Object.keys(fields || {}).forEach((k) => {
    const v = fields[k];
    if (v !== undefined) payload[k] = v;
  });
  if (!Object.keys(payload).length) return null;
  const { data, error } = await supabaseAdmin.from('client_information').update(payload).eq('request_group_id', request_group_id).select('id').maybeSingle();
  if (error) throw error;
  return data;
}

async function updateServiceRequestDetails(request_group_id, fields) {
  const payload = {};
  Object.keys(fields || {}).forEach((k) => {
    const v = fields[k];
    if (v !== undefined) payload[k] = v;
  });
  if (!Object.keys(payload).length) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('client_service_request_details')
      .update(payload)
      .eq('request_group_id', request_group_id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    if (isMissingColumn(e, 'workers_needed')) {
      const p2 = withWorkersColumn(payload, 'workers_need');
      const { data, error } = await supabaseAdmin
        .from('client_service_request_details')
        .update(p2)
        .eq('request_group_id', request_group_id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    if (isMissingColumn(e, 'workers_need')) {
      const p2 = withWorkersColumn(payload, 'workers_needed');
      const { data, error } = await supabaseAdmin
        .from('client_service_request_details')
        .update(p2)
        .eq('request_group_id', request_group_id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    throw e;
  }
}

module.exports = {
  uploadDataUrlToBucket,
  findClientByEmail,
  findClientById,
  insertClientInformation,
  insertServiceRequestDetails,
  insertServiceRequestStatus,
  insertClientServiceRate,
  insertClientCancelRequest,
  newGroupId,
  listDetailsByEmail,
  getCombinedByGroupId,
  getCancelledByGroupIds,
  getCancelledMapByGroupIds,
  listPendingByEmail,
  getCancelledReasonsByGroupIds,
  updateClientInformation,
  updateServiceRequestDetails
};
