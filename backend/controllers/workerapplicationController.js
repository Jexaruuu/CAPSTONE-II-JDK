const {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRate,
  insertWorkerRequiredDocuments,
  insertWorkerTermsAndAgreements,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById,
  findWorkerByAuthUid,
  updateWorkerInformationWorkerId
} = require('../models/workerapplicationModel');

const { supabaseAdmin } = require('../supabaseClient');

function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/wa-attachments/i.test(raw) && /not.*found|bucket/i.test(raw)) return 'Storage bucket "wa-attachments" is missing.';
  if (/worker_information|worker_work_information|worker_service_rate|worker_required_documents|worker_agreements|worker_application_status/i.test(raw)) return `Database error: ${raw}`;
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
function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') {
    const out = [];
    Object.entries(v).forEach(([k, val]) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(x => out.push({ kind: k, ...(x || {}) }));
      } else if (typeof val === 'object') {
        out.push({ kind: k, ...(val || {}) });
      } else if (typeof val === 'string') {
        out.push({ kind: k, url: val });
      }
    });
    return out;
  }
  if (typeof v === 'string') return [{ url: v }];
  return [];
}
function coerceDataUrl(v, mime) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^data:/i.test(s)) return s;
  if (/^[A-Za-z0-9+/]+={0,2}$/i.test(s)) return `data:${mime || 'image/jpeg'};base64,${s}`;
  return '';
}

function normalizeDocs(arr) {
  const base = toArray(arr);
  return base.map(x => {
    const o = x || {};
    const kind = o.kind || o.type || o.label || o.name || o.field || '';
    const url = o.url || o.link || o.href || '';
    const rawData =
      o.data_url || o.dataUrl || o.dataURL || o.base64 || o.imageData || o.blobData || '';
    const data_url = coerceDataUrl(rawData, (o.mime || o.mimetype || '').toString()) || (String(rawData || '').startsWith('data:') ? rawData : '');
    const filename = o.filename || o.fileName || o.name || '';
     const preferData = String(url || '').startsWith('data:') && !data_url ? url : data_url;
    const final_url = preferData && preferData.startsWith('data:') ? '' : url;
    const final_data_url = preferData && preferData.startsWith('data:') ? preferData : data_url;
    return { kind, url: final_url, data_url: final_data_url, filename };
  });
}

function extFromMime(m) {
  const mime = String(m || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

async function safeUploadDataUrl(bucket, dataUrl, path) {
  try {
    const up = await uploadDataUrlToBucket(bucket, dataUrl, path);
    if (up?.url) return up;
  } catch {}
  const m = /^data:(.+?);base64,(.*)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('invalid data url');
  const contentType = m[1];
  const bytes = Buffer.from(m[2], 'base64');
  const ext = extFromMime(contentType);
  const finalPath = path.includes('.') ? path : `${path}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(finalPath, bytes, { upsert: true, contentType });
  if (error) throw error;
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(finalPath);
  return { url: pub?.publicUrl || '', name: finalPath.split('/').pop() || null };
}

exports.submitFullApplication = async (req, res) => {
  try {
    const src = req.body || {};
    const info = src.info || src.information || src.profile || {};
    const details = src.details || src.detail || src.work || {};
    const rate = src.rate || src.pricing || {};
    const metadata = src.metadata || {};
    const docsIn = normalizeDocs(
  src.documents ||
  src.docs ||
  src.attachments ||
  src.required_documents ||
  src.requiredDocuments ||
  src.required_documents_object ||            // <— add
  src.worker_documents ||
  src.workerDocuments ||
  src.documentsData ||
  details.required_documents ||
  details.requiredDocuments ||                // <— add
  details.documents ||
  {}
);

    const worker_id_in = pick(src, ['worker_id', 'workerId', 'info.worker_id', 'info.workerId']);
    const first_name = pick(src, ['first_name', 'firstName', 'info.first_name', 'info.firstName', 'metadata.first_name', 'metadata.firstName']);
    const last_name = pick(src, ['last_name', 'lastName', 'info.last_name', 'info.lastName', 'metadata.last_name', 'metadata.lastName']);
    const email_address = pick(src, ['email_address', 'email', 'info.email_address', 'info.email', 'metadata.email']);
    const contact_number = pick(src, ['contact_number', 'phone', 'mobile', 'info.contact_number', 'info.phone', 'info.mobile', 'metadata.contact_number', 'metadata.phone']);
    const street = pick(src, ['street', 'info.street', 'metadata.street']);
    const barangay = pick(src, ['barangay', 'info.barangay', 'metadata.barangay']);
    const date_of_birth = pick(src, ['date_of_birth', 'birthDate', 'info.date_of_birth', 'info.birthDate', 'metadata.date_of_birth']);
    const age = pick(src, ['age', 'info.age', 'metadata.age']);
    const auth_uid = pick(src, ['auth_uid', 'authUid', 'info.auth_uid', 'metadata.auth_uid']);
    const profile_picture_any = pick(src, [
      'profile_picture',
      'profilePicture',
      'info.profile_picture',
      'info.profilePicture',
      'metadata.profile_picture',
      'profile_picture_url',
      'profilePictureUrl',
      'info.profile_picture_url',
      'info.profilePictureUrl',
      'metadata.profile_picture_url',
      'profile_picture_data_url',
      'profilePictureDataUrl',
      'info.profile_picture_data_url',
      'info.profilePictureDataUrl',
      'metadata.profile_picture_data_url'
    ]);
    const profile_picture_name = pick(src, ['profile_picture_name', 'profilePictureName', 'info.profile_picture_name', 'info.profilePictureName', 'metadata.profile_picture_name']);
    const profile_picture_data_any = pick(src, [
  'profile_picture_data_url',
  'profilePictureDataUrl',
  'info.profile_picture_data_url',
  'info.profilePictureDataUrl',
  'metadata.profile_picture_data_url',
  'metadata.profilePictureDataUrl'
]);

    const service_types = pick(src, ['service_types', 'details.service_types', 'details.serviceTypes', 'work.service_types', 'work.serviceTypes'], []);
    const service_task_raw = pick(src, ['service_task', 'details.service_task', 'details.serviceTask', 'work.service_task', 'work.serviceTask'], {});
    const years_experience = pick(src, ['years_experience', 'details.years_experience', 'details.yearsExperience', 'work.years_experience', 'work.yearsExperience']);
    const tools_provided = pick(src, ['tools_provided', 'details.tools_provided', 'details.toolsProvided', 'work.tools_provided', 'work.toolsProvided', 'metadata.tools_provided', 'metadata.toolsProvided']);
    const work_description = pick(src, ['work_description', 'service_description', 'details.work_description', 'details.service_description', 'work.service_description', 'work.serviceDescription']);

    const rate_type_raw = pick(src, ['rate_type', 'rateType', 'rate.rate_type', 'rate.rateType', 'pricing.rate_type', 'pricing.rateType']);
    const rate_from = pick(src, ['rate_from', 'rateFrom', 'rate.rate_from', 'rate.rateFrom', 'pricing.rate_from', 'pricing.rateFrom']);
    const rate_to = pick(src, ['rate_to', 'rateTo', 'rate.rate_to', 'rate.rateTo', 'pricing.rate_to', 'pricing.rateTo']);
    const rate_value = pick(src, ['rate_value', 'rateValue', 'rate.rate_value', 'rate.rateValue', 'pricing.rate_value', 'pricing.rateValue']);

    let effectiveWorkerId = worker_id_in != null && String(worker_id_in).trim() !== '' ? Number(worker_id_in) : null;
    let effectiveAuthUid = null;
    let canonicalEmail = String(email_address || '').trim() || null;

    if (effectiveWorkerId) {
      try {
        const foundById = await findWorkerById(effectiveWorkerId);
        if (foundById) {
          effectiveAuthUid = foundById.auth_uid || null;
          if (!canonicalEmail && foundById.email_address) canonicalEmail = foundById.email_address;
        }
      } catch {}
    }
    if (!effectiveWorkerId && (auth_uid || metadata.auth_uid)) {
      try {
        const foundByAu = await findWorkerByAuthUid(auth_uid || metadata.auth_uid);
        if (foundByAu && foundByAu.id) {
          effectiveWorkerId = foundByAu.id;
          effectiveAuthUid = foundByAu.auth_uid || null;
          if (!canonicalEmail && foundByAu.email_address) canonicalEmail = foundByAu.email_address;
        }
      } catch {}
    }
    if (!effectiveWorkerId && canonicalEmail) {
      try {
        const found = await findWorkerByEmail(canonicalEmail);
        if (found && found.id) {
          effectiveWorkerId = found.id;
          effectiveAuthUid = found.auth_uid || null;
          if (found.email_address) canonicalEmail = found.email_address;
        }
      } catch {}
    }
    if (!canonicalEmail) return res.status(400).json({ message: 'Missing email_address for worker.' });

    try {
      const { data: existing } = await supabaseAdmin
        .from('worker_application_status')
        .select('request_group_id,status')
        .ilike('email_address', canonicalEmail)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(50);
      const rows = Array.isArray(existing) ? existing : [];
      const active = rows.filter(r => ['pending', 'approved'].includes(String(r.status || '').toLowerCase()));
      if (active.length > 0) return res.status(409).json({ message: 'You already have an active worker application.' });
    } catch {}

    const request_group_id = newGroupId();

  let profileUpload = null;
let profileDirect = null;
const rawProfile = profile_picture_data_any || profile_picture_any || '';
if (rawProfile) {
  const s = String(rawProfile);
  if (/^data:/i.test(s)) {
    try {
      const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', s, `${request_group_id}-profile`);
      profileUpload = up?.url ? up : null;
    } catch {
      profileUpload = null;
    }
  } else if (/^https?:\/\//i.test(s)) {
    profileDirect = s;
  } else {
    const coerced = coerceDataUrl(s, 'image/jpeg');
    if (coerced) {
      try {
        const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', coerced, `${request_group_id}-profile`);
        profileUpload = up?.url ? up : null;
      } catch {
        profileUpload = null;
      }
    }
  }
}

    const infoRow = {
  request_group_id,
  worker_id: effectiveWorkerId,
  auth_uid: effectiveWorkerId ? effectiveAuthUid : (auth_uid || metadata.auth_uid || null),
  email_address: canonicalEmail || metadata.email || null,
  first_name: first_name || metadata.first_name || null,
  last_name: last_name || metadata.last_name || null,
  contact_number: (contact_number ?? metadata.contact_number ?? '').toString(),
  street: (street ?? metadata.street ?? '').toString(),
  barangay: (barangay ?? metadata.barangay ?? '').toString(),
  date_of_birth: date_of_birth || null,
  age: age || null,
  profile_picture_url: profileUpload?.url || profileDirect || metadata.profile_picture || metadata.profile_picture_url || null,
  profile_picture_name: profileUpload?.name || profile_picture_name || null
};

    if (!infoRow.profile_picture_url) {
      infoRow.profile_picture_url = metadata.profile_picture || metadata.profile_picture_url || fallbackProfile?.profile_picture_url || null;
      if (!infoRow.profile_picture_name) infoRow.profile_picture_name = fallbackProfile?.profile_picture_name || null;
    }

    const missingInfo = [];
    if (!infoRow.email_address) missingInfo.push('email_address');
    if (!infoRow.first_name) missingInfo.push('first_name');
    if (!infoRow.last_name) missingInfo.push('last_name');
    if (!infoRow.contact_number) missingInfo.push('contact_number');
    if (infoRow.barangay === '') missingInfo.push('barangay');
    if (missingInfo.length) return res.status(400).json({ message: `Missing required worker_information fields: ${missingInfo.join(', ')}` });

    let infoIns;
    try {
      infoIns = await insertWorkerInformation(infoRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }
    if (infoIns?.id && effectiveWorkerId && !infoRow.worker_id) {
      try { await updateWorkerInformationWorkerId(infoIns.id, effectiveWorkerId); } catch {}
    }

    const normalizeTasks = (raw, types) => {
      const map = {};
      const keys = Array.isArray(types) ? types : [];
      keys.forEach((t) => {
        const k = String(t || '').trim();
        if (k && !map[k]) map[k] = [];
      });
      if (Array.isArray(raw)) {
        raw.forEach((it) => {
          const cat = String(it?.category || '').trim();
          const vals = Array.isArray(it?.tasks) ? it.tasks : [];
          if (!cat) return;
          const clean = vals.map(v => String(v || '').trim()).filter(Boolean);
          map[cat] = Array.from(new Set([...(map[cat] || []), ...clean]));
        });
      } else if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([k, v]) => {
          const vals = Array.isArray(v) ? v : [v];
          const clean = vals.map(x => String(x || '').trim()).filter(Boolean);
          if (!clean.length) return;
          const cat = String(k || '').trim() || 'General';
          map[cat] = Array.from(new Set([...(map[cat] || []), ...clean]));
        });
      }
      return Object.entries(map).map(([category, tasks]) => ({ category, tasks }));
    };

    const tasksArr = normalizeTasks(service_task_raw || {}, Array.isArray(service_types) ? service_types : []);

    const detailsRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      service_types: Array.isArray(service_types) ? service_types : [],
      service_task: tasksArr,
      years_experience: years_experience ?? null,
      tools_provided: yesNo(toBoolStrict(tools_provided)),
      work_description: work_description || null
    };

    const hasTasks =
      Array.isArray(detailsRow.service_task)
        ? detailsRow.service_task.length > 0
        : Object.values(detailsRow.service_task || {}).some(arr => Array.isArray(arr) && arr.length > 0);

    const missingDetails = [];
    if (!detailsRow.service_types || !detailsRow.service_types.length) missingDetails.push('service_types');
    if (detailsRow.years_experience === null || detailsRow.years_experience === undefined || String(detailsRow.years_experience) === '') missingDetails.push('years_experience');
    if (!detailsRow.tools_provided) missingDetails.push('tools_provided');
    if (!detailsRow.work_description) missingDetails.push('work_description');
    if (!hasTasks) missingDetails.push('service_task');
    if (missingDetails.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingDetails.join(', ')}` });

    await insertWorkerWorkInformation(detailsRow);

    let inferredRateType = rate_type_raw || null;
    if (!inferredRateType) {
      if (rate_value) inferredRateType = 'By the Job Rate';
      else if (rate_from || rate_to) inferredRateType = 'Hourly Rate';
    }
    const toLabelRateType = (t) => {
      const s = String(t || '').toLowerCase();
      if (s.includes('hour')) return 'Hourly Rate';
      if (s.includes('job') || s.includes('fixed') || s.includes('flat')) return 'By the Job Rate';
      return '';
    };
    const rateTypeDb = toLabelRateType(inferredRateType);
    const rateRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      rate_type: rateTypeDb || null,
      rate_from: rate_from ? Number(rate_from) : null,
      rate_to: rate_to ? Number(rate_to) : null,
      rate_value: rate_value ? Number(rate_value) : null
    };
    const missingRate = [];
    if (!rateRow.rate_type) missingRate.push('rate_type');
    if (rateRow.rate_type === 'Hourly Rate' && (!rateRow.rate_from || !rateRow.rate_to)) missingRate.push('rate_from/rate_to');
    if (rateRow.rate_type === 'By the Job Rate' && !rateRow.rate_value) missingRate.push('rate_value');
    if (missingRate.length) return res.status(400).json({ message: `Missing required worker_service_rate fields: ${missingRate.join(', ')}` });

    try {
  await insertWorkerRate(rateRow);
} catch (e) {
  const raw = String(e?.message || '');
  if (/rate_type.*check|rate_type_check/i.test(raw)) {
    const fallbacks = rateRow.rate_type === 'Hourly Rate'
      ? ['hourly', 'hourly_rate']
      : rateRow.rate_type === 'By the Job Rate'
      ? ['job', 'by_job_rate']
      : [];
    let inserted = false;
    for (const alt of fallbacks) {
      try {
        await insertWorkerRate({ ...rateRow, rate_type: alt });
        inserted = true;
        break;
      } catch {}
    }
    if (!inserted) throw e;
  } else {
    throw e;
  }
}

    const bucket = process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments';
    const docCols = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      primary_id_front: '',
      primary_id_back: '',
      secondary_id: '',
      nbi_police_clearance: '',
      proof_of_address: '',
      medical_certificate: '',
      certificates: ''
    };

    let fallbackDocs = null;
try {
  const { data: prevDocs } = await supabaseAdmin
    .from('worker_required_documents')
    .select('primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, certificates')
    .ilike('email_address', infoRow.email_address)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (prevDocs) fallbackDocs = prevDocs;
} catch {}

if (fallbackDocs) {
  Object.keys(docCols).forEach(k => {
    if (k === 'request_group_id' || k === 'worker_id' || k === 'auth_uid' || k === 'email_address') return;
    if (!docCols[k]) docCols[k] = fallbackDocs[k] || '';
  });
}


    const aliasToKey = (raw, f) => {
      const r = String(raw || '').toLowerCase();
      const ff = String(f || '').toLowerCase();
      if ((/primary/.test(r) && /(front|face)/.test(r)) || (/prim/.test(ff) && /(front|face)/.test(ff))) return 'primary_id_front';
      if ((/primary/.test(r) && /(back|rear|reverse)/.test(r)) || (/prim/.test(ff) && /(back|rear|reverse)/.test(ff))) return 'primary_id_back';
      if ((/secondary|alternate|alt/.test(r)) || (/second|alt/.test(ff))) return 'secondary_id';
      if ((/(nbi|police)/.test(r)) || (/(nbi|police)/.test(ff))) return 'nbi_police_clearance';
      if ((/proof.*address|address.*proof|billing|bill/.test(r)) || (/address|billing|bill/.test(ff))) return 'proof_of_address';
      if ((/medical|med\s*cert|health/.test(r)) || (/medical|medcert|health/.test(ff))) return 'medical_certificate';
      if ((/certificate|certs?\b|tesda|ncii|nc2/.test(r)) || (/certificate|certs?\b|tesda|ncii|nc2/.test(ff))) return 'certificates';
      if (/(^primary_id_front$|^primary\-id\-front$)/.test(r)) return 'primary_id_front';
      if (/(^primary_id_back$|^primary\-id\-back$)/.test(r)) return 'primary_id_back';
      if (/(^nbi_police_clearance$|^nbi\-police\-clearance$)/.test(r)) return 'nbi_police_clearance';
      if (/(^proof_of_address$|^proof\-of\-address$)/.test(r)) return 'proof_of_address';
      if (/(^medical_certificate$|^medical_certificates$|^medical\-certificate$)/.test(r)) return 'medical_certificate';
      if (/^certificates?$/.test(r)) return 'certificates';
      return null;
    };

    for (let i = 0; i < docsIn.length; i++) {
      const d = docsIn[i] || {};
      const key = aliasToKey(d.kind, d.filename) || aliasToKey(d.filename, d.kind);
      if (!key) continue;
      if (typeof d.url === 'string') {
  if (/^https?:\/\//i.test(d.url)) {
    docCols[key] = d.url;
    continue;
  }
  if (/^data:/i.test(d.url)) {
    try {
      const up = await safeUploadDataUrl(bucket, d.url, `${request_group_id}-${key}`);
      docCols[key] = up?.url || '';
    } catch {
      docCols[key] = docCols[key] || '';
    }
    continue;
  }
}
const maybeData = coerceDataUrl(d.data_url, 'image/jpeg');
if (maybeData) {
  try {
    const up = await safeUploadDataUrl(bucket, maybeData, `${request_group_id}-${key}`);
    docCols[key] = up?.url || '';
  } catch {
    docCols[key] = docCols[key] || '';
  }
}
    }

    if (typeof metadata === 'object') {
      const m = metadata || {};
      const trySet = (k, v) => {
        if (!v) return;
        if (typeof v === 'string' && /^https?:\/\//i.test(v)) docCols[k] = v;
      };
      trySet('primary_id_front', m.primary_id_front || m.primaryIdFront);
      trySet('primary_id_back', m.primary_id_back || m.primaryIdBack);
      trySet('secondary_id', m.secondary_id || m.secondaryId);
      trySet('nbi_police_clearance', m.nbi_police_clearance || m.nbiPoliceClearance);
      trySet('proof_of_address', m.proof_of_address || m.proofOfAddress);
      trySet('medical_certificate', m.medical_certificate || m.medical_certificates || m.medicalCertificate);
      trySet('certificates', m.certificates);
    }

    if (fallbackDocs) {
      Object.keys(docCols).forEach(k => {
        if (k === 'request_group_id' || k === 'worker_id' || k === 'auth_uid' || k === 'email_address') return;
        if (!docCols[k]) docCols[k] = fallbackDocs[k] || '';
      });
    }

    try {
      await insertWorkerRequiredDocuments(docCols);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const termsRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
      email_address: infoRow.email_address,
      consent_background_checks: !!(metadata.agree_verify || src.agree_verify || src.agreements?.consent_background_checks),
      consent_terms_privacy: !!(metadata.agree_tos || src.agree_tos || src.agreements?.consent_terms_privacy),
      consent_data_privacy: !!(metadata.agree_privacy || src.agree_privacy || src.agreements?.consent_data_privacy),
      created_at: new Date().toISOString()
    };

    try {
      await insertWorkerTermsAndAgreements(termsRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    const pendingInfo = {
      first_name: infoRow.first_name,
      last_name: infoRow.last_name,
      email_address: infoRow.email_address,
      contact_number: infoRow.contact_number,
      street: infoRow.street || null,
      barangay: infoRow.barangay || null,
      profile_picture_url: infoRow.profile_picture_url || null
    };

    const pendingDetails = {
      service_types: detailsRow.service_types,
      service_task: detailsRow.service_task,
      years_experience: detailsRow.years_experience,
      tools_provided: detailsRow.tools_provided,
      work_description: detailsRow.work_description
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
        worker_id: effectiveWorkerId,
        auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
        email_address: infoRow.email_address,
        info: pendingInfo,
        details: pendingDetails,
        rate: pendingRate,
        status: 'pending'
      });
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    return res.status(201).json({
      message: 'Application submitted',
      application: {
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

exports.listPublicApproved = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '60', 10), 1), 200);
    const { data: apps, error } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, email_address, info, details, rate')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = Array.isArray(apps) ? apps : [];
    if (!rows.length) return res.status(200).json({ items: [] });

    const gids = [...new Set(rows.map(r => r.request_group_id).filter(Boolean))];

    let infoMap = {}, workMap = {}, rateMap = {};
    if (gids.length) {
      const [{ data: infos }, { data: works }, { data: rates }] = await Promise.all([
        supabaseAdmin.from('worker_information').select('*').in('request_group_id', gids),
        supabaseAdmin.from('worker_work_information').select('*').in('request_group_id', gids),
        supabaseAdmin.from('worker_service_rate').select('*').in('request_group_id', gids)
      ]);
      (infos || []).forEach(r => { if (r?.request_group_id) infoMap[r.request_group_id] = r; });
      (works || []).forEach(r => { if (r?.request_group_id) workMap[r.request_group_id] = r; });
      (rates || []).forEach(r => { if (r?.request_group_id) rateMap[r.request_group_id] = r; });
    }

    const items = rows.map(r => {
      const gid = r.request_group_id;
      const i = infoMap[gid] || r.info || {};
      const w = workMap[gid] || r.details || {};
      const rt = rateMap[gid] || r.rate || {};
      return {
        id: r.id,
        request_group_id: gid,
        email_address: r.email_address || i.email_address || w.email_address || null,
        status: r.status,
        created_at: r.created_at,
        info: i,
        work: w,
        rate: rt
      };
    });

    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.listApproved = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const { data, error } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, email_address')
      .eq('status', 'approved')
      .ilike('email_address', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return res.status(200).json({ items: Array.isArray(data) ? data : [] });
  } catch {
    return res.status(500).json({ message: 'Failed to load approved applications' });
  }
};

function readAppUHeader(req){
  const h=req.headers["x-app-u"];
  if(!h) return {};
  try{
    const o=JSON.parse(decodeURIComponent(h));
    const email=o.email||o.email_address||o.e||'';
    const auth_uid=o.auth_uid||o.authUid||o.au||'';
    return { email, email_address: email, auth_uid };
  }catch{
    return {};
  }
}

exports.listMine = async (req, res) => {
  try {
    const scope = String(req.query.scope || 'current').toLowerCase();
    const hdr = readAppUHeader(req);
    const email = String(req.query.email || hdr.email || hdr.email_address || req.session?.user?.email_address || '').trim();
    const authUid = String(req.query.auth_uid || hdr.auth_uid || '').trim();
    if (!email && !authUid) return res.status(401).json({ message: 'Unauthorized' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const groupIdFilter = String(req.query.groupId || '').trim();

    let q = supabaseAdmin
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason, auth_uid, worker_id, info, details, rate')
      .order('created_at', { ascending: false })
      .limit(200);
    if (email) q = q.ilike('email_address', email);
    if (!email && authUid) q = q.eq('auth_uid', authUid);

    const { data: statusRows } = await q;

    const rows = Array.isArray(statusRows) ? statusRows : [];
    let base = rows;
    const isCancelled = (r) => ['cancelled','canceled'].includes(String(r.status||'').toLowerCase());
    const isExpired = (r) => String(r.status||'').toLowerCase() === 'expired';
    const isCurrent = (r) => ['pending','approved','declined'].includes(String(r.status||'').toLowerCase());
    const isActive = (r) => ['pending','approved'].includes(String(r.status||'').toLowerCase());

    if (scope === 'cancelled') base = rows.filter(isCancelled);
    else if (scope === 'expired') base = rows.filter(isExpired);
    else if (scope === 'active') base = rows.filter(isActive);
    else base = rows.filter(isCurrent);

    let targetGroups = base.map(r => r.request_group_id).filter(Boolean);
    if (groupIdFilter) targetGroups = targetGroups.includes(groupIdFilter) ? [groupIdFilter] : [];

    let infoMap = {}, detailsMap = {}, rateMap = {}, docsMap = {};
    if (targetGroups.length) {
      try {
        const { data: infos } = await supabaseAdmin
          .from('worker_information')
          .select('request_group_id, worker_id, auth_uid, email_address, first_name, last_name, contact_number, street, barangay, date_of_birth, age, profile_picture_url, profile_picture_name')
          .in('request_group_id', targetGroups);
        (infos || []).forEach(r => { if (r?.request_group_id) infoMap[r.request_group_id] = r; });
      } catch {}
      try {
        const { data: details } = await supabaseAdmin
          .from('worker_work_information')
          .select('request_group_id, auth_uid, service_types, service_task, years_experience, tools_provided, work_description, barangay, street, worker_id')
          .in('request_group_id', targetGroups);
        (details || []).forEach(r => { if (r?.request_group_id) detailsMap[r.request_group_id] = r; });
      } catch {}
      try {
        const { data: rates } = await supabaseAdmin
          .from('worker_service_rate')
          .select('request_group_id, auth_uid, rate_type, rate_from, rate_to, rate_value, worker_id')
          .in('request_group_id', targetGroups);
        (rates || []).forEach(r => { if (r?.request_group_id) rateMap[r.request_group_id] = r; });
      } catch {}
      try {
        const { data: docs } = await supabaseAdmin
          .from('worker_required_documents')
          .select('request_group_id, primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, certificates')
          .in('request_group_id', targetGroups);
        (docs || []).forEach(r => { if (r?.request_group_id) docsMap[r.request_group_id] = r; });
      } catch {}
    }

    const items = (rows || [])
      .filter(r => targetGroups.includes(r.request_group_id))
      .map(r => {
        const gid = r.request_group_id;
        const mergedInfo = infoMap[gid] || r.info || {};
        const mergedDetails = detailsMap[gid] || r.details || {};
        const mergedRate = rateMap[gid] || r.rate || {};
        const mergedDocs = docsMap[gid] || null;
        return { ...r, info: mergedInfo, details: mergedDetails, rate: mergedRate, required_documents: mergedDocs };
      });

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.getByGroup = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const { data, error } = await supabaseAdmin
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

exports.deleteApplication = async (req, res) => {
  try {
    const raw = String(req.params.id || '').trim();
    if (!raw) return res.status(400).json({ message: 'id is required' });
    const { data: row, error } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, status, request_group_id')
      .eq('id', raw)
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ message: 'Not found' });
    await supabaseAdmin.from('worker_application_status').delete().eq('id', raw);
    return res.status(200).json({ message: 'Application deleted', id: raw });
  } catch {
    return res.status(500).json({ message: 'Failed to delete application' });
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

    const { data: existing, error: getErr } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, status, email_address, request_group_id, auth_uid, worker_id')
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!existing) return res.status(404).json({ message: 'Application not found' });

    const upd = { status: 'cancelled', reason_choice, reason_other };
    const { data: updated, error: upErr } = await supabaseAdmin
      .from('worker_application_status')
      .update(upd)
      .eq('id', existing.id)
      .select('id, status, reason_choice, reason_other')
      .maybeSingle();
    if (upErr) throw upErr;

    const canceled_at = new Date().toISOString();
    const { error: insErr } = await supabaseAdmin
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

    return res.status(201).json({ message: 'Cancellation recorded', canceled_at, id: updated?.id || existing.id });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.getByGroupFull = async (req, res) => {
  try {
    const gid = String(req.params.id || '').trim();
    if (!gid) return res.status(400).json({ message: 'Missing id' });

    const [{ data: info }, { data: details }, { data: rate }, { data: docs }, { data: statusRow }] = await Promise.all([
      supabaseAdmin.from('worker_information').select('*').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('worker_work_information').select('*').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('worker_service_rate').select('*').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('worker_required_documents').select('request_group_id, primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, certificates').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('worker_application_status').select('id, request_group_id, status, email_address, created_at, auth_uid').eq('request_group_id', gid).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);

    if (!statusRow && !info && !details && !rate) return res.status(404).json({ message: 'Application not found' });

    return res.status(200).json({
      request_group_id: gid,
      status: statusRow || null,
      info: info || null,
      details: details || null,
      rate: rate || null,
      required_documents: docs || null
    });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.updateByGroup = async (req, res) => {
  try {
    const gid = String(req.params.id || '').trim();
    if (!gid) return res.status(400).json({ message: 'Missing id' });

    const payload = req.body || {};

    const { data: statusRow } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, request_group_id, email_address, auth_uid, worker_id, status')
      .eq('request_group_id', gid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const email = payload.email_address || statusRow?.email_address || null;
    const auth_uid = payload.auth_uid || statusRow?.auth_uid || null;
    const worker_id = payload.worker_id || statusRow?.worker_id || null;

     const upsertInfo = async () => {
      const info = payload.info || {};
      const { data: existing } = await supabaseAdmin
        .from('worker_information')
        .select('id, first_name, last_name, contact_number, street, barangay, date_of_birth, age, profile_picture_url, profile_picture_name, email_address')
        .eq('request_group_id', gid)
        .limit(1)
        .maybeSingle();

      const profileAny =
        payload.profile_picture ||
        payload.profile_picture_url ||
        payload.profile_picture_data_url ||
        info.profile_picture ||
        info.profile_picture_url ||
        info.profile_picture_data_url ||
        '';

      let profile_picture_url = existing?.profile_picture_url || null;
      let profile_picture_name = existing?.profile_picture_name || null;

      if (profileAny) {
        const s = String(profileAny);
        if (/^data:/i.test(s)) {
          const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', s, `${gid}-profile`);
          profile_picture_url = up?.url || profile_picture_url || null;
          profile_picture_name = up?.name || profile_picture_name || null;
        } else if (/^https?:\/\//i.test(s)) {
          profile_picture_url = s;
        }
      }

      const base = {
        request_group_id: gid,
        worker_id: worker_id || null,
        auth_uid: auth_uid || null,
        email_address: (email || info.email_address || existing?.email_address || null),
        first_name: (info.first_name !== undefined ? info.first_name : existing?.first_name) ?? null,
        last_name: (info.last_name !== undefined ? info.last_name : existing?.last_name) ?? null,
        contact_number: (info.contact_number !== undefined ? info.contact_number : existing?.contact_number) ?? null,
        street: (info.street !== undefined ? info.street : existing?.street) ?? null,
        barangay: (info.barangay !== undefined ? info.barangay : existing?.barangay) ?? null,
        date_of_birth: (info.date_of_birth !== undefined ? info.date_of_birth : existing?.date_of_birth) ?? null,
        age: (info.age !== undefined ? info.age : existing?.age) ?? null,
        profile_picture_url,
        profile_picture_name
      };

      if (existing?.id) {
        await supabaseAdmin.from('worker_information').update(base).eq('id', existing.id);
      } else {
        await insertWorkerInformation(base);
      }

      return {
        profile_picture_url,
        profile_picture_name,
        first_name: base.first_name,
        last_name: base.last_name,
        email_address: base.email_address,
        contact_number: base.contact_number,
        street: base.street,
        barangay: base.barangay
      };
    };

       const upsertDetails = async () => {
      const d = payload.details || payload.work || {};
      const { data: existing } = await supabaseAdmin
        .from('worker_work_information')
        .select('id, service_types, service_task, years_experience, tools_provided, work_description, email_address')
        .eq('request_group_id', gid)
        .limit(1)
        .maybeSingle();

      let incomingTypes = Array.isArray(d.service_types) ? d.service_types : (d.service_type ? [d.service_type] : []);
      let incomingTask = d.service_task;

      if (Array.isArray(incomingTask)) {
        incomingTask = incomingTask;
      } else if (incomingTypes.length && typeof incomingTask === 'string') {
        incomingTask = [{ category: incomingTypes[0], tasks: [incomingTask] }];
      } else if (!incomingTask && incomingTypes.length) {
        incomingTask = [{ category: incomingTypes[0], tasks: [] }];
      }

      const service_types = incomingTypes && incomingTypes.length ? incomingTypes : (existing?.service_types || []);
      const service_task = Array.isArray(incomingTask) && incomingTask.length ? incomingTask : (existing?.service_task || []);

      const years_experience =
        (d.years_experience !== undefined && d.years_experience !== null && String(d.years_experience) !== '')
          ? d.years_experience
          : (existing?.years_experience ?? null);

      const tools_in = d.tools_provided;
      const tools_provided = tools_in !== undefined && tools_in !== null && String(tools_in) !== ''
        ? (['yes','y','true','t','1'].includes(String(tools_in).trim().toLowerCase()) ? 'Yes' : 'No')
        : (existing?.tools_provided ?? null);

      const work_description =
        (d.work_description !== undefined && String(d.work_description).trim() !== '')
          ? d.work_description
          : (existing?.work_description ?? null);

      const row = {
        request_group_id: gid,
        worker_id: worker_id || null,
        auth_uid: auth_uid || null,
        email_address: email || existing?.email_address || null,
        service_types,
        service_task,
        years_experience,
        tools_provided,
        work_description
      };

      if (existing?.id) {
        await supabaseAdmin.from('worker_work_information').update(row).eq('id', existing.id);
      } else {
        await insertWorkerWorkInformation(row);
      }
      return row;
    };

    const upsertRate = async () => {
      const r = payload.rate || {};
      const s = String(r.rate_type || '').toLowerCase();
      let rate_type = '';
      if (s.includes('hour')) rate_type = 'Hourly Rate';
      else if (s.includes('job') || s.includes('fixed') || s.includes('flat')) rate_type = 'By the Job Rate';
      else rate_type = r.rate_type || '';
      const row = {
        request_group_id: gid,
        worker_id: worker_id || null,
        auth_uid: auth_uid || null,
        email_address: email || null,
        rate_type: rate_type || null,
        rate_from: r.rate_from != null ? Number(r.rate_from) : null,
        rate_to: r.rate_to != null ? Number(r.rate_to) : null,
        rate_value: r.rate_value != null ? Number(r.rate_value) : null
      };
      const { data: existing } = await supabaseAdmin.from('worker_service_rate').select('id').eq('request_group_id', gid).limit(1).maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from('worker_service_rate').update(row).eq('id', existing.id);
      } else {
        await insertWorkerRate(row);
      }
      return row;
    };

    const upsertDocs = async () => {
      const docs = payload.required_documents || payload.documents || null;
      if (!docs) return null;
      const bucket = process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments';
      const shape = {
        request_group_id: gid,
        worker_id: worker_id || null,
        auth_uid: auth_uid || null,
        email_address: email || null,
        primary_id_front: '',
        primary_id_back: '',
        secondary_id: '',
        nbi_police_clearance: '',
        proof_of_address: '',
        medical_certificate: '',
        certificates: ''
      };
      const setUrl = async (k, v) => {
        if (!v) return;
        if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
          shape[k] = v;
        } else if (typeof v === 'string' && /^data:/i.test(v)) {
          const up = await safeUploadDataUrl(bucket, v, `${gid}-${k}`);
          shape[k] = up?.url || '';
        }
      };
      await setUrl('primary_id_front', docs.primary_id_front || docs.front || docs.primaryFront);
      await setUrl('primary_id_back', docs.primary_id_back || docs.back || docs.primaryBack);
      await setUrl('secondary_id', docs.secondary_id || docs.secondary || docs.alt);
      await setUrl('nbi_police_clearance', docs.nbi_police_clearance || docs.nbi || docs.police);
      await setUrl('proof_of_address', docs.proof_of_address || docs.address || docs.billing);
      await setUrl('medical_certificate', docs.medical_certificate || docs.medical);
      await setUrl('certificates', docs.certificates);

      const { data: existing } = await supabaseAdmin.from('worker_required_documents').select('id').eq('request_group_id', gid).limit(1).maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from('worker_required_documents').update(shape).eq('id', existing.id);
      } else {
        await insertWorkerRequiredDocuments(shape);
      }
      return shape;
    };

    const [infoRes, detailsRes, rateRes, docsRes] = await Promise.all([upsertInfo(), upsertDetails(), upsertRate(), upsertDocs()]);

    if (statusRow?.id) {
      await supabaseAdmin.from('worker_application_status').update({
      info: {
        first_name: infoRes?.first_name || null,
        last_name: infoRes?.last_name || null,
        email_address: infoRes?.email_address || email || null,
        contact_number: infoRes?.contact_number || null,
        street: infoRes?.street || null,
        barangay: infoRes?.barangay || null,
        profile_picture_url: infoRes?.profile_picture_url || null
      },
      details: {
        service_types: detailsRes?.service_types || [],
        service_task: detailsRes?.service_task || [],
        years_experience: detailsRes?.years_experience ?? null,
        tools_provided: detailsRes?.tools_provided ?? null,
        work_description: detailsRes?.work_description || null
      },
      rate: {
        rate_type: rateRes?.rate_type || null,
        rate_from: rateRes?.rate_from ?? null,
        rate_to: rateRes?.rate_to ?? null,
        rate_value: rateRes?.rate_value ?? null
      }
    }).eq('id', statusRow.id);
    }

    return res.status(200).json({ message: 'Updated', request_group_id: gid });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};
