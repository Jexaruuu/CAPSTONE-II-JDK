const loginModel = require('../models/loginModel');
const supabase = require('../supabaseClient'); // ✅ Added import

// Login Controller
const loginUser = async (req, res) => {
  const { email_address, password } = req.body;

  try {
    // ✅ Step 1: Try to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email_address,
      password: password
    });

    if (error) {
      console.error('Supabase Auth Error:', error.message);
      return res.status(401).json({ message: 'Invalid email or password (auth)' });
    }

    // ✅ Step 2: If login is successful, get user details from your own MySQL table
    let user = await loginModel.getClientByEmail(email_address);
    let role = 'client';

    if (!user) {
      user = await loginModel.getWorkerByEmail(email_address);
      role = 'worker';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found in profile table' });
    }

    // ✅ Step 3: Store session data
    req.session.user = {
      id: user.id,
      role,
      first_name: user.first_name,
      last_name: user.last_name,
      sex: user.sex,
    };

    // ✅ Step 4: Respond with success
    res.status(200).json({
      message: 'Login successful',
      user,
      role,
      token: data.session.access_token, // Optional: Send Supabase token to frontend
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Logout Controller
const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logout successful' });
  });
};

module.exports = {
  loginUser,
  logoutUser,
};
