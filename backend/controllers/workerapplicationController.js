const {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail
} = require('../models/workerapplicationModel');
const { supabaseAdmin } = require('../supabaseClient');

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
function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/bucket/i.test(raw) && /not.*found/i.test(raw)) return 'Storage bucket missing.';
  if (/worker_information|worker_work_information|worker_rate|worker_required_documents|wa_pending/i.test(raw)) return `Database error: ${raw}`;
  return raw;
}

exports.submitFullApplication = async (req, res) => {
  try {
    const {
      worker_id,
      first_name,
      last_name,
      email_address,
      contact_number,
      barangay,
      street,
      additional_address,
      address,
      birth_date,
      facebook,
      instagram,
      linkedin,
      profile_picture,
      profile_picture_name,
      service_types = [],
      job_details = {},
      years_experience,
      tools_provided,
      work_description,
      rate_type,
      rate_from,
      rate_to,
      rate_value,
      docs = [],
      metadata = {}
    } = req.body || {};

    let effectiveWorkerId = worker_id || null;
    if (!effectiveWorkerId && email_address) {
      try {
        const found = await findWorkerByEmail(email_address);
        if (found && found.id) effectiveWorkerId = found.id;
      } catch {}
    }
    if (!effectiveWorkerId) return res.status(400).json({ message: 'Unable to identify worker. Provide worker_id or a known email_address.' });

    const request_group_id = newGroupId();

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

    let profileUpload = { url: null, name: null };
    if (profile_picture) {
      try {
        profileUpload = await uploadDataUrlToBucket('wa-attachments', profile_picture, `${request_group_id}-profile`);
      } catch {
        profileUpload = { url: null, name: null };
      }
    }

    const infoRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      email_address: email_address || metadata.email || null,
      first_name: first_name || metadata.first_name || null,
      last_name: last_name || metadata.last_name || null,
      contact_number: (contact_number ?? metadata.contact_number ?? '').toString(),
      street: (streetVal ?? '').toString(),
      barangay: (barangay ?? metadata.barangay ?? '').toString(),
      additional_address: (addlVal ?? '').toString(),
      birth_date: birth_date || metadata.birth_date || null,
      facebook: facebook ?? metadata.facebook ?? null,
      instagram: instagram ?? metadata.instagram ?? null,
      linkedin: linkedin ?? metadata.linkedin ?? null,
      profile_picture_url: profileUpload.url || metadata.profile_picture_url || null,
      profile_picture_name: profileUpload.name || profile_picture_name || metadata.profile_picture_name || null
    };

    const missingInfo = [];
    if (!infoRow.email_address) missingInfo.push('email_address');
    if (!infoRow.first_name) missingInfo.push('first_name');
    if (!infoRow.last_name) missingInfo.push('last_name');
    if (!infoRow.contact_number) missingInfo.push('contact_number');
    if (infoRow.barangay === '') missingInfo.push('barangay');
    if (missingInfo.length) return res.status(400).json({ message: `Missing required worker_information fields: ${missingInfo.join(', ')}` });

    try {
      await insertWorkerInformation(infoRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const detailsRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      email_address: infoRow.email_address,
      service_types: Array.isArray(service_types) ? service_types : [],
      job_details: job_details && typeof job_details === 'object' ? job_details : {},
      years_experience: years_experience ?? null,
      tools_provided: typeof tools_provided === 'string' ? tools_provided : (tools_provided ? 'Yes' : 'No'),
      work_description: work_description || null
    };

    const missingWork = [];
    if (!detailsRow.email_address) missingWork.push('email_address');
    if (!detailsRow.service_types || !detailsRow.service_types.length) missingWork.push('service_types');
    if (!detailsRow.years_experience && detailsRow.years_experience !== 0) missingWork.push('years_experience');
    if (!detailsRow.tools_provided) missingWork.push('tools_provided');
    if (!detailsRow.work_description) missingWork.push('work_description');
    if (missingWork.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingWork.join(', ')}` });

    try {
      await insertWorkerWorkInformation(detailsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const rateRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      email_address: infoRow.email_address,
      rate_type: rate_type || null,
      rate_from: rate_from || null,
      rate_to: rate_to || null,
      rate_value: rate_value || null
    };

    const missingRate = [];
    if (!rateRow.email_address) missingRate.push('email_address');
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (rateRow.rate_type === 'Hourly Rate' && (!rateRow.rate_from || !rateRow.rate_to)) missingRate.push('rate_from/rate_to');
    if (rateRow.rate_type === 'By the Job Rate' && !rateRow.rate_value) missingRate.push('rate_value');
    if (missingRate.length) return res.status(400).json({ message: `Missing required worker_rate fields: ${missingRate.join(', ')}` });

    try {
      await insertWorkerRate(rateRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    let docsJson = {};
    if (Array.isArray(docs) && docs.length) {
      try {
        const uploads = {};
        for (const d of docs) {
          const kind = String(d?.kind || '').toLowerCase().replace(/\s+/g, '_');
          const dataUrl = d?.data_url || d?.dataUrl || null;
          const name = d?.name || kind || 'doc';
          if (!dataUrl || !kind) continue;
          const up = await uploadDataUrlToBucket('wa-attachments', dataUrl, `${request_group_id}-${kind}`);
          uploads[kind] = { url: up?.url || null, name: up?.name || name };
        }
        docsJson = uploads;
      } catch {
        docsJson = {};
      }
    }

    try {
      await insertWorkerRequiredDocuments({
        request_group_id,
        worker_id: effectiveWorkerId,
        email_address: infoRow.email_address,
        docs: docsJson
      });
    } catch (e) {
      if (!/column .*docs/i.test(e?.message || '')) {
        return res.status(400).json({ message: friendlyError(e) });
      }
    }

    let preferredDate = null;
    try {
      const perJob = Array.isArray(service_types) && service_types.length ? service_types[0] : null;
      preferredDate = perJob ? new Date().toISOString().split('T')[0] : null;
    } catch {}

    const pendingInfo = {
      first_name: infoRow.first_name,
      last_name: infoRow.last_name,
      email_address: infoRow.email_address,
      contact_number: infoRow.contact_number,
      street: infoRow.street,
      barangay: infoRow.barangay,
      additional_address: infoRow.additional_address,
      birth_date: infoRow.birth_date,
      profile_picture_url: infoRow.profile_picture_url,
      profile_picture_name: infoRow.profile_picture_name
    };

    const pendingWork = {
      service_types: detailsRow.service_types,
      job_details: detailsRow.job_details,
      years_experience: detailsRow.years_experience,
      tools_provided: detailsRow.tools_provided,
      work_description: detailsRow.work_description,
      preferred_date: preferredDate
    };

    const pendingRate = {
      rate_type: rateRow.rate_type,
      rate_from: rateRow.rate_from,
      rate_to: rateRow.rate_to,
      rate_value: rateRow.rate_value
    };

    let pendingRow;
    try {
      pendingRow = await insertPendingApplication({
        request_group_id,
        email_address: infoRow.email_address,
        info: pendingInfo,
        work: pendingWork,
        rate: pendingRate,
        docs: docsJson,
        status: 'pending'
      });
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    return res.status(201).json({
      message: 'Application submitted',
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
      .from('wa_pending')
      .select('id, request_group_id, status, created_at, email_address, info, work, rate, docs')
      .eq('status', 'approved')
      .eq('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const items = Array.isArray(data) ? data : [];
    const filtered = items.filter((it) => !isExpiredPreferredDate(it?.work?.preferred_date));
    return res.status(200).json({ items: filtered });
  } catch {
    return res.status(500).json({ message: 'Failed to load approved applications' });
  }
};
