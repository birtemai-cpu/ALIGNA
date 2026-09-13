/**
 * Client-Side Audio Utilities for ALIGNA
 * Handles 16kHz PCM input capture, 24kHz PCM playback, scheduling, and voice activity measurement.
 */

export class AudioPlaybackManager {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPaused = false;
  private pausedTime = 0;

  constructor() {
    // AudioContext will be initialized on user gesture
  }

  public init(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public playChunk(pcm16Base64: string) {
    const ctx = this.init();
    const binary = atob(pcm16Base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
    };
  }

  public stopAndClear() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might have already finished
      }
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
  }

  public async pause() {
    if (this.ctx && this.ctx.state === 'running') {
      await this.ctx.suspend();
      this.isPaused = true;
    }
  }

  public async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
      this.isPaused = false;
    }
  }

  public destroy() {
    this.stopAndClear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

/**
 * Converts Float32 audio samples to 16-bit PCM little-endian base64 string
 */
export function float32ToPcm16Base64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Microphone Recorder helper with real-time level analysis
 */
export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onAudioChunk: ((base64Pcm: string) => void) | null = null;
  private onLevelUpdate: ((level: number) => void) | null = null;
  private animationId: number | null = null;
  private isMuted = false;

  public async start(
    onChunk: (base64Pcm: string) => void,
    onLevel?: (level: number) => void
  ): Promise<void> {
    this.onAudioChunk = onChunk;
    this.onLevelUpdate = onLevel || null;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx({ sampleRate: 16000 });
    const source = this.audioCtx.createMediaStreamSource(this.stream);

    // Analyser node for voice activity indicator
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    // 4096 samples buffer (~256ms at 16kHz)
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);

    this.processor.onaudioprocess = (e) => {
      if (this.isMuted) return;
      const input = e.inputBuffer.getChannelData(0);
      const base64 = float32ToPcm16Base64(input);
      if (this.onAudioChunk) {
        this.onAudioChunk(base64);
      }
    };

    if (this.onLevelUpdate && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateLoop = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        if (this.onLevelUpdate) {
          this.onLevelUpdate(this.isMuted ? 0 : normalized);
        }
        this.animationId = requestAnimationFrame(updateLoop);
      };
      this.animationId = requestAnimationFrame(updateLoop);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.onAudioChunk = null;
    this.onLevelUpdate = null;
  }
}

/**
 * Web Speech API live transcriber for user speech
 */
export class SpeechTranscriber {
  private recognition: any = null;
  private isRunning = false;
  private onTextCallback: ((text: string, isFinal: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start(onText: (text: string, isFinal: boolean) => void) {
    if (!this.recognition || this.isRunning) return;
    this.onTextCallback = onText;
    this.isRunning = true;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item && item[0]) {
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }
      }
      if (final.trim()) {
        this.onTextCallback?.(final.trim(), true);
      } else if (interim.trim()) {
        this.onTextCallback?.(interim.trim(), false);
      }
    };

    this.recognition.onerror = (e: any) => {
      // Don't crash on common speech recognition events like 'no-speech' or 'aborted'
      if (e?.error !== 'no-speech' && e?.error !== 'aborted') {
        console.warn('SpeechRecognition warning:', e?.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        try {
          this.recognition.start();
        } catch (e) {
          // ignore restart errors
        }
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.onTextCallback = null;
  }
}
