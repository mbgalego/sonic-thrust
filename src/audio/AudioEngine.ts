/**
 * Sonic Thrust - Web Audio Engine
 * Handles real-time FFT analysis, BPM peak detection, procedural sound synthesis,
 * local track decoding, and continuous sound effects.
 */

import { AudioFrequencyData, TrackMetadata, PowerUpType } from '../types/game';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPreGain: GainNode | null = null; // Pre-fader bus: unity gain connected to analyser
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private tickAlt: boolean = false; // alternates tic / toc in countdown ticks
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  
  // Playback state
  private playbackStartTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private trackDuration: number = 0;

  // Real-time FFT analysis cache & Envelope Followers
  private freqByteData: Uint8Array = new Uint8Array(512);
  private lerpedBass: number = 0;
  private lerpedMids: number = 0;
  private lerpedTreble: number = 0;
  private lerpedEnergy: number = 0;
  private energyHistory: number[] = [];
  private beatCooldown: number = 0;

  // Multi-band Attack/Decay envelope followers (for musical dynamics without jitter)
  private envSubBass: number = 0;
  private envBass: number = 0;
  private envLowMids: number = 0;
  private envHighMids: number = 0;
  private envTreble: number = 0;
  private beatPulse: number = 0;
  private macroEnergy: number = 0; // Macro envelope tracking musical movement (breakdown vs drop)

  // Procedural thruster & radar proximity audio nodes
  private leftThrusterGain: GainNode | null = null;
  private rightThrusterGain: GainNode | null = null;
  private thrusterNoiseSource: AudioBufferSourceNode | null = null;
  private thrusterOscL: OscillatorNode | null = null;
  private thrusterOscR: OscillatorNode | null = null;
  private scrapeGain: GainNode | null = null;
  private currentMusicVolume: number = 0.85;
  private lastRadarClickTime: number = 0;
  private bufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    // Lazy init on first user interaction
  }

  public async init(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Master, SFX Routing
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Pre-fader music bus with constant 1.0 gain.
    // Tapped directly into analyser so FFT analysis ALWAYS receives 100% full-scale
    // track audio signal, even when music volume is lowered or muted!
    this.musicPreGain = this.ctx.createGain();
    this.musicPreGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Music gain controls audible playback volume to speakers
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.currentMusicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Feed pre-fader signal into musicGain
    this.musicPreGain.connect(this.musicGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Analyser Node for Real-time FFT connected PRE-FADER
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.40; // Faster response for more dynamic equalizer movement
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.musicPreGain.connect(this.analyser);

    this.freqByteData = new Uint8Array(this.analyser.frequencyBinCount);

    this.setupContinuousThrusterAudio();
  }

  private setupContinuousThrusterAudio(): void {
    if (!this.ctx || !this.sfxGain) return;

    try {
      // Noise buffer for jet exhaust
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-ish noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.thrusterNoiseSource = this.ctx.createBufferSource();
      this.thrusterNoiseSource.buffer = noiseBuffer;
      this.thrusterNoiseSource.loop = true;

      // Filter
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      noiseFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.thrusterNoiseSource.connect(noiseFilter);

      // Gains for L and R thrusters
      this.leftThrusterGain = this.ctx.createGain();
      this.leftThrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rightThrusterGain = this.ctx.createGain();
      this.rightThrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

      // Bass rumble oscillators for physical punch
      this.thrusterOscL = this.ctx.createOscillator();
      this.thrusterOscL.type = 'triangle';
      this.thrusterOscL.frequency.setValueAtTime(65, this.ctx.currentTime);
      this.thrusterOscL.connect(this.leftThrusterGain);

      this.thrusterOscR = this.ctx.createOscillator();
      this.thrusterOscR.type = 'triangle';
      this.thrusterOscR.frequency.setValueAtTime(70, this.ctx.currentTime);
      this.thrusterOscR.connect(this.rightThrusterGain);

      noiseFilter.connect(this.leftThrusterGain);
      noiseFilter.connect(this.rightThrusterGain);

      this.leftThrusterGain.connect(this.sfxGain);
      this.rightThrusterGain.connect(this.sfxGain);

      this.thrusterNoiseSource.start();
      this.thrusterOscL.start();
      this.thrusterOscR.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateThrusterAudio(leftPower: number, rightPower: number): void {
    if (!this.ctx || !this.leftThrusterGain || !this.rightThrusterGain) return;
    const now = this.ctx.currentTime;
    // Fast ramp to prevent clicks
    const lGain = Math.max(0, Math.min(1, leftPower)) * 0.28;
    const rGain = Math.max(0, Math.min(1, rightPower)) * 0.28;
    this.leftThrusterGain.gain.setTargetAtTime(lGain, now, 0.04);
    this.rightThrusterGain.gain.setTargetAtTime(rGain, now, 0.04);
  }

  /**
   * High-tech Sonar / Geiger Radar Clicks for terrain & ceiling proximity.
   * Click frequency accelerates exponentially as the craft approaches danger.
   */
  public updateRadarClicks(intensity: number): void {
    if (!this.ctx || intensity <= 0.04) return;
    const now = this.ctx.currentTime;
    // Interval scales from 0.48s (initial warning) down to 0.045s (critical imminent impact)
    const interval = 0.045 + 0.44 * Math.pow(Math.max(0, 1.0 - intensity), 2.2);

    if (now - this.lastRadarClickTime >= interval) {
      this.lastRadarClickTime = now;
      this.playRadarClick(intensity);
    }
  }

  private playRadarClick(intensity: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Sharp acoustic chirping sonar click: 2400Hz up to 3600Hz at highest proximity
      const baseFreq = 2300 + intensity * 1300;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.015);

      const clickGain = 0.12 + intensity * 0.16;
      gain.gain.setValueAtTime(clickGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.022);
    } catch {
      // Audio node cleanup
    }
  }

  /**
   * Instantly silences all continuous sound nodes (thruster rumble, radar clicks, etc.)
   * Used when exiting to menu, pausing, restarting, or on ship death.
   */
  public silenceAllContinuous(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      if (this.leftThrusterGain) {
        this.leftThrusterGain.gain.cancelScheduledValues(now);
        this.leftThrusterGain.gain.setValueAtTime(0, now);
      }
      if (this.rightThrusterGain) {
        this.rightThrusterGain.gain.cancelScheduledValues(now);
        this.rightThrusterGain.gain.setValueAtTime(0, now);
      }
      if (this.scrapeGain) {
        this.scrapeGain.gain.cancelScheduledValues(now);
        this.scrapeGain.gain.setValueAtTime(0, now);
      }
    } catch {
      // Ignore
    }
    this.lastRadarClickTime = 0;
  }

  /**
   * Smoothly fades out track music upon losing and cuts off playback.
   */
  public fadeOutAndStopTrack(duration: number = 0.85): void {
    if (!this.ctx || !this.musicGain || !this.isPlaying || !this.currentSource) {
      this.stopTrack();
      return;
    }

    const now = this.ctx.currentTime;
    try {
      const currentVol = Math.max(0.001, this.musicGain.gain.value);
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(currentVol, now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } catch {
      // Fallback
    }

    setTimeout(() => {
      this.stopTrack();
      if (this.ctx && this.musicGain) {
        this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(this.currentMusicVolume, this.ctx.currentTime);
      }
    }, duration * 1000);
  }

  public setVolumes(musicVol: number, sfxVol: number): void {
    this.currentMusicVolume = Math.max(0, Math.min(1, musicVol));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.musicGain && this.isPlaying) {
      this.musicGain.gain.setTargetAtTime(this.currentMusicVolume, now, 0.05);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, sfxVol)), now, 0.05);
    }
  }

  /**
   * Loads an AudioBuffer from URL or returns a synthesized procedural track
   */
  public async loadTrack(track: TrackMetadata): Promise<AudioBuffer> {
    await this.init();
    if (!this.ctx) throw new Error('AudioContext not ready');

    if (track.audioBuffer) {
      this.bufferCache.set(track.id, track.audioBuffer);
      return track.audioBuffer;
    }

    if (this.bufferCache.has(track.id)) {
      return this.bufferCache.get(track.id)!;
    }

    // Try fetching from local file path (encodeURI handles spaces, hyphens, and brackets)
    const trackPath = encodeURI(`/tracks/${track.filename}`);
    try {
      const response = await fetch(trackPath);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        let decoded: AudioBuffer;
        try {
          decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
        } catch {
          decoded = await new Promise<AudioBuffer>((resolve, reject) => {
            this.ctx!.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
          });
        }
        this.bufferCache.set(track.id, decoded);
        return decoded;
      }
    } catch {
      // File not found on disk, fallback to high-fidelity procedural synth track
    }

    // Procedural synthesizer track generator
    const proceduralBuffer = this.generateProceduralTrack(
      track.estimatedBpm || 130,
      track.duration || 90,
      track.id
    );
    this.bufferCache.set(track.id, proceduralBuffer);
    return proceduralBuffer;
  }


  /**
   * Offline Beat Detection & BPM Estimator using peak spectral flux
   */
  public detectBpmFromBuffer(buffer: AudioBuffer): number {
    try {
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      const stepSize = Math.floor(sampleRate / 100); // 10ms windows
      const totalSteps = Math.min(Math.floor(channelData.length / stepSize), 3000); // Inspect first 30s
      
      const energyLevels: number[] = [];
      for (let i = 0; i < totalSteps; i++) {
        let sum = 0;
        const start = i * stepSize;
        const end = Math.min(start + stepSize, channelData.length);
        for (let j = start; j < end; j++) {
          sum += channelData[j] * channelData[j];
        }
        energyLevels.push(Math.sqrt(sum / stepSize));
      }

      // Detect peaks above threshold
      const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
      const threshold = avgEnergy * 1.45;
      const peakIndices: number[] = [];
      
      for (let i = 1; i < energyLevels.length - 1; i++) {
        if (
          energyLevels[i] > threshold &&
          energyLevels[i] > energyLevels[i - 1] &&
          energyLevels[i] > energyLevels[i + 1]
        ) {
          if (peakIndices.length === 0 || (i - peakIndices[peakIndices.length - 1]) > 18) { // min 180ms
            peakIndices.push(i);
          }
        }
      }

      // Interval frequency estimation
      if (peakIndices.length > 5) {
        const intervals: number[] = [];
        for (let i = 1; i < peakIndices.length; i++) {
          intervals.push((peakIndices[i] - peakIndices[i - 1]) * 10); // in ms
        }
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];
        if (medianInterval > 250 && medianInterval < 1000) {
          const rawBpm = Math.round(60000 / medianInterval);
          if (rawBpm >= 90 && rawBpm <= 180) return rawBpm;
          if (rawBpm < 90) return rawBpm * 2;
          if (rawBpm > 180) return Math.round(rawBpm / 2);
        }
      }
    } catch {
      // Fallback
    }
    return 128;
  }

  /**
   * Generates a high-octane 16-bit Synthwave audio buffer procedurally
   */
  public generateProceduralTrack(bpm: number, durationSeconds: number, styleId: string): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext required');
    const sampleRate = this.ctx.sampleRate;
    const totalSamples = Math.floor(sampleRate * durationSeconds);
    const audioBuffer = this.ctx.createBuffer(2, totalSamples, sampleRate);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    const secondsPerBeat = 60 / bpm;

    // Scale notes in Hz
    // Key: D minor / F major synthwave vibe
    const rootD = 73.42; // D2
    const bassline = [
      rootD, rootD, rootD * 1.5, rootD, // D, D, A, D
      rootD * 1.189, rootD * 1.189, rootD * 1.334, rootD * 1.189, // F, F, G, F
      rootD * 1.334, rootD * 1.334, rootD * 1.5, rootD * 1.334, // G, G, A, G
      rootD * 0.89, rootD * 0.89, rootD, rootD * 1.5 // C, C, D, A
    ];

    const leadNotes = [
      293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66, // D4, F4, A4, C5, A4, G4, F4, D4
      349.23, 392.0, 440.0, 587.33, 523.25, 440.0, 349.23, 329.63
    ];

    const stylePitchFactor = styleId.includes('velocity') ? 1.15 : styleId.includes('dark') ? 0.85 : 1.0;

    let phaseBass = 0;
    let phaseLead = 0;
    let phasePad = 0;

    for (let i = 0; i < totalSamples; i++) {
      const timeInSec = i / sampleRate;
      const currentBeat = timeInSec / secondsPerBeat;
      const beatProgress = currentBeat % 1;
      const current16th = Math.floor(timeInSec / (secondsPerBeat / 4));
      const sub16Progress = (timeInSec / (secondsPerBeat / 4)) % 1;

      let sampleL = 0;
      let sampleR = 0;

      // 1. Kick Drum on every beat (4-on-the-floor)
      if (beatProgress < 0.22) {
        const kickEnv = Math.pow(1 - beatProgress / 0.22, 2.5);
        const kickFreq = 140 * Math.exp(-beatProgress * 22) + 42;
        const kickWave = Math.sin(2 * Math.PI * kickFreq * beatProgress * secondsPerBeat);
        const kickOut = kickWave * kickEnv * 0.75;
        sampleL += kickOut;
        sampleR += kickOut;
      }

      // 2. Snare / Clap on beats 2 and 4
      const beatInBar = Math.floor(currentBeat % 4);
      if ((beatInBar === 1 || beatInBar === 3) && beatProgress < 0.25) {
        const snareEnv = Math.pow(1 - beatProgress / 0.25, 2.0);
        const snareNoise = (Math.random() * 2 - 1) * snareEnv * 0.42;
        const snareTone = Math.sin(2 * Math.PI * 185 * beatProgress) * snareEnv * 0.25;
        sampleL += snareNoise + snareTone;
        sampleR += snareNoise + snareTone;
      }

      // 3. Hi-Hat on every off-beat 16th
      if (current16th % 2 === 1 && sub16Progress < 0.12) {
        const hatEnv = Math.pow(1 - sub16Progress / 0.12, 3.0);
        const hatNoise = (Math.random() * 2 - 1) * hatEnv * 0.18;
        sampleL += hatNoise * 0.9;
        sampleR += hatNoise * 1.1;
      }

      // 4. Rolling 16th Bassline
      const bassNote = bassline[current16th % bassline.length] * stylePitchFactor;
      phaseBass += (2 * Math.PI * bassNote) / sampleRate;
      const bassEnv = Math.pow(1 - sub16Progress, 1.3);
      // Sawtooth-like bass with odd harmonics
      const bassWave = (Math.sin(phaseBass) + 0.4 * Math.sin(phaseBass * 2) + 0.2 * Math.sin(phaseBass * 3)) * bassEnv;
      sampleL += bassWave * 0.38;
      sampleR += bassWave * 0.38;

      // 5. Synth Lead Arpeggio
      const leadNote = leadNotes[Math.floor(current16th / 2) % leadNotes.length] * stylePitchFactor;
      phaseLead += (2 * Math.PI * leadNote) / sampleRate;
      const leadEnv = Math.pow(1 - ((sub16Progress * 2) % 1), 1.8);
      const leadWave = (Math.sin(phaseLead) + 0.35 * Math.sin(phaseLead * 3)) * leadEnv;
      // Stereo delay / panning
      sampleL += leadWave * 0.22;
      sampleR += leadWave * 0.28;

      // 6. Cyber Ambient Pad
      const padFreq = (rootD * 4) * stylePitchFactor;
      phasePad += (2 * Math.PI * padFreq) / sampleRate;
      const padWave = Math.sin(phasePad) * 0.12 * (0.8 + 0.2 * Math.sin(timeInSec * 1.5));
      sampleL += padWave;
      sampleR += padWave;

      // Master soft limiter / saturation
      leftChannel[i] = Math.tanh(sampleL * 0.92);
      rightChannel[i] = Math.tanh(sampleR * 0.92);
    }

    return audioBuffer;
  }

  /**
   * Start track playback
   */
  public playTrack(buffer: AudioBuffer, startOffset: number = 0): void {
    if (!this.ctx || !this.musicGain) return;

    this.stopTrack();

    this.currentBuffer = buffer;
    this.trackDuration = buffer.duration;
    this.pauseOffset = startOffset;

    this.currentSource = this.ctx.createBufferSource();
    this.currentSource.buffer = buffer;
    // Connect to pre-fader bus so analyser receives unmuted, full-scale signal
    if (this.musicPreGain) {
      this.currentSource.connect(this.musicPreGain);
    } else {
      this.currentSource.connect(this.musicGain);
    }

    this.playbackStartTime = this.ctx.currentTime - startOffset;
    this.currentSource.start(0, startOffset);
    this.isPlaying = true;
    this.isPaused = false;
  }

  public pauseTrack(): void {
    if (!this.ctx || !this.isPlaying || this.isPaused || !this.currentSource) return;
    this.pauseOffset = this.ctx.currentTime - this.playbackStartTime;
    this.currentSource.stop();
    this.currentSource.disconnect();
    this.currentSource = null;
    this.isPaused = true;
    this.isPlaying = false;
  }

  public resumeTrack(): void {
    if (this.currentBuffer && this.isPaused) {
      this.playTrack(this.currentBuffer, this.pauseOffset);
    }
  }

  public stopTrack(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Safe ignore
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseOffset = 0;
  }

  public getCurrentTime(): number {
    if (!this.ctx) return 0;
    if (this.isPaused) return this.pauseOffset;
    if (!this.isPlaying) return 0;
    return Math.min(this.trackDuration, Math.max(0, this.ctx.currentTime - this.playbackStartTime));
  }

  public getTrackDuration(): number {
    return this.trackDuration;
  }

  public isTrackPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Real-time Multi-Band FFT Extractor with Attack/Decay Envelope Followers
   * Splits audio into physical resonant bands:
   * Sub-Bass (20 - 85 Hz): Gravitational heave & bedrock shockwave expansion
   * Punch Bass (85 - 250 Hz): Kick transients & boundary thickness
   * Low-Mids (250 - 800 Hz): Harmonic spacing & acoustic warmth
   * High-Mids (800 - 4000 Hz): Snares, claps, vocal transients & neon edge flashes
   * Treble (4000 - 16000 Hz): Shimmer & hi-hat air
   */
  public getFrequencyData(lerpFactor: number = 0.22, dt: number = 0.016): AudioFrequencyData {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));

    if (!this.analyser || !this.isPlaying) {
      // Gentle musical exponential decay when stopped
      const decayFast = Math.exp(-safeDt / 0.12);
      const decaySlow = Math.exp(-safeDt / 0.25);
      this.envSubBass *= decaySlow;
      this.envBass *= decaySlow;
      this.envLowMids *= decaySlow;
      this.envHighMids *= decayFast;
      this.envTreble *= decayFast;
      this.beatPulse *= decayFast;
      this.macroEnergy *= decaySlow;
      this.lerpedBass *= 0.92;
      this.lerpedMids *= 0.92;
      this.lerpedTreble *= 0.92;
      this.lerpedEnergy *= 0.92;
      return {
        bass: this.lerpedBass,
        mids: this.lerpedMids,
        treble: this.lerpedTreble,
        energy: this.lerpedEnergy,
        isBeat: false,
        frequencyArray: this.freqByteData,
        subBass: this.envSubBass,
        lowMids: this.envLowMids,
        highMids: this.envHighMids,
        beatPulse: this.beatPulse,
        macroEnergy: this.macroEnergy,
        energyContrast: 0
      };
    }

    (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(this.freqByteData);
    const binCount = this.analyser.frequencyBinCount; // 512 bins (0 to ~22050Hz)
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const hzPerBin = nyquist / binCount;

    // Band bin limits calibrated to musical instrumentation:
    // Sub-Bass (20 - 85 Hz): Deep sub-kick & 808 drop
    // Punch Bass (85 - 250 Hz): Kick punch & bassline body
    // Low-Mids (250 - 900 Hz): Synth body, chords, acoustic warmth
    // High-Mids (900 - 4500 Hz): Snares, vocal leads, claps, crisp transients
    // Treble (4500 - 16000 Hz): Hi-hats, cymbals, air, and shimmer
    const subBassEndBin = Math.max(1, Math.min(binCount - 1, Math.floor(85 / hzPerBin)));
    const bassEndBin = Math.max(subBassEndBin + 1, Math.min(binCount - 1, Math.floor(250 / hzPerBin)));
    const lowMidsEndBin = Math.max(bassEndBin + 1, Math.min(binCount - 1, Math.floor(900 / hzPerBin)));
    const highMidsEndBin = Math.max(lowMidsEndBin + 1, Math.min(binCount - 1, Math.floor(4500 / hzPerBin)));
    const trebleEndBin = Math.max(highMidsEndBin + 1, Math.min(binCount - 1, Math.floor(16000 / hzPerBin)));

    // 1. Sub-Bass (20 - 85 Hz)
    let rawSubBass = 0;
    let countSubBass = 0;
    for (let i = 1; i <= subBassEndBin; i++) {
      rawSubBass += this.freqByteData[i];
      countSubBass++;
    }
    const normSubBass = countSubBass > 0 ? (rawSubBass / countSubBass) / 255 : 0;

    // 2. Punch Bass (85 - 250 Hz)
    let rawBassPunch = 0;
    let countBassPunch = 0;
    for (let i = subBassEndBin + 1; i <= bassEndBin; i++) {
      rawBassPunch += this.freqByteData[i];
      countBassPunch++;
    }
    const normBassPunch = countBassPunch > 0 ? (rawBassPunch / countBassPunch) / 255 : 0;
    const normBass = normSubBass * 0.40 + normBassPunch * 0.60;

    // 3. Low-Mids (250 - 900 Hz)
    let rawLowMids = 0;
    let countLowMids = 0;
    for (let i = bassEndBin + 1; i <= lowMidsEndBin; i++) {
      rawLowMids += this.freqByteData[i];
      countLowMids++;
    }
    const normLowMids = countLowMids > 0 ? (rawLowMids / countLowMids) / 255 : 0;

    // 4. High-Mids (900 - 4500 Hz)
    let rawHighMids = 0;
    let countHighMids = 0;
    for (let i = lowMidsEndBin + 1; i <= highMidsEndBin; i++) {
      rawHighMids += this.freqByteData[i];
      countHighMids++;
    }
    const normHighMids = countHighMids > 0 ? (rawHighMids / countHighMids) / 255 : 0;
    const normMids = normLowMids * 0.45 + normHighMids * 0.55;

    // 5. Treble (4500 - 16000 Hz)
    let rawTreble = 0;
    let countTreble = 0;
    for (let i = highMidsEndBin + 1; i <= trebleEndBin; i++) {
      rawTreble += this.freqByteData[i];
      countTreble++;
    }
    const normTreble = countTreble > 0 ? (rawTreble / countTreble) / 255 : 0;

    // Graphic Equalizer normalization with spectral tilt weighting:
    // Natural audio drops ~3-4.5 dB per octave. Vintage hardware equalizers boost high
    // bands proportionally so all 5 columns/waves bounce with lively dynamic range [0.0 - 1.0].
    const eqCurve = (val: number, boost: number): number => {
      const v = Math.min(1.0, val * boost);
      if (v < 0.02) return 0;
      const normalized = (v - 0.02) / 0.98;
      return Math.min(1.0, Math.pow(normalized, 1.15) * 1.25);
    };

    const expSubBass = eqCurve(normSubBass, 1.10);
    const expBassPunch = eqCurve(normBassPunch, 1.05);
    const expBass = eqCurve(normBass, 1.10);
    const expLowMids = eqCurve(normLowMids, 1.20);
    const expHighMids = eqCurve(normHighMids, 1.30);
    const expMids = eqCurve(normMids, 1.15);
    const expTreble = eqCurve(normTreble, 1.40);

    // Multi-band Attack / Decay Envelope Follower:
    // Fast attack (6-12ms) guarantees instant reaction on drum/synth transients
    // Smooth exponential decay (90-200ms) preserves rhythmic musical flow without digital jitter
    const followEnv = (current: number, target: number, attackTime: number, decayTime: number): number => {
      const timeConst = target > current ? attackTime : decayTime;
      const coeff = 1.0 - Math.exp(-safeDt / timeConst);
      return current + (target - current) * coeff;
    };

    // Sub-Bass: 12ms attack, 200ms decay (resonant, heavy bedrock thrust)
    this.envSubBass = followEnv(this.envSubBass, expSubBass, 0.012, 0.200);
    // Bass: 10ms attack, 160ms decay (tight, punchy kick drum)
    this.envBass = followEnv(this.envBass, expBass, 0.010, 0.160);
    // Low-Mids: 10ms attack, 180ms decay (warm chords)
    this.envLowMids = followEnv(this.envLowMids, expLowMids, 0.010, 0.180);
    // High-Mids: 8ms attack, 130ms decay (crisp snare/vocal flash)
    this.envHighMids = followEnv(this.envHighMids, expHighMids, 0.008, 0.130);
    // Treble: 6ms attack, 90ms decay (sparkling shimmer and fast hi-hat chatter)
    this.envTreble = followEnv(this.envTreble, expTreble, 0.006, 0.090);

    const currentEnergy = this.envSubBass * 0.35 + expBassPunch * 0.25 + this.envLowMids * 0.18 + this.envHighMids * 0.14 + this.envTreble * 0.08;

    // Macro Energy Tracking:
    // Tracks the overarching musical movement (breakdown vs build-up vs drop) across ~1.6 - 2.0s.
    // Quick to elevate on drops (0.75s time constant) and relaxes gracefully into breakdowns (2.2s).
    const macroTimeConst = currentEnergy > this.macroEnergy ? 0.75 : 2.2;
    const macroCoeff = 1.0 - Math.exp(-safeDt / macroTimeConst);
    this.macroEnergy += (currentEnergy - this.macroEnergy) * macroCoeff;

    // Dynamic contrast ratio: burst above current macro baseline (highlights drops and impacts)
    const energyContrast = Math.min(1.0, Math.max(0.0, (currentEnergy - this.macroEnergy * 0.65) * 1.6));

    // Legacy lerp smoothing
    this.lerpedBass += (expBass - this.lerpedBass) * lerpFactor;
    this.lerpedMids += (expMids - this.lerpedMids) * lerpFactor;
    this.lerpedTreble += (expTreble - this.lerpedTreble) * lerpFactor;
    this.lerpedEnergy += (currentEnergy - this.lerpedEnergy) * lerpFactor;

    // Real-time Beat Detection with decay impulse
    this.energyHistory.push(expBass);
    if (this.energyHistory.length > 40) this.energyHistory.shift();

    let isBeat = false;
    if (this.beatCooldown > 0) {
      this.beatCooldown--;
    } else {
      const avgBass = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      if (expBass > avgBass * 1.35 && expBass > 0.25) {
        isBeat = true;
        this.beatCooldown = 12; // Frames cooldown
      }
    }

    if (isBeat) {
      this.beatPulse = 1.0;
    } else {
      this.beatPulse *= Math.exp(-safeDt / 0.18);
    }

    return {
      bass: this.lerpedBass,
      mids: this.lerpedMids,
      treble: this.lerpedTreble,
      energy: this.lerpedEnergy,
      isBeat,
      frequencyArray: this.freqByteData,
      subBass: this.envSubBass,
      lowMids: this.envLowMids,
      highMids: this.envHighMids,
      beatPulse: this.beatPulse,
      macroEnergy: this.macroEnergy,
      energyContrast
    };
  }

  // ================= Procedural Sound Effects ================= //

  public playCountdownTick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.tickAlt = !this.tickAlt;
    const freq = this.tickAlt ? 1320 : 920; // alternating tic / tock

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPowerUpSfx(type: PowerUpType): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    if (type === 'PULSE') {
      // Sonic Pulse: sub-bass shockwave thump + fast upward chirp "sonar" sweep
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(70, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.45);
      subGain.gain.setValueAtTime(0.3, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.52);

      const sweep = this.ctx.createOscillator();
      const sweepGain = this.ctx.createGain();
      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(320, now);
      sweep.frequency.exponentialRampToValueAtTime(1500, now + 0.28);
      sweepGain.gain.setValueAtTime(0.12, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      sweep.connect(sweepGain);
      sweepGain.connect(this.sfxGain);
      sweep.start(now);
      sweep.stop(now + 0.32);
      return;
    }

    if (type === 'SINGULARITY') {
      // Cosmic Singularity: deep vacuum suck sweep down to 45Hz followed by an explosive sub-bass boom
      const sweep = this.ctx.createOscillator();
      const sweepGain = this.ctx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(650, now);
      sweep.frequency.exponentialRampToValueAtTime(45, now + 0.32);
      sweepGain.gain.setValueAtTime(0.35, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      sweep.connect(sweepGain);
      sweepGain.connect(this.sfxGain);
      sweep.start(now);
      sweep.stop(now + 0.38);

      const boom = this.ctx.createOscillator();
      const boomGain = this.ctx.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(140, now + 0.12);
      boom.frequency.exponentialRampToValueAtTime(28, now + 0.7);
      boomGain.gain.setValueAtTime(0.6, now + 0.12);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      boom.connect(boomGain);
      boomGain.connect(this.sfxGain);
      boom.start(now + 0.12);
      boom.stop(now + 0.78);
      return;
    }

    const chords: Record<Exclude<PowerUpType, 'PULSE' | 'SINGULARITY'>, number[]> = {
      SHIELD: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6 (Crystal blue)
      DAMPER: [440.0, 554.37, 659.25, 880.0],    // A4, C#5, E5, A5 (Harmonic green)
      LOW_G: [349.23, 440.0, 523.25, 698.46],     // F4, A4, C5, F5 (Float yellow)
      INVULNERABLE: [293.66, 329.63, 392.00, 523.25], // D#4, F#4, A4, D5 (Crimson/Immortal neon thud)
      ETHEREAL: [466.16, 523.25, 587.33, 659.25],     // F#4, G4, A4, E5 (Ghostly airy)
      CHRONO_DILATION: [329.63, 493.88, 659.25, 987.77] // E4, B4, E5, B5 (Time-warp harmonics)
    };

    const notes = chords[type];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.42);
    });
  }

  public playShieldHitSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playExplosionSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub drop boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.6);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.66);

    // Burst noise
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.45), this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(80, now + 0.45);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noiseSource.start(now);
  }

  public playVictorySfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const arpeggio = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0];
    arpeggio.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.09);
      gain.gain.setValueAtTime(0.3, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.52);
    });
  }

  public playTimeUpSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Descending "power-down" tone: the mission failed by timeout
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 1.1);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);

    // Muted low thud to seal the moment
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(110, now + 0.85);
    thudGain.gain.setValueAtTime(0.22, now + 0.85);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now + 0.85);
    thud.stop(now + 1.35);
  }

  public playButtonSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

// Global audio engine singleton
export const audio = new AudioEngine();
