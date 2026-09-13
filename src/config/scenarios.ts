import { Scenario } from '../types.js';

export const SCENARIOS: Scenario[] = [
  {
    id: 'victor_early_warning',
    title: 'Repeatedly shifted deadlines',
    counterpart: 'Victor',
    counterpartRole: 'Experienced team member',
    userRole: "Victor's team lead",
    situation:
      'Victor has repeatedly postponed delivery dates and project deadlines across recent milestones. Whenever a deadline approaches, he pushes the target date back by several days or another week, often at short notice. In the latest project, he has moved the delivery date three times. Downstream colleagues and cross-functional teams cannot begin dependent work or rely on project timelines.',
    goal: 'Address the pattern of constant deadline postponements, explore the root causes (scope creep, perfectionism, reluctance to escalate blockers), and agree on reliable delivery commitments.',
    practiceFocus: ['Addressing repeated patterns', 'Root-cause exploration', 'Reliable commitments', 'Concrete communication rule'],
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
