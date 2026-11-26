// Coral Sky Run — synthesised sound, no audio files.
// One clear job: engine drone, wind rush, ring chimes and landing/crash
// stings, all built from WebAudio oscillators and filtered noise.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.windGain = null;
    this.windFilter = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.buildEngine();
      this.buildWind();
    } catch (e) {
      this.ctx = null; // no audio on this browser; the game plays on mute
    }
  }

  buildEngine() {
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 62;
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = 31;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    this.engineOsc.connect(filter);
    sub.connect(subGain);
    subGain.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);
    this.engineOsc.start();
    sub.start();
    this.engineSub = sub;
  }

  buildWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(ctx.destination);
    src.start();
  }

  setEngine(throttle, speed01, airborne) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const target = airborne ? 0.045 + throttle * 0.075 : throttle * 0.05;
    this.engineGain.gain.setTargetAtTime(target, t, 0.15);
    this.engineOsc.frequency.setTargetAtTime(58 + throttle * 46 + speed01 * 12, t, 0.2);
    this.engineSub.frequency.setTargetAtTime(29 + throttle * 23, t, 0.2);
    this.windGain.gain.setTargetAtTime(airborne ? speed01 * 0.11 : 0, t, 0.2);
    this.windFilter.frequency.setTargetAtTime(350 + speed01 * 900, t, 0.2);
  }

  blip(freq, dur, type = "sine", vol = 0.2) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  }

  ringChime() {
    this.blip(880, 0.5, "sine", 0.22);
    setTimeout(() => this.blip(1318, 0.6, "sine", 0.18), 90);
    setTimeout(() => this.blip(1760, 0.7, "sine", 0.12), 180);
  }

  touchdown() {
    this.blip(140, 0.35, "triangle", 0.3);
    this.blip(90, 0.5, "sine", 0.25);
  }

  crashThud() {
    this.blip(70, 0.8, "sawtooth", 0.35);
    this.blip(45, 1.0, "triangle", 0.3);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      if (this.muted) {
        this.engineGain.gain.setTargetAtTime(0, t, 0.05);
        this.windGain.gain.setTargetAtTime(0, t, 0.05);
      }
    }
    return this.muted;
  }
}
