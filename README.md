# Neon Range

A seated WebXR target gallery. Point a ray, pull the trigger, chase combo.

## Headset already connected

Use the PC the headset is attached to (Meta Link, Air Link, SteamVR, or OpenXR).

```bash
npm install
npm run dev
```

Open **Chrome or Edge** at `http://localhost:43177` (localhost is a secure context). Wake the headset, then click **Enter VR**. The round starts in the HMD.

If this page is inside an embedded preview, WebXR often cannot see the headset — open the same URL in a real Chrome/Edge window.

Quest Browser (no PC link): `npm run dev:headset` and open the HTTPS LAN URL in the headset.

## Controls

| Surface | Aim | Fire |
| --- | --- | --- |
| Headset | Controller laser | Trigger (or squeeze) |
| Desktop | Mouse | Click / hold |

Round length is 45 seconds. Hits add combo; a miss resets it. Score lives on the back-wall board while you are in VR.

## Stack

Vite, TypeScript, Three.js WebXR (`immersive-vr`, controller rays, trigger polling, haptics).
