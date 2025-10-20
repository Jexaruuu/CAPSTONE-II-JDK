const {
  uploadDataUrlToBucket,
  insertClientInformation,
  insertServiceRequestDetails,
  insertServiceRate,
  newGroupId,
  findClientByEmail,
  findClientById,
} = require('../models/clientservicerequestsModel');
const { insertPendingRequest } = require('../models/pendingservicerequestsModel');
const { supabaseAdmin } = require('../supabaseClient');

function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/csr-attachments/i.test(raw) && /not.*found|bucket/i.test(raw)) return 'Storage bucket "csr-attachments" is missing. Create it in Supabase or remove attachments.';
  if (/column .*attachments.* does not exist/i.test(raw)) return 'Your table does not have an "attachments" column. We will retry without attachments.';
  if (/user_client|client_information|client_service_request_details|client_service_rate|csr_pending/i.test(raw)) return `Database error: ${raw}`;
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
function isExpiredPreferredDate(val) {
  const d = dateOnlyFrom(val);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
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
    .map(x => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') return x.dataUrl || x.dataURL || x.base64 || x.url || null;
      return null;
    })
    .filter(Boolean);
}

exports.submitFullRequest = async (req, res) => {
  try {
    const src = req.body || {};
    const info = src.info || src.information || {};
    const details = src.details || src.detail || {};
    const rate = src.rate || src.pricing || {};
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

    const category = pick(src, ['category', 'details.category']);
    const service_type = pick(src, ['service_type', 'serviceType', 'details.service_type', 'details.serviceType']) || category;
    const service_task = pick(src, ['service_task', 'serviceTask', 'task', 'details.service_task', 'details.serviceTask']);
    const description = pick(src, ['description', 'service_description', 'details.description', 'details.service_description']);
    const preferred_date = pick(src, ['preferred_date', 'preferredDate', 'details.preferred_date', 'details.preferredDate']);
    const preferred_time = pick(src, ['preferred_time', 'preferredTime', 'details.preferred_time', 'details.preferredTime']);
    const is_urgent = pick(src, ['is_urgent', 'isUrgent', 'urgent', 'details.is_urgent', 'details.isUrgent', 'metadata.is_urgent', 'metadata.isUrgent']);
    const tools_provided = pick(src, ['tools_provided', 'toolsProvided', 'tools', 'details.tools_provided', 'details.toolsProvided', 'metadata.tools_provided', 'metadata.toolsProvided']);

    const rate_type_raw = pick(src, ['rate_type', 'rateType', 'rate.rate_type', 'rate.rateType']);
    const rate_from = pick(src, ['rate_from', 'rateFrom', 'rate.rate_from', 'rate.rateFrom']);
    const rate_to = pick(src, ['rate_to', 'rateTo', 'rate.rate_to', 'rate.rateTo']);
    const rate_value = pick(src, ['rate_value', 'rateValue', 'rate.rate_value', 'rate.rateValue']);

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

    const request_group_id = newGroupId();

    let uploaded = [];
    if (attachments && attachments.length) {
      try {
        const max = Math.min(attachments.length, 5);
        const promises = [];
        for (let i = 0; i < max; i++) promises.push(uploadDataUrlToBucket('csr-attachments', attachments[i], `${request_group_id}-${i + 1}`));
        const results = await Promise.all(promises);
        uploaded = results.filter(x => x?.url).map(x => ({ url: x.url, name: x.name }));
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
      profile_picture_name: metadata.profile_picture_name ?? null,
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
      image_url: firstUpload?.url ?? metadata.image_url ?? null,
      image_name: firstUpload?.name ?? metadata.image_name ?? null
    };

    const missingDetails = [];
    ['email_address', 'service_type', 'service_task', 'preferred_date', 'preferred_time', 'is_urgent', 'tools_provided', 'service_description'].forEach(k => { if (!detailsRow[k]) missingDetails.push(k); });
    if (missingDetails.length) return res.status(400).json({ message: `Missing required client_service_request_details fields: ${missingDetails.join(', ')}` });

    try {
      await insertServiceRequestDetails(detailsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    let inferredRateType = rate_type_raw || null;
    if (!inferredRateType) {
      if (rate_value) inferredRateType = 'fixed';
      else if (rate_from || rate_to) inferredRateType = 'range';
    }

    const rateRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      rate_type: inferredRateType || null,
      rate_from: rate_from || null,
      rate_to: rate_to || null,
      rate_value: rate_value || null,
    };

    const missingRate = [];
    if (!rateRow.email_address) missingRate.push('email_address');
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (missingRate.length) return res.status(400).json({ message: `Missing required client_service_rate fields: ${missingRate.join(', ')}` });

    try {
      await insertServiceRate(rateRow);
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
      additional_address: infoRow.additional_address,
    };

    const pendingDetails = {
      service_type: detailsRow.service_type,
      service_task: detailsRow.service_task,
      preferred_date: detailsRow.preferred_date,
      preferred_time: detailsRow.preferred_time,
      is_urgent: detailsRow.is_urgent,
      tools_provided: detailsRow.tools_provided,
      service_description: detailsRow.service_description,
      image_url: detailsRow.image_url,
      image_name: detailsRow.image_name
    };

    const pendingRate = {
      rate_type: rateRow.rate_type,
      rate_from: rateRow.rate_from,
      rate_to: rateRow.rate_to,
      rate_value: rateRow.rate_value,
    };

    let pendingRow;
    try {
      pendingRow = await insertPendingRequest({
        request_group_id,
        email_address: infoRow.email_address,
        info: pendingInfo,
        details: pendingDetails,
        rate: pendingRate,
        status: 'pending',
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
        created_at: pendingRow.created_at,
      },
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
      .from('csr_pending')
      .select('id, request_group_id, status, created_at, email_address, info, details, rate')
      .eq('status', 'approved')
      .eq('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const items = Array.isArray(data) ? data : [];
    const fixed = items.map((it) => {
      const d = { ...(it.details || {}) };
      if (d.is_urgent !== undefined) d.is_urgent = yesNo(toBoolStrict(d.is_urgent));
      if (d.tools_provided !== undefined) d.tools_provided = yesNo(toBoolStrict(d.tools_provided));
      return { ...it, details: d };
    });
    const filtered = fixed.filter((it) => !isExpiredPreferredDate(it?.details?.preferred_date));
    return res.status(200).json({ items: filtered });
  } catch {
    return res.status(500).json({ message: 'Failed to load approved requests' });
  }
};
