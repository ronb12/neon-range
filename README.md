# Neon Range

A seated WebXR laser gallery. Clear the plates. Keep the combo. Leave the no-shoot marks alone.

## Assets (CC0)

Third-party art is from [Kenney](https://kenney.nl) (CC0):

- [Blaster Kit](https://kenney.nl/assets/blaster-kit) — `blaster-g` laser
- [Sci-Fi Sounds](https://opengameart.org/content/sci-fi-sounds) — laser and impact one-shots

The range itself is the original neon gallery (not the Space Station tile kit). That kit loaded without its colormap and turned the room into gray blocks.

Attribution is appreciated, not required.

## Deploy

This is a static Vite app. On Vercel, import the GitHub repo (framework: Vite). Production URL will serve HTTPS, which WebXR needs off localhost.

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Play

```bash
npm install
npm run dev
```

Chrome or Edge at `http://localhost:43177`. Enter VR with a connected headset, or play on desktop.

## How it plays

3-2-1, then 45 seconds. Walk the stall (WASD or left stick), snap-turn (Q/E or right stick), then fire. Gold pays more. Rush plates charge you. Marked plates reset the combo.
