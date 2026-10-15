---
name: pwa-android-deploy
description: PWA, fullscreen, and Vercel deploy for Android. Use when adding manifest, service worker, install prompt, orientation or fullscreen behavior, caching headers, or deployment.
---
# PWA Android Deploy

## Rules
1. Configure `vite-plugin-pwa` with `registerType: 'autoUpdate'` and precache all app shell assets.
2. Web App Manifest must include `theme_color: '#ffd9ec'`, `background_color: '#ffd9ec'`, and maskable icons.
3. Call Fullscreen API (`document.documentElement.requestFullscreen()`) strictly upon user gesture.
4. Call `screen.orientation.lock('landscape')` only after entering fullscreen; always wrap in `.catch()`.
5. Provide offline smoke test: app shell, canvas, and menus must load with zero network connectivity.
6. Configure `vercel.json` with `immutable` caching (1 year) for `/assets/*` and `must-revalidate` for `index.html`.
7. Test preview URL on an actual Android device before production release.

## Snippets

### Fullscreen & Orientation Lock
```ts
export async function enterGameFullscreen(el: HTMLElement): Promise<void> {
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    }
    if ('orientation' in screen && 'lock' in screen.orientation) {
      await (screen.orientation as any).lock('landscape').catch(() => {});
    }
  } catch (err) {
    console.warn('Fullscreen/orientation lock skipped:', err);
  }
}
```

### Vercel Header Config
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

## Pitfalls
- Invoking orientation lock without a prior user gesture throws an unhandled SecurityError on mobile browsers.
- Caching `index.html` immutably prevents users from receiving client updates.

## Sources
- https://vite-pwa-org.netlify.app/guide/ (2026-10-15)
- https://vercel.com/docs/projects/project-configuration#headers (2026-10-15)
