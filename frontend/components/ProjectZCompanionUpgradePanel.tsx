'use client';

import { ReactNode, useMemo, useState } from 'react';
import { CompanionMotionMode, ProjectZCompanion3D } from './ProjectZCompanion3D';
import { CompanionEvolutionMilestone, CompanionUpgradeSummary, fallbackCompanionMilestones, fallbackUpgradeSummary } from '../lib/projectZCompanionProgression';

type ProjectZCompanionUpgradePanelProps = {
  stage?: number;
  skinKey?: string | null;
  auraKey?: string | null;
  companionName?: string;
  titleName?: string;
  auraName?: string;
  badgeName?: string;
  summary?: CompanionUpgradeSummary | null;
  milestones?: CompanionEvolutionMilestone[];
  defaultMode?: CompanionMotionMode;
  compact?: boolean;
  children?: ReactNode;
};

const reactionModes: { mode: CompanionMotionMode; label: string; helper: string }[] = [
  { mode: 'idle', label: 'Idle', helper: 'calm focus' },
  { mode: 'thinking', label: 'Thinking', helper: 'working with you' },
  { mode: 'encourage', label: 'Encourage', helper: 'try again energy' },
  { mode: 'celebrate', label: 'Celebrate', helper: 'progress moment' },
  { mode: 'studio', label: 'Studio', helper: 'inspect upgrade' }
];

function stageWord(stage: number) {
  if (stage >= 5) return 'Legendary';
  if (stage >= 4) return 'Epic';
  if (stage >= 3) return 'Advanced';
  if (stage >= 2) return 'Growing';
  return 'Starting';
}

export function ProjectZCompanionUpgradePanel({ stage = 1, skinKey, auraKey, companionName, titleName, auraName, badgeName, summary, milestones = fallbackCompanionMilestones, defaultMode = 'idle', compact = false, children }: ProjectZCompanionUpgradePanelProps) {
  const safeStage = Math.max(1, Math.min(5, Number(stage || 1)));
  const upgradeSummary = summary || fallbackUpgradeSummary(safeStage);
  const [mode, setMode] = useState<CompanionMotionMode>(upgradeSummary.suggested_mood || defaultMode);
  const path = useMemo(() => (milestones.length ? milestones : fallbackCompanionMilestones).map((item) => ({ ...item, active: item.active || item.stage <= safeStage, current_stage: item.current_stage || item.stage === safeStage })), [milestones, safeStage]);
  const progress = Math.max(0, Math.min(100, upgradeSummary.stage_progress_percent || 0));

  return (
    <section className={`card pz-companion-upgrade-panel ${compact ? 'pz-companion-upgrade-compact' : ''}`}>
      <div className="pz-companion-upgrade-main">
        <div>
          <div className="pz-role-badge">🧬 Companion evolution system</div>
          <h2>{companionName || `Stage ${safeStage} companion`}</h2>
          <p className="muted">
            {stageWord(safeStage)} form · Stage {safeStage}/5<br />
            {titleName ? `${titleName} · ` : ''}{auraName ? `${auraName} aura · ` : ''}{badgeName || 'Learning companion'}
          </p>
          <div className="pz-companion-reaction-controls" aria-label="Companion reaction preview controls">
            {reactionModes.map((item) => (
              <button key={item.mode} type="button" className={mode === item.mode ? 'btn blue' : 'btn secondary'} onClick={() => setMode(item.mode)} title={item.helper}>{item.label}</button>
            ))}
          </div>
        </div>
        <ProjectZCompanion3D stage={safeStage} skinKey={skinKey} auraKey={auraKey} mode={mode} interactive={mode === 'studio'} compact={compact} showLabel={true} title={`${companionName || 'Companion'} ${mode} mode`} />
      </div>

      <div className="pz-companion-upgrade-progress">
        <div>
          <strong>Next upgrade: {upgradeSummary.next_upgrade_title}</strong>
          <p className="muted">{upgradeSummary.next_upgrade_description}</p>
        </div>
        <div>
          <progress value={progress} max={100} style={{ width: '100%' }} />
          <p className="muted">{progress}% upgrade charge · Needs Level {upgradeSummary.next_required_level} and {upgradeSummary.next_required_streak} streak day(s)</p>
        </div>
      </div>

      <div className="pz-companion-evolution-roadmap">
        {path.map((item) => (
          <article key={item.stage} className={`pz-companion-evolution-node ${item.active ? 'active' : ''} ${item.current_stage ? 'current' : ''}`}>
            <span>{item.stage >= 5 ? '🌌' : item.stage >= 4 ? '☄️' : item.stage >= 3 ? '🪐' : item.stage >= 2 ? '🌟' : '✨'}</span>
            <div>
              <strong>{item.title}</strong>
              <p className="muted">{item.learning_focus}</p>
              <small className="muted">{item.locked ? `Locked: Level ${item.required_level}, streak ${item.required_streak}` : item.visual_trait}</small>
            </div>
          </article>
        ))}
      </div>

      {children && <div className="pz-companion-upgrade-actions">{children}</div>}
      <p className="muted pz-companion-boundary-note">Companion upgrades are motivational. They are not grades, marks, or IB criteria scores.</p>
    </section>
  );
}
