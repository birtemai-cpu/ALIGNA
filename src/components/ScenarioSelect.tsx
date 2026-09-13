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
      {/* Hero title and purpose */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-4 border border-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Professional Feedback Simulator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Practice the conversation before it matters.
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
          Try a difficult workplace conversation with an AI partner, then get practical feedback on what you said.
        </p>
      </div>

      {/* Main Scenarios Grid */}
      <div className="space-y-6">
        {/* Active Scenario Card: Victor */}
        {activeScenario && (
          <div
            id="active-scenario-card"
            className="bg-white rounded-2xl border-2 border-slate-900 shadow-md hover:shadow-lg transition-all p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Ready to Practice
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Single-session · Ephemeral</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  {activeScenario.counterpart} · {activeScenario.title}
                </h2>
                <p className="text-sm font-medium text-slate-600 mt-0.5">
                  Your role: <span className="text-slate-900 font-semibold">{activeScenario.userRole}</span>
                </p>
              </div>

              <button
                id="prepare-conversation-btn"
                onClick={() => onSelectScenario(activeScenario)}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98] w-full sm:w-auto"
              >
                <span>Prepare conversation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-700" />
                  <span>The Situation</span>
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {activeScenario.situation}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-slate-700" />
                  <span>Your Goal</span>
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {activeScenario.goal}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeScenario.practiceFocus.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200 text-slate-800"
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Future Scenarios
            </h3>
            <span className="text-xs text-slate-400 font-normal">(Non-functional preview)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previewScenarios.map((preview) => (
              <div
                key={preview.id}
                className="bg-slate-50/80 rounded-xl border border-dashed border-slate-300 p-5 opacity-75 select-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Coming soon
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Not startable</span>
                </div>
                <h4 className="text-base font-bold text-slate-700 mt-1">
                  {preview.counterpart} · {preview.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preview.situation}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
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
