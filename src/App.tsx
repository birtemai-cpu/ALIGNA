/**
 * ALIGNA Main Application Component
 */

import React, { useState, useEffect } from 'react';
import { SCENARIOS } from './config/scenarios.js';
import {
  Scenario,
  Difficulty,
  SessionMode,
  SessionState,
  Turn,
  CoachingFeedback,
} from './types.js';
import { Navbar } from './components/Navbar.js';
import { ScenarioSelect } from './components/ScenarioSelect.js';
import { BriefingView } from './components/BriefingView.js';
import { PracticeRoom } from './components/PracticeRoom.js';
import { SafetyExitModal } from './components/SafetyExitModal.js';
import { DashboardAndFeedback } from './components/DashboardAndFeedback.js';
import { Loader2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { createFallbackFeedback } from './schemas/feedbackSchema.js';

export default function App() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [view, setView] = useState<'scenario_select' | 'briefing' | 'practice' | 'feedback'>('scenario_select');
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionMode, setSessionMode] = useState<SessionMode>('voice');
  const [difficulty, setDifficulty] = useState<Difficulty>('gentle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [feedback, setFeedback] = useState<CoachingFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [activeFocus, setActiveFocus] = useState<string | null>(null);

  // Check backend and models health on boot
  const [modelStatus, setModelStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/models/status')
      .then((res) => res.json())
      .then((data) => setModelStatus(data))
      .catch((err) => console.warn('Model status check error:', err));
  }, []);

  // 1. Select Scenario -> Go to Briefing
  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setView('briefing');
    setSessionState('setup');
  };

  // 2. Start Practice -> Voice or Text
  const handleStartPractice = (mode: SessionMode) => {
    setSessionMode(mode);
    setTurns([]);
    setFeedback(null);
    setFeedbackError(null);
    setView('practice');
    setSessionState('connecting');
  };

  // 3. End Practice -> Fetch Coach Feedback
  const handleEndConversation = async (finalTurns: Turn[]) => {
    const validTurns = Array.isArray(finalTurns) && finalTurns.length > 0 ? finalTurns : turns;
    setTurns(validTurns);
    setIsLoadingFeedback(true);
    setFeedbackError(null);
    setSessionState('ending');

    try {
      const res = await fetch('/api/coach/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns: validTurns, scenarioId: selectedScenario.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.feedback) {
        throw new Error(data.error || 'Failed to generate coaching evaluation.');
      }

      setFeedback(data.feedback);
      setView('feedback');
      setSessionState('review');
    } catch (err: any) {
      console.warn('Backend feedback fetch encountered error, synthesizing fallback evaluation:', err);
      // Guarantee that the participant receives their complete feedback dashboard
      const fallback = createFallbackFeedback(validTurns);
      setFeedback(fallback);
      setView('feedback');
      setSessionState('review');
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // 4. Trigger Safety Stop
  const handleStopPractice = () => {
    setIsSafetyModalOpen(true);
    setSessionState('safety_exit');
  };

  // 5. Safety Exit Actions
  const handleEndAndClear = () => {
    handleDiscardSession();
    setIsSafetyModalOpen(false);
  };

  const handleRestartGently = () => {
    setIsSafetyModalOpen(false);
    setDifficulty('gentle');
    setTurns([]);
    setFeedback(null);
    handleStartPractice(sessionMode);
  };

  const handleReviewFromSafety = () => {
    setIsSafetyModalOpen(false);
    if (turns.length > 0) {
      handleEndConversation(turns);
    }
  };

  // 6. Lower Intensity
  const handleLowerIntensity = () => {
    setDifficulty('gentle');
  };

  // 7. Practice Again (Learning loop)
  const handlePracticeAgain = (focus: string | null) => {
    setActiveFocus(focus);
    setTurns([]);
    setFeedback(null);
    setFeedbackError(null);
    setView('briefing');
    setSessionState('setup');
  };

  // 8. Discard All In-Memory Session Data
  const handleDiscardSession = () => {
    setTurns([]);
    setFeedback(null);
    setFeedbackError(null);
    setActiveFocus(null);
    setView('scenario_select');
    setSessionState('idle');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-slate-200">
      {/* Navbar with brand, status indicator, and safety stop */}
      <Navbar
        sessionState={sessionState}
        sessionMode={sessionMode}
        onDiscard={handleDiscardSession}
        onSafetyExit={view === 'practice' ? handleStopPractice : undefined}
        hasActiveData={turns.length > 0 || feedback !== null || view === 'practice'}
      />

      {/* Main View Flow */}
      <main className="flex-1 flex flex-col items-center justify-start">
        {/* Scenario Selection View */}
        {view === 'scenario_select' && (
          <ScenarioSelect
            scenarios={SCENARIOS}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {/* Briefing and Preparation View */}
        {view === 'briefing' && (
          <div className="w-full">
            {activeFocus && (
              <div className="max-w-4xl mx-auto px-4 pt-6">
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Practice focus for this try:</strong> {activeFocus}
                  </span>
                </div>
              </div>
            )}
            <BriefingView
              scenario={selectedScenario}
              difficulty={difficulty}
              onSelectDifficulty={setDifficulty}
              onStartSession={handleStartPractice}
              onBack={() => setView('scenario_select')}
            />
          </div>
        )}

        {/* Active Practice Room View */}
        {view === 'practice' && (
          <PracticeRoom
            difficulty={difficulty}
            sessionMode={sessionMode}
            onEndConversation={handleEndConversation}
            onStopPractice={handleStopPractice}
            onLowerIntensity={handleLowerIntensity}
            onDiscardSession={handleDiscardSession}
          />
        )}

        {/* Loading Coach Feedback State */}
        {isLoadingFeedback && (
          <div className="w-full max-w-md mx-auto my-auto py-24 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Evaluating your conversation</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Validating observable evidence across naming the issue, team impact, curiosity, and agreements…
            </p>
          </div>
        )}

        {/* Feedback and Small Quality Dashboard View */}
        {view === 'feedback' && !isLoadingFeedback && (
          <>
            {feedback ? (
              <DashboardAndFeedback
                feedback={feedback}
                turns={turns}
                onPracticeAgain={handlePracticeAgain}
                onDiscardSession={handleDiscardSession}
              />
            ) : (
              <div className="w-full max-w-lg mx-auto py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Feedback Pending</h2>
                <p className="text-xs text-slate-600 mt-2">
                  {feedbackError || 'Click below to generate and review your conversation evaluation.'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => handleEndConversation(turns)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Evaluate conversation now</span>
                  </button>
                  <button
                    onClick={() => handlePracticeAgain(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Practice again
                  </button>
                  <button
                    onClick={handleDiscardSession}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  >
                    Discard session
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Safety Exit Modal */}
      <SafetyExitModal
        isOpen={isSafetyModalOpen}
        onClose={() => {
          setIsSafetyModalOpen(false);
          setSessionState('active');
        }}
        onEndAndClear={handleEndAndClear}
        onRestartGently={handleRestartGently}
        onReviewConversation={turns.length > 0 ? handleReviewFromSafety : undefined}
        canReview={turns.length > 0}
      />
    </div>
  );
}
