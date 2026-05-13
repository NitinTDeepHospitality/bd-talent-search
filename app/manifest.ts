import type { MetadataRoute } from 'next';

// PWA manifest. With this + the apple-touch-icon link in layout.tsx,
// Belinda can "Add to Home Screen" from iOS Safari and the app opens
// fullscreen with the BD launcher icon, no browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BD Talent Search',
    short_name: 'BD Talent',
    description: "A concept for institutionalising Belinda's craft",
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0907',
    theme_color: '#0B0907',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
