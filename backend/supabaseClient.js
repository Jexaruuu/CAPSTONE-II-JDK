require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const DEV_AUTOCONFIRM = (process.env.DEV_AUTOCONFIRM || "false") === "true";
const FALLBACK_AUTOCONFIRM = (process.env.FALLBACK_AUTOCONFIRM || "false") === "true";

let dynamicRedirectBase = "";
function setDefaultRedirectBase(base) { dynamicRedirectBase = base || ""; }
function computeRedirectTo() {
  const explicit = process.env.AUTH_REDIRECT_BASE_URL || process.env.EMAIL_REDIRECT_URL || "";
  const base = dynamicRedirectBase || explicit || process.env.PUBLIC_APP_URL || "";
  if (!base) return null;
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}/auth/callback`;
}

function loadEnv() {
  const url = process.env.SUPABASE_URL || "https://uoyzcboehvwxcadrqqfq.supabase.co";
  const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
  const svc =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET ||
    "";
  return { url, anon, svc };
}

let _anonClient = null;
let _adminClient = null;
let _last = { url: null, anon: null, svc: null };

function getSupabase() {
  const { url, anon } = loadEnv();
  if (!_anonClient || url !== _last.url || anon !== _last.anon) {
    _anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    _last.url = url;
    _last.anon = anon;
  }
  return _anonClient;
}

function getSupabaseAdmin() {
  const { url, anon, svc } = loadEnv();
  const key = svc || anon;
  if (!_adminClient || url !== _last.url || key !== _last.svc) {
    _adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    _last.url = url;
    _last.svc = key;
  }
  return _adminClient;
}

const supabase = new Proxy({}, { get: (_t, p) => getSupabase()[p] });
const supabaseAdmin = new Proxy({}, { get: (_t, p) => getSupabaseAdmin()[p] });

async function createSupabaseAuthUser(email, password, metadata = {}) {
  try {
    if (DEV_AUTOCONFIRM) {
      const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
      if (error) throw error;
      return { user: data.user, error: null, autoConfirmed: true };
    }
    const redirectTo = computeRedirectTo() || undefined;
    const { data, error } = await getSupabaseAdmin().auth.signUp({ email, password, options: { data: metadata, emailRedirectTo: redirectTo } });
    if (error) throw error;
    return { user: data?.user, error: null };
  } catch (err) {
    if (err?.status === 429 || err?.code === "over_email_send_rate_limit") err.isRateLimit = true;
    if (err?.status === 400 && /already registered|user already registered/i.test(err?.message || "")) err.isAlreadyRegistered = true;
    if (err?.status === 500 || err?.code === "unexpected_failure" || /confirmation email|smtp|mail/i.test(err?.message || "")) err.isEmailSendFailure = true;
    if (err.isEmailSendFailure && FALLBACK_AUTOCONFIRM) {
      try {
        const { data, error: err2 } = await getSupabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
        if (err2) throw err2;
        return { user: data.user, error: null, autoConfirmed: true, usedFallback: true };
      } catch (e2) {
        e2.originalError = err;
        return { user: null, error: e2 };
      }
    }
    return { user: null, error: err };
  }
}

async function createConfirmedUser(email, password, metadata = {}) {
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (err) {
    if (err?.status === 400 && /already registered|user already registered/i.test(err?.message || "")) err.isAlreadyRegistered = true;
    return { user: null, error: err };
  }
}

async function resendSignupEmail(email) {
  const { data, error } = await getSupabaseAdmin().auth.resend({ type: "signup", email });
  if (error) throw error;
  return data;
}

async function ensureStorageBucket(name, isPublic = true) {
  const parseBytes = v => {
    if (!v) return null;
    const s = String(v).trim().toLowerCase();
    if (/^\d+$/.test(s)) return Number(s);
    const m = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)$/.exec(s);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (m[2] === "kb") return Math.round(n * 1024);
    if (m[2] === "mb") return Math.round(n * 1024 * 1024);
    if (m[2] === "gb") return Math.round(n * 1024 * 1024 * 1024);
    return null;
  };
  const envLimit =
    parseBytes(process.env.SUPABASE_BUCKET_FILE_LIMIT_BYTES) ||
    parseBytes(process.env.MAX_BODY_SIZE) ||
    25 * 1024 * 1024;

  try {
    const { data: existing, error: getErr } = await getSupabaseAdmin().storage.getBucket(name);
    if (existing && !getErr) {
      await getSupabaseAdmin().storage.updateBucket(name, { public: isPublic, fileSizeLimit: envLimit });
      return existing;
    }
  } catch {}
  const { data: created, error: createErr } = await getSupabaseAdmin().storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: envLimit
  });
  if (createErr) throw createErr;
  return created;
}

module.exports = {
  supabase,
  supabaseAdmin,
  getSupabaseAdmin,
  createSupabaseAuthUser,
  resendSignupEmail,
  createConfirmedUser,
  setDefaultRedirectBase,
  ensureStorageBucket
};
