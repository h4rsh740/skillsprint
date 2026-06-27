import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillsprint.ai',
  appName: 'SkillSprint AI',
  webDir: 'www',
  server: {
    url: 'https://skillsprint-h4rsh740s-projects.vercel.app',
    cleartext: false
  }
};

export default config;