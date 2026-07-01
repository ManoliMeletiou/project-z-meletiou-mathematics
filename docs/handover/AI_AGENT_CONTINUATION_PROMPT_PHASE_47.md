# AI Agent Continuation Prompt — After Phase 47

You are continuing Project Z / Meletiou Mathematics after Phase 47.

The latest completed phase is:

```text
Phase 47 — 3D Animated Student Companion Foundation
```

Current health version should be:

```text
phase-47-3d-animated-companion
```

## Product direction

Project Z must become the most enhanced and engaging mathematics platform in the world. It should compete with and beat other platforms by combining serious, scientifically grounded mathematics learning with a premium game-like student experience.

The student companion/avatar is now a 3D animated learning companion. It should become more alive over time, but must remain connected to learning habits, effort, practice, corrections, reflection, mastery growth, and healthy tutor use.

## Current companion implementation

The 3D companion is implemented as a procedural React Three Fiber component:

```text
frontend/components/ProjectZCompanion3D.tsx
```

It appears in:

```text
/student-dashboard
/student-quest
/quest-studio
```

Quest Studio uses interactive rotation. Dashboard and Quest use animated non-interactive presentation.

## Safety rules

Do not rewrite the whole app.
Do not weaken Supabase RLS.
Do not expose parent-unsafe data.
Do not treat XP, streaks, levels, cosmetics, achievements, or companion upgrades as formal marks.
Do not use “Core” as the MYP label; use MYP Standard and MYP Extended.
Keep mathematical accuracy and assessment validity more important than decoration.

## Recommended next phase

Phase 48 should expand the 3D companion system into a deeper upgrade system:

- unlockable companion animations/emotes
- companion skins mapped to actual 3D visual changes
- aura effects mapped to selected aura
- studio preview controls
- stage evolution moments
- reward explanation cards
- lightweight mobile fallback

Do not add heavy 3D models until performance and asset strategy are decided.
