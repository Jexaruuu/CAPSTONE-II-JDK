const { supabaseAdmin } = require('../supabaseClient');
const { resendSignupEmail } = require('../supabaseClient');

async function resendEmailVerification(email) {
  return resendSignupEmail(email);
}

async function isEmailTaken(raw) {
  const email = String(raw || '').trim().toLowerCase();
  const t1 = supabaseAdmin.from('user_client').select('id', { count: 'exact', head: true }).eq('email_address', email);
  const t2 = supabaseAdmin.from('user_worker').select('id', { count: 'exact', head: true }).eq('email_address', email);
  const t3 = supabaseAdmin.from('user_admin').select('id', { count: 'exact', head: true }).eq('email_address', email);
  const [r1, r2, r3] = await Promise.all([t1, t2, t3]);
  if (r1.error || r2.error || r3.error) throw (r1.error || r2.error || r3.error);
  const c1 = r1.count || 0;
  const c2 = r2.count || 0;
  const c3 = r3.count || 0;
  return c1 + c2 + c3 > 0;
}

module.exports = { resendEmailVerification, isEmailTaken };
