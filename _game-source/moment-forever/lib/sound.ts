// Original, procedurally composed ambient score. No downloaded recordings.
export class ShoreSound {
  private context: AudioContext;
  private master: GainNode;
  private piano: GainNode;
  private timer: ReturnType<typeof setInterval> | undefined;
  private noteIndex = 0;
  constructor() {
    this.context = new AudioContext();
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = 0.38;
    this.master.connect(c.destination);
    this.piano = c.createGain();
    this.piano.gain.value = 0.65;
    this.piano.connect(this.master);
    const buffer = c.createBuffer(1, c.sampleRate * 8, c.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) {
      last = (last + Math.random() * 0.036 - 0.018) / 1.018;
      samples[i] = last * 3.5;
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 720;
    const swell = c.createGain();
    swell.gain.value = 0.36;
    noise.connect(low);
    low.connect(swell);
    swell.connect(this.master);
    noise.start();
    const tide = c.createOscillator();
    tide.frequency.value = 0.095;
    const tideDepth = c.createGain();
    tideDepth.gain.value = 0.22;
    tide.connect(tideDepth);
    tideDepth.connect(swell.gain);
    tide.start();
    const delay = c.createDelay(3);
    delay.delayTime.value = 0.73;
    const feedback = c.createGain();
    feedback.gain.value = 0.28;
    this.piano.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    feedback.connect(this.master);
    this.playNote();
    this.timer = setInterval(() => this.playNote(), 3400);
  }
  private playNote() {
    if (this.context.state !== 'running') return;
    // A slow, unresolved pentatonic melody with pauses between phrases.
    const melody = [
      57, 64, 69, 71, 64, 0, 66, 64, 59, 62, 64, 0, 57, 61, 64, 69, 66, 0,
    ];
    const note = melody[this.noteIndex++ % melody.length];
    if (!note) return;
    this.tone(note, 0.13, 4.5);
    if (this.noteIndex % 4 === 1) this.tone(note - 24, 0.07, 7);
  }
  private tone(midi: number, volume: number, length: number) {
    const c = this.context,
      now = c.currentTime;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    [1, 2, 3].forEach((partial, i) => {
      const oscillator = c.createOscillator();
      const envelope = c.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency * partial;
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(
        volume / (1 + i * 5),
        now + 0.025,
      );
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        now + length / (1 + i * 0.4),
      );
      oscillator.connect(envelope);
      envelope.connect(this.piano);
      oscillator.start(now);
      oscillator.stop(now + length + 0.1);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    });
  }
  async enabled(value: boolean) {
    if (value) await this.context.resume();
    else await this.context.suspend();
  }
  remembering(value: boolean) {
    this.master.gain.setTargetAtTime(
      value ? 0.23 : 0.38,
      this.context.currentTime,
      0.8,
    );
  }
  chime(index: number) {
    this.tone([69, 71, 74, 76][index % 4], 0.09, 5);
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    void this.context.close();
  }
}
