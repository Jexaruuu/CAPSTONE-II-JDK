// controllers/adminController.js
const { supabase, supabaseAdmin, createConfirmedUser } = require('../supabaseClient');
const adminModel = require('../models/adminModel');

/**
 * POST /api/admins/register
 * Also mounted at /api/admin/register (same handler)
 * Requires OTP to be verified (req.session.verifiedEmails[email] === true).
 * Creates a confirmed Supabase Auth user, then inserts an admin profile row.
 */
exports.registerAdmin = async (req, res) => {
  try {
    const {
      first_name = '',
      last_name = '',
      admin_no = '',
      sex = '',
      email_address = '',
      password = '',
      is_agreed_to_terms = false
    } = req.body || {};

    const email = String(email_address || '').trim().toLowerCase();
    const adminNo = String(admin_no || '').trim().replace(/\D/g, '');

    if (!first_name.trim() || !last_name.trim()) {
      return res.status(400).json({ message: 'First and last name are required.' });
    }
    if (!adminNo) {
      return res.status(400).json({ message: 'Admin No. is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }
    if (!password || password.length < 12) {
      return res.status(400).json({ message: 'Password must be at least 12 characters.' });
    }

    if (!req.session?.verifiedEmails?.[email]) {
      return res.status(403).json({ message: 'Email not verified. Please complete OTP verification.' });
    }

    const [byEmail, byAdminNo] = await Promise.all([
      adminModel.getByEmail(email),
      adminModel.getByAdminNo(adminNo),
    ]);
    if (byEmail) return res.status(409).json({ message: 'Email already registered as an admin.' });
    if (byAdminNo) return res.status(409).json({ message: 'Admin No. already in use.' });

    const emailTakenAnywhere = await adminModel.checkEmailExistenceAcrossAllUsers(email);
    if (emailTakenAnywhere) {
      return res.status(409).json({ message: 'This email already exists in another user role.' });
    }

    const metadata = { role: 'admin', first_name, last_name, sex, admin_no: adminNo };
    const { user, error } = await createConfirmedUser(email, password, metadata);
    if (error || !user) {
      return res.status(400).json({ message: error?.message || 'Failed to create auth user.' });
    }

    const profile = {
      auth_uid: user.id,
      first_name,
      last_name,
      sex,
      email_address: email,
      admin_no: adminNo,
      role: 'admin',
      created_at: new Date().toISOString(),
    };

 const inserted = await adminModel.createAdmin(profile);
if (!inserted) {
  // Roll back Auth user to avoid orphan if insert fails
  try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch (_) {}

  // 👇 Return a helpful hint so you can see it in the browser Network tab
  return res.status(500).json({
    message: 'Failed to persist admin profile.',
    hint:
      "Verify Supabase table 'user_admin' exists and has columns: " +
      "auth_uid uuid, first_name text, last_name text, sex text, " +
      "email_address text UNIQUE, admin_no text UNIQUE, role text, created_at timestamptz DEFAULT now().",
  });
}

    req.session.user = {
      id: user.id,
      first_name,
      last_name,
      sex,
      email_address: email,
      admin_no: adminNo,
      role: 'admin',
    };
    try { delete req.session.verifiedEmails[email]; } catch (_) {}

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      auth_uid: user.id,
      data: { auth_uid: user.id },
      user: { first_name, last_name, sex, email_address: email, admin_no: adminNo },
      role: 'admin',
    });
  } catch (err) {
    console.error('registerAdmin error:', err);
    return res.status(500).json({ message: 'Server error during admin registration.' });
  }
};

/**
 * POST /api/admin/login
 * Also mounted at /api/admins/login (same handler)
 * Accepts { admin_no, password } OR { email_address, password }.
 * We sign in against Supabase Auth (server-side) to validate password.
 */
exports.loginAdmin = async (req, res) => {
  try {
    let { admin_no = '', email_address = '', password = '' } = req.body || {};
    const adminNo = String(admin_no || '').trim().replace(/\D/g, '');
    const email = String(email_address || '').trim().toLowerCase();

    if ((!adminNo && !email) || !password) {
      return res.status(400).json({ message: 'Admin No. or Email, and password are required.' });
    }

    let adminRow = null;
    if (adminNo) {
      adminRow = await adminModel.getByAdminNo(adminNo);
      if (!adminRow) return res.status(401).json({ message: 'Invalid credentials.' });
    } else if (email) {
      adminRow = await adminModel.getByEmail(email);
      if (!adminRow) return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const loginEmail = adminRow?.email_address || email;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error || !data?.user) return res.status(401).json({ message: 'Invalid credentials.' });

    if ((adminRow?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'This login is for admins only.' });
    }

    const user = {
      first_name: adminRow.first_name,
      last_name: adminRow.last_name,
      sex: adminRow.sex,
      email_address: adminRow.email_address,
      admin_no: adminRow.admin_no,
    };

    req.session.user = {
      id: adminRow.auth_uid || data.user.id,
      ...user,
      role: 'admin',
    };

    return res.status(200).json({ user, role: 'admin' });
  } catch (err) {
    console.error('loginAdmin error:', err);
    return res.status(500).json({ message: 'Server error during admin login.' });
  }
};
