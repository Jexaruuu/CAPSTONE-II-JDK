// clientservicerequestsController.js
const {
  uploadDataUrlToBucket,
  insertClientInformation,
  insertServiceRequestDetails,
  newGroupId,
  findClientByEmail,
  findClientById,
  listDetailsByEmail,
  getCombinedByGroupId,
  insertClientCancelRequest,
  getCancelledByGroupIds,
  getCancelledMapByGroupIds,
  getCancelledReasonsByGroupIds,
  updateClientInformation,
  updateServiceRequestDetails
} = require('../models/clientservicerequestsModel');

const { insertPendingRequest } = require('../models/clientservicerequeststatusModel');
const { supabaseAdmin } = require('../supabaseClient');

function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/csr-attachments/i.test(raw) && /not.*found|bucket/i.test(raw)) return 'Storage bucket "csr-attachments" is missing. Create it in Supabase or remove attachments.';
  if (/column .*attachments.* does not exist/i.test(raw)) return 'Your table does not have an "attachments" column. We will retry without attachments.';
  if (/user_client|client_information|client_service_request_details|client_service_rate|client_service_request_status/i.test(raw)) return `Database error: ${raw}`;
  return raw;
}

function dateOnlyFrom(input) {
  if (!input) return null;
  const raw = String(input).trim();
  const token = raw.split('T')[0].split(' ')[0];
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(token))) return new Date(+m[3], +m[1] - 1, +m[2]);
  const d = new Date(raw);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseHM24(val) {
  if (!val) return { h: 23, m: 59 };
  const s = String(val).trim();
  let d = new Date(`1970-01-01T${s}`);
  if (isNaN(d)) d = new Date(`1970-01-01 ${s}`);
  if (!isNaN(d)) return { h: d.getHours(), m: d.getMinutes() };
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(s);
  if (!m) return { h: 23, m: 59 };
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (!ap && h > 23) h = 23;
  if (min > 59) min = 59;
  return { h, m: min };
}
function isExpiredPreferredDateTime(details) {
  const d = dateOnlyFrom(details?.preferred_date);
  if (!d) return false;
  const { h, m } = parseHM24(details?.preferred_time);
  d.setHours(h, m, 0, 0);
  const now = new Date();
  return d.getTime() < now.getTime();
}
function toBoolStrict(v) {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  const s = String(v ?? '').trim().toLowerCase();
  if (['yes', 'y', 'true', 't'].includes(s)) return true;
  if (['no', 'n', 'false', 'f'].includes(s)) return false;
  return false;
}
const yesNo = (b) => (b ? 'Yes' : 'No');

function pick(obj, keys, alt = null) {
  for (const k of keys) {
    const v = k.split('.').reduce((a, p) => (a && a[p] !== undefined ? a[p] : undefined), obj);
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return alt;
}
function normalizeAttachments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') return x.dataUrl || x.dataURL || x.base64 || x.url || null;
      return null;
    })
    .filter(Boolean);
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const n = Math.floor(v);
    return n >= 1 ? n : null;
  }
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isFinite(n)) {
    const nn = Math.floor(n);
    return nn >= 1 ? nn : null;
  }
  const m = s.match(/\d+/);
  if (!m) return null;
  const nn = Math.floor(Number(m[0]));
  return Number.isFinite(nn) && nn >= 1 ? nn : null;
}

function getWorkersNeeded(src, details, metadata) {
  const v = pick(
    { src, details, metadata },
    [
      'src.workers_needed',
      'src.workers_need',
      'src.workersNeeded',
      'details.workers_needed',
      'details.workers_need',
      'details.workersNeeded',
      'metadata.workers_needed',
      'metadata.workers_need',
      'metadata.workersNeeded'
    ],
    null
  );
  return toIntOrNull(v);
}

function workersNeededValue(obj) {
  if (!obj) return null;
  const v = obj.workers_needed;
  if (v !== undefined && v !== null) return v;
  const v2 = obj.workers_need;
  if (v2 !== undefined && v2 !== null) return v2;
  return null;
}

async function publicOrSignedUrl(bucket, path) {
  if (!path) return null;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  if (pub?.publicUrl) return pub.publicUrl;
  const { data: signed } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return signed?.signedUrl || null;
}

exports.listOpen = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const { data: rows, error } = await supabaseAdmin
      .from('client_service_request_status')
      .select('request_group_id,status,created_at,details')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    if (error) throw error;

    const items = Array.isArray(rows) ? rows : [];
    const valid = items.filter((r) => !isExpiredPreferredDateTime(r?.details || {}));
    const gids = valid.map((r) => r.request_group_id).filter(Boolean);
    let cancelled = [];
    try {
      cancelled = await getCancelledByGroupIds(gids);
    } catch {}

    const open = valid.filter((r) => !cancelled.includes(r.request_group_id));

    const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
    const combined = await Promise.all(
      open.map(async (r) => {
        const row = await getCombinedByGroupId(r.request_group_id);
        if (!row) return null;
        const d = row.details || {};
        if (!d.request_image_url && d.image_name) {
          row.details = { ...d, request_image_url: await publicOrSignedUrl(bucket, d.image_name) };
        }
        const ip = row.info || {};
        let info = { ...ip };
        if (!info.profile_picture_url && info.profile_picture_name) {
          info.profile_picture_url = await publicOrSignedUrl(bucket, info.profile_picture_name);
        }
        return {
          id: r.request_group_id,
          request_group_id: r.request_group_id,
          created_at: r.created_at,
          status: r.status,
          info: {
            email_address: info.email_address || null,
            first_name: info.first_name || null,
            last_name: info.last_name || null,
            contact_number: info.contact_number || null,
            street: info.street || '',
            barangay: info.barangay || '',
            additional_address: info.additional_address || '',
            profile_picture_url: info.profile_picture_url || null
          },
          details: {
            service_type: row.details?.service_type || '',
            service_task: row.details?.service_task || '',
            preferred_date: row.details?.preferred_date || null,
            preferred_time: row.details?.preferred_time || null,
            is_urgent: row.details?.is_urgent || '',
            tools_provided: row.details?.tools_provided || '',
            service_description: row.details?.service_description || '',
            workers_needed: workersNeededValue(row.details) ?? null,
            request_image_url: row.details?.request_image_url || null,
            image_name: row.details?.image_name || null
          }
        };
      })
    );

    const cleaned = combined.filter(Boolean).slice(0, limit);
    return res.status(200).json({ items: cleaned });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.submitFullRequest = async (req, res) => {
  try {
    const src = req.body || {};
    const info = src.info || src.information || {};
    const details = src.details || src.detail || {};
    const metadata = src.metadata || {};

    const client_id = pick(src, ['client_id', 'clientId', 'info.client_id', 'info.clientId']);
    const first_name = pick(src, ['first_name', 'firstName', 'info.first_name', 'info.firstName', 'metadata.first_name', 'metadata.firstName']);
    const last_name = pick(src, ['last_name', 'lastName', 'info.last_name', 'info.lastName', 'metadata.last_name', 'metadata.lastName']);
    const email_address = pick(src, ['email_address', 'email', 'info.email_address', 'info.email', 'metadata.email']);
    const barangay = pick(src, ['barangay', 'info.barangay', 'metadata.barangay'], '');
    const address = pick(src, ['address', 'info.address', 'metadata.address']);
    const contact_number = pick(src, ['contact_number', 'phone', 'mobile', 'info.contact_number', 'info.phone', 'info.mobile', 'metadata.contact_number', 'metadata.phone']);
    const street = pick(src, ['street', 'info.street', 'metadata.street']);
    const additional_address = pick(src, ['additional_address', 'additionalAddress', 'landmark', 'info.additional_address', 'info.additionalAddress', 'metadata.additional_address', 'metadata.additionalAddress']);
    const auth_uid = pick(src, ['auth_uid', 'authUid', 'info.auth_uid', 'metadata.auth_uid']);

    const category = pick(src, ['category', 'details.category', 'serviceType', 'details.serviceType']);
    const service_type = pick(src, ['service_type', 'serviceType', 'details.service_type', 'details.serviceType']) || category;
    const service_task = pick(src, ['service_task', 'serviceTask', 'task', 'details.service_task', 'details.serviceTask']);
    const description = pick(src, ['description', 'service_description', 'serviceDescription', 'details.description', 'details.service_description', 'details.serviceDescription']);
    const preferred_date = pick(src, ['preferred_date', 'preferredDate', 'details.preferred_date', 'details.preferredDate']);
    const preferred_time = pick(src, ['preferred_time', 'preferredTime', 'details.preferred_time', 'details.preferredTime']);
    const is_urgent = pick(src, ['is_urgent', 'isUrgent', 'urgent', 'details.is_urgent', 'details.isUrgent', 'metadata.is_urgent', 'metadata.isUrgent']);
    const tools_provided = pick(src, ['tools_provided', 'toolsProvided', 'tools', 'details.tools_provided', 'details.toolsProvided', 'metadata.tools_provided', 'metadata.toolsProvided']);
    const workers_needed = getWorkersNeeded(src, details, metadata);

    const attachments = normalizeAttachments(pick(src, ['attachments', 'details.attachments'], []));

    const serviceKind = service_type || category;
    let effectiveClientId = client_id || null;
    let effectiveAuthUid = null;
    let canonicalEmail = String(email_address || '').trim() || null;

    if (effectiveClientId) {
      try {
        const foundById = await findClientById(effectiveClientId);
        if (foundById) {
          effectiveAuthUid = foundById.auth_uid || null;
          if (!canonicalEmail && foundById.email_address) canonicalEmail = foundById.email_address;
        }
      } catch {}
    }
    if (!effectiveClientId && canonicalEmail) {
      try {
        const found = await findClientByEmail(canonicalEmail);
        if (found && found.id) {
          effectiveClientId = found.id;
          effectiveAuthUid = found.auth_uid || null;
          if (found.email_address) canonicalEmail = found.email_address;
        }
      } catch {}
    }

    if (!serviceKind || !description) return res.status(400).json({ message: 'Missing required fields: service_type/category and description.' });
    if (!effectiveClientId) return res.status(400).json({ message: 'Unable to identify client. Provide client_id or a known email_address.' });

    try {
      const { data: existing } = await supabaseAdmin
        .from('client_service_request_status')
        .select('request_group_id,status,details')
        .eq('email_address', canonicalEmail)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(50);
      const rows = Array.isArray(existing) ? existing : [];
      const gids = rows.map((r) => r.request_group_id).filter(Boolean);
      const cancelled = await getCancelledByGroupIds(gids);
      const active = rows.filter((r) => {
        const s = String(r.status || '').toLowerCase();
        const notCancelled = !cancelled.includes(r.request_group_id);
        const notExpired = !isExpiredPreferredDateTime(r?.details || {});
        return (s === 'pending' || s === 'approved') && notExpired && notCancelled;
      });
      if (active.length > 0) return res.status(409).json({ message: 'You already have an active service request.' });
    } catch {}

    const request_group_id = newGroupId();

    let uploaded = [];
    if (attachments && attachments.length) {
      try {
        const max = Math.min(attachments.length, 5);
        const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
        const promises = [];
        for (let i = 0; i < max; i++) promises.push(uploadDataUrlToBucket(bucket, attachments[i], `${request_group_id}-${i + 1}`));
        const results = await Promise.all(promises);
        uploaded = results.filter((x) => x?.url).map((x) => ({ url: x.url, name: x.name }));
      } catch {
        uploaded = [];
      }
    }

    let streetVal = street ?? metadata.street ?? null;
    let addlVal = additional_address ?? metadata.additional_address ?? null;
    if ((!streetVal || !addlVal) && typeof address === 'string' && address.trim()) {
      const idx = address.indexOf(',');
      if (idx !== -1) {
        streetVal = streetVal ?? address.slice(0, idx).trim();
        addlVal = addlVal ?? address.slice(idx + 1).trim();
      } else {
        streetVal = streetVal ?? address.trim();
        addlVal = addlVal ?? '';
      }
    }

    const infoRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: canonicalEmail || metadata.email || null,
      first_name: first_name || metadata.first_name || null,
      last_name: last_name || metadata.last_name || null,
      contact_number: (contact_number ?? metadata.contact_number ?? '').toString(),
      street: (streetVal ?? '').toString(),
      barangay: (barangay ?? metadata.barangay ?? '').toString(),
      additional_address: (addlVal ?? '').toString(),
      profile_picture_url: metadata.profile_picture ?? null,
      profile_picture_name: metadata.profile_picture_name ?? null
    };

    const missingInfo = [];
    if (!infoRow.email_address) missingInfo.push('email_address');
    if (!infoRow.first_name) missingInfo.push('first_name');
    if (!infoRow.last_name) missingInfo.push('last_name');
    if (!infoRow.contact_number) missingInfo.push('contact_number');
    if (infoRow.street === '') missingInfo.push('street');
    if (infoRow.barangay === '') missingInfo.push('barangay');
    if (infoRow.additional_address === '') missingInfo.push('additional_address');
    if (missingInfo.length) return res.status(400).json({ message: `Missing required client_information fields: ${missingInfo.join(', ')}` });

    try {
      await insertClientInformation(infoRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const firstUpload = uploaded[0] || null;
    const urgentRaw = is_urgent ?? metadata.is_urgent ?? metadata.urgency ?? metadata.priority ?? '';
    const toolsRaw = tools_provided ?? metadata.tools_provided ?? metadata.tools ?? '';

    const detailsRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      service_type: serviceKind,
      service_task: service_task || metadata.service_task || null,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      is_urgent: yesNo(toBoolStrict(urgentRaw)),
      tools_provided: yesNo(toBoolStrict(toolsRaw)),
      service_description: description,
      workers_needed: workers_needed,
      request_image_url: firstUpload?.url || details.image || metadata.request_image_url || metadata.image_url || null,
      image_name: firstUpload?.name || metadata.image_name || null
    };

    const missingDetails = [];
    ['email_address', 'service_type', 'service_task', 'preferred_date', 'preferred_time', 'is_urgent', 'tools_provided', 'service_description'].forEach((k) => {
      if (!detailsRow[k]) missingDetails.push(k);
    });
    if (missingDetails.length) return res.status(400).json({ message: `Missing required client_service_request_details fields: ${missingDetails.join(', ')}` });

    try {
      await insertServiceRequestDetails(detailsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const pendingInfo = {
      first_name: infoRow.first_name,
      last_name: infoRow.last_name,
      email_address: infoRow.email_address,
      contact_number: infoRow.contact_number,
      street: infoRow.street,
      barangay: infoRow.barangay,
      additional_address: infoRow.additional_address
    };

    const pendingDetails = {
      service_type: detailsRow.service_type,
      service_task: detailsRow.service_task,
      preferred_date: detailsRow.preferred_date,
      preferred_time: detailsRow.preferred_time,
      is_urgent: detailsRow.is_urgent,
      tools_provided: detailsRow.tools_provided,
      service_description: detailsRow.service_description,
      workers_needed: detailsRow.workers_needed ?? null,
      request_image_url: detailsRow.request_image_url,
      image_name: detailsRow.image_name
    };

    let pendingRow;
    try {
      pendingRow = await insertPendingRequest({
        request_group_id,
        email_address: infoRow.email_address,
        client_id: effectiveClientId,
        auth_uid: infoRow.auth_uid || effectiveAuthUid || auth_uid || null,
        info: pendingInfo,
        details: pendingDetails,
        rate: {},
        status: 'pending'
      });
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    return res.status(201).json({
      message: 'Request submitted',
      request: {
        id: pendingRow.id,
        request_group_id,
        status: 'pending',
        created_at: pendingRow.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.listApproved = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const { data, error } = await supabaseAdmin
      .from('client_service_request_status')
      .select('id, request_group_id, status, created_at, email_address, client_id, auth_uid, info, details')
      .eq('status', 'approved')
      .eq('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
    const items = Array.isArray(data) ? data : [];
    const fixed = await Promise.all(
      items.map(async (it) => {
        const d = { ...(it.details || {}) };
        if (d.is_urgent !== undefined) d.is_urgent = yesNo(toBoolStrict(d.is_urgent));
        if (d.workers_needed === undefined && d.workers_need !== undefined) d.workers_needed = d.workers_need;
        if (!d.request_image_url && d.image_name) d.request_image_url = await publicOrSignedUrl(bucket, d.image_name);
        let info = it.info || {};
        if (!info.profile_picture_url || info.profile_picture_url === '') {
          const combined = await getCombinedByGroupId(it.request_group_id);
          const ip = combined?.info || {};
          if (!ip.profile_picture_url && ip.profile_picture_name) {
            info = { ...info, profile_picture_url: await publicOrSignedUrl(bucket, ip.profile_picture_name) };
          } else if (ip.profile_picture_url) {
            info = { ...info, profile_picture_url: ip.profile_picture_url };
          }
        }
        return {
          id: it.id,
          request_group_id: it.request_group_id,
          status: it.status,
          created_at: it.created_at,
          email_address: it.email_address,
          client_id: it.client_id,
          auth_uid: it.auth_uid,
          info,
          details: d
        };
      })
    );

    const gids = fixed.map((it) => it.request_group_id).filter(Boolean);
    let cancelled = [];
    try {
      cancelled = await getCancelledByGroupIds(gids);
    } catch {}
    const filtered = fixed.filter((it) => !isExpiredPreferredDateTime(it?.details || {}) && !cancelled.includes(it.request_group_id));
    return res.status(200).json({ items: filtered });
  } catch {
    return res.status(500).json({ message: 'Failed to load approved requests' });
  }
};

exports.listCurrent = async (req, res) => {
  try {
    const scope = String(req.query.scope || 'current').toLowerCase();
    const email = String(req.query.email || req.session?.user?.email_address || '').trim();
    if (!email) return res.status(401).json({ message: 'Unauthorized' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const groupIdFilter = String(req.query.groupId || '').trim();
    const details = await listDetailsByEmail(email, limit);
    const groups = details.map((d) => d.request_group_id).filter(Boolean);
    const cancelledIds = await getCancelledByGroupIds(groups);
    const cancelMap = await getCancelledMapByGroupIds(groups);
    const cancelReasonsMap = await getCancelledReasonsByGroupIds(groups);

    let targetGroups = groups;
    let statusValue = 'pending';
    if (scope === 'cancelled') {
      targetGroups = cancelledIds;
      statusValue = 'cancelled';
    } else {
      const activeGroups = groups.filter((g) => !cancelledIds.includes(g));
      targetGroups = activeGroups;
      statusValue = 'pending';
    }

    if (groupIdFilter) {
      if (scope === 'cancelled') {
        targetGroups = cancelledIds.includes(groupIdFilter) ? [groupIdFilter] : [];
      } else {
        targetGroups = cancelledIds.includes(groupIdFilter) ? [] : groups.includes(groupIdFilter) ? [groupIdFilter] : [];
      }
    }

    let statusMap = {};
    if (targetGroups.length) {
      const { data: pend } = await supabaseAdmin.from('client_service_request_status').select('request_group_id,status,created_at,details').in('request_group_id', targetGroups);
      (Array.isArray(pend) ? pend : []).forEach((r) => {
        statusMap[r.request_group_id] = String(r.status || 'pending').toLowerCase();
      });
    }

    const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
    const combined = await Promise.all(
      targetGroups.map(async (g) => {
        const row = await getCombinedByGroupId(g);
        if (!row) return null;
        const d = row.details || {};
        if (!d.request_image_url && d.image_name) d.request_image_url = await publicOrSignedUrl(bucket, d.image_name);
        const ip = row.info || {};
        let info = ip;
        if (!ip.profile_picture_url && ip.profile_picture_name) {
          info = { ...ip, profile_picture_url: await publicOrSignedUrl(bucket, ip.profile_picture_name) };
        }
        return { ...row, details: d, info };
      })
    );

    const items = combined
      .filter(Boolean)
      .map((row) => {
        const d = row.details || {};
        const gid = row.details?.request_group_id || row.info?.request_group_id || '';
        const base = {
          id: gid,
          client_id: row.info?.client_id || null,
          auth_uid: row.info?.auth_uid || null,
          created_at: d.created_at || row.info?.created_at || new Date().toISOString(),
          details: {
            service_type: d.service_type || '',
            service_task: d.service_task || '',
            preferred_date: d.preferred_date || '',
            preferred_time: d.preferred_time || '',
            is_urgent: d.is_urgent || '',
            tools_provided: d.tools_provided || '',
            workers_needed: workersNeededValue(d) ?? null,
            request_image_url: d.request_image_url || null,
            image_name: d.image_name || null,
            service_description: d.service_description || ''
          },
          info: {
            profile_picture_url: row.info?.profile_picture_url || null,
            first_name: row.info?.first_name || null,
            last_name: row.info?.last_name || null
          }
        };

        if (scope === 'cancelled') {
          const cr = cancelReasonsMap[gid] || {};
          return { ...base, status: 'cancelled', canceled_at: cr.canceled_at || cancelMap[gid] || null, reason_choice: cr.reason_choice || null, reason_other: cr.reason_other || null };
        }

        const s = statusMap[gid] || statusValue;
        if (cancelledIds.includes(gid)) {
          const cr = cancelReasonsMap[gid] || {};
          return { ...base, status: 'cancelled', canceled_at: cr.canceled_at || cancelMap[gid] || null, reason_choice: cr.reason_choice || null, reason_other: cr.reason_other || null };
        }

        return { ...base, status: s };
      });

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.detailsByEmail = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const items = await listDetailsByEmail(email, limit);
    return res.status(200).json({ items });
  } catch {
    return res.status(500).json({ message: 'Failed to load details' });
  }
};

exports.byGroup = async (req, res) => {
  try {
    const gid = String(req.params.groupId || '').trim();
    if (!gid) return res.status(400).json({ message: 'groupId is required' });
    const row = await getCombinedByGroupId(gid);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const d = row.details || {};
    const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
    if (!d.request_image_url && d.image_name) {
      row.details = { ...d, request_image_url: await publicOrSignedUrl(bucket, d.image_name) };
    }
    const ip = row.info || {};
    if (!ip.profile_picture_url && ip.profile_picture_name) {
      row.info = { ...ip, profile_picture_url: await publicOrSignedUrl(bucket, ip.profile_picture_name) };
    }
    if (row.details) {
      if (row.details.workers_needed === undefined && row.details.workers_need !== undefined) row.details.workers_needed = row.details.workers_need;
      if (row.details.workers_needed === undefined) row.details.workers_needed = null;
    }
    return res.status(200).json(row);
  } catch {
    return res.status(500).json({ message: 'Failed to load request' });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const gid = String(req.params.groupId || '').trim();
    if (!gid) return res.status(400).json({ message: 'groupId is required' });
    const combined = await getCombinedByGroupId(gid);
    if (!combined) return res.status(404).json({ message: 'Not found' });
    return res.status(200).json({ message: 'Request deleted', request_group_id: gid });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const src = req.body || {};
    const request_group_id = String(src.request_group_id || '').trim();
    const client_id = src.client_id ?? null;
    const email_address = src.email_address ? String(src.email_address).trim() : null;
    const reason_choice = src.reason_choice ? String(src.reason_choice).trim() : null;
    const reason_other = src.reason_other ? String(src.reason_other).trim() : null;
    let auth_uid = src.auth_uid ?? null;

    if (!request_group_id) return res.status(400).json({ message: 'request_group_id is required' });
    if (!reason_choice && !reason_other) return res.status(400).json({ message: 'Provide a reason' });

    if (!auth_uid && client_id) {
      try {
        auth_uid = (await findClientById(client_id))?.auth_uid || null;
      } catch {}
    }
    if (!auth_uid && email_address) {
      try {
        auth_uid = (await findClientByEmail(email_address))?.auth_uid || null;
      } catch {}
    }

    const canceled_at = new Date().toISOString();
    await insertClientCancelRequest({
      request_group_id,
      client_id,
      auth_uid,
      email_address,
      reason_choice,
      reason_other,
      canceled_at
    });

    return res.status(201).json({ message: 'Cancellation recorded', canceled_at });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.updateByGroup = async (req, res) => {
  try {
    const gid = String(req.params.groupId || '').trim();
    if (!gid) return res.status(400).json({ message: 'groupId is required' });

    const src = req.body || {};
    const info = src.info || src.information || {};
    const details = src.details || src.detail || {};
    const metadata = src.metadata || {};

    const bucket = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';

    let uploaded = [];
    const attachments = normalizeAttachments(src.attachments || details.attachments || []);
    if (attachments && attachments.length) {
      try {
        const first = attachments[0];
        const up = await uploadDataUrlToBucket(bucket, first, `${gid}-updated-${Date.now()}`);
        if (up?.url) uploaded = [up];
      } catch {}
    }

    let profileUploaded = null;
    const profileDataUrl = info.profile_picture_data_url || metadata.profile_picture_data_url || null;
    if (profileDataUrl) {
      try {
        const up = await uploadDataUrlToBucket(bucket, profileDataUrl, `${gid}-profile-${Date.now()}`);
        if (up?.url) profileUploaded = up;
      } catch {}
    }

    const current = await getCombinedByGroupId(gid);
    if (!current) return res.status(404).json({ message: 'Not found' });

    const infoRow = {
      first_name: info.first_name ?? current.info?.first_name ?? null,
      last_name: info.last_name ?? current.info?.last_name ?? null,
      contact_number: info.contact_number ?? current.info?.contact_number ?? null,
      street: info.street ?? current.info?.street ?? '',
      barangay: info.barangay ?? current.info?.barangay ?? '',
      additional_address: info.additional_address ?? current.info?.additional_address ?? '',
      profile_picture_url: profileUploaded?.url ?? info.profile_picture_url ?? current.info?.profile_picture_url ?? null,
      profile_picture_name: profileUploaded?.name ?? info.profile_picture_name ?? current.info?.profile_picture_name ?? null
    };

    await updateClientInformation(gid, infoRow);

    const incomingWorkersNeeded = getWorkersNeeded(src, details, metadata);

    const newDetails = {
      service_type: details.service_type ?? current.details?.service_type ?? '',
      service_task: details.service_task ?? current.details?.service_task ?? '',
      preferred_date: details.preferred_date ?? current.details?.preferred_date ?? null,
      preferred_time: details.preferred_time ?? current.details?.preferred_time ?? null,
      is_urgent: details.is_urgent ?? current.details?.is_urgent ?? null,
      tools_provided: details.tools_provided ?? current.details?.tools_provided ?? null,
      service_description: details.service_description ?? current.details?.service_description ?? '',
      workers_needed: incomingWorkersNeeded !== null ? incomingWorkersNeeded : details.workers_needed ?? details.workers_need ?? current.details?.workers_needed ?? current.details?.workers_need ?? null,
      request_image_url: uploaded[0]?.url ?? details.request_image_url ?? current.details?.request_image_url ?? null,
      image_name: uploaded[0]?.name ?? current.details?.image_name ?? null
    };

    await updateServiceRequestDetails(gid, newDetails);

    await supabaseAdmin
      .from('client_service_request_status')
      .update({
        info: {
          first_name: infoRow.first_name,
          last_name: infoRow.last_name,
          email_address: current.info?.email_address || null,
          contact_number: infoRow.contact_number,
          street: infoRow.street,
          barangay: infoRow.barangay,
          additional_address: infoRow.additional_address
        },
        details: {
          service_type: newDetails.service_type,
          service_task: newDetails.service_task,
          preferred_date: newDetails.preferred_date,
          preferred_time: newDetails.preferred_time,
          is_urgent: newDetails.is_urgent,
          tools_provided: newDetails.tools_provided,
          service_description: newDetails.service_description,
          workers_needed: newDetails.workers_needed ?? null,
          request_image_url: newDetails.request_image_url,
          image_name: newDetails.image_name
        },
        rate: {}
      })
      .eq('request_group_id', gid);

    const updated = await getCombinedByGroupId(gid);
    const d = updated.details || {};
    const bucket2 = process.env.SUPABASE_BUCKET_SERVICE_IMAGES || 'csr-attachments';
    if (!d.request_image_url && d.image_name) {
      updated.details = { ...d, request_image_url: await publicOrSignedUrl(bucket2, d.image_name) };
    }
    if (updated.details) {
      if (updated.details.workers_needed === undefined && updated.details.workers_need !== undefined) updated.details.workers_needed = updated.details.workers_need;
      if (updated.details.workers_needed === undefined) updated.details.workers_needed = null;
    }

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};
