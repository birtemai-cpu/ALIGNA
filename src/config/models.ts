/**
 * ALIGNA Central Model & Voice Configuration
 * Stores verified, tested Gemini model IDs and voice configurations.
 */

export const ALIGNA_CONFIG = {
  // Verified real models in this project:
  models: {
    live: 'gemini-3.1-flash-live-preview',
    text: 'gemini-3.8-flash',
    tts: 'gemini-3.1-flash-tts-preview',
  },
  voices: {
    victor: 'Puck',  // Reserved, natural English male counterpart voice
    coach: 'Kore',   // Calm, supportive, clear English coach voice
  },
  sessionLimits: {
    targetDurationMinutes: 5,
    maxDurationMinutes: 10,
    cleanupMinutes: 2,
  },
  criteriaLabels: [
    { key: 'naming_the_issue', label: 'Naming the issue', description: 'Specific observable behavior rather than character attacks.' },
    { key: 'explaining_impact', label: 'Explaining impact', description: 'Effect of missing information on colleagues and dependent work.' },
    { key: 'listening_and_curiosity', label: 'Listening & curiosity', description: 'Relevant questions and exploring Victor’s perspective.' },
    { key: 'assertiveness_and_accountability', label: 'Clear expectations', description: 'Assertive accountability without aggression or excuses.' },
    { key: 'observable_deescalation', label: 'De-escalation', description: 'Constructive wording and responding calmly to resistance.' },
    { key: 'constructive_agreement', label: 'Next steps', description: 'Feasible next steps for risk communication and follow-up.' },
  ] as const,
  qualitativeMapping: (score: number | null): 'Needs practice' | 'Developing' | 'Strong' | 'Not enough evidence' => {
    if (score === null || score === undefined) return 'Not enough evidence';
    if (score <= 2) return 'Needs practice';
    if (score === 3) return 'Developing';
    return 'Strong'; // 4 or 5
  },
};
