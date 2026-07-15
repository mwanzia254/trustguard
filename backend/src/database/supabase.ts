import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[ScamChek] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Copy backend/.env.example to backend/.env and fill in your Supabase credentials.\n' +
    'Get the Service Role key from: Supabase Dashboard → Settings → API → service_role'
  );
}

// Service-role client for backend — bypasses Row Level Security for admin operations
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-key',
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

// Verify a user JWT issued by Supabase Auth
export const verifySupabaseToken = async (token: string) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};
