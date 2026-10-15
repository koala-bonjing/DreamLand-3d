# PWA & Android Deployment Research
Date: 2026-10-15
Sources:
- https://vite-pwa-org.netlify.app/guide/
- https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock
- https://vercel.com/docs/projects/project-configuration#headers

Key Findings:
1. `vite-plugin-pwa` with `registerType: 'autoUpdate'` handles Workbox service worker generation and offline asset precaching.
2. Web App Manifest requires `display: 'standalone'` or `'fullscreen'`, `theme_color: '#ffd9ec'`, and 192/512px maskable icons for Android installability.
3. `screen.orientation.lock('landscape')` is only permitted after a direct user gesture (e.g. tapping "Start Game") and while in fullscreen mode.
4. Always catch orientation lock errors, as desktop and certain mobile webviews reject orientation lock requests.
5. Vercel deployment utilizes `vercel.json` to configure HTTP headers:
   - Cache-Control `public, max-age=31536000, immutable` for hashed assets in `/assets/`.
   - Cache-Control `public, max-age=0, must-revalidate` for `index.html` and service workers.
6. Test PWA offline behavior by toggling network offline in DevTools and verifying the app shell loads without network requests.
