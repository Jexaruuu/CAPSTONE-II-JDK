require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.SUPABASE_URL || 'https://uoyzcboehvwxcadrqqfq.supabase.co';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE4MzcsImV4cCI6MjA2ODg1NzgzN30.09tdQtyneRfAbQJRoVy5J9YpsuLTwn-EDF0tt2hUosg';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI4MTgzNywiZXhwIjoyMDY4ODU3ODM3fQ.tl5s7jxKg99XfHYG7vTdJ7an7C4UA3g6pg_LBg7Bt20';

// Public client (safe for frontend use)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (backend only - bypass RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a new user in Supabase Auth (Admin)
 * Works for both Client and Worker registrations
 * @param {string} email
 * @param {string} password
 * @param {object} metadata
 */
async function createSupabaseAuthUser(email, password, metadata = {}) {
  try {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { user: data?.user, error };
  } catch (err) {
    console.error('❌ Error creating Supabase Auth user:', err);
    return { user: null, error: err };
  }
}

module.exports = {
  supabase,       // Public client
  supabaseAdmin,  // Admin client for DB inserts
  createSupabaseAuthUser
};
