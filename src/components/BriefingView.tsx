import React, { useState } from 'react';
import { ArrowLeft, Mic, MessageSquare, Shield, Info, Check, Sparkles } from 'lucide-react';
import { Scenario, Difficulty, SessionMode } from '../types.js';

interface BriefingViewProps {
  scenario: Scenario;
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onStartSession: (mode: SessionMode) => void;
  onBack: () => void;
}

export const BriefingView: React.FC<BriefingViewProps> = ({
  scenario,
  difficulty,
  onSelectDifficulty,
  onStartSession,
  onBack,
}) => {
  const [micError, setMicError] = useState<string | null>(null);
  const [isStartingMic, setIsStartingMic] = useState(false);

  const handleStartVoice = async () => {
    setIsStartingMic(true);
    setMicError(null);
    try {
      // Test mic permission directly
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setIsStartingMic(false);
      onStartSession('voice');
    } catch (err: any) {
      setIsStartingMic(false);
      setMicError('Microphone access is off. Allow it in your browser or continue with text.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-10">
      {/* Back button */}
      <button
        id="briefing-back-btn"
        onClick={onBack}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#2d553e] hover:text-[#0c331d] mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to scenario list</span>
      </button>

      <div className="bg-white rounded-2xl border border-[#e8e4d3] shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="border-b border-[#ece7d5] pb-5 mb-6">
          <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#fef9c3] text-[#0c331d] border border-[#fde047]">
            Case Briefing
          </span>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#0c331d] mt-2"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Meeting with {scenario.counterpart}
          </h1>
          <p className="text-sm text-[#2d553e] mt-1">{scenario.title}</p>
        </div>

        {/* 3 Core Briefing Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-[#fbf8ee] border border-[#e8e3d2]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#244c34] mb-1">
              Your Role
            </h2>
            <p className="text-sm font-semibold text-[#0c331d]">{scenario.userRole}</p>
            <p className="text-xs text-[#2c523b] mt-1">Leading the 1-on-1 feedback discussion</p>
          </div>

          <div className="p-4 rounded-xl bg-[#fbf8ee] border border-[#e8e3d2]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#244c34] mb-1">
              What Happened
            </h2>
            <p className="text-xs text-[#143622] leading-relaxed">
              {scenario.situation}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#fbf8ee] border border-[#e8e3d2]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#244c34] mb-1">
              Your Goal
            </h2>
            <p className="text-xs text-[#143622] leading-relaxed">
              {scenario.goal}
            </p>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#244c34] mb-2">
            Select Practice Intensity
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              id="difficulty-gentle-btn"
              onClick={() => onSelectDifficulty('gentle')}
              className={`text-left p-4 rounded-xl border-2 transition-all flex items-start justify-between cursor-pointer ${
                difficulty === 'gentle'
                  ? 'border-[#0c331d] bg-[#fbf8ee] shadow-2xs'
                  : 'border-[#e8e4d3] hover:border-[#cfc9b6]'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-[#0c331d]">Gentle practice</span>
                  {difficulty === 'gentle' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0c331d] text-white font-medium">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#2c523b] mt-1">
                  More space to think, with milder resistance. Opens up earlier after relevant questions.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  difficulty === 'gentle' ? 'border-[#0c331d] bg-[#0c331d] text-white' : 'border-[#cfc9b6]'
                }`}
              >
                {difficulty === 'gentle' && <Check className="w-3 h-3" />}
              </div>
            </button>

            <button
              type="button"
              id="difficulty-challenging-btn"
              onClick={() => onSelectDifficulty('challenging')}
              className={`text-left p-4 rounded-xl border-2 transition-all flex items-start justify-between cursor-pointer ${
                difficulty === 'challenging'
                  ? 'border-[#0c331d] bg-[#fbf8ee] shadow-2xs'
                  : 'border-[#e8e4d3] hover:border-[#cfc9b6]'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-[#0c331d]">Challenging practice</span>
                  {difficulty === 'challenging' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0c331d] text-white font-medium">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#2c523b] mt-1">
                  More direct resistance, requiring clearer facts and agreements, within the same safety boundaries.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  difficulty === 'challenging' ? 'border-[#0c331d] bg-[#0c331d] text-white' : 'border-[#cfc9b6]'
                }`}
              >
                {difficulty === 'challenging' && <Check className="w-3 h-3" />}
              </div>
            </button>
          </div>
        </div>

        {/* Notices & Guardrails */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-[#fef9c3]/70 border border-[#fde047] text-xs text-[#0c331d]">
            <Shield className="w-4 h-4 text-[#0c331d] shrink-0 mt-0.5" />
            <p>
              <strong>Simulation notice:</strong> Victor is an AI simulation. Use fictional details and leave out real names or confidential work information. You can pause or stop at any time.
            </p>
          </div>

          <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-[#fbf8ee] border border-[#e8e3d2] text-xs text-[#2c523b]">
            <Info className="w-4 h-4 text-[#2c523b] shrink-0 mt-0.5" />
            <p>
              <strong>Data notice:</strong> Your speech and text are sent to Google to generate replies and feedback. This prototype keeps its own conversation data only for the current session in memory. Provider retention follows the project's service settings and terms.
            </p>
          </div>
        </div>

        {/* Mic Error Alert */}
        {micError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <span>{micError}</span>
            <button
              onClick={() => onStartSession('text')}
              className="font-semibold underline ml-3 shrink-0"
            >
              Continue with text
            </button>
          </div>
        )}

        {/* Conversation Start Tip */}
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-[#eef6f0] border border-[#cbe5d4] text-xs text-[#0c331d] mb-6">
          <Sparkles className="w-4 h-4 text-[#0c331d] shrink-0 mt-0.5" />
          <p>
            <strong>Starting the conversation:</strong> You initiate the conversation by greeting Victor. Victor will then share his initial guess as to what the meeting is about — unless you already mention the topic directly in your greeting.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            id="start-voice-practice-btn"
            onClick={handleStartVoice}
            disabled={isStartingMic}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-[#0c331d] hover:bg-[#154528] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>{isStartingMic ? 'Checking microphone...' : 'Start voice practice'}</span>
          </button>

          <button
            id="start-text-practice-btn"
            onClick={() => onStartSession('text')}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-[#0c331d] bg-[#f4f1e5] hover:bg-[#e9e5d4] border border-[#e2decb] active:scale-[0.98] transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Use text instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};
