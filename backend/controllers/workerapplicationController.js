const {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById
} = require('../models/workerapplicationModel');
const { supabaseAdmin, ensureStorageBucket } = require('../supabaseClient');

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
function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/row-level security/i.test(raw)) return 'Server is not using service-role for a write. Check service key env and restart the server.';
  if (/bucket/i.test(raw) && /not.*found/i.test(raw)) return 'Storage bucket missing.';
  if (/worker_information|worker_work_information|worker_rate|worker_required_documents|wa_pending/i.test(raw)) return `Database error: ${raw}`;
  return raw;
}
function ageFromBirthDate(birth_date) {
  const d = dateOnlyFrom(birth_date);
  if (!d) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

exports.submitFullApplication = async (req, res) => {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ message: 'Service role key missing on server' });
    await ensureStorageBucket('wa-attachments', true);

    const {
      worker_id,
      first_name,
      last_name,
      email_address,
      contact_number,
      barangay,
      street,
      address,
      birth_date,
      age,
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
    let effectiveAuthUid = null;
    let canonicalEmail = String(email_address || '').trim() || null;

    if (effectiveWorkerId) {
      try {
        const foundById = await findWorkerById(effectiveWorkerId);
        if (foundById) {
          canonicalEmail = canonicalEmail || foundById.email_address || null;
          effectiveAuthUid = foundById.auth_uid || null;
        }
      } catch {}
    }
    if (!effectiveWorkerId && canonicalEmail) {
      try {
        const found = await findWorkerByEmail(canonicalEmail);
        if (found && found.id) {
          effectiveWorkerId = found.id;
          effectiveAuthUid = found.auth_uid || null;
          canonicalEmail = found.email_address || canonicalEmail;
        }
      } catch {}
    }
    if (!effectiveWorkerId) return res.status(400).json({ message: 'Unable to identify worker. Provide worker_id or a known email_address.' });

    const request_group_id = newGroupId();

    let streetVal = street ?? metadata.street ?? null;
    if ((!streetVal) && typeof address === 'string' && address.trim()) streetVal = address.trim();

    let profileUpload = { url: null, name: null };
    if (profile_picture) {
      try {
        profileUpload = await uploadDataUrlToBucket('wa-attachments', profile_picture, `${request_group_id}-profile`);
      } catch {
        profileUpload = { url: null, name: null };
      }
    }

    let ageVal = null;
    if (age !== undefined && age !== null && String(age).trim() !== '') {
      const n = parseInt(age, 10);
      ageVal = Number.isFinite(n) ? n : null;
    } else {
      ageVal = ageFromBirthDate(birth_date || metadata.birth_date || null);
    }

    const infoRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveAuthUid,
      email_address: canonicalEmail || metadata.email || null,
      first_name: first_name || metadata.first_name || null,
      last_name: last_name || metadata.last_name || null,
      contact_number: (contact_number ?? metadata.contact_number ?? '').toString(),
      street: (streetVal ?? '').toString(),
      barangay: (barangay ?? metadata.barangay ?? '').toString(),
      birth_date: birth_date || metadata.birth_date || null,
      age: ageVal,
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

    const infoIns = await insertWorkerInformation(infoRow);

    const detailsRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      service_types: Array.isArray(service_types) ? service_types : [],
      job_details: job_details && typeof job_details === 'object' ? job_details : {},
      years_experience: years_experience ?? null,
      tools_provided: typeof tools_provided === 'string' ? tools_provided : (tools_provided ? 'Yes' : 'No'),
      work_description: work_description || null
    };

    const missingWork = [];
    if (!detailsRow.service_types || !detailsRow.service_types.length) missingWork.push('service_types');
    if (!detailsRow.years_experience && detailsRow.years_experience !== 0) missingWork.push('years_experience');
    if (!detailsRow.tools_provided) missingWork.push('tools_provided');
    if (!detailsRow.work_description) missingWork.push('work_description');
    if (missingWork.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingWork.join(', ')}` });

    const workIns = await insertWorkerWorkInformation(detailsRow);

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
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (rateRow.rate_type === 'Hourly Rate' && (!rateRow.rate_from || !rateRow.rate_to)) missingRate.push('rate_from/rate_to');
    if (rateRow.rate_type === 'By the Job Rate' && !rateRow.rate_value) missingRate.push('rate_value');
    if (missingRate.length) return res.status(400).json({ message: `Missing required worker_rate fields: ${missingRate.join(', ')}` });

    const rateIns = await insertWorkerRate(rateRow);

    let docsJson = {};
    if (Array.isArray(docs) && docs.length) {
      try {
        const uploads = {};
        for (let i = 0; i < docs.length; i++) {
          const d = docs[i] || {};
          const rawKind = String(d.kind || d.type || d.label || '').trim();
          const kind = (rawKind || (d.name || `doc_${i}`)).toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/\s+/g, '_');
          const dataUrl = d.data_url || d.dataUrl || null;
          const urlAlready = typeof d.url === 'string' && d.url.startsWith('http') ? d.url : null;
          const base = `${request_group_id}-${kind || `doc_${i}`}`;
          if (urlAlready && !dataUrl) {
            uploads[kind] = { url: urlAlready, name: d.name || kind };
            continue;
          }
          if (!dataUrl) continue;
          const up = await uploadDataUrlToBucket('wa-attachments', dataUrl, base);
          uploads[kind] = { url: up?.url || null, name: up?.name || d.name || kind };
        }
        docsJson = uploads;
      } catch {
        docsJson = {};
      }
    }

    try {
      await insertWorkerRequiredDocuments({ request_group_id, worker_id: effectiveWorkerId, docs: docsJson });
    } catch (e) {
      if (!/column .*docs/i.test(e?.message || '')) return res.status(400).json({ message: friendlyError(e) });
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
      birth_date: infoRow.birth_date,
      age: infoRow.age,
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

    const pendingIns = await insertPendingApplication({
      request_group_id,
      email_address: infoRow.email_address,
      info: pendingInfo,
      work: pendingWork,
      rate: pendingRate,
      docs: docsJson,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Application submitted',
      request: {
        id: pendingIns.id,
        request_group_id,
        status: 'pending',
        created_at: pendingIns.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.listApproved = async (req, res) => {
  try {
    let email = String(req.query.email || '').trim();
    const workerId = String(req.query.worker_id || '').trim();
    if (!email && workerId) {
      try {
        const foundById = await findWorkerById(workerId);
        if (foundById?.email_address) {
          email = String(foundById.email_address).trim();
        }
      } catch {}
    }
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const { data, error } = await supabaseAdmin
      .from('wa_pending')
      .select('id, request_group_id, status, created_at, email_address, info, work, rate, docs')
      .eq('status', 'approved')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const items = Array.isArray(data) ? data : [];
    return res.status(200).json({ items });
  } catch {
    return res.status(500).json({ message: 'Failed to load approved applications' });
  }
};
