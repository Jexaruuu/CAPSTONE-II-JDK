const loginModel = require('../models/loginModel');
const { supabaseAdmin } = require('../supabaseClient');

const loginUser = async (req, res) => {
  const { email_address, password } = req.body;

  try {
    const email = String(email_address || '').trim().toLowerCase();

    let user = await loginModel.getClientByEmail(email);
    let role = 'client';
    if (!user) {
      user = await loginModel.getWorkerByEmail(email);
      role = 'worker';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found in profile table' });
    }

    const storedPassword = String(user.password || '');
    const incomingPassword = String(password || '');
    if (storedPassword !== incomingPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let token = null;
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: incomingPassword
      });
      if (!error) {
        token = data?.session?.access_token || null;
      }
    } catch {}

    req.session.user = {
      id: user.id,
      auth_uid: user.auth_uid || null,
      role,
      first_name: user.first_name,
      last_name: user.last_name,
      sex: user.sex,
      email_address: user.email_address
    };
    await new Promise(r => req.session.save(r));

    const u = encodeURIComponent(JSON.stringify({
      e: user.email_address,
      r: role,
      au: req.session.user.auth_uid || null
    }));
    res.cookie('app_u', u, { httpOnly: false, sameSite: 'lax', secure: false, path: '/', maxAge: 1000 * 60 * 60 * 2 });

    res.status(200).json({
      message: 'Login successful',
      user,
      role,
      token,
      email_address: user.email_address
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.clearCookie('app_u', { path: '/' });
    res.status(200).json({ message: 'Logout successful' });
  });
};

module.exports = {
  loginUser,
  logoutUser
};
