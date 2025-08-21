const workerModel = require('../models/workerModel');
const { createSupabaseAuthUser } = require('../supabaseClient');

const registerWorker = async (req, res) => {
  const {
    first_name,
    last_name,
    sex,
    email_address,
    password,
    is_agreed_to_terms
  } = req.body;

  console.log('📩 Incoming Worker Data:', req.body);

  try {
    // Validate required fields (surface 400 instead of 500)
    if (!first_name || !last_name || !sex || !email_address || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!is_agreed_to_terms) {
      return res.status(400).json({ message: 'You must agree to the Terms and Privacy Policy.' });
    }

    // Check if email exists in either table
    const emailExists = await workerModel.checkEmailExistenceAcrossAllUsers(email_address);
    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create in Supabase Auth (include agreement metadata)
    const agreed_at = new Date().toISOString();
    const { user: authUser, error: authError } = await createSupabaseAuthUser(
      email_address,
      password,
      { first_name, last_name, sex, role: 'worker', is_agreed_to_terms: true, agreed_at }
    );
    if (authError) {
      console.error('Auth create error:', authError);
      return res.status(400).json({ message: authError.message || 'Failed to create auth user' });
    }
    if (!authUser?.id) {
      console.error('Auth user creation returned no id:', authUser);
      return res.status(500).json({ message: 'Auth user not created' });
    }

    // Create in user_worker table (persist agreement fields)
    try {
      await workerModel.createWorker(
        authUser.id, // auth_uid from Supabase
        first_name,
        last_name,
        sex,
        email_address,
        password,
        true,        // is_agreed_to_terms
        agreed_at    // agreed_at
      );
    } catch (dbErr) {
      console.error('DB insert error (worker):', dbErr);
      if (dbErr.code === '23503') {
        return res.status(400).json({
          message: 'Foreign key failed for auth_uid. Ensure FK references auth.users(id).'
        });
      }
      return res.status(500).json({ message: dbErr.message || 'Database insert failed' });
    }

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
