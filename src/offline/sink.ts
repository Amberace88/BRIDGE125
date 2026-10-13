/**
 * The app store's profile patcher, registered by the app shell, so results that the offline queue sends later (when
 * the screen that recorded them is gone) still merge into the profile — same path as a live result, toasts included.
 */
type Patch = (p: Record<string, unknown>) => void;
let sink: Patch | null = null;
export const registerProfileSink = (f: Patch | null) => { sink = f; };
export const patchAppProfile = (p: Record<string, unknown>) => { sink?.(p); };
