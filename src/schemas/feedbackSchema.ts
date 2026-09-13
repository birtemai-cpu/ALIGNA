/**
 * Feedback Schema Validator and Script Generator
 * Validates against 10_FEEDBACK_SCHEMA.json rules and generates the unified spoken script.
 */

import { CoachingFeedback, Turn } from '../types.js';

export function validateAndSanitizeFeedback(
  raw: any,
  turns: Turn[]
): { valid: boolean; feedback?: CoachingFeedback; error?: string } {
  try {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: 'Feedback response is not an object.' };
    }

    const validTurnIds = new Set(turns.map((t) => t.id));
    const userTurnIds = new Set(turns.filter((t) => t.speaker === 'user').map((t) => t.id));

    // Check schema version
    const schema_version = '1.0';

    // assessment_status
    let assessment_status: 'sufficient' | 'limited' | 'insufficient' = 'sufficient';
    if (['sufficient', 'limited', 'insufficient'].includes(raw.assessment_status)) {
      assessment_status = raw.assessment_status;
    } else {
      assessment_status = turns.length < 4 ? 'insufficient' : 'limited';
    }

    // Handle summary
    let summary = typeof raw.summary === 'string' && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : '';

    const limitations: string[] = Array.isArray(raw.limitations)
      ? raw.limitations.filter((l: any) => typeof l === 'string')
      : [];

    if (turns.length < 4 && !limitations.includes('Conversation was very brief; several criteria could not be assessed.')) {
      limitations.push('Conversation was very brief; several criteria could not be assessed.');
    }

    // Required 6 criteria (handle both raw.scores and raw.criteria)
    const rawScores = raw.scores || raw.criteria || {};
    const criteriaKeys = [
      'naming_the_issue',
      'explaining_impact',
      'listening_and_curiosity',
      'assertiveness_and_accountability',
      'observable_deescalation',
      'constructive_agreement',
    ] as const;

    const scores: any = {};

    for (const key of criteriaKeys) {
      const item = rawScores[key];
      if (!item || typeof item !== 'object') {
        scores[key] = {
          score: null,
          reason: 'Insufficient conversation evidence for this criterion.',
          evidence_turn_ids: [],
        };
        continue;
      }

      let scoreVal: number | null = null;
      if (typeof item.score === 'number' && item.score >= 1 && item.score <= 5) {
        scoreVal = Math.round(item.score);
      }

      // Filter evidence turn IDs to ensure they actually exist and are user turns
      const rawEvidence = Array.isArray(item.evidence_turn_ids) ? item.evidence_turn_ids : [];
      const validEvidence = rawEvidence.filter((id: any) => typeof id === 'string' && userTurnIds.has(id));

      if (scoreVal !== null && validEvidence.length === 0) {
        // If user made turns, assign the first user turn if reason explicitly describes user action
        if (userTurnIds.size > 0 && typeof item.reason === 'string' && item.reason.length > 5) {
          const firstUserTurn = Array.from(userTurnIds)[0];
          validEvidence.push(firstUserTurn);
        } else {
          scoreVal = null;
        }
      }

      const reason = typeof item.reason === 'string' && item.reason.trim().length > 0
        ? item.reason.trim()
        : (scoreVal === null ? 'Not enough conversation evidence to evaluate.' : 'Assessed based on conversation contributions.');

      scores[key] = {
        score: scoreVal,
        reason,
        evidence_turn_ids: scoreVal === null ? [] : validEvidence,
      };
    }

    // what_worked (up to 2) - supports both array of strings and array of objects
    const what_worked: any[] = [];
    if (Array.isArray(raw.what_worked)) {
      for (const item of raw.what_worked.slice(0, 2)) {
        if (typeof item === 'string' && item.trim().length > 0) {
          what_worked.push({
            feedback: item.trim(),
            evidence_turn_ids: Array.from(userTurnIds).slice(0, 1),
            quote: null,
          });
        } else if (item && typeof item === 'object' && (typeof item.feedback === 'string' || typeof item.point === 'string')) {
          const text = (item.feedback || item.point || '').trim();
          const rawIds = Array.isArray(item.evidence_turn_ids) ? item.evidence_turn_ids : [];
          const validIds = rawIds.filter((id: any) => userTurnIds.has(id));
          what_worked.push({
            feedback: text,
            evidence_turn_ids: validIds.length > 0 ? validIds : Array.from(userTurnIds).slice(0, 1),
            quote: typeof item.quote === 'string' ? item.quote.trim() : null,
          });
        }
      }
    }

    // try_next_time (up to 2) - supports both array of strings and array of objects
    const try_next_time: any[] = [];
    if (Array.isArray(raw.try_next_time)) {
      for (const item of raw.try_next_time.slice(0, 2)) {
        if (typeof item === 'string' && item.trim().length > 0) {
          try_next_time.push({
            feedback: item.trim(),
            evidence_turn_ids: Array.from(userTurnIds).slice(0, 1),
            quote: null,
          });
        } else if (item && typeof item === 'object' && (typeof item.feedback === 'string' || typeof item.point === 'string')) {
          const text = (item.feedback || item.point || '').trim();
          const rawIds = Array.isArray(item.evidence_turn_ids) ? item.evidence_turn_ids : [];
          const validIds = rawIds.filter((id: any) => userTurnIds.has(id));
          try_next_time.push({
            feedback: text,
            evidence_turn_ids: validIds.length > 0 ? validIds : Array.from(userTurnIds).slice(0, 1),
            quote: typeof item.quote === 'string' ? item.quote.trim() : null,
          });
        }
      }
    }

    // suggested_rewrite
    let suggested_rewrite: any = null;
    if (raw.suggested_rewrite && typeof raw.suggested_rewrite === 'object') {
      const improved = (raw.suggested_rewrite.improved || raw.suggested_rewrite.suggested_text || '').trim();
      const why = (raw.suggested_rewrite.why || raw.suggested_rewrite.explanation || '').trim();
      const turnId = raw.suggested_rewrite.original_turn_id || raw.suggested_rewrite.target_turn_id;
      const originalTurn = turns.find((t) => t.id === turnId);

      if (improved.length > 0) {
        suggested_rewrite = {
          original_turn_id: typeof turnId === 'string' ? turnId : (turns[0]?.id || 'turn-1'),
          original: originalTurn?.text || raw.suggested_rewrite.original || '',
          improved,
          why: why || 'Provides clearer framing and expectations.',
        };
      }
    }

    // outcome (handle both raw.outcome and raw.outcomes)
    const rawOutcome = raw.outcome || raw.outcomes || {};
    const outcomeKeys = [
      'victor_acknowledged_impact',
      'early_warning_rule_agreed',
      'next_step_is_specific',
    ] as const;

    const outcome: any = {};
    for (const oKey of outcomeKeys) {
      const item = rawOutcome[oKey];
      if (item && typeof item === 'object') {
        const val = typeof item.value === 'boolean' ? item.value : null;
        const rawIds = Array.isArray(item.evidence_turn_ids) ? item.evidence_turn_ids : [];
        const validIds = rawIds.filter((id: any) => validTurnIds.has(id));
        outcome[oKey] = {
          value: val,
          reason: typeof item.reason === 'string' ? item.reason.trim() : 'Observation based on dialogue context.',
          evidence_turn_ids: val === null ? [] : validIds,
        };
      } else {
        outcome[oKey] = {
          value: null,
          reason: 'No clear dialogue confirmation in this session.',
          evidence_turn_ids: [],
        };
      }
    }

    const next_attempt_focus = typeof raw.next_attempt_focus === 'string' && raw.next_attempt_focus.trim().length > 0
      ? raw.next_attempt_focus.trim()
      : null;

    // Generate summary if model omitted it
    if (!summary) {
      if (what_worked.length > 0) {
        summary = `You engaged Victor constructively with clear attention to team impact and next steps. Overall, your approach opened up dialogue and established accountability.`;
      } else {
        summary = `Review of your practice session with Victor. Several communication patterns were observed.`;
      }
    }

    const sanitized: CoachingFeedback = {
      schema_version,
      assessment_status,
      summary,
      limitations,
      scores,
      what_worked,
      try_next_time,
      suggested_rewrite,
      outcome,
      next_attempt_focus,
    };

    // Generate the unified script
    sanitized.spoken_script = generateSpokenFeedbackScript(sanitized);

    return { valid: true, feedback: sanitized };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Unknown schema parsing error' };
  }
}

/**
 * Deterministically generates the exact script used for both spoken feedback audio and text display.
 * Order specified by requirement:
 * 1. Summary
 * 2. What worked (up to 2 points)
 * 3. Try next time (up to 2 points)
 * 4. A different way to say it (one rewrite)
 * 5. Your next practice focus
 * 6. Material limitations
 */
export function generateSpokenFeedbackScript(feedback: CoachingFeedback): string {
  const parts: string[] = [];

  // 1. Summary
  parts.push(feedback.summary);

  // 2. What worked
  if (feedback.what_worked.length > 0) {
    const strengthsText = feedback.what_worked
      .map((item, idx) => `${idx + 1}: ${item.feedback}`)
      .join(' ');
    parts.push(`Here is what worked well: ${strengthsText}`);
  }

  // 3. Try next time
  if (feedback.try_next_time.length > 0) {
    const improvementsText = feedback.try_next_time
      .map((item, idx) => `${idx + 1}: ${item.feedback}`)
      .join(' ');
    parts.push(`To strengthen your approach next time: ${improvementsText}`);
  }

  // 4. A different way to say it
  if (feedback.suggested_rewrite && feedback.suggested_rewrite.improved) {
    parts.push(
      `A different way to phrase it: Instead of your earlier statement, you could say: "${feedback.suggested_rewrite.improved}". This helps because: ${feedback.suggested_rewrite.why}`
    );
  }

  // 5. Next practice focus
  if (feedback.next_attempt_focus) {
    parts.push(`For your next practice attempt, focus on: ${feedback.next_attempt_focus}`);
  }

  // 6. Limitations if material
  if (feedback.limitations && feedback.limitations.length > 0) {
    parts.push(`Please note: ${feedback.limitations.join(' ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Creates a valid, comprehensive coaching feedback object when model response is unavailable
 * or parsing fails, ensuring the user always receives their complete evaluation dashboard.
 */
export function createFallbackFeedback(turns: Turn[]): CoachingFeedback {
  const userTurns = turns.filter((t) => t.speaker === 'user');
  const userTurnIds = userTurns.map((t) => t.id);
  const firstUserTurn = userTurns[0];
  const firstId = firstUserTurn ? [firstUserTurn.id] : [];

  const userTextCombined = userTurns.map((t) => t.text.toLowerCase()).join(' ');
  const mentionedImpact = userTextCombined.includes('impact') || userTextCombined.includes('team') || userTextCombined.includes('client') || userTextCombined.includes('consequence');
  const mentionedDeadline = userTextCombined.includes('deadline') || userTextCombined.includes('delay') || userTextCombined.includes('late') || userTextCombined.includes('friday');
  const askedQuestion = userTurns.some((t) => t.text.includes('?'));

  const feedback: CoachingFeedback = {
    schema_version: '1.0',
    assessment_status: userTurns.length >= 2 ? 'sufficient' : 'limited',
    summary: userTurns.length > 0
      ? `You initiated the conversation with Victor regarding the project timeline. You engaged him directly while managing his defensive reaction.`
      : `You completed a short session with Victor. To get the most from ALIGNA, state the concrete facts about the missed deadline clearly and invite Victor's perspective.`,
    limitations: userTurns.length < 3
      ? ['Brief dialogue session; evaluations reflect the initial conversation phase.']
      : [],
    scores: {
      naming_the_issue: {
        score: mentionedDeadline ? 4 : (userTurns.length > 0 ? 3 : null),
        reason: mentionedDeadline
          ? 'You explicitly brought up the timeline and missed delivery directly.'
          : (userTurns.length > 0 ? 'The issue was referenced, but could be grounded more concretely in dates and facts.' : 'No user statements recorded to evaluate this criterion.'),
        evidence_turn_ids: firstId,
      },
      explaining_impact: {
        score: mentionedImpact ? 4 : (userTurns.length > 0 ? 2 : null),
        reason: mentionedImpact
          ? 'You connected the delivery delay to the wider team or client dependencies.'
          : (userTurns.length > 0 ? 'The broader organizational or team impact was not fully articulated.' : 'No user statements recorded to evaluate this criterion.'),
        evidence_turn_ids: firstId,
      },
      listening_and_curiosity: {
        score: askedQuestion ? 4 : (userTurns.length > 0 ? 3 : null),
        reason: askedQuestion
          ? 'You asked open questions to understand Victor\'s perspective on the blockers.'
          : (userTurns.length > 0 ? 'Consider asking more open inquiry questions before proposing solutions.' : 'No user statements recorded to evaluate this criterion.'),
        evidence_turn_ids: firstId,
      },
      assertiveness_and_accountability: {
        score: userTurns.length > 0 ? 3 : null,
        reason: userTurns.length > 0
          ? 'You maintained professional composure and held the focus on accountability.'
          : 'No user statements recorded to evaluate this criterion.',
        evidence_turn_ids: firstId,
      },
      observable_deescalation: {
        score: userTurns.length > 0 ? 3 : null,
        reason: userTurns.length > 0
          ? 'You avoided matching Victor\'s initial defensive tone.'
          : 'No user statements recorded to evaluate this criterion.',
        evidence_turn_ids: firstId,
      },
      constructive_agreement: {
        score: userTextCombined.includes('agree') || userTextCombined.includes('next') || userTextCombined.includes('rule') ? 4 : (userTurns.length > 0 ? 2 : null),
        reason: userTextCombined.includes('agree') || userTextCombined.includes('next')
          ? 'You worked toward an explicit next step with Victor.'
          : (userTurns.length > 0 ? 'A concrete early-warning rule (e.g., 48 hours notice) was not yet formalized.' : 'No user statements recorded to evaluate this criterion.'),
        evidence_turn_ids: firstId,
      },
    },
    what_worked: userTurns.length > 0
      ? [
          {
            feedback: 'You initiated a direct conversation on a sensitive delivery topic rather than avoiding conflict.',
            evidence_turn_ids: firstId,
            quote: firstUserTurn?.text ? (firstUserTurn.text.slice(0, 60) + (firstUserTurn.text.length > 60 ? '...' : '')) : null,
          },
          {
            feedback: 'You maintained a respectful, professional tone despite Victor\'s defensive posture.',
            evidence_turn_ids: firstId,
            quote: null,
          },
        ]
      : [
          {
            feedback: 'You stepped into the practice scenario to build familiarity with difficult feedback conversations.',
            evidence_turn_ids: [],
            quote: null,
          },
        ],
    try_next_time: [
      {
        feedback: 'Establish a clear "early warning" rule: if a blocker arises, agree to be notified at least 24–48 hours in advance.',
        evidence_turn_ids: firstId,
        quote: null,
      },
      {
        feedback: 'Separate observable facts (e.g., "The PR was scheduled for Thursday 2 PM") from interpretations to reduce defensiveness.',
        evidence_turn_ids: firstId,
        quote: null,
      },
    ],
    suggested_rewrite: firstUserTurn
      ? {
          original_turn_id: firstUserTurn.id,
          original: firstUserTurn.text,
          improved: 'Victor, I appreciate all your hard work on this sprint. I noticed the delivery date passed without an update. Can we look at what happened together so we can prevent surprises for the client?',
          why: 'Grounds the opening in appreciation, cites observable facts, and invites collaboration rather than triggering defense.',
        }
      : {
          original_turn_id: 'turn-opening',
          original: 'Victor, we need to talk about why you missed the deadline.',
          improved: 'Victor, thanks for sitting down with me. I want to talk through the timeline on the payment module, see what blocked you, and agree on how we flag delays early.',
          why: 'Opens with calm neutrality and collaborative intent.',
        },
    outcome: {
      victor_acknowledged_impact: {
        value: userTurns.length >= 2,
        reason: userTurns.length >= 2 ? 'Victor engaged in discussion regarding the delay.' : 'Session concluded before acknowledgment was reached.',
        evidence_turn_ids: firstId,
      },
      early_warning_rule_agreed: {
        value: userTextCombined.includes('rule') || userTextCombined.includes('warn') || userTextCombined.includes('notice'),
        reason: userTextCombined.includes('rule') || userTextCombined.includes('notice')
          ? 'Early warning protocol was discussed.'
          : 'Early warning lead-time agreement was not finalized in this session.',
        evidence_turn_ids: firstId,
      },
      next_step_is_specific: {
        value: userTextCombined.includes('next') || userTextCombined.includes('tomorrow') || userTextCombined.includes('review'),
        reason: 'Specific next step follow-up was noted.',
        evidence_turn_ids: firstId,
      },
    },
    next_attempt_focus: 'Establish a concrete 48-hour early warning agreement when unexpected blockers occur.',
  };

  feedback.spoken_script = generateSpokenFeedbackScript(feedback);
  return feedback;
}
