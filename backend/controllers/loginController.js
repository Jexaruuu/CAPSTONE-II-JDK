const loginModel = require('../models/loginModel');
const { supabaseAdmin } = require('../supabaseClient');

const loginUser = async (req, res) => {
  const { email_address, password } = req.body;

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email_address,
      password
    });
    if (error) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let user = await loginModel.getClientByEmail(email_address);
    let role = 'client';
    if (!user) {
      user = await loginModel.getWorkerByEmail(email_address);
      role = 'worker';
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found in profile table' });
    }

    req.session.user = {
      id: user.id,
      auth_uid: data?.user?.id || user.auth_uid || null,
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
      token: data.session.access_token,
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
