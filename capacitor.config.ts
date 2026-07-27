import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.my.cekkontainer.app',
  appName: 'Prana Verify',
  webDir: 'public',
  server: {
    // Allows switching between local dev server and remote production URL
    url: process.env.CAPACITOR_SERVER_URL || 'https://cek-kontainer.my.id',
    cleartext: process.env.NODE_ENV === 'development',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
