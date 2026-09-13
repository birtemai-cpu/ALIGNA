/**
 * ALIGNA Type Definitions
 */

export type Difficulty = 'gentle' | 'challenging';

export type SessionMode = 'voice' | 'text';

export type SessionState =
  | 'idle'
  | 'setup'
  | 'connecting'
  | 'active'
  | 'paused'
  | 'ending'
  | 'review'
  | 'safety_exit'
  | 'error'
  | 'discarded';

export interface Turn {
  id: string;
  speaker: 'user' | 'victor';
  text: string;
  status: 'final' | 'interrupted';
  timestamp: number;
}

export interface Scenario {
  id: string;
  title: string;
  counterpart: string;
  counterpartRole: string;
  userRole: string;
  situation: string;
  goal: string;
  practiceFocus: string[];
  active: boolean;
  comingSoon?: boolean;
}

export interface CriterionScore {
  score: number | null;
  reason: string;
  evidence_turn_ids: string[];
}

export interface FeedbackItem {
  feedback: string;
  evidence_turn_ids: string[];
  quote: string | null;
}

export interface SuggestedRewrite {
  original_turn_id: string;
  original: string;
  improved: string;
  why: string;
}

export interface OutcomeItem {
  value: boolean | null;
  reason: string;
  evidence_turn_ids: string[];
}

export interface CoachingFeedback {
  schema_version: '1.0';
  assessment_status: 'sufficient' | 'limited' | 'insufficient';
  summary: string;
  limitations: string[];
  scores: {
    naming_the_issue: CriterionScore;
    explaining_impact: CriterionScore;
    listening_and_curiosity: CriterionScore;
    assertiveness_and_accountability: CriterionScore;
    observable_deescalation: CriterionScore;
    constructive_agreement: CriterionScore;
  };
  what_worked: FeedbackItem[];
  try_next_time: FeedbackItem[];
  suggested_rewrite: SuggestedRewrite | null;
  outcome: {
    victor_acknowledged_impact: OutcomeItem;
    early_warning_rule_agreed: OutcomeItem;
    next_step_is_specific: OutcomeItem;
  };
  next_attempt_focus: string | null;
  spoken_script?: string;
}

export type QualitativeStatus = 'Needs practice' | 'Developing' | 'Strong' | 'Not enough evidence';

export interface ModelStatus {
  liveModel: { id: string; available: boolean; tested: boolean };
  textModel: { id: string; available: boolean; tested: boolean };
  ttsModel: { id: string; available: boolean; tested: boolean };
  voices: { victor: string; coach: string };
  apiKeyConfigured: boolean;
}
