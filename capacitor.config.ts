import type { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: For an OFFLINE-CAPABLE APK we must NOT set `server.url`.
// When `server.url` is defined, Capacitor loads the app from that remote URL,
// which requires internet. Without it, Capacitor serves the bundled `dist/`
// (webDir) from the device, so the app works fully offline after install.
//
// If you want hot-reload during development from the Lovable sandbox,
// temporarily uncomment the `server` block below — but remove it again
// before producing the release APK.
const config: CapacitorConfig = {
  appId: 'app.lovable.cfe5e6d123a9416a9a3e0b7f102c3a1e',
  appName: 'pixcoolart',
  webDir: 'dist',
  // server: {
  //   url: 'https://cfe5e6d1-23a9-416a-9a3e-0b7f102c3a1e.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;
