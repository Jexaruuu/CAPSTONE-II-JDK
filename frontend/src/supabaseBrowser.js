// src/supabaseBrowser.js
import { createClient } from '@supabase/supabase-js';

// Use the same URL/key you already use
const SUPABASE_URL = 'https://uoyzcboehvwxcadrqqfq.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveXpjYm9laHZ3eGNhZHJxcWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE4MzcsImV4cCI6MjA2ODg1NzgzN30.09tdQtyneRfAbQJRoVy5J9YpsuLTwn-EDF0tt2hUosg';

// One client per browser context, namespaced storageKey so it won't collide with
// client/worker (if you add those later, give them different keys).
function makeAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      storageKey: 'sb-jdkhomecare-admin',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

const g = typeof globalThis !== 'undefined' ? globalThis : window;
if (!g.__SB_JDK_ADMIN__) {
  g.__SB_JDK_ADMIN__ = makeAdminClient();
}

export const sbAdmin = g.__SB_JDK_ADMIN__;
