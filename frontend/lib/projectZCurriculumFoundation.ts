export const PROJECT_Z_MYP_YEARS = [1, 2, 3, 4, 5] as const;

export const PROJECT_Z_PATHWAY_CODES = [
  'myp_1_standard',
  'myp_1_extended',
  'myp_2_standard',
  'myp_2_extended',
  'myp_3_standard',
  'myp_3_extended',
  'myp_4_standard',
  'myp_4_extended',
  'myp_5_standard',
  'myp_5_extended',
  'dp_aa_standard',
  'dp_aa_higher',
  'dp_ai_standard',
  'dp_ai_higher'
] as const;

export type ProjectZPathwayCode = (typeof PROJECT_Z_PATHWAY_CODES)[number];

export const PROJECT_Z_DP_PATHWAY_CODES = [
  'dp_aa_standard',
  'dp_aa_higher',
  'dp_ai_standard',
  'dp_ai_higher'
] as const satisfies readonly ProjectZPathwayCode[];

export const PROJECT_Z_MINIMUM_VERIFIED_VARIANTS_PER_SKILL = 2000;

export function isProjectZPathwayCode(value: string): value is ProjectZPathwayCode {
  return (PROJECT_Z_PATHWAY_CODES as readonly string[]).includes(value);
}

export function mypPathwayCode(
  year: (typeof PROJECT_Z_MYP_YEARS)[number],
  level: 'Standard' | 'Extended'
): ProjectZPathwayCode {
  return `myp_${year}_${level.toLowerCase()}` as ProjectZPathwayCode;
}
