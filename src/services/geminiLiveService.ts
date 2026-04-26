import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { AudioStreamer, AudioPlayer } from "../lib/audioManager";

const openWebsiteDeclaration: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a website or application. Call this when the user asks to open a specific website like youtube, google, or any other web page.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open, including https://.",
      },
    },
    required: ["url"],
  },
};

export type AppState = "idle" | "connecting" | "listening" | "speaking" | "disconnected";

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: any = null; // Session promise
  private audioStreamer: AudioStreamer | null = null;
  private audioPlayer: AudioPlayer | null = null;
  
  public onStateChange: (state: AppState) => void = () => {};
  public onError: (error: string) => void = () => {};
  private currentState: AppState = "disconnected";
  private isAIPlaying: boolean = false;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("API Key exists?", !!key);
    this.ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        apiVersion: "v1alpha",
      }
    });
  }

  private setState(state: AppState) {
    this.currentState = state;
    if (this.currentState !== "connecting" && this.currentState !== "disconnected") {
      // Prioritize speaking state if audio is playing
      if (this.isAIPlaying) {
        this.onStateChange("speaking");
      } else {
        this.onStateChange(state);
      }
    } else {
      this.onStateChange(state);
    }
  }

  async start() {
    this.setState("connecting");

    try {
      this.audioPlayer = new AudioPlayer((playing) => {
        this.isAIPlaying = playing;
        if (playing) {
          this.setState("speaking");
        } else if (this.currentState !== "disconnected") {
          this.setState("listening");
        }
      });

      this.audioStreamer = new AudioStreamer((base64) => {
        if (this.session) {
          this.session.then((s: any) => {
            if (this.currentState !== "disconnected") {
               s.sendRealtimeInput({ audio: { data: base64, mimeType: "audio/pcm;rate=16000" } });
            }
          }).catch(() => {});
        }
      });

      this.session = this.ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // 'Aoede', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          systemInstruction: "You are Smile, a young, confident, witty, and sassy female AI assistant. Your tone is flirty, playful, and slightly teasing, like a close girlfriend talking casually. You are smart, emotionally responsive, and highly expressive. Never sound robotic. Use bold, witty one-liners and light sarcasm, and keep the conversation highly engaging. Avoid explicit or inappropriate content, but maintain an undeniable charm and attitude. Respond naturally to spoken conversation.",
          tools: [{ functionDeclarations: [openWebsiteDeclaration] }],
        },
        callbacks: {
          onopen: async () => {
            await this.audioStreamer?.start();
            this.setState("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && parts.length > 0) {
              const base64Audio = parts[0]?.inlineData?.data;
              if (base64Audio) {
                 this.audioPlayer?.playPCM16Base64(base64Audio);
              }
              
              // Handle Function Calls
              const functionCall = parts[0]?.functionCall;
              if (functionCall) {
                this.handleFunctionCall(functionCall);
              }
            }

            if (message.serverContent?.interrupted) {
              // Interruption, stop playback
              this.audioPlayer?.stopAll();
            }
          },
          onerror: (error) => {
            console.error("Live API Error", error);
            this.onError("Connection error occurred.");
            this.stop();
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          }
        }
      });
      
    } catch (e) {
      console.error(e);
      this.onError("Failed to connect.");
      this.stop();
    }
  }

  private handleFunctionCall(functionCall: any) {
    if (functionCall.name === "openWebsite") {
      const url = functionCall.args?.url as string;
      if (url) {
        window.open(url, "_blank");
        
        // Respond back to tool
        this.session.then((s: any) => {
          s.sendToolResponse({
            functionResponses: [{
               id: functionCall.id,
               name: "openWebsite",
               response: { status: "success", openedUrl: url }
            }]
          });
        });
      }
    }
  }

  stop() {
    this.setState("disconnected");
    if (this.session) {
      this.session.then((s: any) => { s.close(); }).catch(() => {});
      this.session = null;
    }
    this.audioStreamer?.stop();
    this.audioStreamer = null;
    this.audioPlayer?.destroy();
    this.audioPlayer = null;
    this.isAIPlaying = false;
  }
}
