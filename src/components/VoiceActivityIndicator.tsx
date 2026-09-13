import React from 'react';
import { Mic, Volume2, Pause, Wifi, AlertTriangle } from 'lucide-react';
import { SessionState } from '../types.js';

interface VoiceActivityIndicatorProps {
  sessionState: SessionState;
  counterpartName: string;
  isVictorSpeaking: boolean;
  isListening: boolean;
  audioLevel: number; // 0 to 1
  isMuted?: boolean;
  isWaitingForGreeting?: boolean;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({
  sessionState,
  counterpartName,
  isVictorSpeaking,
  isListening,
  audioLevel,
  isMuted = false,
  isWaitingForGreeting = false,
}) => {
  // Determine state description
  let statusText = 'Connecting to Victor...';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let icon = <Wifi className="w-4 h-4 animate-pulse text-slate-500" />;

  if (sessionState === 'paused') {
    statusText = 'Practice paused. Your microphone is off.';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    icon = <Pause className="w-4 h-4 text-amber-700" />;
  } else if (sessionState === 'connecting') {
    statusText = 'Establishing audio connection...';
    badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
    icon = <Wifi className="w-4 h-4 animate-pulse text-blue-600" />;
  } else if (sessionState === 'error') {
    statusText = 'Connection interrupted. Please reconnect or switch to text.';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
    icon = <AlertTriangle className="w-4 h-4 text-rose-600" />;
  } else if (isVictorSpeaking) {
    statusText = `${counterpartName} is speaking...`;
    badgeColor = 'bg-[#eef6f0] text-[#0c331d] border-[#cbe5d4] font-semibold';
    icon = <Volume2 className="w-4 h-4 text-[#0c331d] animate-pulse" />;
  } else if (isListening) {
    if (isMuted) {
      statusText = 'Microphone muted';
      badgeColor = 'bg-[#f4f1e5] text-stone-600 border-[#e2decb]';
      icon = <Mic className="w-4 h-4 text-stone-400" />;
    } else if (isWaitingForGreeting) {
      statusText = 'Victor is listening — greet him to begin the conversation';
      badgeColor = 'bg-[#fef9c3] text-[#0c331d] border-[#fde047] font-semibold';
      icon = <Mic className="w-4 h-4 text-[#0c331d] animate-pulse" />;
    } else {
      statusText = 'Listening to you...';
      badgeColor = 'bg-[#eef6f0] text-[#0c331d] border-[#cbe5d4] font-medium';
      icon = <Mic className="w-4 h-4 text-[#0c331d]" />;
    }
  }

  // Audio wave bars calculation (9 discrete responsive bars)
  const barCount = 11;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Generate organic wave pattern based on level and index
    if (sessionState === 'paused' || isMuted) return 8;
    if (isVictorSpeaking) {
      const offset = Math.sin((i / barCount) * Math.PI) * 0.7 + 0.3;
      return Math.max(12, Math.min(64, Math.round(offset * 56)));
    }
    if (isListening && audioLevel > 0.05) {
      const centerFactor = 1 - Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
      const height = Math.max(10, Math.min(64, Math.round(audioLevel * 60 * centerFactor + 10)));
      return height;
    }
    return 10;
  });

  return (
    <div
      id="voice-activity-container"
      className="w-full bg-white rounded-2xl border border-[#e8e4d3] shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
    >
      {/* Background ambient ring based on state */}
      <div
        className={`absolute inset-0 opacity-5 pointer-events-none transition-colors duration-500 ${
          isVictorSpeaking
            ? 'bg-[#0c331d]'
            : isListening && !isMuted
            ? 'bg-[#154528]'
            : sessionState === 'paused'
            ? 'bg-amber-500'
            : 'bg-stone-300'
        }`}
      />

      {/* Role & Counterpart Header */}
      <div className="mb-4 z-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#244c34]">
          Simulated Counterpart
        </span>
        <h2
          className="text-2xl sm:text-3xl font-bold text-[#0c331d] mt-0.5"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {counterpartName}
        </h2>
        <p className="text-xs sm:text-sm text-[#2d553e]">Experienced team member · Defensive posture</p>
      </div>

      {/* Physical Audio Activity Waveform Display */}
      <div
        className="w-full max-w-sm h-28 flex items-center justify-center space-x-2 my-2 z-10"
        aria-label="Audio activity waveform"
      >
        {bars.map((height, idx) => (
          <div
            key={idx}
            style={{
              height: `${height}px`,
              transition: 'height 80ms ease-out',
            }}
            className={`w-2 sm:w-2.5 rounded-full transition-colors duration-200 ${
              isVictorSpeaking
                ? 'bg-[#0c331d]'
                : isListening && !isMuted && audioLevel > 0.05
                ? 'bg-[#154528]'
                : 'bg-[#d8d3c0]'
            }`}
          />
        ))}
      </div>

      {/* Status indicator badge */}
      <div className="mt-4 z-10">
        <div
          className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${badgeColor} transition-colors`}
        >
          {icon}
          <span>{statusText}</span>
        </div>
      </div>

      {/* Non-emotion measurement disclaimer notice */}
      <p className="text-[11px] text-stone-400 mt-4 z-10">
        Acoustic voice activity indicator · Does not infer emotions or psychological states
      </p>
    </div>
  );
};
