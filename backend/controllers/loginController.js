const loginModel = require('../models/loginModel');

const loginUser = async (req, res) => {
  const { email_address, password } = req.body;

  try {
    let user = await loginModel.getClientByEmail(email_address);
    let role = 'client';

    if (!user) {
      user = await loginModel.getWorkerByEmail(email_address);
      role = 'worker';
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.password !== password) return res.status(401).json({ message: 'Incorrect password' });

    req.session.user = {
      id: user.id,
      role,
      first_name: user.first_name,
      last_name: user.last_name,
      sex: user.sex,
    };

    res.status(200).json({
      message: 'Login successful',
      user,
      role,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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