const workerModel = require('../models/workerModel');
const { createSupabaseAuthUser, createConfirmedUser } = require('../supabaseClient');

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
    // ✅ Require OTP verification in session
    const verified = req.session?.verifiedEmails?.[email_address] === true;
    if (!verified) {
      return res.status(400).json({ message: 'Please verify your email with the 6-digit code before creating an account.' });
    }

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

    // Create in Supabase Auth as email-confirmed
    const agreed_at = new Date().toISOString();
    const { user: authUser, error: authError } = await createConfirmedUser(
      email_address,
      password,
      { first_name, last_name, sex, role: 'worker', is_agreed_to_terms: true, agreed_at }
    );

    // ✅ Map like client side
    if (authError) {
      console.error('Auth create error:', authError);
      return res.status(authError.status || 400).json({
        message: authError.message || 'Failed to create auth user',
        code: authError.code || undefined
      });
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

    // ✅ cleanup the session flag
    if (req.session?.verifiedEmails) delete req.session.verifiedEmails[email_address];

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
    // match the safer default used on client side flow
    return res.status(400).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  registerWorker,
};
