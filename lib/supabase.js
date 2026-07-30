'use client';

import { createClient } from '@supabase/supabase-js';

// Same project the legacy build talked to. These are the publishable
// (anon) values — safe in the client, and already public in the old
// index.html; every real authorisation decision is made server-side.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fgnosgawafdotmyjslmy.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client;

export function supabase() {
  if (!client) {
    client = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export async function currentSession() {
  const { data: { session } } = await supabase().auth.getSession();
  return session || null;
}

// profiles.role is what decides which portal a person belongs in. It is read
// here for routing only — the backend re-checks it on every request, because a
// role read in the browser is a hint, not a permission.
export async function currentProfile(session) {
  if (!session) return null;
  const { data } = await supabase()
    .from('profiles')
    .select('role, full_name, tutor_name, assigned_tutor')
    .eq('id', session.user.id)
    .single();
  return data || null;
}
