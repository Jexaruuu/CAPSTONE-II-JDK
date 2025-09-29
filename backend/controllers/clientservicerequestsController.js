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

exports.submitFullRequest = async (req, res) => {
  try {
    const {
      client_id,
      first_name,
      last_name,
      email_address,
      barangay,
      address,
      contact_number,
      street,
      additional_address,
      auth_uid,
      category,
      service_type,
      service_task,
      description,
      preferred_date,
      preferred_time,
      is_urgent,
      tools_provided,
      rate_type,
      rate_from,
      rate_to,
      rate_value,
      attachments = [],
      metadata = {},
    } = req.body || {};

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
    if (attachments && Array.isArray(attachments) && attachments.length) {
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
      facebook: metadata.facebook ?? null,
      instagram: metadata.instagram ?? null,
      linkedin: metadata.linkedin ?? null,
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
      image_name: firstUpload?.name ?? metadata.image_name ?? null,
    };

    const missingDetails = [];
    ['email_address', 'service_type', 'service_task', 'preferred_date', 'preferred_time', 'is_urgent', 'tools_provided', 'service_description'].forEach(k => { if (!detailsRow[k]) missingDetails.push(k); });
    if (missingDetails.length) return res.status(400).json({ message: `Missing required client_service_request_details fields: ${missingDetails.join(', ')}` });

    try {
      await insertServiceRequestDetails(detailsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const rateRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      rate_type: rate_type || null,
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
      image_name: detailsRow.image_name,
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
