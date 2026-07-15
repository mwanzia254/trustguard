import admin from 'firebase-admin';
import { supabase } from '../database/supabase';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
    });
    logger.info('Firebase Admin SDK initialized');
  } else {
    logger.warn('Firebase credentials not set — FCM notifications disabled');
  }
}

const messaging = admin.apps.length ? admin.messaging() : null;

async function sendToToken(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!messaging) return false;
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: data || {},
      android: { priority: 'high' },
      apns:    { payload: { aps: { sound: 'default' } } },
    });
    return true;
  } catch (err: any) {
    // Invalid token — clean it up
    if (err.code === 'messaging/registration-token-not-registered') {
      await supabase.from('profiles').update({ fcm_token: null }).eq('fcm_token', fcmToken);
    }
    logger.warn('FCM send failed:', err.message);
    return false;
  }
}

export const fcmService = {
  /**
   * Notify a specific user by their profile ID.
   */
  async notifyUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (!profile?.fcm_token) return;
    await sendToToken(profile.fcm_token, title, body, data);
  },

  /**
   * Notify all admin users.
   */
  async notifyAdmins(title: string, body: string, data?: Record<string, string>) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('role', 'admin')
      .not('fcm_token', 'is', null);

    if (!admins || admins.length === 0) return;

    await Promise.allSettled(
      admins.map((a: any) => sendToToken(a.fcm_token, title, body, data))
    );
  },

  /**
   * Notify a user when their report is approved/rejected.
   */
  async notifyReportStatus(userId: string, status: 'approved' | 'rejected', reportId: string) {
    const messages = {
      approved: {
        title: '✅ Report Approved',
        body:  'Your scam report has been reviewed and approved. Thank you for protecting the community!',
      },
      rejected: {
        title: '❌ Report Rejected',
        body:  'Your report was reviewed but could not be approved. It may lack sufficient evidence.',
      },
    };
    const msg = messages[status];
    await fcmService.notifyUser(userId, msg.title, msg.body, { reportId, status });
  },

  /**
   * Warn a user who recently searched a seller that just got new reports.
   */
  async notifyRecentSearchers(sellerId: string, newReportCount: number) {
    if (!messaging) return;

    // Find users who searched this seller in the past 30 days
    const { data: searchers } = await supabase
      .from('searches')
      .select('user_id')
      .eq('seller_id', sellerId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

    if (!searchers || searchers.length === 0) return;

    const userIds = [...new Set(searchers.map((s: any) => s.user_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('fcm_token')
      .in('id', userIds)
      .not('fcm_token', 'is', null);

    if (!profiles || profiles.length === 0) return;

    await Promise.allSettled(
      profiles.map((p: any) =>
        sendToToken(
          p.fcm_token,
          '⚠️ Scam Alert',
          `A seller you recently searched has received ${newReportCount} new scam report(s).`,
          { sellerId }
        )
      )
    );
  },
};
