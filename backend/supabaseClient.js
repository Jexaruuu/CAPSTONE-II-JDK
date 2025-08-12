require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uoyzcboehvwxcadrqqfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE4MzcsImV4cCI6MjA2ODg1NzgzN30.09tdQtyneRfAbQJRoVy5J9YpsuLTwn-EDF0tt2hUosg';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a new user in Supabase Auth
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @param {object} metadata - Additional user metadata (optional)
 * @returns {Promise<{user: object, error: object}>}
 */
async function createSupabaseAuthUser(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata // metadata can store things like first_name, last_name, role, etc.
    }
  });
  return { user: data?.user, error };
}

module.exports = {
  supabase,
  createSupabaseAuthUser
};
