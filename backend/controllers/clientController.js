const clientModel = require('../models/clientModel');
const { createConfirmedUser } = require('../supabaseClient');

const registerClient = async (req, res) => {
  const { first_name, last_name, sex, email_address, password, is_agreed_to_terms } = req.body;
  try {
    const email = String(email_address || '').trim().toLowerCase();
    const verified = req.session?.verifiedEmails?.[email] === true;
    if (!verified) return res.status(400).json({ message: 'Please verify your email with the 6-digit code before creating an account.' });
    const emailExists = await clientModel.checkEmailExistenceAcrossAllUsers(email);
    if (emailExists.length > 0) return res.status(400).json({ message: 'Email already in use' });
    const agreed_at = is_agreed_to_terms ? new Date().toISOString() : null;
    const { user: authUser, error: authError } = await createConfirmedUser(
      email,
      password,
      { first_name, last_name, sex, role: 'client', is_agreed_to_terms: !!is_agreed_to_terms, agreed_at }
    );
    if (authError) {
      return res.status(authError.status || 400).json({
        message: authError.message || 'Signup failed',
        code: authError.code || undefined
      });
    }
    await clientModel.createClient(
      authUser.id,
      first_name,
      last_name,
      sex,
      email,
      password,
      !!is_agreed_to_terms,
      agreed_at
    );
    if (req.session?.verifiedEmails) delete req.session.verifiedEmails[email];
    return res.status(201).json({
      message: 'Client registered successfully',
      data: { first_name, last_name, sex, is_agreed_to_terms: !!is_agreed_to_terms, agreed_at, auth_uid: authUser.id }
    });
  } catch (error) {
    return res.status(400).json({ message: error?.message || 'Internal server error' });
  }
};

module.exports = {
  registerClient
};
