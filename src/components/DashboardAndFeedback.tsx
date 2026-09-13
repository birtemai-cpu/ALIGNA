import React, { useState, useEffect, useRef } from 'react';
import {
  Pause,
  RotateCcw,
  Volume2,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { CoachingFeedback, Turn, QualitativeStatus } from '../types.js';
import { ALIGNA_CONFIG } from '../config/models.js';
import { TranscriptDrawer } from './TranscriptDrawer.js';
import { AudioPlaybackManager } from '../services/audioUtils.js';

interface DashboardAndFeedbackProps {
  feedback: CoachingFeedback;
  turns: Turn[];
  onPracticeAgain: (focus: string | null) => void;
  onDiscardSession: () => void;
}

export const DashboardAndFeedback: React.FC<DashboardAndFeedbackProps> = ({
  feedback,
  turns,
  onPracticeAgain,
  onDiscardSession,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [highlightedTurnId, setHighlightedTurnId] = useState<string | null>(null);

  // Conversation playback state
  const [isPlayingFullConversation, setIsPlayingFullConversation] = useState(false);
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null);

  const audioManagerRef = useRef<AudioPlaybackManager | null>(null);
  const conversationAbortRef = useRef<boolean>(false);

  // Oral feedback is deactivated; cleanup any conversation replay on unmount
  useEffect(() => {
    return () => {
      conversationAbortRef.current = true;
      if (audioManagerRef.current) {
        audioManagerRef.current.destroy();
        audioManagerRef.current = null;
      }
    };
  }, []);

  // Conversation Replay Logic
  const stopConversationReplay = () => {
    conversationAbortRef.current = true;
    setIsPlayingFullConversation(false);
    setPlayingTurnId(null);
    if (audioManagerRef.current) {
      audioManagerRef.current.stopAndClear();
    }
  };

  const handleReplayFullConversation = async () => {
    if (isPlayingFullConversation) {
      stopConversationReplay();
      return;
    }

    if (turns.length === 0) return;

    setShowTranscript(true);
    setIsPlayingFullConversation(true);
    conversationAbortRef.current = false;

    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioPlaybackManager();
    }

    for (let i = 0; i < turns.length; i++) {
      if (conversationAbortRef.current) break;
      const turn = turns[i];
      setPlayingTurnId(turn.id);

      try {
        const res = await fetch('/api/coach/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: turn.text,
            voice: turn.speaker === 'victor' ? 'victor' : 'coach',
          }),
        });

        const data = await res.json();
        if (conversationAbortRef.current) break;

        if (data.audio) {
          audioManagerRef.current.stopAndClear();
          audioManagerRef.current.playChunk(data.audio);

          // Estimate duration based on PCM bytes (~16000 samples/sec, 16bit = 32000 bytes/sec)
          const pcmByteLength = (data.audio.length * 3) / 4;
          const durationMs = Math.max(1500, Math.min(12000, (pcmByteLength / 32000) * 1000 + 600));
          await new Promise((r) => setTimeout(r, durationMs));
        }
      } catch (err) {
        console.warn('Turn audio replay error:', err);
      }
    }

    if (!conversationAbortRef.current) {
      setPlayingTurnId(null);
      setIsPlayingFullConversation(false);
    }
  };

  const handlePlayTurn = async (turn: Turn) => {
    stopConversationReplay();

    setPlayingTurnId(turn.id);
    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioPlaybackManager();
    }

    try {
      const res = await fetch('/api/coach/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: turn.text,
          voice: turn.speaker === 'victor' ? 'victor' : 'coach',
        }),
      });

      const data = await res.json();
      if (data.audio) {
        audioManagerRef.current.stopAndClear();
        audioManagerRef.current.playChunk(data.audio);
        const pcmByteLength = (data.audio.length * 3) / 4;
        const durationMs = Math.max(1500, (pcmByteLength / 32000) * 1000 + 500);
        setTimeout(() => {
          setPlayingTurnId((prev) => (prev === turn.id ? null : prev));
        }, durationMs);
      }
    } catch (err) {
      console.warn('Single turn TTS error:', err);
      setPlayingTurnId(null);
    }
  };

  const handleDiscard = () => {
    stopConversationReplay();
    if (audioManagerRef.current) {
      audioManagerRef.current.destroy();
      audioManagerRef.current = null;
    }
    onDiscardSession();
  };

  // Helper for badge colors
  const getStatusBadge = (status: QualitativeStatus) => {
    switch (status) {
      case 'Strong':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'Developing':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Sparkles className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'Needs practice':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'Not enough evidence':
      default:
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          Post-Conversation Debrief
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
          Your conversation review
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          Evidence-based review of your observable statements and conversation arc with Victor.
        </p>
      </div>

      {/* Written Coach Evaluation & Summary (Oral feedback is deactivated) */}
      <div
        id="coach-feedback-summary-card"
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Coach Feedback & Summary</h2>
              <p className="text-xs text-slate-500">
                Detailed written review of your conversation.
              </p>
            </div>
          </div>

          {/* Quick action: replay conversation dialogue audio if turns exist */}
          {turns.length > 0 && (
            <button
              id="replay-conversation-top-btn"
              onClick={handleReplayFullConversation}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                isPlayingFullConversation
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
              title="Listen to the entire conversation replay with Victor and your responses"
            >
              {isPlayingFullConversation ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause conversation replay</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Replay conversation</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="prose prose-sm max-w-none text-slate-800 space-y-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
          {feedback.summary || feedback.spoken_script}
        </div>

        {feedback.limitations && feedback.limitations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium">
              Note: {feedback.limitations.join(' ')}
            </p>
          </div>
        )}
      </div>

      {/* 1. Small Conversation Quality Dashboard (6 Criteria) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Conversation Quality Dashboard</h2>
            <p className="text-xs text-slate-500">
              Qualitative evaluation across the six core feedback criteria based on observable evidence.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Status: {feedback.assessment_status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALIGNA_CONFIG.criteriaLabels.map((c) => {
            const scoreItem = feedback.scores[c.key as keyof typeof feedback.scores];
            const qualStatus = ALIGNA_CONFIG.qualitativeMapping(scoreItem?.score ?? null);
            const badge = getStatusBadge(qualStatus);

            return (
              <div
                key={c.key}
                id={`criterion-card-${c.key}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900">{c.label}</span>
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{qualStatus}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {scoreItem?.reason || c.description}
                  </p>
                </div>

                {/* Evidence citations */}
                {scoreItem?.evidence_turn_ids && scoreItem.evidence_turn_ids.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex items-center space-x-1 text-[11px] text-slate-500">
                    <span className="font-medium">Evidence:</span>
                    <div className="flex flex-wrap gap-1">
                      {scoreItem.evidence_turn_ids.map((id) => (
                        <button
                          key={id}
                          onClick={() => {
                            setHighlightedTurnId(id);
                            setShowTranscript(true);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 font-mono text-[10px] transition-colors"
                          title="Click to view turn in transcript"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Structured Dialogue Outcomes Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-8">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Observed Dialogue Outcomes</h3>
        <p className="text-xs text-slate-500 mb-4">
          Did the conversation establish concrete mutual agreement and accountability?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-800">Acknowledged Impact</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feedback.outcome.victor_acknowledged_impact.value === true
                    ? 'bg-emerald-100 text-emerald-800'
                    : feedback.outcome.victor_acknowledged_impact.value === false
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {feedback.outcome.victor_acknowledged_impact.value === true
                  ? 'Achieved'
                  : feedback.outcome.victor_acknowledged_impact.value === false
                  ? 'Not achieved'
                  : 'Unclear'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              {feedback.outcome.victor_acknowledged_impact.reason}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-800">Warning Rule Agreed</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feedback.outcome.early_warning_rule_agreed.value === true
                    ? 'bg-emerald-100 text-emerald-800'
                    : feedback.outcome.early_warning_rule_agreed.value === false
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {feedback.outcome.early_warning_rule_agreed.value === true
                  ? 'Achieved'
                  : feedback.outcome.early_warning_rule_agreed.value === false
                  ? 'Not achieved'
                  : 'Unclear'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              {feedback.outcome.early_warning_rule_agreed.reason}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-800">Specific Next Step</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feedback.outcome.next_step_is_specific.value === true
                    ? 'bg-emerald-100 text-emerald-800'
                    : feedback.outcome.next_step_is_specific.value === false
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {feedback.outcome.next_step_is_specific.value === true
                  ? 'Achieved'
                  : feedback.outcome.next_step_is_specific.value === false
                  ? 'Not achieved'
                  : 'Unclear'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              {feedback.outcome.next_step_is_specific.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Rewrite Card if available */}
      {feedback.suggested_rewrite && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-8">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>A different way to say it</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {feedback.suggested_rewrite.original && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                  Original statement ({feedback.suggested_rewrite.original_turn_id})
                </span>
                <p className="italic text-slate-700">"{feedback.suggested_rewrite.original}"</p>
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block mb-1">
                Improved formulation
              </span>
              <p className="font-medium text-emerald-950">"{feedback.suggested_rewrite.improved}"</p>
              <p className="text-emerald-800 mt-2 text-[11px]">
                <strong>Why:</strong> {feedback.suggested_rewrite.why}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Practice Focus Banner */}
      {feedback.next_attempt_focus && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recommended Focus for Next Try
            </span>
            <p className="text-sm font-semibold mt-1 text-slate-100">
              {feedback.next_attempt_focus}
            </p>
          </div>
          <button
            id="practice-again-with-focus-btn"
            onClick={() => onPracticeAgain(feedback.next_attempt_focus)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 transition-colors shrink-0"
          >
            <span>Practice again with this focus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Full Transcript Drawer (Toggled from review) */}
      <div className="mb-8">
        <TranscriptDrawer
          turns={turns}
          isOpen={showTranscript}
          onToggle={() => setShowTranscript(!showTranscript)}
          highlightTurnId={highlightedTurnId}
          mode="voice"
          onPlayTurn={handlePlayTurn}
          playingTurnId={playingTurnId}
          onReplayAll={handleReplayFullConversation}
          isPlayingAll={isPlayingFullConversation}
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            id="practice-again-btn"
            onClick={() => onPracticeAgain(null)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice again</span>
          </button>

          <button
            id="review-transcript-btn"
            onClick={() => setShowTranscript(!showTranscript)}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all w-full sm:w-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showTranscript ? 'Hide transcript' : 'Review transcript'}</span>
          </button>
        </div>

        <button
          id="discard-session-bottom-btn"
          onClick={handleDiscard}
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors w-full sm:w-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Discard session</span>
        </button>
      </div>

      {/* Scientific/Psychological Disclaimer Footer */}
      <p className="text-[11px] text-slate-400 text-center mt-8">
        AI-generated practice feedback, not a validated assessment of your skills or personality.
      </p>
    </div>
  );
};
