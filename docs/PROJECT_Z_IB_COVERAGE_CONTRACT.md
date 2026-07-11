# Project Z IB Mathematics Coverage Contract

## Supported pathways

The launch coverage matrix contains fourteen pathways:

| Programme | Pathways |
|---|---|
| MYP Year 1 | Standard, Extended |
| MYP Year 2 | Standard, Extended |
| MYP Year 3 | Standard, Extended |
| MYP Year 4 | Standard, Extended |
| MYP Year 5 | Standard, Extended |
| DP Mathematics | Analysis and Approaches SL, Analysis and Approaches HL, Applications and Interpretation SL, Applications and Interpretation HL |

The curriculum atlas must be mapped against the current authorized IB subject documentation used by the school. Project Z may add prerequisite or enrichment skills, but must distinguish them from required programme coverage.

## Skill record contract

Every advertised skill requires:

- stable canonical identifier and version;
- programme, year, pathway, topic, subtopic, and course ordering;
- precise student-facing learning objective;
- prerequisite and successor edges;
- representations, notation, vocabulary, and calculator expectations;
- applicable MYP or DP assessment dimensions;
- common misconceptions and diagnostic evidence;
- worked examples and teaching explanations;
- practice blueprint families across difficulty and context;
- accessibility metadata and localization-ready text;
- source/provenance and human review record;
- active, draft, deprecated, and replacement lifecycle states.

## Practice depth contract

“Thousands of practices per skill” means each active skill can produce at least 2,000 mathematically distinct, reproducible, verified practice instances, not 2,000 superficial number swaps.

Each skill must include multiple blueprint families and, where appropriate:

- fluency and conceptual questions;
- multiple representations;
- routine and unfamiliar contexts;
- reverse, error-analysis, and explanation tasks;
- calculator and non-calculator forms;
- difficulty progression;
- MYP criteria or DP command-term alignment;
- distractors derived from real misconceptions;
- equivalence-aware answer checking;
- units, domains, precision, significant figures, and notation checks.

A skill is not serveable until automated sampling proves at least 2,000 valid seeds, with no duplicate normalized question/answer pairs in the release sample. The minimum release sample is 500 generated instances per blueprint family or every valid instance when the family is smaller.

## Verification pipeline

1. Validate parameters and constraints before rendering.
2. Compute the answer independently from the rendered solution path where possible.
3. Check symbolic/numerical equivalence, domain restrictions, units, precision, and notation.
4. Verify distractors are wrong for the intended reason and never accidentally equivalent.
5. Detect exact and semantic duplicates.
6. Check reading level, ambiguity, accessibility, and prohibited content.
7. Sample across seeds, difficulty, pathway, and representation.
8. Require human mathematics review before a blueprint becomes active.
9. Record generator version, seed, verification results, and reviewer.
10. Quarantine a blueprint automatically when monitoring finds a correctness regression.

## Coverage gates

A pathway may be advertised as complete only when:

- 100% of its approved skill atlas is reviewed and versioned;
- 100% of required skills have prerequisite placement;
- 100% have diagnostics and misconception mappings;
- 100% have at least 2,000 verified distinct instances;
- 100% pass the mathematical and accessibility release checks;
- every skill has teaching support, not answer-only feedback;
- an independent sample audit meets the approved correctness threshold;
- no unresolved critical or high-severity content defect remains.

Raw row counts do not prove coverage. Coverage is calculated over the approved canonical atlas, and inactive, duplicate, unlinked, or unverified content does not count.

## Diagnostic and mastery contract

- Diagnostics adapt across prerequisites and target skills and stop when confidence is sufficient.
- A single correct answer never proves mastery.
- Mastery uses recency, independence, difficulty, representation diversity, and repeated evidence.
- Hint use is learning evidence, not punishment.
- Guessing, copying, repeated retries, or answer reveal reduce evidence strength without shaming the learner.
- Spaced review is scheduled after initial success and again after delay.
- Recommendations state the evidence and allow a teacher to override them.

## Tutor contract

The tutor follows a learning ladder:

1. identify the learner's goal and current attempt;
2. diagnose the exact misconception or missing prerequisite;
3. choose a representation or smaller step;
4. offer the least revealing useful hint;
5. ask the learner to act;
6. check the learner's reasoning;
7. repair misconceptions explicitly;
8. summarize the transferable idea;
9. give a short independent check;
10. record safe, structured learning evidence.

The tutor must support text and mathematical notation first. Graphs, diagrams, manipulatives, audio, or vision may be added when they materially improve understanding and pass the same safety and accessibility gates.

