// Ridgeline Courier — synthesised sound: engine hum, ring chime, thuds.
// Everything is generated with WebAudio; no audio files are loaded.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ensure() || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch {
      /* audio is decoration; never break the game */
    }
  }

  return {
    /** Call on the first user gesture so the browser unlocks audio. */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    /** Engine drone follows throttle; silent on the ground at idle. */
    engine(throttle, airborne) {
      if (!ensure() || muted || !engineGain) return;
      const target = airborne ? 0.02 + throttle * 0.05 : throttle * 0.03;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + throttle * 70, ctx.currentTime, 0.1);
    },
    ring() {
      blip(880, 0.35, 'sine', 0.16);
      blip(1318, 0.4, 'sine', 0.12, 0.07);
    },
    land() {
      blip(140, 0.25, 'triangle', 0.2);
      blip(90, 0.3, 'sine', 0.18, 0.05);
    },
    crash() {
      blip(70, 0.7, 'sawtooth', 0.22);
      blip(45, 0.9, 'square', 0.14, 0.1);
    },
    click() {
      blip(660, 0.08, 'sine', 0.1);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
