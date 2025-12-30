// adminController.js
const { supabase, supabaseAdmin, createConfirmedUser } = require('../supabaseClient');
const adminModel = require('../models/adminModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

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

function buildAdminNoEmail({ brandName, code, supportEmail, logoUrl }) {
  const prettyCode = String(code || '')
    .trim()
    .split('')
    .join(' ');
  const subject = `Your ${brandName} Admin No.`;
  const preheader = `Your Admin No. is ${code}. Use this to complete admin sign up.`;
  const text =
    `${brandName}\n\n` +
    `Your Admin No. is: ${code}\n` +
    `Use this Admin No. in the sign up form.\n\n` +
    `If you didn't request this, you can ignore this email.\n` +
    (supportEmail ? `\nNeed help? Contact ${supportEmail}\n` : '');

  const logoCell = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" height="22" style="display:block;height:22px;max-height:22px;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:12px;font-weight:700;">${brandName}</span>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:16px;font-weight:700;">
                    ${brandName}
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;">
                    Admin access
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:22px 22px 0 22px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:20px;font-weight:700;line-height:1.25;">
                      Your Admin Number
                    </div>
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:14px;line-height:1.6;padding-top:8px;">
                      Use the code below to complete your admin sign up.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 22px 0 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;">
                      <tr>
                        <td style="padding:12px 14px 0 14px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="left" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;">
                                Admin No.
                              </td>
                              <td align="right">
                                ${logoCell}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:10px 14px 16px 14px;">
                          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:28px;font-weight:800;letter-spacing:6px;">
                            ${prettyCode}
                          </div>
                          <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;line-height:1.5;padding-top:8px;">
                            If you didn’t request this, you can safely ignore this email.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 22px 22px 22px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;line-height:1.6;">
                      For your security, do not share this code with anyone.
                      ${supportEmail ? `<br/>Need help? Contact <span style="color:#111827;">${supportEmail}</span>.` : ''}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 6px 0 6px;">
              <div style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
                © ${new Date().getFullYear()} ${brandName}. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
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

    const brandName = process.env.EMAIL_BRAND_NAME || 'JDK HOMECARE';
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
    const supportEmail = process.env.SUPPORT_EMAIL || '';
    const logoUrl = String(process.env.EMAIL_LOGO_URL || '').trim();

    const tpl = buildAdminNoEmail({ brandName, code, supportEmail, logoUrl });

    await mailTransport.sendMail({
      from: `"${brandName}" <${fromAddr}>`,
      to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    });

    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[to] = true;

    return res.status(200).json({ sent: true });
  } catch {
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
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

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
    if (error || !user) {
      const msg = error?.message || '';
      if (error?.isAlreadyRegistered || /already registered|user already registered/i.test(msg)) {
        return res.status(409).json({ message: 'This email already exists in another account.' });
      }
      return res.status(400).json({ message: msg || 'Failed to create auth user.' });
    }

    let hashedPassword = null;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch {
      try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch {}
      return res.status(500).json({ message: 'Failed to secure password.' });
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
      password: hashedPassword
    };

    const inserted = await adminModel.createAdmin(profile);
    if (!inserted) {
      try { await supabaseAdmin.auth.admin.deleteUser(user.id); } catch {}
      return res.status(500).json({
        message: 'Failed to persist admin profile.',
        hint:
          "Verify Supabase table 'user_admin' exists and has columns: " +
          "auth_uid uuid, first_name text, last_name text, sex text, " +
          "email_address text UNIQUE, admin_no text UNIQUE, role text, created_at timestamptz DEFAULT now(), password text.",
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
    try { delete req.session.verifiedEmails[email]; } catch {}

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      auth_uid: user.id,
      data: { auth_uid: user.id },
      user: { first_name, last_name, sex, email_address: email, admin_no: adminNo },
      role: 'admin',
    });
  } catch {
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

    if ((adminRow?.role || '').toLowerCase() !== 'admin') return res.status(403).json({ message: 'This login is for admins only.' });

    const loginEmail = adminRow.email_address;

    let signedInUserId = null;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (!error && data?.user) {
      signedInUserId = data.user.id;
    } else {
      const hash = adminRow?.password;
      if (hash) {
        let ok = false;
        try {
          ok = await bcrypt.compare(password, String(hash));
        } catch {
          ok = false;
        }
        if (!ok) return res.status(401).json({ message: 'Invalid credentials.' });
        signedInUserId = adminRow.auth_uid || null;
      } else {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
    }

    const user = {
      first_name: adminRow.first_name,
      last_name: adminRow.last_name,
      sex: adminRow.sex,
      email_address: adminRow.email_address,
      admin_no: adminRow.admin_no,
    };

    req.session.user = {
      id: adminRow.auth_uid || signedInUserId || adminRow.id || null,
      ...user,
      role: 'admin',
    };

    return res.status(200).json({ user, role: 'admin' });
  } catch {
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
    } catch {}

    const brandName = process.env.EMAIL_BRAND_NAME || 'JDK HOMECARE';
    const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost';
    const supportEmail = process.env.SUPPORT_EMAIL || '';
    const logoUrl = String(process.env.EMAIL_LOGO_URL || '').trim();

    const tpl = buildAdminNoEmail({ brandName, code: adminNo, supportEmail, logoUrl });

    await mailTransport.sendMail({
      from: `"${brandName}" <${fromAddr}>`,
      to: email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    });

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Unable to send Admin No. email.' });
  }
};

exports.getCurrentAdmin = async (req, res) => {
  try {
    const u = req.session && req.session.user;
    if (!u || String(u.role || '').toLowerCase() !== 'admin') {
      return res.status(401).json({ message: 'Not authenticated as admin.' });
    }
    return res.status(200).json({ user: u });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch current admin.' });
  }
};

exports.logoutAdmin = async (_req, res) => {
  try {
    if (_req.session) {
      await new Promise((resolve) => _req.session.destroy(() => resolve()));
    }
    res.clearCookie('connect.sid', { path: '/' });
    return res.status(200).json({ message: 'Logged out' });
  } catch {
    return res.status(200).json({ message: 'Logged out' });
  }
};

exports.listAllUsers = async (_req, res) => {
  try {
    const clientsPromise = adminModel.listClients();
    const workersPromise = adminModel.listWorkers();
    const adminsPromise =
      typeof adminModel.listAdmins === 'function'
        ? adminModel.listAdmins()
        : Promise.resolve([]);

    const [clients, workers, adminsRaw] = await Promise.all([
      clientsPromise,
      workersPromise,
      adminsPromise,
    ]);

    const admins = Array.isArray(adminsRaw) ? adminsRaw : [];

    const getDate = (row) => row?.created_at || row?.createdAt || null;

    const mapClient = (c) => ({
      id: c.auth_uid || c.id || c.email_address,
      role: 'client',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      sex: c.sex || '',
      email: c.email_address,
      date: getDate(c),
      phone: c.contact_number || '',
      facebook: c.social_facebook || '',
      instagram: c.social_instagram || ''
    });

    const mapWorker = (w) => ({
      id: w.auth_uid || w.id || w.email_address,
      role: 'worker',
      first_name: w.first_name || '',
      last_name: w.last_name || '',
      sex: w.sex || '',
      email: w.email_address,
      date: getDate(w),
      phone: w.contact_number || '',
      facebook: w.social_facebook || '',
      instagram: w.social_instagram || ''
    });

    const mapAdmin = (a) => ({
      id: a.auth_uid || a.id || a.email_address,
      role: 'admin',
      first_name: a.first_name || '',
      last_name: a.last_name || '',
      sex: a.sex || '',
      email: a.email_address,
      date: getDate(a),
      phone: '',
      facebook: '',
      instagram: ''
    });

    const users = [
      ...(Array.isArray(clients) ? clients.map(mapClient) : []),
      ...(Array.isArray(workers) ? workers.map(mapWorker) : []),
      ...(Array.isArray(admins) ? admins.map(mapAdmin) : []),
    ].sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('listAllUsers error:', err);
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
};
