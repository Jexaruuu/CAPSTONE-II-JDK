const workerModel = require('../models/workerModel');
const { createSupabaseAuthUser } = require('../supabaseClient');

const registerWorker = async (req, res) => {
  const { first_name, last_name, sex, email_address, password } = req.body;

  console.log('📩 Incoming Worker Data:', req.body);

  try {
    // Check if email exists in either table
    const emailExists = await workerModel.checkEmailExistenceAcrossAllUsers(email_address);
    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create in Supabase Auth
    const { user: authUser, error: authError } = await createSupabaseAuthUser(
      email_address,
      password,
      { first_name, last_name, sex, role: 'worker' }
    );
    if (authError) throw authError;

    // Create in user_worker table
    await workerModel.createWorker(
      authUser.id, // auth_uid from Supabase
      first_name,
      last_name,
      sex,
      email_address,
      password
    );

    return res.status(201).json({
      message: 'Worker registered successfully',
      data: {
        first_name,
        last_name,
        sex,
        auth_uid: authUser.id
      }
    });
  } catch (error) {
    console.error('Error during worker registration:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  registerWorker,
};
