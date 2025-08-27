const { supabase, supabaseAdmin, createConfirmedUser } = require('../supabaseClient');
const adminModel = require('../models/adminModel');
const nodemailer = require('nodemailer');

const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_PORT || '465') === '465',
  auth: {
    user: process.env.SMTP_USER || 'YOUR_EMAIL@example.com',
    pass: process.env.SMTP_PASS || 'YOUR_APP_PASSWORD',
  },
});

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.requestAdminNo = async (req, res) => {
  try {
    const { email } = req.body || {};
    const to = String(email || '').trim().toLowerCase();
    if (!to || !to.includes('@')) return res.status(400).json({ message: 'Valid email is required.' });

    let code = gen6();
    for (let i = 0; i < 5; i++) {
      const exists = await adminModel.adminNoExists(code);
      if (!exists) break;
      code = gen6();
    }

    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111">
        <h2 style="margin:0 0 8px">Your Admin Number</h2>
        <p>Here is your 6-digit Admin No.:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:1px;margin:12px 0">${code}</p>
        <p>Use this Admin No. in the sign up form.</p>
      </div>
    `;
    await mailTransport.sendMail({
      from: `"JDK HOMECARE" <${fromAddr}>`,
      to,
      subject: 'Your JDK HOMECARE Admin No.',
      html,
    });

    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[to] = true;

    return res.status(200).json({ sent: true });
  } catch (err) {
    return res.status(500).json({ message: 'Unable to send Admin No.' });
  }
};

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

    if (!first_name.trim() || !last_name.trim()) return res.status(400).json({ message: 'First and last name are required.' });
    if (!adminNo) return res.status(400).json({ message: 'Admin No. is required.' });
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Valid email is required.' });
    if (!password || password.length < 12) return res.status(400).json({ message: 'Password must be at least 12 characters.' });

    if (!req.session?.verifiedEmails?.[email]) return res.status(403).json({ message: 'Email not verified. Please request your Admin No. first.' });

    const [byEmail, byAdminNo] = await Promise.all([
      adminModel.getByEmail(email),
      adminModel.getByAdminNo(adminNo),
    ]);
    if (byEmail) return res.status(409).json({ message: 'Email already registered as an admin.' });
    if (byAdminNo) return res.status(409).json({ message: 'Admin No. already in use.' });

    const emailTakenAnywhere = await adminModel.checkEmailExistenceAcrossAllUsers(email);
    if (emailTakenAnywhere) return res.status(409).json({ message: 'This email already exists in another user role.' });

    const metadata = { role: 'admin', first_name, last_name, sex, admin_no: adminNo };
    const { user, error } = await createConfirmedUser(email, password, metadata);
    if (error || !user) return res.status(400).json({ message: error?.message || 'Failed to create auth user.' });

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
      try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch (_) {}
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
    return res.status(500).json({ message: 'Server error during admin registration.' });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    let { admin_no = '', email_address = '', password = '' } = req.body || {};
    const adminNo = String(admin_no || '').trim().replace(/\D/g, '');
    if (!adminNo || !password) return res.status(400).json({ message: 'Admin No. and password are required.' });

    const adminRow = await adminModel.getByAdminNo(adminNo);
    if (!adminRow) return res.status(401).json({ message: 'Invalid credentials.' });

    const loginEmail = adminRow.email_address;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error || !data?.user) return res.status(401).json({ message: 'Invalid credentials.' });

    if ((adminRow?.role || '').toLowerCase() !== 'admin') return res.status(403).json({ message: 'This login is for admins only.' });

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
    return res.status(500).json({ message: 'Server error during admin login.' });
  }
};

exports.sendAdminNoEmail = async (req, res) => {
  try {
    let { to = '', first_name = '', last_name = '', admin_no = '' } = req.body || {};
    const email = String(to || '').trim().toLowerCase();
    const adminNo = String(admin_no || '').trim().replace(/\D/g, '');
    if (!email || !adminNo) return res.status(400).json({ message: 'Missing "to" or "admin_no".' });

    try {
      const byEmail = await adminModel.getByEmail(email);
      const byAdminNo = await adminModel.getByAdminNo(adminNo);
      if (byEmail && !first_name) first_name = byEmail.first_name || '';
      if (byEmail && !last_name) last_name = byEmail.last_name || '';
    } catch (_) {}

    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111">
        <h2 style="margin:0 0 8px">Your Admin Number</h2>
        <p>Hi ${[first_name, last_name].filter(Boolean).join(' ') || 'there'},</p>
        <p>Here is your Admin No.:</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:1px;margin:12px 0">${adminNo}</p>
      </div>
    `;
    await mailTransport.sendMail({
      from: `"JDK HOMECARE" <${fromAddr}>`,
      to: email,
      subject: 'Your JDK HOMECARE Admin No.',
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: 'Unable to send Admin No. email.' });
  }
};
