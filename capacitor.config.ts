import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chainpack.rush',
  appName: 'Chainpack Rush',
  webDir: 'dist',
  backgroundColor: '#120e1a',
  plugins: {
    StatusBar: { overlaysWebView: true },
  },
};

export default config;
