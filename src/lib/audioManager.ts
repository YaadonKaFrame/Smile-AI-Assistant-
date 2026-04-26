// src/lib/audioManager.ts
const WORKLET_CODE = `
class RecorderWorklet extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0]) {
      const channelData = input[0];
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderWorklet);
`;

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export class AudioStreamer {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onAudioData: (base64: string) => void = () => {};

  constructor(onAudioData: (base64: string) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    this.context = new window.AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
    
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.context.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const source = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, 'recorder-worklet');
    
    this.workletNode.port.onmessage = (e) => {
      const pcm16Buffer = e.data;
      const base64 = arrayBufferToBase64(pcm16Buffer);
      this.onAudioData(base64);
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.context.destination);
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

export class AudioPlayer {
  private context: AudioContext;
  private nextPlayTime: number = 0;
  private sourceNodes: AudioBufferSourceNode[] = [];
  public isPlaying: boolean = false;
  private onPlayChange?: (playing: boolean) => void;
  private checkInterval: number | null = null;

  constructor(onPlayChange?: (playing: boolean) => void) {
    this.context = new window.AudioContext({ sampleRate: 24000 });
    this.onPlayChange = onPlayChange;
    this.checkInterval = window.setInterval(() => this.checkPlaying(), 100);
  }
  
  private checkPlaying() {
    const isPlayingNow = this.context.state === 'running' && this.nextPlayTime > this.context.currentTime;
    if (isPlayingNow !== this.isPlaying) {
      this.isPlaying = isPlayingNow;
      this.onPlayChange?.(isPlayingNow);
    }
  }

  playPCM16Base64(base64: string) {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    
    const buffer = base64ToArrayBuffer(base64);
    const pcm16 = new Int16Array(buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
    }
    
    const audioBuffer = this.context.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);

    const currentTime = this.context.currentTime;
    // Add brief 0.05s buffer to smooth out jitter
    if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.05;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.sourceNodes.push(source);
    
    source.onended = () => {
      this.sourceNodes = this.sourceNodes.filter(n => n !== source);
    };
  }

  stopAll() {
    this.sourceNodes.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sourceNodes = [];
    this.nextPlayTime = 0;
    this.isPlaying = false;
    this.onPlayChange?.(false);
  }
  
  destroy() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.stopAll();
    this.context.close();
  }
}
