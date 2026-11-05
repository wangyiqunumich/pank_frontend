import { useEffect, useRef, useState } from 'react';
import calibration from './loadingCalibration.json';

// A presentation estimate, not model-token completion. The checklist is driven
// separately by real events. Reserve the final 9% for slower-than-average runs.
const phases = ['initial_reasoning', 'context_and_query', 'evidence_and_review'];
export const PROGRESS_SEGMENTS = [
  { durationMs: calibration.mean_admission_ms, end: 2 },
  ...phases.map((phase, index) => ({
    durationMs: calibration.mean_phase_ms[phase],
    end: 2 + 88 * phases.slice(0, index + 1).reduce((sum, key) => sum + calibration.mean_phase_ms[key], 0) / calibration.mean_total_ms,
  })),
];
const expectedMs = PROGRESS_SEGMENTS.reduce((sum, segment) => sum + segment.durationMs, 0);
export function estimatedTarget(activeMs, observedPhase = 0) {
  let startMs = 0, startProgress = 0, target = 0;
  for (const segment of PROGRESS_SEGMENTS) {
    if (activeMs <= startMs + segment.durationMs) {
      const fraction = Math.max(0, (activeMs - startMs) / segment.durationMs);
      target = startProgress + (segment.end - startProgress) * (1 - Math.pow(1 - fraction, 1.3));
      break;
    }
    startMs += segment.durationMs;
    startProgress = segment.end;
    target = segment.end;
  }
  if (activeMs > expectedMs) target = 90 + 9 * (1 - Math.exp(-(activeMs - expectedMs) / calibration.mean_total_ms));
  const eventFloor = observedPhase > 0 ? PROGRESS_SEGMENTS[Math.min(observedPhase, 4) - 1].end : 0;
  return Math.min(99, Math.max(target, eventFloor));
}

export function useEstimatedProgress(options) {
  const enabled = Boolean(options);
  const runKey = options?.runKey;
  const settings = useRef(options);
  settings.current = options;
  const clock = useRef({ runKey, activeMs: 0, value: 0, phase: 0, lastTick: Date.now() });
  const [value, setValue] = useState(0);
  useEffect(() => {
    const previous = clock.current;
    // Admission supplies the ID for the same question; only a different real
    // question resets the visual clock. Never reuse another run's progress.
    const admission = previous.runKey === 'submitting' && runKey;
    if (previous.runKey !== runKey && !admission) {
      clock.current = { runKey, activeMs: 0, value: 0, phase: 0, lastTick: Date.now() };
      setValue(0);
    } else previous.runKey = runKey;
  }, [runKey]);
  useEffect(() => {
    if (!enabled) return;
    clock.current.lastTick = Date.now();
    const timer = setInterval(() => {
      const state = clock.current, current = settings.current;
      const now = Date.now();
      // Avoid a large visual jump after a background tab resumes.
      const dt = Math.min(250, Math.max(0, now - state.lastTick));
      state.lastTick = now;
      if (!current || current.paused || document.hidden) return;
      state.activeMs += dt;
      state.phase = Math.max(state.phase, current.phase || 0);
      const target = estimatedTarget(state.activeMs, state.phase);
      // Smooth event-driven target changes, with a hard speed limit; Qwen can
      // revisit planning without ever pulling the bar backwards.
      state.value = Math.min(99, state.value + Math.max(0, Math.min(dt * 0.02, (target - state.value) * (1 - Math.exp(-dt / 600)))));
      setValue(state.value);
    }, 50);
    return () => clearInterval(timer);
  }, [enabled]);
  return value;
}
