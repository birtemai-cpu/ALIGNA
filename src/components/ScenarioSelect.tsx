import React from 'react';
import { ArrowRight, Clock, Target, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Scenario } from '../types.js';

interface ScenarioSelectProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
}

export const ScenarioSelect: React.FC<ScenarioSelectProps> = ({
  scenarios,
  onSelectScenario,
}) => {
  const activeScenario = scenarios.find((s) => s.active);
  const previewScenarios = scenarios.filter((s) => s.comingSoon);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero title and purpose matching Pitch Deck Slide 1 */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#fef9c3] text-[#0c331d] text-xs font-semibold mb-5 border border-[#fde047] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#0c331d]" />
          <span>AI Roleplay Conversation Coach</span>
        </div>
        <h1
          className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0c331d] leading-[1.15]"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          You know what you want to say.{' '}
          <span className="block mt-1 font-normal italic text-[#1b5030]">Then they push back.</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#234b33] leading-relaxed max-w-2xl mx-auto">
          Rehearse high-stakes workplace conversations out loud before you have them for real.
          Get actionable feedback on how you communicate under pressure.
        </p>
      </div>

      {/* Main Scenarios Grid */}
      <div className="space-y-6">
        {/* Active Scenario Card: Victor */}
        {activeScenario && (
          <div
            id="active-scenario-card"
            className="bg-white rounded-2xl border-2 border-[#0c331d] shadow-sm hover:shadow-md transition-all p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ece7d5] pb-5 mb-5">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#fef9c3] text-[#0c331d] border border-[#fde047]">
                    Ready to Practice
                  </span>
                  <span className="text-xs text-[#2c523b] font-medium">Single-session · Ephemeral</span>
                </div>
                <h2
                  className="text-2xl font-bold text-[#0c331d] mt-2"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {activeScenario.counterpart} · {activeScenario.title}
                </h2>
                <p className="text-sm font-medium text-[#2d553e] mt-0.5">
                  Your role: <span className="text-[#0c331d] font-semibold">{activeScenario.userRole}</span>
                </p>
              </div>

              <button
                id="prepare-conversation-btn"
                onClick={() => onSelectScenario(activeScenario)}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#0c331d] hover:bg-[#154528] transition-all shadow-sm active:scale-[0.98] w-full sm:w-auto cursor-pointer"
              >
                <span>Prepare conversation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#244c34] mb-1.5 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#0c331d]" />
                  <span>The Situation</span>
                </h3>
                <p className="text-sm text-[#143622] leading-relaxed bg-[#fbf8ee] p-4 rounded-xl border border-[#e8e3d2]">
                  {activeScenario.situation}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#244c34] mb-1.5 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-[#0c331d]" />
                  <span>Your Goal</span>
                </h3>
                <p className="text-sm text-[#143622] leading-relaxed bg-[#fbf8ee] p-4 rounded-xl border border-[#e8e3d2]">
                  {activeScenario.goal}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeScenario.practiceFocus.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#eef6f0] text-[#0c331d] border border-[#cbe5d4]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Preview Section */}
        <div>
          <div className="flex items-center space-x-2 mb-3 mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#244c34]">
              Future Scenarios
            </h3>
            <span className="text-xs text-stone-500 font-normal">(Non-functional preview)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previewScenarios.map((preview) => (
              <div
                key={preview.id}
                className="bg-white/70 rounded-xl border border-dashed border-[#d8d3c0] p-5 opacity-85 select-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f4f1e5] text-[#2c5139] border border-[#e2decb]">
                    Coming soon
                  </span>
                  <span className="text-xs text-stone-400 font-mono">Not startable</span>
                </div>
                <h4
                  className="text-base font-bold text-[#0c331d] mt-1"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {preview.counterpart} · {preview.title}
                </h4>
                <p className="text-xs text-[#2a4e37] mt-1 line-clamp-2">{preview.situation}</p>
                <div className="mt-3 pt-3 border-t border-[#ece7d5] flex items-center justify-between text-xs text-stone-500">
                  <span>Role: {preview.userRole}</span>
                  <span className="italic">Preview only</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
