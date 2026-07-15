import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'contributor' | 'admin';
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('tg_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));

async function applySession(session: Session | null) {
  if (!session) {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    return;
  }

  const token = session.access_token;
  localStorage.setItem('tg_token', token);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, phone, role, is_verified')
    .eq('id', session.user.id)
    .maybeSingle();

  const user: User = {
    id:          session.user.id,
    name:        profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
    email:       session.user.email ?? '',
    phone:       profile?.phone ?? undefined,
    role:        (profile?.role ?? 'user') as User['role'],
    is_verified: profile?.is_verified ?? false,
  };

  useAuthStore.setState({ user, token, isAuthenticated: true, isLoading: false });
}

// Boot once — outside React, safe from StrictMode double-invoke
let booted = false;
export function bootAuth() {
  if (booted) return;
  booted = true;

  // 1. Check for existing session immediately on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    // Only apply if no auth state change has fired yet
    if (useAuthStore.getState().isLoading) {
      applySession(session);
    }
  });

  // 2. Listen for all future auth events
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      // Already handled by getSession above
      return;
    }
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('tg_token');
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    if (session) {
      applySession(session);
    }
  });
}
