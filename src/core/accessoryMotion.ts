// Small timed motions of the accessories (src/ui/heroAccessories.ts). Pure: time in ms in, a
// strength out.

/** One glint: how long it takes to pop and fade */
export const GLINT_MS = 360;

/** Glint strength (0..1) at time t: a short pop once every `everyMs` */
export function glintAt(t: number, everyMs: number): number {
  const phase = t % everyMs;
  return phase < GLINT_MS ? Math.sin((phase / GLINT_MS) * Math.PI) : 0;
}

/** Brightness (min..1) at time t: a slow breath, full at 0, down to `min` halfway through `ms` */
export function pulseAt(t: number, pulse: { min: number; ms: number }): number {
  const wave = 0.5 + 0.5 * Math.cos((2 * Math.PI * t) / pulse.ms);
  return pulse.min + (1 - pulse.min) * wave;
}
