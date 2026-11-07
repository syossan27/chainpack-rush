import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chainpack.rush',
  appName: 'Chainpack Rush',
  webDir: 'dist',
  backgroundColor: '#14121c',
  plugins: {
    StatusBar: { overlaysWebView: true },
  },
};

export default config;
