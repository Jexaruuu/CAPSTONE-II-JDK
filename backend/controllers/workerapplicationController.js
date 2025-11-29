const {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById,
  insertWorkerTermsAndAgreements,
  updateWorkerInformationWorkerId
} = require('../models/workerapplicationModel');
const { supabaseAdmin, ensureStorageBucket, getSupabaseAdmin } = require('../supabaseClient');

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
  if (/row-level security/i.test(raw)) return 'Service role key missing on server';
  if (/bucket/i.test(raw) && /not.*found/i.test(raw)) return 'Storage bucket missing.';
  if (/worker_information|worker_work_information|worker_rate|worker_required_documents|worker_terms_and_agreements|worker_application_status/i.test(raw)) return `Database error: ${raw}`;
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
    try { getSupabaseAdmin(); } catch (e) { return res.status(500).json({ message: e.message || 'Service role key missing on server' }); }
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
      service_task = {},
      job_details = {},
      years_experience,
      tools_provided,
      work_description,
      service_description,
      rate_type,
      rate_from,
      rate_to,
      rate_value,
      docs = [],
      attachments = [],
      metadata = {}
    } = req.body || {};

    let effectiveWorkerId = worker_id || null;
    let canonicalEmail = String(email_address || '').trim() || null;

    if (effectiveWorkerId) {
      try {
        const foundById = await findWorkerById(effectiveWorkerId);
        if (foundById) {
          canonicalEmail = canonicalEmail || foundById.email_address || null;
        }
      } catch {}
    }
    if (!effectiveWorkerId && canonicalEmail) {
      try {
        const found = await findWorkerByEmail(canonicalEmail);
        if (found && found.id) {
          effectiveWorkerId = found.id;
          canonicalEmail = found.email_address || canonicalEmail;
        }
      } catch {}
    }
    if (!canonicalEmail) return res.status(400).json({ message: 'Missing email_address for worker.' });

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
      worker_id: effectiveWorkerId,
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

    if (!effectiveWorkerId) {
      effectiveWorkerId = infoIns.id;
      try { await updateWorkerInformationWorkerId(infoIns.id, effectiveWorkerId); } catch {}
    }

    const workDesc = (work_description || service_description || '').toString().trim() || null;

    const finalServiceTask = service_task && typeof service_task === 'object' ? service_task : (job_details && typeof job_details === 'object' ? job_details : {});

    const detailsRow = {
      worker_id: effectiveWorkerId,
      service_types: Array.isArray(service_types) ? service_types : [],
      service_task: finalServiceTask,
      years_experience: years_experience ?? null,
      tools_provided: typeof tools_provided === 'string' ? tools_provided : (tools_provided ? 'Yes' : 'No'),
      work_description: workDesc
    };

    const missingWork = [];
    if (!detailsRow.service_types || !detailsRow.service_types.length) missingWork.push('service_types');
    if (!detailsRow.years_experience && detailsRow.years_experience !== 0) missingWork.push('years_experience');
    if (!detailsRow.tools_provided) missingWork.push('tools_provided');
    if (!detailsRow.work_description) missingWork.push('work_description');
    if (missingWork.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingWork.join(', ')}` });

    await insertWorkerWorkInformation(detailsRow);

    const rateRow = {
      worker_id: effectiveWorkerId,
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

    await insertWorkerRate(rateRow);

    const docsSource = (Array.isArray(docs) && docs.length) ? docs : attachments;
    const docCols = {
      primary_id_front: null,
      primary_id_back: null,
      secondary_id: null,
      nbi_police_clearance: null,
      proof_of_address: null,
      medical_certificate: null,
      certificates: null
    };
    if (Array.isArray(docsSource) && docsSource.length) {
      for (let i = 0; i < docsSource.length; i++) {
        const d = docsSource[i] || {};
        const raw = String(d.kind || d.type || d.label || d.name || '').toLowerCase();
        const key =
          /primary.*front/.test(raw) ? 'primary_id_front' :
          /primary.*back/.test(raw) ? 'primary_id_back' :
          /secondary/.test(raw) ? 'secondary_id' :
          /(nbi|police)/.test(raw) ? 'nbi_police_clearance' :
          /address/.test(raw) ? 'proof_of_address' :
          /medical/.test(raw) ? 'medical_certificate' :
          /(certificate|certs?)/.test(raw) ? 'certificates' : null;
        if (!key) continue;
        const hasUrl = typeof d.url === 'string' && /^https?:\/\//i.test(d.url);
        if (hasUrl && !d.data_url && !docCols[key]) {
          docCols[key] = d.url;
          continue;
        }
        if (d.data_url && !docCols[key]) {
          const up = await uploadDataUrlToBucket('wa-attachments', d.data_url, `${request_group_id}-${key}`);
          docCols[key] = up?.url || null;
        }
      }
    }
    await insertWorkerRequiredDocuments({ worker_id: effectiveWorkerId, ...docCols });

    const termsRow = {
      worker_id: effectiveWorkerId,
      email_address: infoRow.email_address,
      agree_verify: !!metadata.agree_verify,
      agree_tos: !!metadata.agree_tos,
      agree_privacy: !!metadata.agree_privacy,
      agreed_at: new Date().toISOString()
    };
    try {
      await insertWorkerTermsAndAgreements(termsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const pendingIns = await insertPendingApplication({
      worker_id: effectiveWorkerId,
      email_address: infoRow.email_address,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Application submitted',
      request: {
        id: pendingIns.id,
        status: 'pending',
        created_at: pendingIns.created_at,
        worker_id: effectiveWorkerId
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
    const { data, error } = await getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, status, created_at, email_address')
      .eq('status', 'approved')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const items = Array.isArray(data) ? data : [];
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.getByGroup = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const { data, error } = await getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Application not found' });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.cancel = async (req, res) => {
  try {
    const body = req.body || {};
    const id = String(body.application_id || body.id || '').trim();
    const reason_choice = String(body.reason_choice || '').trim() || null;
    const reason_other = String(body.reason_other || '').trim() || null;
    const worker_id = body.worker_id ? Number(body.worker_id) : null;
    const email_address = String(body.email_address || '').trim() || null;
    if (!id) return res.status(400).json({ message: 'Missing application_id' });

    const { data: existing, error: getErr } = await getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, status, email_address')
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!existing) return res.status(404).json({ message: 'Application not found' });

    const upd = { status: 'cancelled', reason_choice, reason_other };
    const { data: updated, error: upErr } = await getSupabaseAdmin()
      .from('worker_application_status')
      .update(upd)
      .eq('id', existing.id)
      .select('id, status, reason_choice, reason_other')
      .maybeSingle();
    if (upErr) throw upErr;

    const canceled_at = new Date().toISOString();
    const { error: insErr } = await getSupabaseAdmin()
      .from('worker_cancel_application')
      .insert([{
        worker_id: worker_id || null,
        email_address: email_address || existing.email_address || null,
        reason_choice,
        reason_other,
        canceled_at
      }]);
    if (insErr) throw insErr;

    return res.status(200).json({
      id: updated?.id || existing.id,
      status: 'cancelled',
      canceled_at,
      reason_choice,
      reason_other
    });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.listMine = async (req, res) => {
  try {
    let email = String(req.query.email || '').trim();
    let workerId = req.query.worker_id ? parseInt(req.query.worker_id, 10) : null;

    if (!email && workerId) {
      try {
        const foundById = await findWorkerById(workerId);
        if (foundById?.email_address) {
          email = String(foundById.email_address).trim();
        }
      } catch {}
    }

    if (!email && req.session?.user?.email_address) {
      email = String(req.session.user.email_address).trim();
    }

    if (!email) {
      return res.status(200).json({ items: [] });
    }

    const statusRaw = String(req.query.status || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    let query = getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusRaw !== 'all') {
      query = query.eq('status', statusRaw);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = Array.isArray(data) ? data : [];
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    const raw = String(req.params.id || '').trim();
    if (!raw) return res.status(400).json({ message: 'id is required' });

    const { data: row, error } = await getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, status, email_address')
      .eq('id', raw)
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ message: 'Not found' });

    const status = String(row.status || '').toLowerCase();
    const allowed = new Set(['pending', 'approved', 'declined', 'cancelled', 'canceled']);
    if (!allowed.has(status)) {
      return res.status(409).json({ message: 'Cannot delete this application status' });
    }

    await getSupabaseAdmin().from('worker_application_status').delete().eq('id', raw);
    return res.status(200).json({ message: 'Application deleted', id: raw });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};
