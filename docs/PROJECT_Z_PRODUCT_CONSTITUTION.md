# Project Z Product Constitution

## Authority and boundary

This document is the binding product contract for Project Z.

The only writable product systems are:

- GitHub: `ManoliMeletiou/project-z-meletiou-mathematics`
- Vercel: `project-z-meletiou-mathematics.vercel.app`
- Supabase: `jlesueqjdvmxkqaqmnke`

`ManoliMeletiou/meletiou-mathematics-platform`, its Vercel app, its database, and every other product are read-only references. Ideas or information may be independently recreated inside Project Z, but no external reference system may be changed by Project Z work.

## Product promise

Project Z is an IB mathematics learning system that helps a learner understand mathematics, practise it deliberately, explain it clearly, and transfer it to unfamiliar situations. It supports the complete learning loop for students, teachers, and parents without turning learning into a confusing collection of pages.

The product covers:

- MYP Years 1–5 Standard
- MYP Years 1–5 Extended
- DP Mathematics: Analysis and Approaches SL and HL
- DP Mathematics: Applications and Interpretation SL and HL

Project labels must say `MYP Standard` and `MYP Extended`; `Core` is not a product course label.

## Non-negotiable learning principles

1. Mathematical truth comes first. A polished incorrect question is a release-blocking defect.
2. The AI tutor teaches with questions, representations, hints, checks for understanding, and misconception repair. It does not simply reveal an answer.
3. Students retain agency. Hints become progressively more explicit and the learner is asked to attempt the next step.
4. Mastery is skill-specific, evidence-based, explainable, and revisited over time.
5. Motivation is separate from assessment. XP, streaks, levels, companions, and cosmetics never become grades.
6. Teachers control assigned work, publication, feedback, and high-stakes judgement.
7. Parents see safe summaries and useful support actions, never raw tutor chats, private teacher notes, or another learner's data.
8. Accessibility, privacy, security, and child safety are product features, not later additions.

## Calm-interface rules

Every primary page must follow progressive disclosure:

- one dominant next action;
- no more than two immediately visible secondary actions;
- advanced or infrequent tools behind a clearly named disclosure;
- plain-language labels based on the user's goal;
- role-specific navigation with no design, test, or system route in a learner's primary path;
- a visible way home, contextual help, and an account control;
- designed empty, loading, error, offline, and recovery states;
- keyboard operation, visible focus, semantic headings, reduced motion, and responsive layouts.

Capabilities are not removed merely to simplify a page. They are placed at the correct depth.

## Roles and their primary jobs

| Role | Primary job | First screen must answer |
|---|---|---|
| Student | Learn the right skill next | “What should I learn or finish now?” |
| Teacher | Decide and act on learning evidence | “Who needs what, and what must I do next?” |
| Parent | Support without surveillance | “How is my child progressing, and how can I help?” |
| Admin | Keep the platform safe and accurate | “What needs intervention before learners are affected?” |

## AI and content safety

- AI output is untrusted until it passes deterministic checks and the applicable review gate.
- Questions require a canonical skill, course placement, difficulty, solution, answer model, misconception model, provenance, verification state, and version.
- Criterion A may use deterministic marking where mathematically valid. Criteria B, C, and D require task-specific rubrics and must not overstate automated certainty.
- Open responses expose confidence and evidence to teachers; the platform does not silently convert uncertain AI judgement into a formal mark.
- Tutor interactions use age-appropriate boundaries, prompt-injection resistance, rate limits, audit events, and a safe escalation path.

## Meaning of “100% complete”

Project Z is not 100% complete because a deployment succeeds or pages exist. It is complete only when every acceptance gate in `PROJECT_Z_100_PERCENT_ACCEPTANCE_MATRIX.md` is green with reproducible evidence and the controlled pilot is signed off. Until then, product copy must not claim full curriculum coverage or validated superiority.

