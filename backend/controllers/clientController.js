const clientModel = require('../models/clientModel');
const { createSupabaseAuthUser, createConfirmedUser } = require('../supabaseClient');

const registerClient = async (req, res) => {
  const { first_name, last_name, sex, email_address, password, is_agreed_to_terms } = req.body;

  try {
    // ✅ Block unless email verified via OTP in this session
    const verified = req.session?.verifiedEmails?.[email_address] === true;
    if (!verified) {
      return res.status(400).json({ message: 'Please verify your email with the 6-digit code before creating an account.' });
    }

    // Check if email exists in either table
    const emailExists = await clientModel.checkEmailExistenceAcrossAllUsers(email_address);
    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // derive agreed_at on server for consistency/audit
    const agreed_at = is_agreed_to_terms ? new Date().toISOString() : null;

    // ✅ After OTP, create the user already-confirmed (no further email link)
    const { user: authUser, error: authError } = await createConfirmedUser(
      email_address,
      password,
      { first_name, last_name, sex, role: 'client', is_agreed_to_terms: !!is_agreed_to_terms, agreed_at }
    );

    // Keep your existing error mapping shape for consistency
    if (authError) {
      return res.status(authError.status || 400).json({
        message: authError.message || 'Signup failed',
        code: authError.code || undefined
      });
    }

    // Create in user_client table (persist agreement fields)
    await clientModel.createClient(
      authUser.id,
      first_name,
      last_name,
      sex,
      email_address,
      password,
      !!is_agreed_to_terms,
      agreed_at
    );

    // ✅ cleanup the session flag for this email
    if (req.session?.verifiedEmails) delete req.session.verifiedEmails[email_address];

    return res.status(201).json({
      message: 'Client registered successfully',
      data: { first_name, last_name, sex, is_agreed_to_terms: !!is_agreed_to_terms, agreed_at, auth_uid: authUser.id }
    });
  } catch (error) {
    console.error('Error during client registration:', error);
    // Safer default than 500
    return res.status(400).json({ message: error?.message || 'Internal server error' });
  }
};

module.exports = {
  registerClient
};
