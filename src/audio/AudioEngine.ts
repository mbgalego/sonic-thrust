/**
 * Sonic Thrust - Web Audio Engine
 * Handles real-time FFT analysis, BPM peak detection, procedural sound synthesis,
 * local track decoding, and continuous sound effects.
 */

import { AudioFrequencyData, TrackMetadata } from '../types/game';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  
  // Playback state
  private playbackStartTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private trackDuration: number = 0;

  // Real-time FFT analysis cache
  private freqByteData: Uint8Array = new Uint8Array(512);
  private lerpedBass: number = 0;
  private lerpedMids: number = 0;
  private lerpedTreble: number = 0;
  private lerpedEnergy: number = 0;
  private energyHistory: number[] = [];
  private beatCooldown: number = 0;

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
    
    // Master, Music, SFX Routing
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.currentMusicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Analyser Node for Real-time FFT
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.musicGain.connect(this.analyser);

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

  public updateScrapeAudio(intensity: number): void {
    this.updateRadarClicks(intensity);
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
      const cached = this.bufferCache.get(track.id)!;
      track.audioBuffer = cached;
      track.duration = Math.round(cached.duration);
      return cached;
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
        track.audioBuffer = decoded;
        track.duration = Math.round(decoded.duration);
        track.estimatedBpm = this.detectBpmFromBuffer(decoded);
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
    track.audioBuffer = proceduralBuffer;
    track.duration = proceduralBuffer.duration;
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
    const samplesPerBeat = sampleRate * secondsPerBeat;
    const samplesPer16th = samplesPerBeat / 4;

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
    this.currentSource.connect(this.musicGain);

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
   * Real-time FFT Frequency Extractor with smooth LERP
   * Bass: 20Hz - 250Hz (height / oscillation of ceiling and floor)
   * Mids: 250Hz - 4kHz (rotation and emergence of blocks / platforms)
   * Treble: 4kHz - 20kHz (laser barriers)
   */
  public getFrequencyData(lerpFactor: number = 0.22): AudioFrequencyData {
    if (!this.analyser || !this.isPlaying) {
      // Gentle decay when stopped
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
        frequencyArray: this.freqByteData
      };
    }

    (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(this.freqByteData);
    const binCount = this.analyser.frequencyBinCount; // 512 bins (0 to ~22050Hz)
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const hzPerBin = nyquist / binCount;

    // Band limits
    const bassEndBin = Math.max(2, Math.floor(250 / hzPerBin));
    const midsEndBin = Math.min(binCount - 1, Math.floor(4000 / hzPerBin));
    const trebleEndBin = Math.min(binCount - 1, Math.floor(18000 / hzPerBin));

    let rawBass = 0;
    let countBass = 0;
    for (let i = 1; i <= bassEndBin; i++) {
      rawBass += this.freqByteData[i];
      countBass++;
    }
    const normBass = countBass > 0 ? (rawBass / countBass) / 255 : 0;

    let rawMids = 0;
    let countMids = 0;
    for (let i = bassEndBin + 1; i <= midsEndBin; i++) {
      rawMids += this.freqByteData[i];
      countMids++;
    }
    const normMids = countMids > 0 ? (rawMids / countMids) / 255 : 0;

    let rawTreble = 0;
    let countTreble = 0;
    for (let i = midsEndBin + 1; i <= trebleEndBin; i++) {
      rawTreble += this.freqByteData[i];
      countTreble++;
    }
    const normTreble = countTreble > 0 ? (rawTreble / countTreble) / 255 : 0;

    const currentEnergy = normBass * 0.55 + normMids * 0.3 + normTreble * 0.15;

    // LERP smoothing
    this.lerpedBass += (normBass - this.lerpedBass) * lerpFactor;
    this.lerpedMids += (normMids - this.lerpedMids) * lerpFactor;
    this.lerpedTreble += (normTreble - this.lerpedTreble) * lerpFactor;
    this.lerpedEnergy += (currentEnergy - this.lerpedEnergy) * lerpFactor;

    // Real-time Beat Detection
    this.energyHistory.push(normBass);
    if (this.energyHistory.length > 40) this.energyHistory.shift();

    let isBeat = false;
    if (this.beatCooldown > 0) {
      this.beatCooldown--;
    } else {
      const avgBass = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      if (normBass > avgBass * 1.35 && normBass > 0.35) {
        isBeat = true;
        this.beatCooldown = 12; // Frames cooldown
      }
    }

    return {
      bass: this.lerpedBass,
      mids: this.lerpedMids,
      treble: this.lerpedTreble,
      energy: this.lerpedEnergy,
      isBeat,
      frequencyArray: this.freqByteData
    };
  }

  // ================= Procedural Sound Effects ================= //

  public playPowerUpSfx(type: 'SHIELD' | 'DAMPER' | 'LOW_G'): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const chords = {
      SHIELD: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6 (Crystal blue)
      DAMPER: [440.0, 554.37, 659.25, 880.0],    // A4, C#5, E5, A5 (Harmonic green)
      LOW_G: [349.23, 440.0, 523.25, 698.46]     // F4, A4, C5, F5 (Float yellow)
    };

    const notes = chords[type];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.2, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.38);
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
