const loginModel = require('../models/loginModel');

const loginUser = async (req, res) => {
  const { email_address, password } = req.body;

  try {
    // First, try to find user in client table
    let user = await loginModel.getClientByEmail(email_address);
    let role = 'client';

    // If not found in client table, try worker table
    if (!user) {
      user = await loginModel.getWorkerByEmail(email_address);
      role = 'worker';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

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

module.exports = {
  loginUser,
};
