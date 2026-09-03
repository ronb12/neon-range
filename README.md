# Neon Range

A seated WebXR target gallery — the shooting game you can actually make in about five minutes of design, and play in a 45-second round.

No locomotion. No weapons locker. No multiplayer. You stand (or sit), point a ray, pull the trigger, and chase combo.

## Why this game

WebXR shooting fantasies get expensive fast (full FPS, reloading, cover, IK hands). The slice that fits a short build is a **gallery range**:

- Raycast from the controller (or the mouse)
- Floating targets
- Score + combo + a timer
- Desktop fallback so you can test without a headset

## Play

```bash
npm install
npm run dev
```

Open the printed local URL. Click **Start range**, then click targets. Hold the mouse to rapid-fire.

If the browser exposes WebXR, use **Enter VR** and squeeze the controller trigger.

Headset testing usually needs HTTPS (or `localhost`). This repo serves HTTP for local preview; put it behind HTTPS when you take a Quest into the room.

## Controls

| Surface | Aim | Fire |
| --- | --- | --- |
| Desktop / phone | Mouse or tap | Click / hold |
| Headset | Controller laser | Trigger (`select`) |

Round length is 45 seconds. Hits add combo; a miss resets it. Distant targets pay a small bonus.

## Stack

Vite, TypeScript, Three.js (`WebGLRenderer.xr`, `VRButton`, XR controller models).
