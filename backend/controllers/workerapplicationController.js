// workerapplicationController.js
const {
  uploadDataUrlToBucket,
  insertWorkerInformation,
  insertWorkerWorkInformation,
  insertWorkerRequiredDocuments,
  insertPendingApplication,
  newGroupId,
  findWorkerByEmail,
  findWorkerById,
  findWorkerByAuthUid,
  updateWorkerInformationWorkerId
} = require('../models/workerapplicationModel');

const { supabaseAdmin } = require('../supabaseClient');

const fallbackProfile = { profile_picture_url: '/fallback-profile.png', profile_picture_name: 'fallback-profile.png' };

function friendlyError(err) {
  const raw = err?.message || String(err);
  if (/wa-attachments/i.test(raw) && /not.*found|bucket/i.test(raw)) return 'Storage bucket "wa-attachments" is missing.';
  if (/worker_information|worker_work_information|worker_required_documents|worker_application_status|worker_cancel_application/i.test(raw))
    return `Database error: ${raw}`;
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
        val.forEach((x) => {
          if (!x) return;
          if (typeof x === 'string') out.push({ kind: k, url: x });
          else if (typeof x === 'object') out.push({ kind: k, ...(x || {}) });
        });
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
  return base
    .map((x) => {
      const o = x || {};
      const kind = o.kind || o.type || o.label || o.name || o.field || '';
      const url = o.url || o.link || o.href || '';
      const rawData = o.data_url || o.dataUrl || o.dataURL || o.base64 || o.imageData || o.blobData || '';
      const data_url =
        coerceDataUrl(rawData, (o.mime || o.mimetype || '').toString()) || (String(rawData || '').startsWith('data:') ? rawData : '');
      const filename = o.filename || o.fileName || o.name || '';
      const preferData = String(url || '').startsWith('data:') && !data_url ? url : data_url;
      const final_url = preferData && preferData.startsWith('data:') ? '' : url;
      const final_data_url = preferData && preferData.startsWith('data:') ? preferData : data_url;
      return { kind, url: final_url, data_url: final_data_url, filename };
    })
    .filter((d) => (d.url && String(d.url).trim()) || (d.data_url && String(d.data_url).trim()));
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

function extFromDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,/.exec(String(dataUrl || '').trim());
  const mime = (m ? m[1] : '').toLowerCase();
  return extFromMime(mime) || 'jpg';
}

function isFallbackProfileUrl(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return true;
  if (s === '/fallback-profile.png') return true;
  if (s.endsWith('/fallback-profile.png')) return true;
  if (s.includes('fallback-profile.png')) return true;
  return false;
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

function mergeNormalizedDocs(...sources) {
  const merged = [];
  sources.forEach((src) => {
    const items = normalizeDocs(src);
    if (!items.length) return;
    merged.push(...items);
  });

  const seen = new Set();
  const out = [];
  merged.forEach((d) => {
    const k = String(d.kind || '').trim().toLowerCase();
    const u = String(d.url || '').trim();
    const du = String(d.data_url || '').trim();
    const f = String(d.filename || '').trim();
    const sig = [k, u || du, f].join('|');
    if (!k || !(u || du) || seen.has(sig)) return;
    seen.add(sig);
    out.push(d);
  });
  return out;
}

async function insertWorkerRequiredDocumentsSafe(docCols) {
  try {
    const safe = { ...(docCols || {}) };
    if ('certificates' in safe) delete safe.certificates;
    return await insertWorkerRequiredDocuments(safe);
  } catch (e) {
    const raw = String(e?.message || '');
    const retry = { ...(docCols || {}) };
    if ('certificates' in retry) delete retry.certificates;

    const hasMissingCol = /column .* does not exist/i.test(raw) || /has no field/i.test(raw);
    if (!hasMissingCol) throw e;

    const missingTesda = /column\s+"?tesda_/i.test(raw) || /tesda_.*_certificate/i.test(raw);

    if (missingTesda) {
      Object.keys(retry).forEach((k) => {
        if (/^tesda_.*_certificate$/i.test(k)) delete retry[k];
      });
      return await insertWorkerRequiredDocuments(retry);
    }

    Object.keys(retry).forEach((k) => {
      if (/^tesda_.*_certificate$/i.test(k)) delete retry[k];
    });

    return await insertWorkerRequiredDocuments(retry);
  }
}

function unwrapDocValue(v) {
  if (!v) return '';
  if (Array.isArray(v)) return unwrapDocValue(v.find(Boolean));
  if (typeof v === 'object') {
    const o = v || {};
    return (
      unwrapDocValue(o.url || o.link || o.href) ||
      unwrapDocValue(o.data_url || o.dataUrl || o.dataURL) ||
      unwrapDocValue(o.base64 ? coerceDataUrl(o.base64, o.mime || o.mimetype || 'image/jpeg') : '') ||
      ''
    );
  }
  return String(v || '').trim();
}

function mergePlainObjects(...objs) {
  const out = {};
  objs.forEach((o) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    Object.keys(o).forEach((k) => {
      if (out[k] === undefined) out[k] = o[k];
    });
  });
  return out;
}

function tryParseJsonObject(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  const s = String(v || '').trim();
  if (!s) return null;
  if (!(s.startsWith('{') || s.startsWith('['))) return null;
  try {
    const j = JSON.parse(s);
    return j && typeof j === 'object' ? j : null;
  } catch {
    return null;
  }
}

function parseStoredMulti(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => unwrapDocValue(x)).filter(Boolean);
  if (typeof v === 'object') {
    const got = unwrapDocValue(v);
    return got ? [got] : [];
  }
  const s = String(v || '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map((x) => String(x || '').trim()).filter(Boolean);
    } catch {}
  }
  if (s.includes('|')) return s.split('|').map((x) => String(x || '').trim()).filter(Boolean);
  if (s.includes('\n')) return s.split('\n').map((x) => String(x || '').trim()).filter(Boolean);
  return [s];
}

function storeMultiValue(arr) {
  const uniq = Array.from(new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean)));
  if (!uniq.length) return '';
  if (uniq.length === 1) return uniq[0];
  return JSON.stringify(uniq);
}

async function finalizeRequiredDocsUploads(request_group_id, docCols) {
  const bucket = process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments';
  const keys = Object.keys(docCols || {});
  for (const k of keys) {
    if (k === 'request_group_id' || k === 'worker_id' || k === 'auth_uid' || k === 'email_address') continue;

    const isTesda = /^tesda_.*_certificate$/i.test(k);
    const rawVal = docCols[k];

    if (isTesda) {
      const list = parseStoredMulti(rawVal);
      if (!list.length) continue;

      const out = [];
      for (let i = 0; i < list.length; i++) {
        const v0 = String(list[i] || '').trim();
        if (!v0) continue;
        if (/^https?:\/\//i.test(v0)) {
          out.push(v0);
          continue;
        }

        let du = '';
        if (/^data:/i.test(v0)) du = v0;
        else {
          const coerced = coerceDataUrl(v0, 'image/jpeg');
          if (coerced && /^data:/i.test(coerced)) du = coerced;
        }
        if (!du) {
          out.push(v0);
          continue;
        }

        try {
          const up = await safeUploadDataUrl(bucket, du, `${request_group_id}-${k}-${i + 1}`);
          if (up?.url) out.push(up.url);
          else out.push(v0);
        } catch {
          out.push(v0);
        }
      }

      docCols[k] = storeMultiValue(out);
      continue;
    }

    const v = String(rawVal || '').trim();
    if (!v) continue;
    if (/^https?:\/\//i.test(v)) continue;

    let du = '';
    if (/^data:/i.test(v)) du = v;
    else {
      const coerced = coerceDataUrl(v, 'image/jpeg');
      if (coerced && /^data:/i.test(coerced)) du = coerced;
    }
    if (!du) continue;

    try {
      const up = await safeUploadDataUrl(bucket, du, `${request_group_id}-${k}`);
      if (up?.url) docCols[k] = up.url;
    } catch {}
  }
  return docCols;
}

function canonType(s) {
  const k = String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (/carpent/.test(k)) return 'carpentry';
  if (/elect/.test(k)) return 'electrical works';
  if (/plumb/.test(k)) return 'plumbing';
  if (/(car\s*wash|carwash|auto)/.test(k)) return 'car washing';
  if (/laund/.test(k)) return 'laundry';
  return k;
}

function canonTask(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

function extractTaskList(service_task) {
  if (!service_task) return [];
  if (typeof service_task === 'string') {
    return service_task
      .split(/[,/|]+/)
      .map((x) => canonTask(x))
      .filter(Boolean);
  }
  if (Array.isArray(service_task)) {
    const out = [];
    service_task.forEach((it) => {
      if (!it) return;
      if (typeof it === 'string') out.push(canonTask(it));
      else if (typeof it === 'object') {
        const tasks = Array.isArray(it.tasks) ? it.tasks : [];
        tasks.forEach((t) => out.push(canonTask(t)));
      }
    });
    return out.filter(Boolean);
  }
  if (typeof service_task === 'object') {
    const out = [];
    Object.values(service_task).forEach((v) => {
      if (!v) return;
      const arr = Array.isArray(v) ? v : [v];
      arr.forEach((x) => out.push(canonTask(x)));
    });
    return out.filter(Boolean);
  }
  return [];
}

async function hasActiveWorkerApplicationByEmail(email) {
  const canonicalEmail = String(email || '').trim();
  if (!canonicalEmail) return false;

  const { data: existing } = await supabaseAdmin
    .from('worker_application_status')
    .select('request_group_id,status,created_at')
    .ilike('email_address', canonicalEmail)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = Array.isArray(existing) ? existing : [];
  if (!rows.length) return false;

  const gids = [...new Set(rows.map((r) => String(r.request_group_id || '').trim()).filter(Boolean))];
  if (!gids.length) return true;

  let canceledSet = new Set();
  try {
    const { data: canc } = await supabaseAdmin.from('worker_cancel_application').select('request_group_id').in('request_group_id', gids);
    (canc || []).forEach((r) => {
      const gid = String(r?.request_group_id || '').trim();
      if (gid) canceledSet.add(gid);
    });
  } catch {}

  const active = rows.filter((r) => {
    const gid = String(r?.request_group_id || '').trim();
    return gid && !canceledSet.has(gid);
  });

  return active.length > 0;
}

exports.submitFullApplication = async (req, res) => {
  try {
    const src = req.body || {};
    const info = src.info || src.information || src.profile || {};
    const details = src.details || src.detail || src.work || {};
    const metadata = src.metadata || {};

    const worker_id_in = pick(src, ['worker_id', 'workerId', 'info.worker_id', 'info.workerId']);
    const first_name = pick(src, ['first_name', 'firstName', 'info.first_name', 'info.firstName', 'metadata.first_name', 'metadata.firstName']);
    const last_name = pick(src, ['last_name', 'lastName', 'info.last_name', 'info.lastName', 'metadata.last_name', 'metadata.lastName']);
    const email_address = pick(src, ['email_address', 'email', 'info.email_address', 'info.email', 'metadata.email']);
    const contact_number = pick(src, [
      'contact_number',
      'phone',
      'mobile',
      'info.contact_number',
      'info.phone',
      'info.mobile',
      'metadata.contact_number',
      'metadata.phone'
    ]);
    const street = pick(src, ['street', 'info.street', 'metadata.street'], 'N/A');
    const barangay = pick(src, ['barangay', 'info.barangay', 'metadata.barangay'], 'N/A');
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
      'metadata.profile_picture_data_url',
      'metadata.profilePictureDataUrl'
    ]);
    const profile_picture_name = pick(src, [
      'profile_picture_name',
      'profilePictureName',
      'info.profile_picture_name',
      'info.profilePictureName',
      'metadata.profile_picture_name'
    ]);
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
    const tools_provided = pick(
      src,
      ['tools_provided', 'details.tools_provided', 'details.toolsProvided', 'work.tools_provided', 'work.toolsProvided', 'metadata.tools_provided', 'metadata.toolsProvided'],
      'No'
    );
    const work_description = pick(src, ['work_description', 'service_description', 'details.work_description', 'details.service_description', 'work.service_description', 'work.serviceDescription']);

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

    const request_group_id = newGroupId();

    try {
      const active = await hasActiveWorkerApplicationByEmail(canonicalEmail);
      if (active) return res.status(409).json({ message: 'You already have an active worker application.' });
    } catch {}

    let profileUpload = null;
    let profileDirect = null;

    const rawProfile = profile_picture_data_any || profile_picture_any || '';
    const rawProfileStr = typeof rawProfile === 'string' ? rawProfile.trim() : '';

    if (rawProfileStr && !isFallbackProfileUrl(rawProfileStr)) {
      if (/^data:/i.test(rawProfileStr)) {
        try {
          const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', rawProfileStr, `${request_group_id}-profile`);
          profileUpload = up?.url ? up : null;
        } catch {
          const ext = extFromDataUrl(rawProfileStr);
          profileUpload = { url: rawProfileStr, name: profile_picture_name || `profile-${Date.now()}.${ext}` };
        }
      } else if (/^https?:\/\//i.test(rawProfileStr)) {
        if (!/\/fallback-profile\.png$/i.test(rawProfileStr)) profileDirect = rawProfileStr;
      } else {
        const coerced = coerceDataUrl(rawProfileStr, 'image/jpeg');
        if (coerced) {
          try {
            const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', coerced, `${request_group_id}-profile`);
            profileUpload = up?.url ? up : null;
          } catch {
            const ext = extFromDataUrl(coerced);
            profileUpload = { url: coerced, name: profile_picture_name || `profile-${Date.now()}.${ext}` };
          }
        }
      }
    }

    const infoRow = {
      request_group_id,
      worker_id: effectiveWorkerId,
      auth_uid: effectiveWorkerId ? effectiveAuthUid : auth_uid || metadata.auth_uid || null,
      email_address: canonicalEmail || metadata.email || null,
      first_name: first_name || metadata.first_name || null,
      last_name: last_name || metadata.last_name || null,
      contact_number: (contact_number ?? metadata.contact_number ?? '').toString(),
      street: (street ?? metadata.street ?? 'N/A').toString() || 'N/A',
      barangay: (barangay ?? metadata.barangay ?? 'N/A').toString() || 'N/A',
      date_of_birth: date_of_birth || null,
      age: age || null,
      profile_picture_url: profileUpload?.url || profileDirect || null,
      profile_picture_name: profileUpload?.name || profile_picture_name || null
    };

    if (!infoRow.profile_picture_url || isFallbackProfileUrl(infoRow.profile_picture_url)) {
      infoRow.profile_picture_url = fallbackProfile.profile_picture_url;
      infoRow.profile_picture_name = fallbackProfile.profile_picture_name;
    }

    const missingInfo = [];
    if (!infoRow.email_address) missingInfo.push('email_address');
    if (!infoRow.first_name) missingInfo.push('first_name');
    if (!infoRow.last_name) missingInfo.push('last_name');
    if (!infoRow.contact_number) missingInfo.push('contact_number');
    if (missingInfo.length) return res.status(400).json({ message: `Missing required worker_information fields: ${missingInfo.join(', ')}` });

    let infoIns;
    try {
      infoIns = await insertWorkerInformation(infoRow);
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }
    if (infoIns?.id && effectiveWorkerId && !infoRow.worker_id) {
      try {
        await updateWorkerInformationWorkerId(infoIns.id, effectiveWorkerId);
      } catch {}
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
          const clean = vals.map((v) => String(v || '').trim()).filter(Boolean);
          map[cat] = Array.from(new Set([...(map[cat] || []), ...clean]));
        });
      } else if (raw && typeof raw === 'object') {
        Object.entries(raw).forEach(([k, v]) => {
          const vals = Array.isArray(v) ? v : [v];
          const clean = vals.map((x) => String(x || '').trim()).filter(Boolean);
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

    const missingDetails = [];
    if (!detailsRow.service_types || detailsRow.service_types.length === 0) missingDetails.push('service_types');
    if (!detailsRow.tools_provided) detailsRow.tools_provided = 'No';
    if (!detailsRow.work_description) missingDetails.push('work_description');
    if (missingDetails.length) return res.status(400).json({ message: `Missing required worker_work_information fields: ${missingDetails.join(', ')}` });

    await insertWorkerWorkInformation(detailsRow);

    const rawDocsA =
      src.documents ||
      src.docs ||
      src.attachments ||
      src.documentsData ||
      details.documents ||
      details.docs ||
      details.attachments ||
      null;

    const rawDocsB =
      src.required_documents ||
      src.requiredDocuments ||
      src.required_documents_object ||
      src.worker_documents ||
      src.workerDocuments ||
      details.required_documents ||
      details.requiredDocuments ||
      details.required_documents_object ||
      null;

    const docsIn = mergeNormalizedDocs(rawDocsA, rawDocsB);

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
      tesda_carpentry_certificate: '',
      tesda_electrician_certificate: '',
      tesda_plumbing_certificate: '',
      tesda_carwashing_certificate: '',
      tesda_laundry_certificate: ''
    };

    let fallbackDocs = null;
    try {
      const { data: prevDocs } = await supabaseAdmin
        .from('worker_required_documents')
        .select(
          'primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, tesda_carpentry_certificate, tesda_electrician_certificate, tesda_plumbing_certificate, tesda_carwashing_certificate, tesda_laundry_certificate'
        )
        .ilike('email_address', infoRow.email_address)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevDocs) fallbackDocs = prevDocs;
    } catch {}

    if (fallbackDocs) {
      Object.keys(docCols).forEach((k) => {
        if (k === 'request_group_id' || k === 'worker_id' || k === 'auth_uid' || k === 'email_address') return;
        if (!docCols[k]) docCols[k] = fallbackDocs[k] || '';
      });
    }

    const aliasToKey = (raw, f) => {
      const r = String(raw || '').toLowerCase();
      const ff = String(f || '').toLowerCase();

      const isCarp = /carpentry|carpenter/.test(r) || /carpentry|carpenter/.test(ff);
      const isElec =
        /electric|electrician|eim|electrical\s*installation|electrical\s*installation\s*and\s*maintenance|installation\s*and\s*maintenance/.test(r) ||
        /electric|electrician|eim|electrical\s*installation|electrical\s*installation\s*and\s*maintenance|installation\s*and\s*maintenance/.test(ff);
      const isPlum = /plumb|plumbing|plumber/.test(r) || /plumb|plumbing|plumber/.test(ff);
      const isCarwash = /carwash|carwashing|car\s*wash|carwasher|automotive/.test(r) || /carwash|carwashing|car\s*wash|carwasher|automotive/.test(ff);
      const isLaundry = /laundry|housekeeping/.test(r) || /laundry|housekeeping/.test(ff);

      if (/^tesda_carpentry_certificate$/.test(r) || /^tesda_carpentry_certificate$/.test(ff)) return 'tesda_carpentry_certificate';

      if (/^tesda_electrician_certificate$/.test(r) || /^tesda_electrician_certificate$/.test(ff)) return 'tesda_electrician_certificate';
      if (/^tesda_electrical_certificate$/.test(r) || /^tesda_electrical_certificate$/.test(ff)) return 'tesda_electrician_certificate';
      if (/^tesda_eim_certificate$/.test(r) || /^tesda_eim_certificate$/.test(ff)) return 'tesda_electrician_certificate';
      if (/^tesda_electrical_installation.*certificate$/.test(r) || /^tesda_electrical_installation.*certificate$/.test(ff))
        return 'tesda_electrician_certificate';

      if (/^tesda_plumbing_certificate$/.test(r) || /^tesda_plumbing_certificate$/.test(ff)) return 'tesda_plumbing_certificate';
      if (/^tesda_plumber_certificate$/.test(r) || /^tesda_plumber_certificate$/.test(ff)) return 'tesda_plumbing_certificate';

      if (/^tesda_carwashing_certificate$/.test(r) || /^tesda_carwashing_certificate$/.test(ff)) return 'tesda_carwashing_certificate';
      if (/^tesda_car_washing_certificate$/.test(r) || /^tesda_car_washing_certificate$/.test(ff)) return 'tesda_carwashing_certificate';
      if (/^tesda_carwash_certificate$/.test(r) || /^tesda_carwash_certificate$/.test(ff)) return 'tesda_carwashing_certificate';
      if (/^tesda_automotive_certificate$/.test(r) || /^tesda_automotive_certificate$/.test(ff)) return 'tesda_carwashing_certificate';

      if (/^tesda_laundry_certificate$/.test(r) || /^tesda_laundry_certificate$/.test(ff)) return 'tesda_laundry_certificate';
      if (/^tesda_housekeeping_certificate$/.test(r) || /^tesda_housekeeping_certificate$/.test(ff)) return 'tesda_laundry_certificate';

      if ((/tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(r) || /tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(ff)) && isCarp)
        return 'tesda_carpentry_certificate';
      if ((/tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(r) || /tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(ff)) && isElec)
        return 'tesda_electrician_certificate';
      if ((/tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(r) || /tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(ff)) && isPlum)
        return 'tesda_plumbing_certificate';
      if ((/tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(r) || /tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(ff)) && isCarwash)
        return 'tesda_carwashing_certificate';
      if ((/tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(r) || /tesda|nc|ncii|nc2|certificate|cert\b|certs\b/.test(ff)) && isLaundry)
        return 'tesda_laundry_certificate';

      if ((/primary/.test(r) && /(front|face)/.test(r)) || (/prim/.test(ff) && /(front|face)/.test(ff))) return 'primary_id_front';
      if ((/primary/.test(r) && /(back|rear|reverse)/.test(r)) || (/prim/.test(ff) && /(back|rear|reverse)/.test(ff))) return 'primary_id_back';
      if (/secondary|alternate|alt/.test(r) || /second|alt/.test(ff)) return 'secondary_id';
      if (/(nbi|police)/.test(r) || /(nbi|police)/.test(ff)) return 'nbi_police_clearance';
      if (/proof.*address|address.*proof|billing|bill/.test(r) || /address|billing|bill/.test(ff)) return 'proof_of_address';
      if (/medical|med\s*cert|health/.test(r) || /medical|medcert|health/.test(ff)) return 'medical_certificate';

      if ((/(^primary_id_front$|^primary\-id\-front$)/.test(r))) return 'primary_id_front';
      if (/(^primary_id_back$|^primary\-id\-back$)/.test(r)) return 'primary_id_back';
      if (/(^nbi_police_clearance$|^nbi\-police\-clearance$)/.test(r)) return 'nbi_police_clearance';
      if (/^proof_of_address$|^proof\-of\-address$/.test(r)) return 'proof_of_address';
      if (/^medical_certificate$|^medical_certificates$|^medical\-certificate$/.test(r)) return 'medical_certificate';
      return null;
    };

    const addVal = async (k, v, force = false) => {
      if (!k) return;
      const isTesda = /^tesda_.*_certificate$/i.test(k);

      const pullMany = (vv) => {
        if (!vv) return [];
        if (Array.isArray(vv)) return vv.flatMap((x) => pullMany(x));
        if (typeof vv === 'object') {
          const got = unwrapDocValue(vv);
          return got ? [got] : [];
        }
        const got = String(vv || '').trim();
        if (!got) return [];
        if (got.startsWith('[')) {
          try {
            const j = JSON.parse(got);
            if (Array.isArray(j)) return j.map((x) => String(x || '').trim()).filter(Boolean);
          } catch {}
        }
        return [got];
      };

      const incoming = pullMany(v);
      if (!incoming.length) return;

      if (!force && docCols[k] && !isTesda) return;
      if (!force && docCols[k] && isTesda) return;

      if (!isTesda) {
        const raw = incoming[0];
        if (!raw) return;

        if (/^https?:\/\//i.test(raw)) {
          docCols[k] = raw;
          return;
        }

        const du = coerceDataUrl(raw, 'image/jpeg') || (raw.startsWith('data:') ? raw : '');
        if (du && /^data:/i.test(du)) docCols[k] = du;
        return;
      }

      const existing = parseStoredMulti(docCols[k]);
      const merged = storeMultiValue(existing.concat(incoming));
      if (merged) docCols[k] = merged;
    };

    const docObjMerged = mergePlainObjects(
      src.required_documents,
      src.requiredDocuments,
      src.required_documents_object,
      src.worker_documents,
      src.workerDocuments,
      details.required_documents,
      details.requiredDocuments,
      details.required_documents_object,
      rawDocsB && typeof rawDocsB === 'object' && !Array.isArray(rawDocsB) ? rawDocsB : null
    );

    const certCarrier =
      docObjMerged.certificates ||
      docObjMerged.certs ||
      src.certificates ||
      src.certs ||
      metadata.certificates ||
      metadata.certs ||
      null;

    const extractedCerts = (() => {
      const out = {};
      const parsed = tryParseJsonObject(certCarrier);
      const srcVal = parsed || certCarrier;

      const push = (k, val) => {
        if (!k || !/^tesda_.*_certificate$/i.test(k)) return;
        const list = parseStoredMulti(val);
        if (!list.length) return;
        out[k] = (out[k] || []).concat(list);
      };

      if (Array.isArray(srcVal)) {
        srcVal.forEach((it) => {
          const k = aliasToKey(it?.kind || it?.label || it?.name || it?.type || '', it?.filename || it?.fileName || it?.name || '');
          push(k, it);
        });
        return out;
      }

      if (srcVal && typeof srcVal === 'object') {
        Object.entries(srcVal).forEach(([k0, v0]) => {
          const kGuess = aliasToKey(k0, k0) || aliasToKey(v0?.label || v0?.kind || v0?.name || '', v0?.filename || v0?.fileName || v0?.name || '');
          push(kGuess, v0);
        });
        return out;
      }

      return out;
    })();

    const hasIncoming = (v) => {
      const raw = unwrapDocValue(v);
      return !!(raw && String(raw).trim());
    };

    const carpIncoming =
      docObjMerged.tesda_carpentry_certificate || docObjMerged.tesdaCarpentryCertificate || docObjMerged.carpentry_certificate || docObjMerged.carpentry;
    const elecIncoming =
      docObjMerged.tesda_electrician_certificate ||
      docObjMerged.tesdaElectricianCertificate ||
      docObjMerged.electrician_certificate ||
      docObjMerged.electrical_certificate ||
      docObjMerged.tesda_electrical_certificate ||
      docObjMerged.tesdaElectricalCertificate ||
      docObjMerged.tesda_eim_certificate ||
      docObjMerged.tesdaEimCertificate ||
      docObjMerged.eim_certificate ||
      docObjMerged.eim ||
      docObjMerged.electrical_installation_certificate ||
      docObjMerged.electricalInstallationCertificate;
    const plumIncoming =
      docObjMerged.tesda_plumbing_certificate ||
      docObjMerged.tesdaPlumbingCertificate ||
      docObjMerged.plumbing_certificate ||
      docObjMerged.plumber_certificate ||
      docObjMerged.plumbing ||
      docObjMerged.tesda_plumber_certificate ||
      docObjMerged.tesdaPlumberCertificate;
    const carwashIncoming =
      docObjMerged.tesda_carwashing_certificate ||
      docObjMerged.tesdaCarwashingCertificate ||
      docObjMerged.carwashing_certificate ||
      docObjMerged.carwash_certificate ||
      docObjMerged.tesda_car_washing_certificate ||
      docObjMerged.tesdaCarWashingCertificate ||
      docObjMerged.automotive_certificate ||
      docObjMerged.automotive ||
      docObjMerged.carwashing ||
      docObjMerged.carwash;
    const laundryIncoming =
      docObjMerged.tesda_laundry_certificate ||
      docObjMerged.tesdaLaundryCertificate ||
      docObjMerged.laundry_certificate ||
      docObjMerged.housekeeping_certificate ||
      docObjMerged.tesda_housekeeping_certificate ||
      docObjMerged.tesdaHousekeepingCertificate ||
      docObjMerged.laundry ||
      docObjMerged.housekeeping;

    await addVal('tesda_carpentry_certificate', carpIncoming, hasIncoming(carpIncoming));
    await addVal('tesda_electrician_certificate', elecIncoming, hasIncoming(elecIncoming));
    await addVal('tesda_plumbing_certificate', plumIncoming, hasIncoming(plumIncoming));
    await addVal('tesda_carwashing_certificate', carwashIncoming, hasIncoming(carwashIncoming));
    await addVal('tesda_laundry_certificate', laundryIncoming, hasIncoming(laundryIncoming));

    await addVal('tesda_carpentry_certificate', extractedCerts.tesda_carpentry_certificate || [], true);
    await addVal('tesda_electrician_certificate', extractedCerts.tesda_electrician_certificate || [], true);
    await addVal('tesda_plumbing_certificate', extractedCerts.tesda_plumbing_certificate || [], true);
    await addVal('tesda_carwashing_certificate', extractedCerts.tesda_carwashing_certificate || [], true);
    await addVal('tesda_laundry_certificate', extractedCerts.tesda_laundry_certificate || [], true);

    const setVal = async (k, v, force = false) => {
      if (!k) return;
      const isTesda = /^tesda_.*_certificate$/i.test(k);
      if (isTesda) return addVal(k, v, force);

      if (!force && docCols[k]) return;
      const raw = unwrapDocValue(v);
      if (!raw) return;

      if (/^https?:\/\//i.test(raw)) {
        docCols[k] = raw;
        return;
      }

      const du = coerceDataUrl(raw, 'image/jpeg') || (raw.startsWith('data:') ? raw : '');
      if (du && /^data:/i.test(du)) {
        docCols[k] = du;
      }
    };

    for (let i = 0; i < docsIn.length; i++) {
      const d = docsIn[i] || {};
      const key = aliasToKey(d.kind, d.filename) || aliasToKey(d.filename, d.kind);
      if (!key) continue;

      if (typeof d.url === 'string' && d.url) {
        await setVal(key, d.url, true);
        continue;
      }
      const maybeData = coerceDataUrl(d.data_url, 'image/jpeg');
      if (maybeData) await setVal(key, maybeData, true);
    }

    if (typeof metadata === 'object') {
      const m = metadata || {};
      const trySet = async (k, v) => {
        await setVal(k, v, false);
      };
      await trySet('primary_id_front', m.primary_id_front || m.primaryIdFront);
      await trySet('primary_id_back', m.primary_id_back || m.primaryIdBack);
      await trySet('secondary_id', m.secondary_id || m.secondaryId);
      await trySet('nbi_police_clearance', m.nbi_police_clearance || m.nbiPoliceClearance);
      await trySet('proof_of_address', m.proof_of_address || m.proofOfAddress);
      await trySet('medical_certificate', m.medical_certificate || m.medical_certificates || m.medicalCertificate);

      await trySet('tesda_carpentry_certificate', m.tesda_carpentry_certificate || m.tesdaCarpentryCertificate);
      await trySet(
        'tesda_electrician_certificate',
        m.tesda_electrician_certificate ||
          m.tesdaElectricianCertificate ||
          m.tesda_electrical_certificate ||
          m.tesdaElectricalCertificate
      );
      await trySet('tesda_plumbing_certificate', m.tesda_plumbing_certificate || m.tesdaPlumbingCertificate);
      await trySet('tesda_carwashing_certificate', m.tesda_carwashing_certificate || m.tesdaCarwashingCertificate);
      await trySet(
        'tesda_laundry_certificate',
        m.tesda_laundry_certificate ||
          m.tesdaLaundryCertificate ||
          m.tesda_housekeeping_certificate ||
          m.tesdaHousekeepingCertificate
      );
    }

    if (fallbackDocs) {
      Object.keys(docCols).forEach((k) => {
        if (k === 'request_group_id' || k === 'worker_id' || k === 'auth_uid' || k === 'email_address') return;
        if (!docCols[k]) docCols[k] = fallbackDocs[k] || '';
      });
    }

    await finalizeRequiredDocsUploads(request_group_id, docCols);

    try {
      await insertWorkerRequiredDocumentsSafe(docCols);
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

    try {
      const active = await hasActiveWorkerApplicationByEmail(canonicalEmail);
      if (active) return res.status(409).json({ message: 'You already have an active worker application.' });
    } catch {}

    let pendingRow;
    try {
      pendingRow = await insertPendingApplication({
        request_group_id,
        worker_id: effectiveWorkerId,
        auth_uid: effectiveAuthUid || auth_uid || metadata.auth_uid || null,
        email_address: infoRow.email_address,
        info: pendingInfo,
        details: pendingDetails,
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

    const filterServiceType = canonType(req.query.service_type || req.query.serviceType || '');
    const filterTasksRaw = req.query.service_task || req.query.serviceTask || '';
    const filterTaskList = extractTaskList(filterTasksRaw);
    const filterTaskSet = new Set(filterTaskList.map(canonTask).filter(Boolean));

    const { data: apps, error } = await supabaseAdmin
      .from('worker_application_status')
      .select('id, request_group_id, status, created_at, email_address, info, details')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = Array.isArray(apps) ? apps : [];
    if (!rows.length) return res.status(200).json({ items: [] });

    const gids = [...new Set(rows.map((r) => r.request_group_id).filter(Boolean))];

    let latestMap = {};
    let canceledSet = new Set();

    if (gids.length) {
      const { data: allStatus } = await supabaseAdmin
        .from('worker_application_status')
        .select('request_group_id,status,created_at')
        .in('request_group_id', gids)
        .order('created_at', { ascending: false });
      (allStatus || []).forEach((r) => {
        const gid = r.request_group_id;
        if (!latestMap[gid]) latestMap[gid] = String(r.status || '').toLowerCase();
      });

      const { data: canc } = await supabaseAdmin.from('worker_cancel_application').select('request_group_id').in('request_group_id', gids);
      (canc || []).forEach((r) => {
        if (r?.request_group_id) canceledSet.add(r.request_group_id);
      });
    }

    const approvedCurrentGids = gids.filter((gid) => latestMap[gid] === 'approved' && !canceledSet.has(gid));
    if (!approvedCurrentGids.length) return res.status(200).json({ items: [] });

    let infoMap = {},
      workMap = {};
    const targets = approvedCurrentGids;

    const [{ data: infos }, { data: works }] = await Promise.all([
      supabaseAdmin.from('worker_information').select('*').in('request_group_id', targets),
      supabaseAdmin.from('worker_work_information').select('*').in('request_group_id', targets)
    ]);
    (infos || []).forEach((r) => {
      if (r?.request_group_id) infoMap[r.request_group_id] = r;
    });
    (works || []).forEach((r) => {
      if (r?.request_group_id) workMap[r.request_group_id] = r;
    });

    let items = rows
      .filter((r) => approvedCurrentGids.includes(r.request_group_id))
      .map((r) => {
        const gid = r.request_group_id;
        const i = infoMap[gid] || r.info || {};
        const w = workMap[gid] || r.details || {};
        return {
          id: r.id,
          request_group_id: gid,
          email_address: r.email_address || i.email_address || w.email_address || null,
          status: 'approved',
          created_at: r.created_at,
          info: i,
          work: w
        };
      });

    if (filterServiceType || filterTaskSet.size) {
      items = items.filter((it) => {
        const w = it.work || it.details || {};
        const wTypes = Array.isArray(w.service_types) ? w.service_types : [];
        const wCanonTypes = new Set(wTypes.map(canonType).filter(Boolean));

        const wTaskList = extractTaskList(w.service_task || []);
        const wTaskSet = new Set(wTaskList.map(canonTask).filter(Boolean));

        const typeOk = filterServiceType ? wCanonTypes.has(filterServiceType) : true;
        const taskOk = filterTaskSet.size === 0 ? true : Array.from(filterTaskSet).some((t) => wTaskSet.has(t));

        return typeOk && taskOk;
      });
    }

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

function readAppUHeader(req) {
  const h = req.headers['x-app-u'];
  if (!h) return {};
  try {
    const o = JSON.parse(decodeURIComponent(h));
    const email = o.email || o.email_address || o.e || '';
    const auth_uid = o.auth_uid || o.authUid || o.au || '';
    return { email, email_address: email, auth_uid };
  } catch {
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
      .select('id, request_group_id, status, created_at, decided_at, email_address, reason_choice, reason_other, decision_reason, auth_uid, worker_id, info, details')
      .order('created_at', { ascending: false })
      .limit(200);
    if (email) q = q.ilike('email_address', email);
    if (!email && authUid) q = q.eq('auth_uid', authUid);

    const { data: statusRows } = await q;

    const rows = Array.isArray(statusRows) ? statusRows : [];

    const allGroups = [...new Set(rows.map((r) => r.request_group_id).filter(Boolean))];
    let canceledSet = new Set();
    if (allGroups.length) {
      try {
        const { data: canc } = await supabaseAdmin.from('worker_cancel_application').select('request_group_id').in('request_group_id', allGroups);
        (canc || []).forEach((r) => {
          if (r?.request_group_id) canceledSet.add(r.request_group_id);
        });
      } catch {}
    }

    const isCancelledStatus = (r) => ['cancelled', 'canceled'].includes(String(r.status || '').toLowerCase());
    const isExpired = (r) => String(r.status || '').toLowerCase() === 'expired';
    const isCurrent = (r) => ['pending', 'approved', 'declined'].includes(String(r.status || '').toLowerCase());
    const isActive = (r) => ['pending', 'approved'].includes(String(r.status || '').toLowerCase());

    const isCanceledByTable = (r) => {
      const gid = String(r?.request_group_id || '').trim();
      return gid ? canceledSet.has(gid) : false;
    };

    let base = rows;

    if (scope === 'cancelled') base = rows.filter((r) => isCancelledStatus(r) || isCanceledByTable(r));
    else if (scope === 'expired') base = rows.filter((r) => isExpired(r) && !isCanceledByTable(r));
    else if (scope === 'active') base = rows.filter((r) => isActive(r) && !isCanceledByTable(r));
    else base = rows.filter((r) => isCurrent(r) && !isCanceledByTable(r));

    let targetGroups = base.map((r) => r.request_group_id).filter(Boolean);
    if (groupIdFilter) targetGroups = targetGroups.includes(groupIdFilter) ? [groupIdFilter] : [];

    let infoMap = {},
      detailsMap = {},
      docsMap = {};
    if (targetGroups.length) {
      try {
        const { data: infos } = await supabaseAdmin
          .from('worker_information')
          .select(
            'request_group_id, worker_id, auth_uid, email_address, first_name, last_name, contact_number, street, barangay, date_of_birth, age, profile_picture_url, profile_picture_name'
          )
          .in('request_group_id', targetGroups);
        (infos || []).forEach((r) => {
          if (r?.request_group_id) infoMap[r.request_group_id] = r;
        });
      } catch {}
      try {
        const { data: details } = await supabaseAdmin
          .from('worker_work_information')
          .select('request_group_id, auth_uid, service_types, service_task, years_experience, tools_provided, work_description, barangay, street, worker_id')
          .in('request_group_id', targetGroups);
        (details || []).forEach((r) => {
          if (r?.request_group_id) detailsMap[r.request_group_id] = r;
        });
      } catch {}
      try {
        const { data: docs } = await supabaseAdmin
          .from('worker_required_documents')
          .select(
            'request_group_id, primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, tesda_carpentry_certificate, tesda_electrician_certificate, tesda_plumbing_certificate, tesda_carwashing_certificate, tesda_laundry_certificate'
          )
          .in('request_group_id', targetGroups);
        (docs || []).forEach((r) => {
          if (r?.request_group_id) docsMap[r.request_group_id] = r;
        });
      } catch {}
    }

    const items = (rows || [])
      .filter((r) => targetGroups.includes(r.request_group_id))
      .map((r) => {
        const gid = r.request_group_id;
        const mergedInfo = infoMap[gid] || r.info || {};
        const mergedDetails = detailsMap[gid] || r.details || {};
        const mergedDocs = docsMap[gid] || null;

        const st = String(r.status || '').toLowerCase();
        const finalStatus = canceledSet.has(String(gid || '')) && !['cancelled', 'canceled'].includes(st) ? 'cancelled' : r.status;

        return { ...r, status: finalStatus, info: mergedInfo, details: mergedDetails, required_documents: mergedDocs };
      })
      .slice(0, limit);

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
    const { data: row, error } = await supabaseAdmin.from('worker_application_status').select('id, status, request_group_id').eq('id', raw).maybeSingle();
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
    const status_id = String(body.application_id || body.id || '').trim();
    const request_group_id_in = String(body.request_group_id || '').trim();
    const reason_choice = String(body.reason_choice || '').trim() || null;
    const reason_other = String(body.reason_other || '').trim() || null;
    const worker_id = body.worker_id ? Number(body.worker_id) : null;
    const email_address = String(body.email_address || '').trim() || null;

    if (!reason_choice && !reason_other) return res.status(400).json({ message: 'Provide a reason' });

    let found = null;
    if (status_id) {
      const { data } = await supabaseAdmin
        .from('worker_application_status')
        .select('id, status, email_address, request_group_id, auth_uid, worker_id')
        .eq('id', status_id)
        .maybeSingle();
      if (data) found = data;
    }
    if (!found && request_group_id_in) {
      const { data } = await supabaseAdmin
        .from('worker_application_status')
        .select('id, status, email_address, request_group_id, auth_uid, worker_id, created_at')
        .eq('request_group_id', request_group_id_in)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) found = data;
    }
    if (!found) return res.status(404).json({ message: 'Application not found' });

    const canceled_at = new Date().toISOString();

    await supabaseAdmin.from('worker_cancel_application').insert([
      {
        request_group_id: found.request_group_id || request_group_id_in || null,
        worker_id: worker_id || found.worker_id || null,
        auth_uid: found.auth_uid || null,
        email_address: email_address || found.email_address || null,
        reason_choice,
        reason_other,
        canceled_at
      }
    ]);

    await supabaseAdmin.from('worker_application_status').update({ status: 'cancelled', reason_choice, reason_other, decided_at: canceled_at }).eq('id', found.id);

    return res.status(201).json({ message: 'Cancellation recorded', canceled_at, request_group_id: found.request_group_id, id: found.id });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.getByGroupFull = async (req, res) => {
  try {
    const gid = String(req.params.id || '').trim();
    if (!gid) return res.status(400).json({ message: 'Missing id' });

    const [{ data: info }, { data: details }, { data: docs }, { data: statusRow }] = await Promise.all([
      supabaseAdmin.from('worker_information').select('*').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('worker_work_information').select('*').eq('request_group_id', gid).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin
        .from('worker_required_documents')
        .select(
          'request_group_id, primary_id_front, primary_id_back, secondary_id, nbi_police_clearance, proof_of_address, medical_certificate, tesda_carpentry_certificate, tesda_electrician_certificate, tesda_plumbing_certificate, tesda_carwashing_certificate, tesda_laundry_certificate'
        )
        .eq('request_group_id', gid)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('worker_application_status')
        .select('id, request_group_id, status, email_address, created_at, auth_uid')
        .eq('request_group_id', gid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (!statusRow && !info && !details) return res.status(404).json({ message: 'Application not found' });

    return res.status(200).json({
      request_group_id: gid,
      status: statusRow || null,
      info: info || null,
      details: details || null,
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

      const profileAnyStr = typeof profileAny === 'string' ? profileAny.trim() : '';

      if (profileAnyStr && !isFallbackProfileUrl(profileAnyStr)) {
        if (/^data:/i.test(profileAnyStr)) {
          try {
            const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', profileAnyStr, `${gid}-profile`);
            profile_picture_url = up?.url || profile_picture_url || null;
            profile_picture_name = up?.name || profile_picture_name || null;
          } catch {
            const ext = extFromDataUrl(profileAnyStr);
            profile_picture_url = profileAnyStr;
            profile_picture_name = profile_picture_name || `profile-${Date.now()}.${ext}`;
          }
        } else if (/^https?:\/\//i.test(profileAnyStr)) {
          if (!/\/fallback-profile\.png$/i.test(profileAnyStr)) profile_picture_url = profileAnyStr;
        } else {
          const coerced = coerceDataUrl(profileAnyStr, 'image/jpeg');
          if (coerced) {
            try {
              const up = await safeUploadDataUrl(process.env.SUPABASE_BUCKET_WORKER_ATTACHMENTS || 'wa-attachments', coerced, `${gid}-profile`);
              profile_picture_url = up?.url || profile_picture_url || null;
              profile_picture_name = up?.name || profile_picture_name || null;
            } catch {
              const ext = extFromDataUrl(coerced);
              profile_picture_url = coerced;
              profile_picture_name = profile_picture_name || `profile-${Date.now()}.${ext}`;
            }
          }
        }
      }

      if (!profile_picture_url || isFallbackProfileUrl(profile_picture_url)) {
        profile_picture_url = fallbackProfile.profile_picture_url;
        profile_picture_name = fallbackProfile.profile_picture_name;
      }

      const base = {
        request_group_id: gid,
        worker_id: worker_id || null,
        auth_uid: auth_uid || null,
        email_address: email || info.email_address || existing?.email_address || null,
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

      const { data: existId } = await supabaseAdmin.from('worker_information').select('id').eq('request_group_id', gid).limit(1).maybeSingle();
      if (existId?.id) await supabaseAdmin.from('worker_information').update(base).eq('id', existId.id);
      else await insertWorkerInformation(base);

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

      let incomingTypes = Array.isArray(d.service_types) ? d.service_types : d.service_type ? [d.service_type] : [];
      let incomingTask = d.service_task;

      if (Array.isArray(incomingTask)) {
        incomingTask = incomingTask;
      } else if (incomingTypes.length && typeof incomingTask === 'string') {
        incomingTask = [{ category: incomingTypes[0], tasks: [incomingTask] }];
      } else if (!incomingTask && incomingTypes.length) {
        incomingTask = [{ category: incomingTypes[0], tasks: [] }];
      }

      const service_types = incomingTypes && incomingTypes.length ? incomingTypes : existing?.service_types || [];
      const service_task = Array.isArray(incomingTask) && incomingTask.length ? incomingTask : existing?.service_task || [];

      const years_experience =
        d.years_experience !== undefined && d.years_experience !== null && String(d.years_experience) === ''
          ? null
          : d.years_experience !== undefined && d.years_experience !== null
          ? d.years_experience
          : existing?.years_experience ?? null;

      const tools_in = d.tools_provided;
      const tools_provided =
        tools_in !== undefined && tools_in !== null && String(tools_in) !== ''
          ? ['yes', 'y', 'true', 't', '1'].includes(String(tools_in).trim().toLowerCase())
            ? 'Yes'
            : 'No'
          : existing?.tools_provided ?? null;

      const work_description =
        d.work_description !== undefined && String(d.work_description).trim() !== ''
          ? d.work_description
          : existing?.work_description ?? null;

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

      const { data: existId } = await supabaseAdmin.from('worker_work_information').select('id').eq('request_group_id', gid).limit(1).maybeSingle();
      if (existId?.id) await supabaseAdmin.from('worker_work_information').update(row).eq('id', existId.id);
      else await insertWorkerWorkInformation(row);
      return row;
    };

    const upsertDocs = async () => {
      const docs = payload.required_documents || payload.documents || null;
      if (!docs) return null;

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
        tesda_carpentry_certificate: '',
        tesda_electrician_certificate: '',
        tesda_plumbing_certificate: '',
        tesda_carwashing_certificate: '',
        tesda_laundry_certificate: ''
      };

      const setUrl = async (k, v) => {
        if (!v) return;

        const isTesda = /^tesda_.*_certificate$/i.test(k);
        const list = parseStoredMulti(v);
        if (!list.length) return;

        if (!isTesda) {
          const raw = unwrapDocValue(list[0]);
          if (!raw) return;
          if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) shape[k] = raw;
          else if (typeof raw === 'string' && /^data:/i.test(raw)) shape[k] = raw;
          else {
            const du = coerceDataUrl(raw, 'image/jpeg');
            if (du && /^data:/i.test(du)) shape[k] = du;
          }
          return;
        }

        const existing = parseStoredMulti(shape[k]);
        const merged = storeMultiValue(existing.concat(list));
        if (merged) shape[k] = merged;
      };

      await setUrl('primary_id_front', docs.primary_id_front || docs.front || docs.primaryFront);
      await setUrl('primary_id_back', docs.primary_id_back || docs.back || docs.primaryBack);
      await setUrl('secondary_id', docs.secondary_id || docs.secondary || docs.alt);
      await setUrl('nbi_police_clearance', docs.nbi_police_clearance || docs.nbi || docs.police);
      await setUrl('proof_of_address', docs.proof_of_address || docs.address || docs.billing);
      await setUrl('medical_certificate', docs.medical_certificate || docs.medical);

      const certParsed = tryParseJsonObject(docs.certificates || docs.certs) || null;

      await setUrl(
        'tesda_carpentry_certificate',
        docs.tesda_carpentry_certificate ||
          docs.tesdaCarpentryCertificate ||
          docs.carpentry_certificate ||
          docs.carpentry ||
          certParsed?.tesda_carpentry_certificate ||
          certParsed?.Carpenter
      );
      await setUrl(
        'tesda_electrician_certificate',
        docs.tesda_electrician_certificate ||
          docs.tesdaElectricianCertificate ||
          docs.electrician_certificate ||
          docs.electrical_certificate ||
          docs.electrician ||
          docs.tesda_electrician ||
          docs.tesda_electrical_certificate ||
          docs.tesdaElectricalCertificate ||
          docs.eim_certificate ||
          docs.tesda_eim_certificate ||
          certParsed?.tesda_electrician_certificate ||
          certParsed?.Electrician
      );
      await setUrl(
        'tesda_plumbing_certificate',
        docs.tesda_plumbing_certificate ||
          docs.tesdaPlumbingCertificate ||
          docs.plumbing_certificate ||
          docs.plumbing ||
          docs.tesda_plumbing ||
          docs.plumber_certificate ||
          certParsed?.tesda_plumbing_certificate ||
          certParsed?.Plumber
      );
      await setUrl(
        'tesda_carwashing_certificate',
        docs.tesda_carwashing_certificate ||
          docs.tesdaCarwashingCertificate ||
          docs.carwashing_certificate ||
          docs.carwash_certificate ||
          docs.automotive_certificate ||
          docs.carwashing ||
          docs.tesda_carwashing ||
          docs.tesda_car_washing_certificate ||
          certParsed?.tesda_carwashing_certificate ||
          certParsed?.Carwasher
      );
      await setUrl(
        'tesda_laundry_certificate',
        docs.tesda_laundry_certificate ||
          docs.tesdaLaundryCertificate ||
          docs.laundry_certificate ||
          docs.housekeeping_certificate ||
          docs.laundry ||
          docs.tesda_laundry ||
          docs.tesda_housekeeping_certificate ||
          certParsed?.tesda_laundry_certificate ||
          certParsed?.Laundry
      );

      await finalizeRequiredDocsUploads(gid, shape);

      const { data: existId } = await supabaseAdmin.from('worker_required_documents').select('id').eq('request_group_id', gid).limit(1).maybeSingle();
      if (existId?.id) await supabaseAdmin.from('worker_required_documents').update(shape).eq('id', existId.id);
      else await insertWorkerRequiredDocumentsSafe(shape);
      return shape;
    };

    const [infoRes, detailsRes, docsRes] = await Promise.all([upsertInfo(), upsertDetails(), upsertDocs()]);

    if (statusRow?.id) {
      await supabaseAdmin
        .from('worker_application_status')
        .update({
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
          }
        })
        .eq('id', statusRow.id);
    }

    return res.status(200).json({ message: 'Updated', request_group_id: gid });
  } catch (e) {
    return res.status(500).json({ message: friendlyError(e) });
  }
};

exports.cancelWorkerApplication = exports.cancel;
