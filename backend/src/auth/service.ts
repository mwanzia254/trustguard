import { createClient } from '@supabase/supabase-js';
import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import dotenv from 'dotenv';

dotenv.config();

// Client-side Supabase client (uses anon key) — for sign-up / sign-in which
// must go through Supabase Auth flow, not the service-role client
const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Register a new user via Supabase Auth.
   * The trigger `handle_new_user` auto-creates the profile row.
   */
  async register(input: RegisterInput) {
    const { name, email, phone, password } = input;

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone: phone || null },
      },
    });

    if (error) throw createError(error.message, 400);
    if (!data.user || !data.session) {
      throw createError('Registration failed — check email confirmation settings', 500);
    }

    // Update profile with phone if provided
    if (phone) {
      await supabase
        .from('profiles')
        .update({ phone, name })
        .eq('id', data.user.id);
    }

    const profile = await authService.getProfile(data.user.id);
    return { user: profile, token: data.session.access_token };
  },

  /**
   * Sign in via Supabase Auth.
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error) throw createError('Invalid credentials', 401);
    if (!data.user || !data.session) throw createError('Login failed', 500);

    // Check if banned via profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_banned) {
      throw createError('Account has been suspended', 403);
    }

    const userProfile = await authService.getProfile(data.user.id);
    return { user: userProfile, token: data.session.access_token };
  },

  /**
   * Fetch user profile from the profiles table.
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, role, is_verified, reputation_score, profile_image, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) throw createError('User not found', 404);

    // Attach email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    return { ...data, email: authUser?.user?.email ?? '' };
  },

  /**
   * Update FCM device token for push notifications.
   */
  async updateFcmToken(userId: string, fcmToken: string) {
    await supabase
      .from('profiles')
      .update({ fcm_token: fcmToken })
      .eq('id', userId);
  },

  /**
   * Confirm all unconfirmed users — run once after disabling email confirmation.
   */
  async confirmAllUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw createError('Failed to list users', 500);

    const unconfirmed = users.filter((u) => !u.email_confirmed_at);
    let count = 0;

    for (const user of unconfirmed) {
      await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      count++;
    }

    return { count };
  },
  async confirmAndLogin(input: { email: string; password: string; name?: string; phone?: string }) {
    const { email, password, name, phone } = input;

    // Find the user by email using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw createError('Failed to confirm account', 500);

    const authUser = users.find((u) => u.email === email);
    if (!authUser) throw createError('Account not found. Please register first.', 404);

    // Force-confirm the email using service role
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
    });
    if (updateError) throw createError('Failed to confirm email', 500);

    // Update profile name/phone if provided
    if (name || phone) {
      await supabase
        .from('profiles')
        .update({ name: name || '', phone: phone || null })
        .eq('id', authUser.id);
    }

    // Now sign in with the confirmed account
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw createError('Invalid credentials', 401);
    if (!signInData.session) throw createError('Login failed', 500);

    const profile = await authService.getProfile(authUser.id);
    return { user: profile, token: signInData.session.access_token };
  },
};
