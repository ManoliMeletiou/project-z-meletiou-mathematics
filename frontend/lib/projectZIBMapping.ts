export type IBMCriteria = 'B' | 'C' | 'D';

export type IBCriterionMapping = {
  criterion: IBMCriteria;
  description: string;
  skills: string[];
  evidenceRequired: string;
};

export const IB_MYP_CRITERIA: IBCriterionMapping[] = [
  {
    criterion: 'B',
    description: 'Investigating Patterns',
    skills: ['Pattern recognition', 'Generalization', 'Proof', 'Conjecture'],
    evidenceRequired: 'Multiple examples showing pattern identification and justification'
  },
  {
    criterion: 'C',
    description: 'Communicating',
    skills: ['Explanation', 'Representation', 'Justification', 'Reflection'],
    evidenceRequired: 'Clear written or verbal explanation with appropriate mathematical language'
  },
  {
    criterion: 'D',
    description: 'Applying Mathematics in Real-Life Contexts',
    skills: ['Modelling', 'Problem solving', 'Interpretation', 'Evaluation'],
    evidenceRequired: 'Application of mathematics to authentic real-world or abstract situations'
  }
];

export function getCriterionByCode(code: IBMCriteria) {
  return IB_MYP_CRITERIA.find(c => c.criterion === code);
}

export function getAllCriteria() {
  return IB_MYP_CRITERIA;
}
