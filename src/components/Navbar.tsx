import React from 'react';
import { Shield, Sparkles, Trash2, Volume2, MessageSquare, AlertCircle } from 'lucide-react';
import { SessionState, SessionMode } from '../types.js';
import { AlignaLogo } from './AlignaLogo.js';

interface NavbarProps {
  sessionState: SessionState;
  sessionMode: SessionMode;
  onDiscard: () => void;
  onSafetyExit?: () => void;
  hasActiveData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  sessionState,
  sessionMode,
  onDiscard,
  onSafetyExit,
  hasActiveData,
}) => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-xs border-b border-[#e8e4d3] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & working title */}
        <div className="flex items-center space-x-3">
          <AlignaLogo size={32} color="#0c331d" textColor="#0c331d" />
          <div className="hidden sm:flex items-center space-x-2 pl-1 border-l border-[#e8e4d3]">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#0c331d] font-semibold border border-[#fde047]">
              Demo
            </span>
            <p className="text-xs text-stone-500 font-medium">Rehearse before it matters</p>
          </div>
        </div>

        {/* Current status and persistent controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {sessionState !== 'idle' && sessionState !== 'discarded' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-[#eef6f0] border border-[#cbe5d4] text-[#0c331d]">
              {sessionMode === 'voice' ? (
                <Volume2 className="w-3.5 h-3.5 text-[#0c331d] animate-pulse" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-[#0c331d]" />
              )}
              <span className="capitalize">{sessionState.replace('_', ' ')}</span>
            </div>
          )}

          {/* Safety Exit Button always accessible during active session */}
          {(sessionState === 'active' || sessionState === 'paused' || sessionState === 'connecting') && onSafetyExit && (
            <button
              id="nav-safety-exit-btn"
              onClick={onSafetyExit}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
              title="Stop practice session immediately"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Safety stop</span>
            </button>
          )}

          {/* Discard Session Button */}
          {hasActiveData && (
            <button
              id="nav-discard-session-btn"
              onClick={onDiscard}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
              title="Discard all session data from app memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Discard session</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
