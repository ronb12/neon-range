# Neon Range

A seated WebXR target gallery. Point a ray, pull the trigger, chase combo.

## Play on a headset

WebXR needs a secure context. On the headset itself that means **HTTPS** (or `localhost`).

```bash
npm install
npm run dev:headset
```

That serves HTTPS on port `43178`. In the Quest (or other XR) browser:

1. Open the Network URL Vite prints (`https://<your-lan-ip>:43178`).
2. Accept the self-signed certificate warning once.
3. Tap **Put on headset** / **ENTER VR**.
4. Aim the controller laser at **SHOOT TO START** and squeeze trigger.

Quest Browser can also **Add to Apps** from the page menu so the range sits on the library shelf like a PWA.

If you only want a desktop preview (HTTP):

```bash
npm run dev
```

## Controls

| Surface | Aim | Fire |
| --- | --- | --- |
| Headset | Controller laser | Trigger |
| Desktop | Mouse | Click / hold |

Round length is 45 seconds. Hits add combo; a miss resets it. Distant targets pay a small bonus. The HTML HUD hides in VR — score lives on the back-wall board.

## Stack

Vite, TypeScript, Three.js (`WebGLRenderer.xr`, `local-floor`, VR controllers, haptics).
