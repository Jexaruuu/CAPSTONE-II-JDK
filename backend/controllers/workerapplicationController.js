// controllers/workerapplicationController.js
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
const { ensureStorageBucket, getSupabaseAdmin } = require('../supabaseClient');

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
  if (/worker_information|worker_work_information|worker_service_rate|worker_required_documents|worker_agreements|worker_application_status/i.test(raw)) return `Database error: ${raw}`;
  return raw;
}
function ageFromBirthDate(date_of_birth) {
  const d = dateOnlyFrom(date_of_birth);
  if (!d) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}
function pick(obj, keys, alt = null) {
  for (const k of keys) {
    const v = k.split('.').reduce((a, p) => (a && a[p] !== undefined ? a[p] : undefined), obj);
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return alt;
}
function normalizeDocs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(x => {
    if (typeof x === 'string') return { data_url: x };
    const o = x || {};
    return {
      kind: o.kind || o.type || o.label || o.name || '',
      url: o.url || '',
      data_url: o.data_url || o.dataUrl || o.dataURL || o.base64 || ''
    };
  });
}

exports.submitFullApplication = async (req, res) => {
  try {
    try { getSupabaseAdmin(); } catch (e) { return res.status(500).json({ message: e.message || 'Service role key missing on server' }); }
    await ensureStorageBucket('wa-attachments', true);

    const src = req.body || {};
    const info = src.info || src.information || src.profile || {};
    const work = src.work || {};
    const details = src.details || src.detail || work || {};
    const rateObj = src.rate || src.pricing || {};
    const metadata = src.metadata || {};
    const docsIn = normalizeDocs(src.docs || src.attachments || src.documents || []);

    let worker_id = pick(src, ['worker_id', 'info.worker_id', 'info.workerId']) || null;
    let email_address =
      pick(src, ['email_address', 'email', 'info.email_address', 'info.email', 'metadata.email']) || null;
    let auth_uid =
      pick(src, ['auth_uid', 'authUid', 'info.auth_uid', 'info.authUid', 'metadata.auth_uid']) || null;

    if (worker_id) {
      try {
        const foundById = await findWorkerById(worker_id);
        if (foundById?.email_address) email_address = email_address || foundById.email_address;
        if (foundById?.auth_uid) auth_uid = auth_uid || foundById.auth_uid;
      } catch {}
    }
    if (!worker_id && email_address) {
      try {
        const found = await findWorkerByEmail(email_address);
        if (found?.id) {
          worker_id = found.id;
          email_address = found.email_address || email_address;
          auth_uid = auth_uid || found.auth_uid || null;
        }
      } catch {}
    }
    if (!email_address) return res.status(400).json({ message: 'Missing email_address for worker.' });

    const request_group_id = newGroupId();

    let profileUp = { url: null, name: null };
    const profile_picture = pick(src, ['profile_picture', 'info.profile_picture', 'info.profilePicture', 'metadata.profile_picture']);
    const profile_picture_name = pick(src, ['profile_picture_name', 'info.profile_picture_name', 'info.profilePictureName', 'metadata.profile_picture_name']);
    if (profile_picture) {
      try {
        profileUp = await uploadDataUrlToBucket('wa-attachments', profile_picture, `${request_group_id}-profile`);
      } catch {
        profileUp = { url: null, name: null };
      }
    }

    const date_of_birth = pick(src, ['date_of_birth', 'info.date_of_birth', 'info.birthDate', 'metadata.date_of_birth']);
    const age = pick(src, ['age', 'info.age']);
    const ageVal = age !== undefined && age !== null && String(age).trim() !== '' ? (Number.isFinite(parseInt(age, 10)) ? parseInt(age, 10) : null) : ageFromBirthDate(date_of_birth || null);

    const street = pick(src, ['street', 'info.street', 'metadata.street', 'address', 'info.address', 'metadata.address']);
    const barangay = pick(src, ['barangay', 'info.barangay', 'metadata.barangay']);
    const contact_number = pick(src, ['contact_number', 'info.contact_number', 'info.contactNumber', 'metadata.contact_number']);

    const first_name = pick(src, ['first_name', 'info.first_name', 'info.firstName', 'metadata.first_name', 'metadata.firstName']);
    const last_name = pick(src, ['last_name', 'info.last_name', 'info.lastName', 'metadata.last_name', 'metadata.lastName']);

    const infoRow = {
      request_group_id,
      worker_id,
      auth_uid,
      email_address,
      first_name,
      last_name,
      contact_number: (contact_number ?? '').toString(),
      street: (street ?? '').toString(),
      barangay: (barangay ?? '').toString(),
      date_of_birth: date_of_birth || null,
      age: ageVal,
      profile_picture_url: profileUp.url || null,
      profile_picture_name: profileUp.name || profile_picture_name || null
    };

    const missingInfo = [];
    if (!infoRow.email_address) missingInfo.push('email_address');
    if (!infoRow.first_name) missingInfo.push('first_name');
    if (!infoRow.last_name) missingInfo.push('last_name');
    if (!infoRow.contact_number) missingInfo.push('contact_number');
    if (infoRow.barangay === '') missingInfo.push('barangay');
    if (missingInfo.length) return res.status(400).json({ message: `Missing required worker_information fields: ${missingInfo.join(', ')}` });

    const infoIns = await insertWorkerInformation(infoRow);
    if (!worker_id) {
      worker_id = infoIns.id;
      try { await updateWorkerInformationWorkerId(infoIns.id, worker_id); } catch {}
    }

    const service_types =
      Array.isArray(details.service_types || details.serviceTypes || src.service_types) ? (details.service_types || details.serviceTypes || src.service_types) : [];
    const service_task_raw = details.service_task || details.serviceTask || src.service_task || {};
    const years_experience = pick(src, ['years_experience', 'details.years_experience', 'work.years_experience', 'work.yearsExperience']);
    const tools_provided = pick(src, ['tools_provided', 'details.tools_provided', 'work.tools_provided', 'work.toolsProvided', 'metadata.tools_provided']);
    const work_description =
      pick(src, ['work_description', 'service_description', 'details.work_description', 'details.service_description', 'work.service_description', 'work.serviceDescription']) || '';

    const normalizeTasks = (raw, types) => {
      const out = {};
      const keys = Array.isArray(types) ? types : [];
      for (const t of keys) {
        const arr = Array.isArray(raw?.[t]) ? raw[t] : [];
        const vals = arr.map(v => String(v || '').trim()).filter(Boolean);
        out[t] = Array.from(new Set(vals));
      }
      return out;
    };
    const service_task = normalizeTasks(service_task_raw, service_types);

    const detailsRow = {
      request_group_id,
      worker_id,
      auth_uid,
      service_types,
      service_task,
      years_experience: years_experience ?? null,
      tools_provided: typeof tools_provided === 'string' ? tools_provided : (tools_provided ? 'Yes' : 'No'),
      work_description: work_description || null
    };

    const missingWork = [];
    if (!detailsRow.service_types || !detailsRow.service_types.length) missingWork.push('service_types');
    if (detailsRow.years_experience === null || detailsRow.years_experience === undefined || String(detailsRow.years_experience) === '') missingWork.push('years_experience');
    if (!detailsRow.tools_provided) missingWork.push('tools_provided');
    if (!detailsRow.work_description) missingWork.push('work_description');
    const emptyTaskTypes = (detailsRow.service_types || []).filter(t => !(detailsRow.service_task?.[t] || []).length);
    if (emptyTaskTypes.length) missingWork.push('service_task');
    if (missingWork.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingWork.join(', ')}` });

    await insertWorkerWorkInformation(detailsRow);

    const rate_type = pick(src, ['rate_type', 'rateType', 'rate.rate_type', 'rate.rateType', 'pricing.rate_type', 'pricing.rateType']) || null;
    const rate_from = (() => {
      const v = pick(src, ['rate_from', 'rateFrom', 'rate.rate_from', 'rate.rateFrom', 'pricing.rate_from', 'pricing.rateFrom']);
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })();
    const rate_to = (() => {
      const v = pick(src, ['rate_to', 'rateTo', 'rate.rate_to', 'rate.rateTo', 'pricing.rate_to', 'pricing.rateTo']);
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })();
    const rate_value = (() => {
      const v = pick(src, ['rate_value', 'rateValue', 'rate.rate_value', 'rate.rateValue', 'pricing.rate_value', 'pricing.rateValue']);
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })();

    const rateRow = {
      request_group_id,
      worker_id,
      auth_uid,
      rate_type,
      rate_from,
      rate_to,
      rate_value
    };

    const missingRate = [];
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (rateRow.rate_type === 'Hourly Rate' && (!rateRow.rate_from || !rateRow.rate_to)) missingRate.push('rate_from/rate_to');
    if (rateRow.rate_type === 'By the Job Rate' && !rateRow.rate_value) missingRate.push('rate_value');
    if (missingRate.length) return res.status(400).json({ message: `Missing required worker_rate fields: ${missingRate.join(', ')}` });

    await insertWorkerRate(rateRow);

    const docCols = {
      request_group_id,
      worker_id,
      auth_uid,
      primary_id_front: null,
      primary_id_back: null,
      secondary_id: null,
      nbi_police_clearance: null,
      proof_of_address: null,
      medical_certificate: null,
      certificates: null
    };
    for (let i = 0; i < docsIn.length; i++) {
      const d = docsIn[i] || {};
      const raw = String(d.kind || '').toLowerCase();
      const key =
        /primary.*front/.test(raw) ? 'primary_id_front' :
        /primary.*back/.test(raw) ? 'primary_id_back' :
        /secondary/.test(raw) ? 'secondary_id' :
        /(nbi|police)/.test(raw) ? 'nbi_police_clearance' :
        /address/.test(raw) ? 'proof_of_address' :
        /medical/.test(raw) ? 'medical_certificate' :
        /(certificate|certs?)/.test(raw) ? 'certificates' : null;
      if (!key) continue;
      if (typeof d.url === 'string' && /^https?:\/\//i.test(d.url) && !docCols[key]) {
        docCols[key] = d.url;
        continue;
      }
      if (d.data_url && !docCols[key]) {
        const up = await uploadDataUrlToBucket('wa-attachments', d.data_url, `${request_group_id}-${key}`);
        docCols[key] = up?.url || null;
      }
    }
    await insertWorkerRequiredDocuments(docCols);

    const termsRow = {
      request_group_id,
      worker_id,
      auth_uid,
      email_address,
      agree_verify: !!(metadata.agree_verify || src.agree_verify || src.agreements?.consent_background_checks),
      agree_tos: !!(metadata.agree_tos || src.agree_tos || src.agreements?.consent_terms_privacy),
      agree_privacy: !!(metadata.agree_privacy || src.agree_privacy || src.agreements?.consent_data_privacy),
      agreed_at: new Date().toISOString()
    };
    try { await insertWorkerTermsAndAgreements(termsRow); } catch (e) { return res.status(400).json({ message: friendlyError(e) }); }

    const pendingIns = await insertPendingApplication({
      request_group_id,
      worker_id,
      auth_uid,
      email_address,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Application submitted',
      application: {
        id: pendingIns.id,
        request_group_id,
        status: 'pending',
        created_at: pendingIns.created_at,
        worker_id,
        auth_uid
      },
      request_group_id
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
        if (foundById?.email_address) email = String(foundById.email_address).trim();
      } catch {}
    }
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const { data, error } = await getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, email_address')
      .eq('status', 'approved')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return res.status(200).json({ items: Array.isArray(data) ? data : [] });
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
      .select('id, request_group_id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason, auth_uid, worker_id')
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
      .select('id, status, email_address, request_group_id, auth_uid, worker_id')
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
        request_group_id: existing.request_group_id || null,
        worker_id: worker_id || existing.worker_id || null,
        auth_uid: existing.auth_uid || null,
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
        if (foundById?.email_address) email = String(foundById.email_address).trim();
      } catch {}
    }
    if (!email && req.session?.user?.email_address) email = String(req.session.user.email_address).trim();
    if (!email) return res.status(200).json({ items: [] });

    const statusRaw = String(req.query.status || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);

    let base = getSupabaseAdmin()
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason, auth_uid, worker_id')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (statusRaw !== 'all') base = base.eq('status', statusRaw);

    const { data: statusRows, error } = await base;
    if (error) throw error;

    const { data: infoRow } = await getSupabaseAdmin()
      .from('worker_information')
      .select('id, request_group_id, worker_id, auth_uid, email_address, first_name, last_name, contact_number, street, barangay, date_of_birth, age, profile_picture_url')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const wid = workerId || infoRow?.worker_id || infoRow?.id || null;

    let detailsRow = null;
    if (wid) {
      const r1 = await getSupabaseAdmin()
        .from('worker_work_information')
        .select('request_group_id, auth_uid, service_types, service_task, years_experience, tools_provided, work_description, barangay, street, worker_id')
        .eq('worker_id', wid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      detailsRow = r1?.data || null;
    }

    const normDetails = (() => {
      const d = detailsRow || {};
      const parseArr = (v) => {
        if (Array.isArray(v)) return v;
        const s = String(v ?? '').trim();
        if (!s) return [];
        try { const x = JSON.parse(s); return Array.isArray(x) ? x : []; } catch { return []; }
      };
      const tools = (() => {
        const raw = d.tools_provided ?? '';
        if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
        const s = String(raw).trim().toLowerCase();
        if (['yes','y','true','1'].includes(s)) return 'Yes';
        if (['no','n','false','0'].includes(s)) return 'No';
        return String(raw || '');
      })();
      return {
        ...d,
        service_types: parseArr(d.service_types),
        work_description: d.work_description ?? '',
        years_experience: d.years_experience ?? '',
        tools_provided: tools
      };
    })();

    let rateRow = null;
    if (wid) {
      const r2 = await getSupabaseAdmin()
        .from('worker_service_rate')
        .select('request_group_id, auth_uid, rate_type, rate_from, rate_to, rate_value, worker_id')
        .eq('worker_id', wid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      rateRow = r2?.data || null;
    }

    const items = (statusRows || []).map(r => ({
      ...r,
      info: infoRow || {},
      details: normDetails,
      rate: rateRow || {}
    }));

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
    if (!allowed.has(status)) return res.status(409).json({ message: 'Cannot delete this application status' });

    await getSupabaseAdmin().from('worker_application_status').delete().eq('id', raw);
    return res.status(200).json({ message: 'Application deleted', id: raw });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};
