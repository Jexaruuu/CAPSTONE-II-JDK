const workerModel = require('../models/workerModel');
const { createConfirmedUser } = require('../supabaseClient');

const registerWorker = async (req, res) => {
  const { first_name, last_name, sex, email_address, password, is_agreed_to_terms } = req.body;
  try {
    const email = String(email_address || '').trim().toLowerCase();
    const verified = req.session?.verifiedEmails?.[email] === true;
    if (!verified) return res.status(400).json({ message: 'Please verify your email with the 6-digit code before creating an account.' });
    if (!first_name || !last_name || !sex || !email || !password) return res.status(400).json({ message: 'Missing required fields' });
    if (!is_agreed_to_terms) return res.status(400).json({ message: 'You must agree to the Terms and Privacy Policy.' });
    const emailExists = await workerModel.checkEmailExistenceAcrossAllUsers(email);
    if (emailExists.length > 0) return res.status(400).json({ message: 'Email already in use' });
    const agreed_at = new Date().toISOString();
    const { user: authUser, error: authError } = await createConfirmedUser(
      email,
      password,
      { first_name, last_name, sex, role: 'worker', is_agreed_to_terms: true, agreed_at }
    );
    if (authError) return res.status(authError.status || 400).json({ message: authError.message || 'Failed to create auth user', code: authError.code || undefined });
    if (!authUser?.id) return res.status(500).json({ message: 'Auth user not created' });
    try {
      await workerModel.createWorker(authUser.id, first_name, last_name, sex, email, password, true, agreed_at);
    } catch (dbErr) {
      if (dbErr.code === '23503') return res.status(400).json({ message: 'Foreign key failed for auth_uid. Ensure FK references auth.users(id).' });
      return res.status(500).json({ message: dbErr.message || 'Database insert failed' });
    }
    if (req.session?.verifiedEmails) delete req.session.verifiedEmails[email];
    return res.status(201).json({ message: 'Worker registered successfully', data: { first_name, last_name, sex, auth_uid: authUser.id } });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = { registerWorker };
