require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || "https://uoyzcboehvwxcadrqqfq.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE4MzcsImV4cCI6MjA2ODg1NzgzN30.09tdQtyneRfAbQJRoVy5J9YpsuLTwn-EDF0tt2hUosg";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI4MTgzNywiZXhwIjoyMDY4ODU3ODM3fQ.tl5s7jxKg99XfHYG7vTdJ7an7C4UA3g6pg_LBg7Bt20";

const DEV_AUTOCONFIRM = (process.env.DEV_AUTOCONFIRM || "false") === "true";
const FALLBACK_AUTOCONFIRM = (process.env.FALLBACK_AUTOCONFIRM || "false") === "true";

let dynamicRedirectBase = "";
function setDefaultRedirectBase(base) {
  dynamicRedirectBase = base || "";
}
function computeRedirectTo() {
  const explicit = process.env.AUTH_REDIRECT_BASE_URL || process.env.EMAIL_REDIRECT_URL || "";
  const base = dynamicRedirectBase || explicit || process.env.PUBLIC_APP_URL || "";
  if (!base) return null;
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}/auth/callback`;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createSupabaseAuthUser(email, password, metadata = {}) {
  try {
    if (DEV_AUTOCONFIRM) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      });
      if (error) throw error;
      return { user: data.user, error: null, autoConfirmed: true };
    }
    const redirectTo = computeRedirectTo() || undefined;
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    return { user: data?.user, error: null };
  } catch (err) {
    if (err?.status === 429 || err?.code === "over_email_send_rate_limit") err.isRateLimit = true;
    if (err?.status === 400 && /already registered|user already registered/i.test(err?.message || "")) err.isAlreadyRegistered = true;
    if (err?.status === 500 || err?.code === "unexpected_failure" || /confirmation email|smtp|mail/i.test(err?.message || "")) err.isEmailSendFailure = true;
    if (err.isEmailSendFailure && FALLBACK_AUTOCONFIRM) {
      try {
        const { data, error: err2 } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: metadata
        });
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
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: err };
  }
}

async function resendSignupEmail(email) {
  const { data, error } = await supabaseAdmin.auth.resend({ type: "signup", email });
  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  supabaseAdmin,
  createSupabaseAuthUser,
  resendSignupEmail,
  createConfirmedUser,
  setDefaultRedirectBase
};
