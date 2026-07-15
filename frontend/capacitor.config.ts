import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:    'co.ke.scamchek',
  appName:  'ScamChek',
  webDir:   'dist',
  server: {
    // Use the live Supabase URL directly — no local server needed
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath:     'release-key.jks',
      keystoreAlias:    'scamchek',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor:    '#1e3a8a',   // primary-900 (dark blue)
      androidSplashResourceName: 'splash',
      showSpinner:        false,
    },
    StatusBar: {
      style:           'dark',
      backgroundColor: '#1e3a8a',
    },
  },
};

export default config;
