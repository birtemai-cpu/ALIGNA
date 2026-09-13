import React from 'react';
import { Shield, Sparkles, Trash2, Volume2, MessageSquare, AlertCircle } from 'lucide-react';
import { SessionState, SessionMode } from '../types.js';

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
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & working title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg tracking-tight">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">ALIGNA</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                Prototype v0.2
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Difficult Workplace Conversation Practice</p>
          </div>
        </div>

        {/* Current status and persistent controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {sessionState !== 'idle' && sessionState !== 'discarded' && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
              {sessionMode === 'voice' ? (
                <Volume2 className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
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
