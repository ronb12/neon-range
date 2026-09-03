# Neon Range

A seated WebXR target gallery. Point a ray, pull the trigger, chase combo.

## How it plays

Forty-five seconds, then the lane goes dark.

- **Cyan / mint plates** — standard work
- **Gold plates** — farther, faster, pay 250 × combo
- **Pink rush plates** — they charge you and vanish if you wait
- **White core** — bullseye bonus
- Misses dump the combo. House best is saved in the browser.

A 3-2-1 countdown starts every run, including when you **Enter VR** with a connected headset.

## Run it

```bash
npm install
npm run dev
```

Open Chrome or Edge at `http://localhost:43177`. Wake the headset, click **Enter VR**. Or **Play on desktop** and click / hold to fire.

Headset on the Quest browser: `npm run dev:headset` and open the HTTPS LAN URL.

## Stack

Vite, TypeScript, Three.js WebXR.
