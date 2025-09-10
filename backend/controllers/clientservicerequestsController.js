// backend/controllers/clientservicerequestsController.js
const {
  uploadDataUrlToBucket,
  insertClientInformation,
  insertServiceRequestDetails,
  insertServiceRate,
  newGroupId,
  findClientByEmail,
} = require('../models/clientservicerequestsModel');
const { insertPendingRequest } = require('../models/pendingservicerequestsModel');

function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/csr-attachments/i.test(raw) && /not.*found|bucket/i.test(raw)) return 'Storage bucket "csr-attachments" is missing. Create it in Supabase or remove attachments.';
  if (/column .*attachments.* does not exist/i.test(raw)) return 'Your table does not have an "attachments" column. We will retry without attachments.';
  if (/user_client|client_information|client_service_request_details|client_service_rate|csr_pending/i.test(raw)) return `Database error: ${raw}`;
  return raw;
}

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
    if (!effectiveClientId && email_address) {
      try {
        const found = await findClientByEmail(email_address);
        if (found && found.id) effectiveClientId = found.id;
      } catch {}
    }

    if (!serviceKind || !description) {
      return res.status(400).json({ message: 'Missing required fields: service_type/category and description.' });
    }
    if (!effectiveClientId) {
      return res.status(400).json({ message: 'Unable to identify client. Provide client_id or a known email_address.' });
    }

    const request_group_id = newGroupId();

    let uploaded = [];
    if (attachments && Array.isArray(attachments) && attachments.length) {
      try {
        const max = Math.min(attachments.length, 5);
        const promises = [];
        for (let i = 0; i < max; i++) {
          const dataUrl = attachments[i];
          promises.push(uploadDataUrlToBucket('csr-attachments', dataUrl, `${request_group_id}-${i + 1}`));
        }
        const results = await Promise.all(promises);
        uploaded = results.filter(x => x?.url).map(x => ({ url: x.url, name: x.name }));
      } catch (upErr) {
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
      auth_uid: auth_uid ?? metadata.auth_uid ?? null,
      email_address: email_address || metadata.email || null,
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
    if (missingInfo.length) {
      return res.status(400).json({ message: `Missing required client_information fields: ${missingInfo.join(', ')}` });
    }

    try {
      await insertClientInformation(infoRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const yesNo = v => (v ? 'Yes' : 'No');
    const firstUpload = uploaded[0] || null;

    const detailsRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: auth_uid ?? metadata.auth_uid ?? null,
      email_address: infoRow.email_address,
      service_type: serviceKind,
      service_task: service_task || metadata.service_task || null,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null,
      is_urgent: yesNo(!!is_urgent),
      tools_provided: yesNo(!!tools_provided),
      service_description: description,
      image_url: firstUpload?.url ?? metadata.image_url ?? null,
      image_name: firstUpload?.name ?? metadata.image_name ?? null,
    };

    const missingDetails = [];
    ['email_address', 'service_type', 'service_task', 'preferred_date', 'preferred_time', 'is_urgent', 'tools_provided', 'service_description'].forEach(k => {
      if (!detailsRow[k]) missingDetails.push(k);
    });
    if (missingDetails.length) {
      return res.status(400).json({ message: `Missing required client_service_request_details fields: ${missingDetails.join(', ')}` });
    }

    try {
      await insertServiceRequestDetails(detailsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const rateRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: auth_uid ?? metadata.auth_uid ?? null,
      email_address: infoRow.email_address,
      rate_type: rate_type || null,
      rate_from: rate_from || null,
      rate_to: rate_to || null,
      rate_value: rate_value || null,
    };

    const missingRate = [];
    if (!rateRow.email_address) missingRate.push('email_address');
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (missingRate.length) {
      return res.status(400).json({ message: `Missing required client_service_rate fields: ${missingRate.join(', ')}` });
    }

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
