const clientModel = require('../models/clientModel');
const { createSupabaseAuthUser } = require('../supabaseClient');

const registerClient = async (req, res) => {
  const { first_name, last_name, sex, email_address, password, is_agreed_to_terms } = req.body;

  try {
    // Check if email exists in either table
    const emailExists = await clientModel.checkEmailExistenceAcrossAllUsers(email_address);
    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // derive agreed_at on server for consistency/audit
    const agreed_at = is_agreed_to_terms ? new Date().toISOString() : null;

    // Create in Supabase Auth (add agreement metadata)
    const { user: authUser, error: authError } = await createSupabaseAuthUser(
      email_address,
      password,
      { first_name, last_name, sex, role: 'client', is_agreed_to_terms: !!is_agreed_to_terms, agreed_at }
    );

    // ✅ Map known Supabase errors to proper HTTP codes
    if (authError) {
      if (authError.isRateLimit) {
        return res.status(429).json({
          message: 'Too many verification emails sent. Please wait a minute and try again.'
        });
      }
      if (authError.isAlreadyRegistered) {
        return res.status(409).json({
          message: 'This email already started signup. Please resend the verification email.'
        });
      }
      // ✅ NEW: surface SMTP/confirmation send failure clearly
      if (authError.isEmailSendFailure) {
        return res.status(502).json({
          message: 'Email delivery failed. Check SMTP settings in Supabase (host/port/username/app password).'
        });
      }
      // Unknown error from Supabase
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

    return res.status(201).json({
      message: 'Client registered successfully',
      data: { first_name, last_name, sex, is_agreed_to_terms: !!is_agreed_to_terms, agreed_at }
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
