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
      className="w-full bg-white rounded-2xl border border-[#e8e4d3] shadow-sm overflow-hidden transition-all mt-4"
    >
      {/* Header bar with toggle */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-[#fbf8ee] border-b border-[#e8e4d3] gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0c331d]">
            Conversation Transcript
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f4f1e5] text-[#0c331d] font-mono border border-[#e2decb]">
            {turns.length} {turns.length === 1 ? 'turn' : 'turns'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onReplayAll && turns.length > 0 && (
            <button
              id="replay-conversation-header-btn"
              onClick={onReplayAll}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isPlayingAll
                  ? 'bg-[#0c331d] text-white shadow-2xs'
                  : 'bg-[#fef9c3] text-[#0c331d] hover:bg-[#fef08a] border border-[#fde047]'
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
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0c331d] hover:bg-[#f4f1e5] transition-colors cursor-pointer"
          >
            <span>{isOpen ? 'Hide transcript' : 'Show transcript'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div className="p-4 sm:p-6 max-h-96 overflow-y-auto space-y-4 bg-[#fcfbfa]/60">
          {turns.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6">
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
                      ? 'ring-2 ring-[#0c331d] bg-[#fef9c3] shadow-2xs'
                      : isHighlighted
                      ? 'ring-2 ring-[#0c331d] bg-[#eef6f0]'
                      : isUser
                      ? 'bg-white border border-[#e8e4d3] ml-4 sm:ml-8'
                      : 'bg-[#f4f1e5] border border-[#e2decb] mr-4 sm:mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-stone-500">
                    <div className="flex items-center space-x-1.5 font-semibold">
                      {isUser ? (
                        <>
                          <User className="w-3 h-3 text-[#0c331d]" />
                          <span className="text-[#0c331d]">You (Team Lead)</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-[#2d553e]" />
                          <span className="text-[#0c331d]">Victor</span>
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
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            isTurnPlaying
                              ? 'bg-[#0c331d] text-white'
                              : 'bg-[#eef6f0] hover:bg-[#d8edd0] text-[#0c331d]'
                          }`}
                          title="Listen to this line spoken"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isTurnPlaying ? 'Playing…' : 'Listen'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[#143622] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
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
