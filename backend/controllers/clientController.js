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
    if (authError) throw authError;

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
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  registerClient
};
