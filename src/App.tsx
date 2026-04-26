/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, Power, Globe, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GeminiLiveService, type AppState } from "./services/geminiLiveService";
import { cn } from "./lib/utils";

export default function App() {
  const [appState, setAppState] = useState<AppState>("disconnected");
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const serviceRef = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    serviceRef.current = new GeminiLiveService();
    serviceRef.current.onStateChange = setAppState;
    serviceRef.current.onError = setErrorInfo;

    return () => {
      serviceRef.current?.stop();
    };
  }, []);

  const toggleConnection = () => {
    setErrorInfo(null);
    if (appState === "disconnected") {
      serviceRef.current?.start();
    } else {
      serviceRef.current?.stop();
    }
  };

  const getStatusColor = () => {
    switch (appState) {
      case "disconnected": return "bg-zinc-500 shadow-[0_0_10px_rgba(161,161,170,0.6)]";
      case "connecting": return "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]";
      default: return "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)]";
    }
  };

  const quotes: Record<AppState, string> = {
    disconnected: "System is offline. Tap the power button to wake me up.",
    connecting: "Waking up... Just a second, darling.",
    listening: "I'm listening. Tell me what's on your mind.",
    speaking: "\"Don't just stand there staring, darling. I know I'm gorgeous, but we actually have things to do.\"",
    idle: "Waiting for you to say something.",
  };

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden text-white font-sans flex flex-col">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Navigation / Status */}
      <div className="w-full p-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full transition-colors duration-300", getStatusColor())}></div>
          <span className="text-xs font-medium tracking-widest uppercase opacity-70">
            {errorInfo ? "Live Connection: Error" : `Live Connection: ${appState === "disconnected" ? "Offline" : appState === "connecting" ? "Connecting" : "Stable"}`}
          </span>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            SMILE AI
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">v3.1 Flash Preview</p>
        </div>
      </div>

      {/* External Error Display */}
      {errorInfo && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-full text-sm z-50 backdrop-blur-md">
          {errorInfo}
        </div>
      )}

      {/* Central Persona Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-8 pb-32 z-10">
        <Orb state={appState} />
        
        {/* Persona Quote */}
        <div className="mt-12 text-center max-w-lg px-4 h-24">
          <AnimatePresence mode="wait">
             <motion.p
               key={appState}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="text-2xl sm:text-3xl font-light italic text-zinc-200 leading-snug"
               dangerouslySetInnerHTML={{ __html: quotes[appState] }}
             />
          </AnimatePresence>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="h-[1px] w-8 bg-pink-500/50"></span>
            <span className="text-[11px] uppercase tracking-widest text-pink-400 font-bold">
              {appState}
            </span>
            <span className="h-[1px] w-8 bg-pink-500/50"></span>
          </div>
        </div>
      </div>

      {/* Bottom Controls Panel */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8 z-20">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-6 flex items-center justify-between shadow-2xl">
          {/* Left: Mood/State */}
          <div className="flex flex-col gap-1 pl-4 w-28">
            <span className="text-[10px] uppercase tracking-tighter opacity-40 font-bold">Mood</span>
            <span className="text-sm font-medium whitespace-nowrap">Sassy & Sharp</span>
          </div>

          {/* Center: Action Button */}
          <button 
             onClick={toggleConnection}
             className="relative group shrink-0"
          >
            <div className={cn(
              "absolute inset-0 rounded-full blur-xl transition-all duration-500",
              appState !== "disconnected" ? "bg-pink-500 opacity-40 group-hover:opacity-60" : "bg-zinc-500 opacity-20 group-hover:opacity-40"
            )}></div>
            <div className={cn(
              "relative w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center shadow-lg transition-transform active:scale-95 duration-300",
              appState !== "disconnected" ? "bg-gradient-to-b from-pink-500 to-pink-700 text-white" : "bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-400"
            )}>
               {appState === "connecting" ? (
                 <Loader2 className="w-8 h-8 animate-spin" />
               ) : appState === "disconnected" ? (
                 <Power className="w-8 h-8" />
               ) : (
                 <MicOff className="w-8 h-8" />
               )}
            </div>
          </button>

          {/* Right: Quick Tools */}
          <div className="flex gap-4 sm:gap-6 pr-4 w-28 justify-end">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-[9px] uppercase mt-1 block opacity-40">Web</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <span className="text-[9px] uppercase mt-1 block opacity-40">Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Labels (Hardware Aesthetic) */}
      <div className="hidden lg:flex absolute left-8 bottom-32 flex-col gap-8 opacity-20 uppercase tracking-[0.4em] text-[10px] [writing-mode:vertical-rl] rotate-180 pointer-events-none">
        <span>Audio Stream 16kHz</span>
        <span>Encrypted Session</span>
      </div>
      
      <div className="hidden lg:flex absolute right-8 bottom-32 flex-col gap-8 opacity-20 uppercase tracking-[0.4em] text-[10px] [writing-mode:vertical-rl] pointer-events-none">
        <span>PCM16 Linear</span>
        <span>Tool response: OK</span>
      </div>
    </div>
  );
}

function Orb({ state }: { state: AppState }) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isConnected = state !== "disconnected" && state !== "connecting";

  return (
    <div className="relative flex items-center justify-center w-96 h-96">
      {/* Outer Glows */}
      <motion.div 
         animate={{ 
            opacity: isConnected ? 1 : 0.3,
            scale: isSpeaking ? [1, 1.05, 1] : 1
         }}
         transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
         className="absolute w-96 h-96 bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" 
      />
      
      <motion.div 
         animate={{ rotate: 360 }}
         transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
         className="absolute w-80 h-80 border-t border-r border-white/10 rounded-full opacity-50 pointer-events-none" 
      />
      <motion.div 
         animate={{ rotate: -360 }}
         transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
         className="absolute w-72 h-72 border-b border-l border-pink-500/30 rounded-full opacity-50 pointer-events-none" 
      />
      
      {/* Core Orb */}
      <motion.div 
         animate={{
            boxShadow: isSpeaking 
              ? "0 25px 50px -12px rgba(236,72,153,0.5)" 
              : isListening 
              ? "0 25px 50px -12px rgba(0,0,0,0.5)" 
              : "0 10px 30px -10px rgba(0,0,0,0.5)"
         }}
         className="relative w-64 h-64 rounded-full bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 shadow-2xl flex items-center justify-center border border-white/10 overflow-hidden"
      >
         {/* Inner gradient response */}
         <motion.div 
           animate={{
              opacity: isSpeaking ? [0.4, 0.7, 0.4] : 0,
           }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 mix-blend-overlay"
         />

        {/* Mock Waveform */}
        <div className="flex items-center justify-center gap-1.5 h-full w-full z-10">
          <WaveBar active={isSpeaking || isListening || state === 'connecting'} heightPx={32} color="bg-pink-500 opacity-40" delay={0.1} />
          <WaveBar active={isSpeaking || isListening || state === 'connecting'} heightPx={56} color="bg-pink-400" delay={0.2} />
          <WaveBar active={isSpeaking || isListening || state === 'connecting'} heightPx={80} color="bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" delay={0.3} />
          <WaveBar active={isSpeaking || isListening || state === 'connecting'} heightPx={48} color="bg-purple-400" delay={0.4} />
          <WaveBar active={isSpeaking || isListening || state === 'connecting'} heightPx={24} color="bg-purple-600 opacity-40" delay={0.5} />
        </div>
      </motion.div>
    </div>
  );
}

function WaveBar({ active, heightPx, color, delay }: { active: boolean, heightPx: number, color: string, delay: number }) {
   if (!active) {
      return <div className={cn("w-1.5 rounded-full transition-all duration-500 h-2 bg-zinc-700")} />;
   }

   return (
      <motion.div 
         initial={{ height: 8 }}
         animate={{ height: [8, heightPx, 8] }} 
         transition={{ 
            duration: 0.8 + delay * 2, 
            repeat: Infinity,
            ease: "easeInOut"
         }}
         className={cn("w-1.5 rounded-full", color)} 
      />
   );
}

