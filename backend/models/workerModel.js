const { supabase, supabaseAdmin } = require("../supabaseClient");

function stripTrailingSlash(p) { return p.endsWith("/") ? p.slice(0, -1) : p; }
function normalizeFacebook(url) { try { const raw=String(url).trim(); const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw; const u=new URL(src); let host=u.hostname.toLowerCase(); if(host==="m.facebook.com"||host==="www.facebook.com"||host==="fb.com"||host==="www.fb.com") host="facebook.com"; const isId=u.pathname==="/profile.php"&&u.searchParams.has("id"); if(isId) return `https://${host}/profile.php?id=${u.searchParams.get("id")}`; const seg=u.pathname.split("/").filter(Boolean)[0]||""; if(!seg) return `https://${host}`; return `https://${host}/${stripTrailingSlash(seg)}` } catch { return String(url||"").trim() } }
function normalizeInstagram(url) { try { const raw=String(url).trim(); const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw; const u=new URL(src); let host=u.hostname.toLowerCase(); if(host==="www.instagram.com"||host==="m.instagram.com") host="instagram.com"; const seg=u.pathname.split("/").filter(Boolean)[0]||""; if(!seg) return `https://${host}`; return `https://${host}/${stripTrailingSlash(seg)}` } catch { return String(url||"").trim() } }
function computeAge(iso) { if (!iso) return null; const d=new Date(String(iso)); if (isNaN(d.getTime())) return null; const t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if (m<0||(m===0&&t.getDate()<d.getDate())) a--; return a>=0&&a<=120?a:null }

function normalizePHDigits10(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const s = raw.replace(/[^\d+]/g, "");
  let digits = s.replace(/\D/g, "");
  if (s.startsWith("+63")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("63") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "9") digits = digits.slice(1);
  if (digits.length >= 10) digits = digits.slice(digits.length - 10);
  if (digits.length !== 10 || digits[0] !== "9") return "";
  return digits;
}

function normalizePHContactForStore(input) {
  const d = normalizePHDigits10(input);
  return d ? `+63${d}` : "";
}

async function getAuthUserById(auth_uid) { try { const { data, error } = await supabaseAdmin.auth.admin.getUserById(auth_uid); if (error) return null; return data?.user || null } catch { return null } }

const createWorker = async (auth_uid, firstName, lastName, sex, email, password, isAgreedToTerms, agreedAt) => {
  const { data, error } = await supabaseAdmin.from("user_worker").insert([{ auth_uid, first_name:firstName, last_name:lastName, sex, email_address:String(email||"").trim().toLowerCase(), password, is_agreed_to_terms:isAgreedToTerms, agreed_at:agreedAt, contact_number:null, social_facebook:null, social_instagram:null, created_at:new Date().toISOString() }]);
  if (error) throw error;
  return data;
};

const checkEmailExistence = async (email) => {
  const e = String(email || "").trim().toLowerCase();
  const { data, error } = await supabaseAdmin.from("user_worker").select("*").ilike("email_address", e);
  if (error) throw error;
  return data;
};

const checkEmailExistenceAcrossAllUsers = async (email) => {
  const e = String(email || "").trim().toLowerCase();
  const { data: wd, error: we } = await supabaseAdmin.from("user_worker").select("*").ilike("email_address", e);
  if (we) throw we;
  const { data: cd, error: ce } = await supabaseAdmin.from("user_client").select("*").ilike("email_address", e);
  if (ce) throw ce;
  return [...(wd || []), ...(cd || [])];
};

const getByAuthUid = async (auth_uid, opts = {}) => {
  const db = opts.db || supabaseAdmin;
  const { data, error } = await db.from("user_worker").select("*").eq("auth_uid", auth_uid).limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

const getWorkerAccountProfile = async ({ auth_uid, email }, opts = {}) => {
  const db = opts.db || supabase;
  let row = null; try { row = await getByAuthUid(auth_uid, { db }) } catch {}
  let user = null; try { user = await getAuthUserById(row?.auth_uid || auth_uid) } catch {}
  const created_at = row?.created_at || user?.created_at || null;
  const dob = row?.date_of_birth || user?.user_metadata?.date_of_birth || null;
  const age = row?.age != null ? row.age : computeAge(dob);

  const rawPhone = row?.contact_number ?? row?.phone ?? "";
  const phoneDigits = normalizePHDigits10(rawPhone);

  return {
    first_name: row?.first_name || user?.user_metadata?.first_name || "",
    last_name: row?.last_name || user?.user_metadata?.last_name || "",
    email_address: row?.email_address || user?.email || email || "",
    sex: row?.sex || user?.user_metadata?.sex || "",
    phone: phoneDigits || "",
    facebook: row?.social_facebook ?? row?.facebook ?? "",
    instagram: row?.social_instagram ?? row?.instagram ?? "",
    auth_uid: row?.auth_uid || auth_uid || "",
    created_at,
    date_of_birth: dob,
    age,
    profile_picture: row?.profile_picture || null,
  };
};

const updatePassword = async (auth_uid, password, opts = {}) => {
  const db = opts.db || supabaseAdmin;
  const { error } = await db.from("user_worker").update({ password }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
};

const updateAuthPassword = async (auth_uid, new_password, opts = {}) => {
  if (opts.dbAuth) {
    const { error } = await opts.dbAuth.auth.updateUser({ password: new_password });
    if (error) throw error;
    return true;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_uid, { password: new_password });
  if (error) throw error;
  return true;
};

const updateWorkerProfile = async (auth_uid, patch, opts = {}) => {
  const db = opts.db || supabaseAdmin;
  const { data, error } = await db.from("user_worker").update(patch).eq("auth_uid", auth_uid).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

const updateAuthUserMeta = async (auth_uid, patch, opts = {}) => {
  if (opts.dbAuth) {
    const { data: me } = await opts.dbAuth.auth.getUser();
    if (!me?.user || me.user.id !== auth_uid) return true;
    const base = me.user.user_metadata || {};
    const next = { ...base, ...patch };
    const { error } = await opts.dbAuth.auth.updateUser({ data: next });
    if (error) throw error;
    return true;
  }
  const user = await getAuthUserById(auth_uid);
  const base = user?.user_metadata || {};
  const next = { ...base, ...patch };
  const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_uid, { user_metadata: next });
  if (error) throw error;
  return true;
};

async function isContactNumberTakenAcrossAll(phone, excludeAuthUid) {
  const target = normalizePHDigits10(phone);
  if (!target) return false;
  const q1 = supabaseAdmin.from("user_client").select("auth_uid,contact_number");
  const q2 = supabaseAdmin.from("user_worker").select("auth_uid,contact_number");
  const [{ data: c, error: ec }, { data: w, error: ew }] = await Promise.all([q1, q2]);
  if (ec) throw ec;
  if (ew) throw ew;
  const hits = [...(c || []), ...(w || [])]
    .map((r) => ({ uid: r.auth_uid, d: normalizePHDigits10(r.contact_number || "") }))
    .filter((x) => x.d && x.d === target)
    .map((x) => x.uid)
    .filter(Boolean);
  if (!hits.length) return false;
  if (!excludeAuthUid) return true;
  return hits.some((uid) => uid !== excludeAuthUid);
}

function buildVariants(kind, canon) {
  try {
    const u = new URL(canon);
    const path = u.pathname + (u.search || "");
    if (kind === "facebook") {
      const hosts = ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"];
      return hosts.map((h) => `https://${h}${path}`).flatMap((x) => [x, x.endsWith("/") ? x : x + "/"]);
    } else {
      const hosts = ["instagram.com", "www.instagram.com", "m.instagram.com"];
      return hosts.map((h) => `https://${h}${path}`).flatMap((x) => [x, x.endsWith("/") ? x : x + "/"]);
    }
  } catch {
    return [canon, canon.endsWith("/") ? canon : canon + "/"];
  }
}

async function isSocialLinkTakenAcrossAll(kind, value, excludeAuthUid) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const canon = kind === "facebook" ? normalizeFacebook(raw) : normalizeInstagram(raw);
  const col1 = kind === "facebook" ? "social_facebook" : "social_instagram";
  const legacy1 = kind === "facebook" ? "facebook" : "instagram";

  function buildOr(cols, pats) {
    const segs = [];
    for (const col of cols) for (const p of pats) segs.push(`${col}.ilike.*${p}*`);
    return segs.join(",");
  }

  let hitAuthUid = null;

  try {
    const variants = [canon, canon.endsWith("/") ? canon : canon + "/"];
    const orStr = buildOr([col1, legacy1], variants) || `${col1}.is.null`;
    const q1 = supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);
    const q2 = supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);
    const [{ data: c, error: ec }, { data: w, error: ew }] = await Promise.all([q1, q2]);
    if (ec || ew) throw ec || ew;
    const all = [...(c || []), ...(w || [])];
    for (const r of all) {
      const vals = [r[col1], r[legacy1]].filter(Boolean).map(String);
      if (vals.some((v) => (kind === "facebook" ? normalizeFacebook(v) : normalizeInstagram(v)).toLowerCase().includes(canon.toLowerCase()))) {
        hitAuthUid = r.auth_uid || null;
        break;
      }
    }
  } catch {
    const q1 = supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);
    const q2 = supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);
    const [{ data: c2 }, { data: w2 }] = await Promise.all([q1, q2]);
    const all = [...(c2 || []), ...(w2 || [])];
    for (const r of all) {
      const vals = [r[col1], r[legacy1]].filter(Boolean).map(String);
      if (vals.some((v) => (kind === "facebook" ? normalizeFacebook(v) : normalizeInstagram(v)).toLowerCase().includes(canon.toLowerCase()))) {
        hitAuthUid = r.auth_uid || null;
        break;
      }
    }
  }

  if (!hitAuthUid) return false;
  if (!excludeAuthUid) return true;
  return hitAuthUid !== excludeAuthUid;
}

const upsertWorkerAgreements = async (auth_uid, email_address, policy_agreement, nda_agreement, agreed_at, opts = {}) => {
  const db = opts.db || supabaseAdmin;
  const row = {
    auth_uid,
    email_address: String(email_address || "").trim().toLowerCase() || null,
    policy_agreement: !!policy_agreement,
    nda_agreement: !!nda_agreement,
    agreed_at: agreed_at || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db.from("worker_agreements").upsert([row], { onConflict: "auth_uid" }).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
};

async function listPublicReviews({ email, auth_uid, request_group_id, limit = 20 }) {
  const e = String(email || "").trim().toLowerCase();
  const au = String(auth_uid || "").trim();
  if (!e && !au) return { items: [], avg: 0, count: 0 };

  let workerEmail = e;
  if (!workerEmail && au) {
    try {
      const { data } = await supabaseAdmin.from("user_worker").select("email_address").eq("auth_uid", au).limit(1);
      workerEmail = data && data[0] ? String(data[0].email_address || "").toLowerCase() : "";
    } catch {}
  }

  const tables = ["worker_reviews", "reviews_worker", "reviews", "service_reviews"];
  const emailCols = ["worker_email", "email", "email_address"];
  const uidCols = ["worker_auth_uid", "auth_uid", "worker_uid"];

  for (const t of tables) {
    try {
      const attempts = [];
      if (au) uidCols.forEach((c) => attempts.push({ col: c, op: "eq", val: au }));
      if (workerEmail) emailCols.forEach((c) => attempts.push({ col: c, op: "ilike", val: workerEmail }));

      for (const a of attempts) {
        let q = supabaseAdmin.from(t).select("*").order("created_at", { ascending: false }).limit(Number(limit) || 20);
        q = a.op === "eq" ? q.eq(a.col, a.val) : q.ilike(a.col, a.val);
        if (request_group_id) q = q.eq("request_group_id", request_group_id);
        const { data, error } = await q;
        if (error) continue;
        if (Array.isArray(data)) {
          const items = data;
          const count = items.length;
          const avg = count ? items.reduce((s, r) => s + Number(r.rating || 0), 0) / count : 0;
          return { items, avg, count };
        }
      }
    } catch {}
  }

  return { items: [], avg: 0, count: 0 };
}

function clamp3(a) {
  const src = Array.isArray(a) ? a : [];
  return [src[0] ?? null, src[1] ?? null, src[2] ?? null];
}

async function getWorkerWorksByAuthUid(auth_uid, opts = {}) {
  const db = opts.db || supabaseAdmin;
  const { data, error } = await db.from("worker_works").select("*").eq("auth_uid", auth_uid).limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function upsertWorkerWorks(auth_uid, bestWorks, prevWorks, opts = {}) {
  const db = opts.db || supabaseAdmin;
  const b = clamp3(bestWorks);
  const p = clamp3(prevWorks);

  const row = {
    auth_uid,
    best_work_1: b[0],
    best_work_2: b[1],
    best_work_3: b[2],
    previous_work_1: p[0],
    previous_work_2: p[1],
    previous_work_3: p[2],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db.from("worker_works").upsert([row], { onConflict: "auth_uid" }).select("*").limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

module.exports = {
  createWorker,
  checkEmailExistence,
  checkEmailExistenceAcrossAllUsers,
  getByAuthUid,
  getWorkerAccountProfile,
  updatePassword,
  updateAuthPassword,
  updateWorkerProfile,
  updateAuthUserMeta,
  isContactNumberTakenAcrossAll,
  isSocialLinkTakenAcrossAll,
  normalizeFacebook,
  normalizeInstagram,
  normalizePHContactForStore,
  upsertWorkerAgreements,
  listPublicReviews,
  getWorkerWorksByAuthUid,
  upsertWorkerWorks,
};
