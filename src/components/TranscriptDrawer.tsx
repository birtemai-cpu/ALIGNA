import React from 'react';
import { ChevronDown, ChevronUp, User, Bot, AlertCircle, Volume2, RotateCcw, Play, Pause } from 'lucide-react';
import { Turn } from '../types.js';

interface TranscriptDrawerProps {
  turns: Turn[];
  isOpen: boolean;
  onToggle: () => void;
  highlightTurnId?: string | null;
  mode: 'voice' | 'text';
  onPlayTurn?: (turn: Turn) => void;
  playingTurnId?: string | null;
  onReplayAll?: () => void;
  isPlayingAll?: boolean;
}

export const TranscriptDrawer: React.FC<TranscriptDrawerProps> = ({
  turns,
  isOpen,
  onToggle,
  highlightTurnId,
  mode,
  onPlayTurn,
  playingTurnId,
  onReplayAll,
  isPlayingAll,
}) => {
  return (
    <div
      id="transcript-drawer-container"
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all mt-4"
    >
      {/* Header bar with toggle */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Conversation Transcript
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
            {turns.length} {turns.length === 1 ? 'turn' : 'turns'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onReplayAll && turns.length > 0 && (
            <button
              id="replay-conversation-header-btn"
              onClick={onReplayAll}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlayingAll
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Listen to the entire conversation replay"
            >
              {isPlayingAll ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause conversation replay</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay conversation</span>
                </>
              )}
            </button>
          )}

          <button
            id="toggle-transcript-btn"
            onClick={onToggle}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <span>{isOpen ? 'Hide transcript' : 'Show transcript'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div className="p-4 sm:p-6 max-h-96 overflow-y-auto space-y-4 bg-slate-50/30">
          {turns.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No dialogue yet. Begin speaking or type a response to start.
            </p>
          ) : (
            turns.map((turn) => {
              const isUser = turn.speaker === 'user';
              const isHighlighted = highlightTurnId === turn.id || playingTurnId === turn.id;
              const isTurnPlaying = playingTurnId === turn.id;

              return (
                <div
                  key={turn.id}
                  id={`turn-${turn.id}`}
                  className={`flex flex-col p-3.5 rounded-xl text-xs transition-all ${
                    isTurnPlaying
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/90 shadow-xs'
                      : isHighlighted
                      ? 'ring-2 ring-blue-500 bg-blue-50/80'
                      : isUser
                      ? 'bg-white border border-slate-200 ml-4 sm:ml-8'
                      : 'bg-indigo-50/50 border border-indigo-100 mr-4 sm:mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5 font-semibold">
                      {isUser ? (
                        <>
                          <User className="w-3 h-3 text-slate-700" />
                          <span className="text-slate-800">You (Team Lead)</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-indigo-700" />
                          <span className="text-indigo-900">Victor</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {turn.status === 'interrupted' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium flex items-center space-x-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>interrupted</span>
                        </span>
                      )}

                      {onPlayTurn && (
                        <button
                          id={`play-turn-btn-${turn.id}`}
                          onClick={() => onPlayTurn(turn)}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            isTurnPlaying
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Listen to this line spoken"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isTurnPlaying ? 'Playing…' : 'Listen'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {turn.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
