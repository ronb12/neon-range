import type { WebGLRenderer } from "three";

export type HeadsetState = "checking" | "ready" | "presenting" | "unsupported" | "insecure" | "no-api";

const SESSION_OPTIONS: XRSessionInit = {
  optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
};

export function xrSecure(): boolean {
  return window.isSecureContext;
}

export async function headsetAvailable(): Promise<HeadsetState> {
  if (!navigator.xr) return "no-api";
  if (!xrSecure()) return "insecure";
  try {
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    return ok ? "ready" : "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function startHeadsetSession(renderer: WebGLRenderer): Promise<XRSession> {
  if (!navigator.xr) throw new Error("This browser has no WebXR API.");
  if (!xrSecure()) {
    throw new Error("WebXR needs a secure page (localhost or HTTPS).");
  }

  const supported = await navigator.xr.isSessionSupported("immersive-vr");
  if (!supported) {
    throw new Error("A headset is not exposed to this browser. Wake it in Link, SteamVR, or OpenXR, then use Chrome or Edge.");
  }

  renderer.xr.setReferenceSpaceType("local-floor");
  const session = await navigator.xr.requestSession("immersive-vr", SESSION_OPTIONS);
  try {
    await renderer.xr.setSession(session);
    return session;
  } catch {
    await session.end().catch(() => undefined);
    renderer.xr.setReferenceSpaceType("local");
    const fallback = await navigator.xr.requestSession("immersive-vr", SESSION_OPTIONS);
    await renderer.xr.setSession(fallback);
    return fallback;
  }
}

export function watchHeadset(onChange: (state: HeadsetState) => void) {
  const refresh = () => {
    void headsetAvailable().then(onChange);
  };
  refresh();
  navigator.xr?.addEventListener("devicechange", refresh);
  return () => navigator.xr?.removeEventListener("devicechange", refresh);
}
