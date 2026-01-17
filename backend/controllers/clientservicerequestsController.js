const {
  uploadDataUrlToBucket,
  insertClientInformation,
  insertServiceRequestDetails,
  insertClientServiceRate,
  updateClientServiceRate,
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

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v);
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function toNonNegNumber(v, fallback = 0) {
  const n = toNumberOrNull(v);
  if (n === null) return fallback;
  return n >= 0 ? n : fallback;
}

function pesoPH(v) {
  const n = toNonNegNumber(v, 0);
  return `₱${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
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

function pickRateForResponse(rateRow) {
  const r = rateRow && typeof rateRow === 'object' ? rateRow : {};
  return {
    units: r.units ?? null,
    unit_kg: r.unit_kg ?? null,
    sq_m: r.sq_m ?? r.sqm ?? null,
    pieces: r.pieces ?? null,
    payment_method: r.payment_method ?? null,
    preferred_time_fee_php: r.preferred_time_fee_php ?? null,
    extra_workers_fee_php: r.extra_workers_fee_php ?? null,
    total_rate_php: r.total_rate_php ?? null
  };
}

const NIGHT_TIME_FEE = 200;
const INCLUDED_WORKERS = 2;
const EXTRA_WORKER_FEE = 150;

const serviceTaskRates = {
  Carpentry: {
    'General Carpentry': 1000,
    'Furniture Repair': 900,
    'Wood Polishing': 1200,
    'Door & Window Fitting': 1500,
    'Custom Furniture Design': 2000,
    'Modular Kitchen Installation': 6000,
    'Flooring & Decking': 3500,
    'Cabinet & Wardrobe Fixing': 1200,
    'Wall Paneling & False Ceiling': 4000,
    'Wood Restoration & Refinishing': 2500
  },
  'Electrical Works': {
    'Wiring Repair': 1000,
    'Appliance Installation': 800,
    'Lighting Fixtures': 700,
    'Circuit Breaker & Fuse Repair': 1200,
    'CCTV & Security System Setup': 2500,
    'Fan & Exhaust Installation': 700,
    'Inverter & Battery Setup': 1800,
    'Switchboard & Socket Repair': 800,
    'Electrical Safety Inspection': 1500,
    'Smart Home Automation': 3000
  },
  Plumbing: {
    'Leak Fixing': 900,
    'Pipe Installation': 1500,
    'Bathroom Fittings': 1200,
    'Drain Cleaning & Unclogging': 1800,
    'Water Tank Installation': 2500,
    'Gas Pipeline Installation': 3500,
    'Septic Tank & Sewer Repair': 4500,
    'Water Heater Installation': 2000,
    'Toilet & Sink Repair': 1000,
    'Kitchen Plumbing Solutions': 1800
  },
  'Car Washing': {
    'Exterior Wash': 350,
    'Interior Cleaning': 700,
    'Wax & Polish': 1200,
    'Underbody Cleaning': 500,
    'Engine Bay Cleaning': 900,
    'Headlight Restoration': 1500,
    'Ceramic Coating': 12000,
    'Tire & Rim Cleaning': 400,
    'Vacuum & Odor Removal': 700,
    'Paint Protection Film Application': 15000
  },
  Laundry: {
    'Dry Cleaning': '₱130/kg',
    Ironing: '₱100/kg',
    'Wash & Fold': '₱50/kg',
    'Steam Pressing': '₱130/kg',
    'Stain Removal Treatment': '₱180/kg',
    'Curtains & Upholstery Cleaning': '₱400–₱800',
    'Delicate Fabric Care': '₱90/kg',
    'Shoe & Leather Cleaning': '₱250/pair',
    'Express Same-Day Laundry': '₱70/kg',
    'Eco-Friendly Washing': '₱60/kg'
  }
};

function moneyNumberFromAny(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/,/g, '');
  const nums = s.match(/(\d+(?:\.\d+)?)/g);
  if (!nums || !nums.length) return null;
  const ns = nums.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!ns.length) return null;
  if (ns.length >= 2 && /[–-]/.test(s)) {
    const a = ns[0];
    const b = ns[1];
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  return ns[0];
}

function isLaundryRatePerKg(serviceType, serviceTask) {
  if (String(serviceType || '').toLowerCase() !== 'laundry') return false;
  const raw = serviceTaskRates?.[serviceType]?.[serviceTask];
  const s = String(raw ?? '').toLowerCase();
  return s.includes('/kg') || s.includes('per kg');
}

function shouldShowPerUnit(type) {
  return type === 'Car Washing' || type === 'Plumbing' || type === 'Carpentry' || type === 'Electrical Works';
}

function isNightTimeForFee(t) {
  if (!t) return false;
  const [hh, mm] = String(t).split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
  if (hh >= 20) return true;
  if (hh >= 0 && hh <= 5) return true;
  if (hh === 6 && (mm === 0 || mm === 30)) return true;
  return false;
}

function computeRateNumbers(details, rate) {
  const service_type = details?.service_type || '';
  const service_task = details?.service_task || '';
  const preferred_time = details?.preferred_time || '';
  const workers_needed = toIntOrNull(details?.workers_needed ?? details?.workers_need ?? null);

  const raw = serviceTaskRates?.[service_type]?.[service_task];
  const baseRate = moneyNumberFromAny(raw);

  const units = toIntOrNull(rate?.units ?? null);
  const unit_kg = toNumberOrNull(rate?.unit_kg ?? null);
  const sq_m = toNumberOrNull(rate?.sq_m ?? rate?.sqm ?? null);
  const pieces = toIntOrNull(rate?.pieces ?? null);

  let qty = null;
  if (sq_m !== null && sq_m > 0) qty = sq_m;
  else if (pieces !== null && pieces > 0) qty = pieces;
  else if (String(service_type || '').toLowerCase() === 'laundry') {
    const kg = toNumberOrNull(unit_kg ?? units);
    qty = kg !== null && kg > 0 ? kg : null;
  } else {
    qty = units !== null && units > 0 ? units : null;
  }

  let baseAmount = null;
  if (Number.isFinite(baseRate) && baseRate > 0) {
    if (String(service_type || '').toLowerCase() === 'laundry') {
      if (isLaundryRatePerKg(service_type, service_task)) {
        if (qty !== null) baseAmount = baseRate * qty;
      } else {
        baseAmount = baseRate;
      }
    } else if (shouldShowPerUnit(service_type)) {
      if (qty !== null) baseAmount = baseRate * qty;
    } else {
      baseAmount = baseRate;
    }
  }

  const preferredTimeFee = preferred_time && isNightTimeForFee(preferred_time) ? NIGHT_TIME_FEE : 0;
  const extraWorkers = workers_needed !== null ? Math.max(0, workers_needed - INCLUDED_WORKERS) : 0;
  const extraWorkersFee = extraWorkers * EXTRA_WORKER_FEE;

  let total = null;
  if (baseAmount !== null && Number.isFinite(baseAmount)) total = baseAmount + preferredTimeFee + extraWorkersFee;

  return {
    units: units ?? null,
    unit_kg: unit_kg ?? null,
    sq_m: sq_m ?? null,
    pieces: pieces ?? null,
    preferredTimeFee,
    extraWorkersFee,
    total
  };
}

function normalizePesoPhpMaybe(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim();
  if (!s) return null;
  if (s.startsWith('₱')) return s;
  const n = moneyNumberFromAny(s);
  if (n === null) return null;
  return pesoPH(n);
}

function normalizePaymentMethod(raw, fallback) {
  const s = String(raw ?? '').trim();
  if (!s) return fallback ?? null;
  const low = s.toLowerCase();
  if (low === 'gcash' || low.includes('gcash') || low.includes('maya') || low === 'paymaya') return 'GCash';
  return 'Cash';
}

function normalizeUnitKind(service_task, quantity_unit) {
  const q = String(quantity_unit ?? '').trim().toLowerCase();
  if (q) {
    if (q === 'sq.m' || q === 'sqm' || q === 'sq m' || q === 'square meter' || q === 'square meters' || q === 'm2') return 'sq_m';
    if (q === 'piece' || q === 'pieces' || q === 'pc' || q === 'pcs' || q === 'per piece') return 'pieces';
  }
  const t = String(service_task ?? '').toLowerCase();
  if (/(sq\.?\s*m|sqm|m2|square\s*meter)/i.test(t)) return 'sq_m';
  if (/(per\s*piece|pieces?|pcs?\b)/i.test(t)) return 'pieces';
  return '';
}

async function upsertClientServiceRateByGroup(gid, fields, seedBase) {
  let updated = null;
  try {
    updated = await updateClientServiceRate(gid, fields);
  } catch {}
  if (updated) return updated;

  const seed = {
    request_group_id: gid,
    client_id: seedBase?.client_id ?? null,
    auth_uid: seedBase?.auth_uid ?? null,
    email_address: seedBase?.email_address ?? null,
    ...fields
  };
  try {
    await insertClientServiceRate(seed);
  } catch {}
  const combined = await getCombinedByGroupId(gid);
  return combined?.rate || null;
}

exports.requestStatusIdByGroup = async (req, res) => {
  try {
    const gid = String(req.params.groupId || '').trim();
    if (!gid) return res.status(400).json({ message: 'groupId is required' });

    const { data, error } = await supabaseAdmin
      .from('client_service_request_status')
      .select('id, request_group_id, created_at')
      .eq('request_group_id', gid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      id: data?.id || null,
      request_group_id: data?.request_group_id || gid
    });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.listOpen = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const { data: rows, error } = await supabaseAdmin
      .from('client_service_request_status')
      .select('id,request_group_id,status,created_at,details')
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
          id: r.id,
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
          },
          rate: pickRateForResponse(row.rate)
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

    const rateSrc = src.client_service_rate || src.clientServiceRate || src.rate || metadata.client_service_rate || metadata.rate || {};
    const paymentMethod = String(
      pick(
        { src, rateSrc, metadata },
        ['src.payment_method', 'src.paymentMethod', 'rateSrc.payment_method', 'rateSrc.paymentMethod', 'metadata.payment_method', 'metadata.paymentMethod'],
        ''
      ) || ''
    )
      .trim()
      .replace(/\s+/g, ' ');

    const unitsVal = (() => {
      const v = pick({ src, rateSrc, metadata }, ['rateSrc.units', 'rateSrc.unit', 'src.units', 'src.rate_units', 'metadata.rate_units', 'metadata.units', 'metadata.unit'], null);
      const n = toIntOrNull(v);
      return n ?? 1;
    })();

    const unitKgVal = (() => {
      const v = pick({ src, rateSrc, metadata }, ['rateSrc.unit_kg', 'rateSrc.unitKg', 'metadata.unit_kg', 'metadata.unitKg'], null);
      const n = toNumberOrNull(v);
      return n === null ? null : n >= 0 ? n : null;
    })();

    const quantityUnitRaw = pick({ rateSrc, metadata, src }, ['rateSrc.quantity_unit', 'rateSrc.quantityUnit', 'metadata.quantity_unit', 'metadata.quantityUnit'], '');
    const unitKind = normalizeUnitKind(detailsRow.service_task, quantityUnitRaw);

    const sqMVal = (() => {
      const v = pick({ rateSrc, metadata, src }, ['rateSrc.sq_m', 'rateSrc.sqm', 'rateSrc.sqM', 'metadata.sq_m', 'metadata.sqm', 'src.sq_m', 'src.sqm'], null);
      const n = toNumberOrNull(v);
      if (n !== null && n > 0) return n;
      if (unitKind === 'sq_m') return toNumberOrNull(unitsVal);
      return null;
    })();

    const piecesVal = (() => {
      const v = pick({ rateSrc, metadata, src }, ['rateSrc.pieces', 'rateSrc.piece', 'rateSrc.pcs', 'metadata.pieces', 'metadata.pcs', 'src.pieces', 'src.pcs'], null);
      const n = toIntOrNull(v);
      if (n !== null && n > 0) return n;
      if (unitKind === 'pieces') return toIntOrNull(unitsVal);
      return null;
    })();

    const preferredTimeFeeVal = toNonNegNumber(
      pick(
        { src, rateSrc, metadata },
        ['rateSrc.preferred_time_fee', 'rateSrc.preferredTimeFee', 'src.preferred_time_fee', 'metadata.preferred_time_fee', 'metadata.preferredTimeFee'],
        0
      ),
      0
    );

    const extraWorkersFeeVal = toNonNegNumber(
      pick(
        { src, rateSrc, metadata },
        ['rateSrc.extra_workers_fee', 'rateSrc.extraWorkersFee', 'src.extra_workers_fee', 'metadata.extra_workers_fee', 'metadata.extraWorkersFee'],
        0
      ),
      0
    );

    const totalRateVal = toNonNegNumber(
      pick(
        { src, rateSrc, metadata },
        ['rateSrc.total_rate', 'rateSrc.totalRate', 'rateSrc.total', 'src.total_rate', 'metadata.total_rate', 'metadata.totalRate', 'metadata.total'],
        0
      ),
      0
    );

    const rateRow = {
      request_group_id,
      client_id: effectiveClientId,
      auth_uid: infoRow.auth_uid || effectiveAuthUid || auth_uid || null,
      email_address: infoRow.email_address,
      units: unitsVal,
      unit_kg: unitKgVal,
      sq_m: sqMVal,
      pieces: piecesVal,
      payment_method: paymentMethod || null,
      preferred_time_fee_php: pesoPH(preferredTimeFeeVal),
      extra_workers_fee_php: pesoPH(extraWorkersFeeVal),
      total_rate_php: pesoPH(totalRateVal)
    };

    try {
      await insertClientServiceRate(rateRow);
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
        rate: {
          units: unitsVal,
          unit_kg: unitKgVal,
          sq_m: sqMVal,
          pieces: piecesVal,
          payment_method: rateRow.payment_method,
          preferred_time_fee_php: rateRow.preferred_time_fee_php,
          extra_workers_fee_php: rateRow.extra_workers_fee_php,
          total_rate_php: rateRow.total_rate_php
        },
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
        let rate = {};
        const combined = await getCombinedByGroupId(it.request_group_id);
        if (combined?.rate) rate = pickRateForResponse(combined.rate);

        if (!info.profile_picture_url || info.profile_picture_url === '') {
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
          details: d,
          rate
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
    let statusIdMap = {};
    if (targetGroups.length) {
      const { data: pend } = await supabaseAdmin
        .from('client_service_request_status')
        .select('id,request_group_id,status,created_at,details')
        .in('request_group_id', targetGroups);
      (Array.isArray(pend) ? pend : []).forEach((r) => {
        const gid = r.request_group_id;
        if (!gid) return;
        statusMap[gid] = String(r.status || 'pending').toLowerCase();
        statusIdMap[gid] = r.id || null;
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
          request_group_id: gid,
          client_service_request_status_id: statusIdMap[gid] || null,
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
          },
          rate: pickRateForResponse(row.rate)
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

    let statusId = null;
    try {
      const { data } = await supabaseAdmin
        .from('client_service_request_status')
        .select('id, request_group_id, created_at')
        .eq('request_group_id', gid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      statusId = data?.id || null;
    } catch {}

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
    row.rate = pickRateForResponse(row.rate);

    return res.status(200).json({
      ...row,
      client_service_request_status_id: statusId
    });
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

    const incomingRate = src.rate || src.client_service_rate || src.clientServiceRate || metadata.rate || metadata.client_service_rate || {};
    const unitsIncoming = pick({ incomingRate }, ['incomingRate.units', 'incomingRate.unit', 'incomingRate.rate_units'], undefined);
    const unitKgIncoming = pick({ incomingRate }, ['incomingRate.unit_kg', 'incomingRate.unitKg'], undefined);
    const sqMIncoming = pick({ incomingRate }, ['incomingRate.sq_m', 'incomingRate.sqm', 'incomingRate.sqM'], undefined);
    const piecesIncoming = pick({ incomingRate }, ['incomingRate.pieces', 'incomingRate.pcs', 'incomingRate.piece'], undefined);

    const unitsFinal = unitsIncoming !== undefined ? toIntOrNull(unitsIncoming) : (current.rate?.units ?? null);
    const unitKgFinal = unitKgIncoming !== undefined ? toNumberOrNull(unitKgIncoming) : (current.rate?.unit_kg ?? null);
    const sqMFinal = sqMIncoming !== undefined ? toNumberOrNull(sqMIncoming) : (current.rate?.sq_m ?? current.rate?.sqm ?? null);
    const piecesFinal = piecesIncoming !== undefined ? toIntOrNull(piecesIncoming) : (current.rate?.pieces ?? null);

    const pmRaw =
      pick({ incomingRate, src }, ['incomingRate.payment_method', 'incomingRate.paymentMethod', 'src.payment_method', 'src.paymentMethod'], undefined);
    const payment_method = normalizePaymentMethod(pmRaw, current.rate?.payment_method ?? null);

    const computedNums = computeRateNumbers(newDetails, { units: unitsFinal, unit_kg: unitKgFinal, sq_m: sqMFinal, pieces: piecesFinal });

    const ptFeeNumIn =
      pick({ incomingRate }, ['incomingRate.preferred_time_fee', 'incomingRate.preferredTimeFee'], undefined);
    const exFeeNumIn =
      pick({ incomingRate }, ['incomingRate.extra_workers_fee', 'incomingRate.extraWorkersFee'], undefined);
    const totalNumIn =
      pick({ incomingRate }, ['incomingRate.total_rate', 'incomingRate.totalRate', 'incomingRate.total'], undefined);

    const ptFeePhpIn =
      pick({ incomingRate }, ['incomingRate.preferred_time_fee_php', 'incomingRate.preferredTimeFeePhp'], undefined);
    const exFeePhpIn =
      pick({ incomingRate }, ['incomingRate.extra_workers_fee_php', 'incomingRate.extraWorkersFeePhp'], undefined);
    const totalPhpIn =
      pick({ incomingRate }, ['incomingRate.total_rate_php', 'incomingRate.totalRatePhp'], undefined);

    const preferredTimeFeeNum = computedNums.total !== null ? computedNums.preferredTimeFee : toNonNegNumber(ptFeeNumIn, 0);
    const extraWorkersFeeNum = computedNums.total !== null ? computedNums.extraWorkersFee : toNonNegNumber(exFeeNumIn, 0);

    let totalNum = null;
    if (computedNums.total !== null) totalNum = computedNums.total;
    else {
      const t = toNumberOrNull(totalNumIn);
      if (t !== null && t >= 0) totalNum = t;
    }

    const preferred_time_fee_php =
      computedNums.total !== null ? pesoPH(preferredTimeFeeNum) : (normalizePesoPhpMaybe(ptFeePhpIn) ?? (preferredTimeFeeNum ? pesoPH(preferredTimeFeeNum) : pesoPH(0)));

    const extra_workers_fee_php =
      computedNums.total !== null ? pesoPH(extraWorkersFeeNum) : (normalizePesoPhpMaybe(exFeePhpIn) ?? (extraWorkersFeeNum ? pesoPH(extraWorkersFeeNum) : pesoPH(0)));

    const total_rate_php =
      computedNums.total !== null
        ? pesoPH(totalNum)
        : (normalizePesoPhpMaybe(totalPhpIn) ?? (totalNum !== null ? pesoPH(totalNum) : (current.rate?.total_rate_php ?? null)));

    const rateFields = {
      units: unitsFinal ?? null,
      unit_kg: unitKgFinal ?? null,
      sq_m: sqMFinal ?? null,
      pieces: piecesFinal ?? null,
      payment_method: payment_method ?? null,
      preferred_time_fee_php: preferred_time_fee_php ?? null,
      extra_workers_fee_php: extra_workers_fee_php ?? null,
      total_rate_php: total_rate_php ?? null
    };

    const rateSaved = await upsertClientServiceRateByGroup(gid, rateFields, {
      client_id: current.info?.client_id ?? null,
      auth_uid: current.info?.auth_uid ?? null,
      email_address: current.info?.email_address ?? null
    });

    const rateForStatus = pickRateForResponse(rateSaved || rateFields);

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
        rate: rateForStatus
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
    updated.rate = pickRateForResponse(updated.rate);

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};

exports.updatePaymentMethodByGroup = async (req, res) => {
  try {
    const gid = String(req.params.groupId || '').trim();
    if (!gid) return res.status(400).json({ message: 'groupId is required' });

    const src = req.body || {};
    const raw = String(src.payment_method ?? src.paymentMethod ?? '').trim();
    const low = raw.toLowerCase();
    const payment_method = low === 'gcash' || low.includes('gcash') || low.includes('maya') || low === 'paymaya' ? 'GCash' : 'Cash';

    const current = await getCombinedByGroupId(gid);
    if (!current) return res.status(404).json({ message: 'Not found' });

    let savedRate = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('client_service_rate')
        .update({ payment_method })
        .eq('request_group_id', gid)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      savedRate = data || null;
    } catch (e) {
      return res.status(400).json({ message: friendlyError(e) });
    }

    if (!savedRate) {
      const seed = {
        request_group_id: gid,
        client_id: current.info?.client_id ?? src.client_id ?? null,
        auth_uid: current.info?.auth_uid ?? src.auth_uid ?? null,
        email_address: current.info?.email_address ?? src.email_address ?? null,
        units: current.rate?.units ?? 1,
        unit_kg: current.rate?.unit_kg ?? null,
        sq_m: current.rate?.sq_m ?? current.rate?.sqm ?? null,
        pieces: current.rate?.pieces ?? null,
        payment_method: payment_method,
        preferred_time_fee_php: current.rate?.preferred_time_fee_php ?? null,
        extra_workers_fee_php: current.rate?.extra_workers_fee_php ?? null,
        total_rate_php: current.rate?.total_rate_php ?? null
      };
      try {
        await insertClientServiceRate(seed);
      } catch (e) {
        return res.status(400).json({ message: friendlyError(e) });
      }
    }

    const refreshed = await getCombinedByGroupId(gid);
    const rateClean = pickRateForResponse(refreshed?.rate || {});
    rateClean.payment_method = payment_method;

    try {
      await supabaseAdmin
        .from('client_service_request_status')
        .update({ rate: rateClean })
        .eq('request_group_id', gid);
    } catch {}

    return res.status(200).json({
      ...(refreshed || {}),
      payment_method,
      rate: rateClean
    });
  } catch (err) {
    return res.status(500).json({ message: friendlyError(err) });
  }
};
