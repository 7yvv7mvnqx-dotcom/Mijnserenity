import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nl.mijnserenity.app',
  appName: 'MijnSerenity',
  webDir: 'www',
  backgroundColor: '#06162b',
  loggingBehavior: 'debug',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  }
};

export default config;
