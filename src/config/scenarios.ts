import { Scenario } from '../types.js';

export const SCENARIOS: Scenario[] = [
  {
    id: 'victor_early_warning',
    title: 'The missed warning',
    counterpart: 'Victor',
    counterpartRole: 'Experienced team member',
    userRole: "Victor's team lead",
    situation:
      'Victor has missed several project deadlines. In the latest project, he did not flag that his delivery was at risk, including at the final project meeting. On the due date, the team learned that his work would be several days late. Colleagues could not begin their dependent work.',
    goal: 'Address the missing early warning, understand what made it difficult to speak up, and agree on how delivery risks will be communicated next time.',
    practiceFocus: ['Clear feedback', 'Curiosity', 'Accountability', 'Concrete agreement'],
    active: true,
  },
  {
    id: 'elena_overload',
    title: 'Saying yes to too much',
    counterpart: 'Elena',
    counterpartRole: 'Senior specialist',
    userRole: "Elena's team lead",
    situation:
      'A capable colleague repeatedly agrees to more assignments and stakeholder requests than she can sustainably deliver, leading to burnout and quality bottlenecks.',
    goal: 'Help Elena set realistic workload boundaries and delegate without guilt.',
    practiceFocus: ['Boundary setting', 'Prioritization', 'Supportive inquiry'],
    active: false,
    comingSoon: true,
  },
  {
    id: 'jonas_handoffs',
    title: 'The conversation that keeps moving',
    counterpart: 'Jonas',
    counterpartRole: 'Cross-functional partner',
    userRole: 'Peer team lead',
    situation:
      'A project partner repeatedly postpones discussions about missed handoffs and unclear ownership across department boundaries.',
    goal: 'Firmly address avoidance, clarify accountability, and establish shared delivery agreements.',
    practiceFocus: ['Constructive confrontation', 'Clarifying ownership', 'Preventing deflection'],
    active: false,
    comingSoon: true,
  },
];
