# Phase 57 — IB Curriculum Evidence Foundation Report

## Outcome

Phase 57 replaces an eight-code, 24-skill Project Z surface with an exact fourteen-pathway evidence model. It reuses the richer legacy atlas as candidates, but deliberately does not treat legacy structure or row volume as approved curriculum.

## Official public evidence checked on 13 July 2026

- IB MYP mathematics overview: `https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/`
- IB MYP mathematics subject brief: `https://www.ibo.org/globalassets/new-structure/brochures-and-infographics/pdfs/myp-brief-mathematics-en.pdf`
- IB DP mathematics overview: `https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/`
- AA first assessment 2021 brief: `https://www.ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-analysis-and-approaches-en.pdf`
- AI first assessment 2021 brief: `https://www.ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-applications-and-interpretations-en.pdf`
- AA first assessment 2029 brief: `https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/sb_maths_analysis_en.pdf`
- AI first assessment 2029 brief: `https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/sb_maths_application_en.pdf`

Only summarized framework metadata and links are recorded. No official guide text or protected question content is copied into Project Z.

## Before

- 8 course codes, of which 6 were selectable;
- MYP represented only as aggregate Standard/Extended;
- 24 Project Z curriculum skills;
- 18 blueprint and 22 diagnostic rows carrying a legacy boolean `verified` flag;
- 6,253 question-bank rows, but only 1,547 draft rows with a passed verifier, 87 linked canonical skills, and zero approved+verified rows linked to the candidate atlas;
- no executable 2,000-variant or human curriculum-review gate.

## After

- 14 pathway evidence rows: 10 MYP + 4 DP;
- 438 candidate pathway-skill placements imported from 233 canonical skills;
- explicit official-source/current-upcoming-version registry;
- MYP internal year sequencing explicitly separate from the official flexible framework;
- curriculum and question release fail closed;
- exact coverage RPCs for pathway and skill evidence;
- calm pathway selector and progressively disclosed atlas;
- diagnostic start disabled for unreleased pathways.

## Release mathematics

A skill is release-ready only when:

- curriculum review status is approved;
- source alignment and human educator review are recorded;
- at least 2,000 distinct normalized question/answer variants are approved, reviewed and verifier-passed;
- allowed-use status is acceptable;
- a worked solution exists.

A pathway is ready only when every atlas skill meets that condition and the pathway itself is explicitly released. Phase 57 leaves all values false.

## Verification evidence

```text
Node tests:       37 passed
TypeScript:       passed
Next.js build:    passed, 56 routes
Pathway rows:     14
Candidate rows:   438
Released paths:   0
Complete claims:  0
Enabled skills:   0
Quarantined:      18 blueprints + 22 diagnostics
```

## Remaining blockers

- authorized-guide alignment and educator review;
- complete and versioned skill objectives;
- generator-family diversity and mathematical verification;
- 2,000 distinct valid variants per skill;
- misconception, diagnostic, accessibility and independent sampling evidence;
- authenticated browser fixtures and the global launch gates in the acceptance matrix.
