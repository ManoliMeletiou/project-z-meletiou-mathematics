'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { ProjectZCompanion3D } from '../../components/ProjectZCompanion3D';
import { ProjectZCompanionUpgradePanel } from '../../components/ProjectZCompanionUpgradePanel';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  cosmeticTypeLabel,
  fetchQuestCosmetics,
  fetchQuestIdentity,
  QuestCosmetic,
  QuestIdentity,
  rarityLabel,
  updateQuestIdentity
} from '../../lib/projectZQuestStudio';
import {
  CompanionEvolutionMilestone,
  CompanionUpgradeSummary,
  fetchCompanionEvolutionPath,
  fetchCompanionUpgradeSummary
} from '../../lib/projectZCompanionProgression';

function rarityStyle(rarity: string): CSSProperties {
  if (rarity === 'legendary') return { background: 'rgba(250,204,21,.18)', color: '#fef3c7', border: '1px solid rgba(250,204,21,.28)' };
  if (rarity === 'epic') return { background: 'rgba(168,85,247,.20)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,.32)' };
  if (rarity === 'rare') return { background: 'rgba(34,211,238,.17)', color: '#cffafe', border: '1px solid rgba(34,211,238,.28)' };
  return { background: 'rgba(255,255,255,.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,.14)' };
}

function typeOrder(type: string) {
  if (type === 'companion_skin') return 0;
  if (type === 'title') return 1;
  if (type === 'aura') return 2;
  if (type === 'badge') return 3;
  if (type === 'theme') return 4;
  return 5;
}

function categoryIcon(type: string) {
  if (type === 'companion_skin') return '🤖';
  if (type === 'title') return '🧭';
  if (type === 'aura') return '🌌';
  if (type === 'badge') return '🏆';
  if (type === 'theme') return '🎨';
  return '✨';
}

export default function QuestStudioPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [identity, setIdentity] = useState<QuestIdentity | null>(null);
  const [cosmetics, setCosmetics] = useState<QuestCosmetic[]>([]);
  const [companionSummary, setCompanionSummary] = useState<CompanionUpgradeSummary | null>(null);
  const [companionMilestones, setCompanionMilestones] = useState<CompanionEvolutionMilestone[]>([]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Loading Quest Studio.');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to use Quest Studio.' : 'Quest Studio is for student accounts.');
      return;
    }

    const [nextIdentity, nextCosmetics, nextCompanionSummary, nextCompanionMilestones] = await Promise.all([
      fetchQuestIdentity(),
      fetchQuestCosmetics(),
      fetchCompanionUpgradeSummary(),
      fetchCompanionEvolutionPath()
    ]);

    setIdentity(nextIdentity);
    setCosmetics(nextCosmetics);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setStatus('Quest Studio is ready.');
  }

  useEffect(() => {
    loadPage();
  }, []);

  const filteredCosmetics = useMemo(() => {
    return cosmetics
      .filter((item) => filter === 'all' || item.cosmetic_type === filter)
      .sort((a, b) => typeOrder(a.cosmetic_type) - typeOrder(b.cosmetic_type) || a.display_order - b.display_order);
  }, [cosmetics, filter]);

  async function equipCosmetic(key: string) {
    setBusyKey(key);
    const nextIdentity = await updateQuestIdentity(key);
    const [nextCosmetics, nextCompanionSummary, nextCompanionMilestones] = await Promise.all([
      fetchQuestCosmetics(),
      fetchCompanionUpgradeSummary(nextIdentity?.companion_stage || identity?.companion_stage || 1),
      fetchCompanionEvolutionPath(nextIdentity?.companion_stage || identity?.companion_stage || 1)
    ]);

    if (nextIdentity) {
      setIdentity(nextIdentity);
      setStatus('Quest identity updated.');
    } else {
      setStatus('This item could not be equipped. It may still be locked.');
    }

    setCosmetics(nextCosmetics);
    setCompanionSummary(nextCompanionSummary);
    setCompanionMilestones(nextCompanionMilestones);
    setBusyKey(null);
  }

  return (
    <main className="page pz-theme pz-student-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Quest Studio</strong>
            <span>{email || 'Sign in'} - customize your learning identity</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card">
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to customize your Math Companion.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card">
            <h2>Student-only studio</h2>
            <p className="muted">Quest Studio is designed for students.</p>
          </section>
        )}

        {role === 'student' && identity && (
          <>
            <section className="pz-studio-grid">
              <aside className="card pz-companion-stage">
                <div>
                  <div className="pz-role-badge">✨ Current identity</div>
                  <ProjectZCompanion3D
                    stage={identity.companion_stage}
                    skinKey={identity.skin.key}
                    auraKey={identity.aura.key}
                    mode="studio"
                    interactive={true}
                    showLabel={true}
                    title={`${identity.skin.name} interactive preview`}
                  />
                  <h2 style={{ textAlign: 'center' }}>{identity.skin.name}</h2>
                  <p className="muted" style={{ textAlign: 'center' }}>
                    {identity.title.icon} {identity.title.name}<br />
                    {identity.aura.icon} {identity.aura.name} aura<br />
                    {identity.badge.icon} {identity.badge.name}<br />
                    {identity.theme.icon} {identity.theme.name}
                  </p>
                </div>

                <div>
                  <p className="muted">
                    Level {identity.level}<br />
                    {identity.total_xp} XP<br />
                    Current streak: {identity.current_streak}
                  </p>
                  <a className="btn blue" href="/student-quest">Open Quest</a>
                </div>
              </aside>

              <section className="pz-cosmic-hero">
                <div className="pz-role-badge">🎨 Cosmic identity lab</div>
                <h1 style={{ fontSize: 52, lineHeight: 1.0, maxWidth: 780, margin: '16px 0 10px' }}>
                  Build a learning identity that feels like yours.
                </h1>
                <p className="muted" style={{ fontSize: 18, maxWidth: 720 }}>
                  Unlock companion skins, titles, auras, badges, and themes by practising,
                  correcting, reflecting, and keeping momentum.
                </p>

                <section className="grid grid3" style={{ marginTop: 24 }}>
                  <div className="pz-student-stat-chip">
                    <span>🤖 Skin</span>
                    <strong>{identity.skin.name}</strong>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>🌌 Aura</span>
                    <strong>{identity.aura.name}</strong>
                  </div>
                  <div className="pz-student-stat-chip">
                    <span>🏆 Badge</span>
                    <strong>{identity.badge.name}</strong>
                  </div>
                </section>
              </section>
            </section>

            <ProjectZCompanionUpgradePanel
              stage={identity.companion_stage}
              skinKey={identity.skin.key}
              auraKey={identity.aura.key}
              companionName={identity.skin.name}
              titleName={identity.title.name}
              auraName={identity.aura.name}
              badgeName={identity.badge.name}
              summary={companionSummary}
              milestones={companionMilestones}
              defaultMode="studio"
            >
              <a className="btn blue" href="/student-quest">Use in Quest</a>
              <a className="btn secondary" href="/student-dashboard">Back to Dashboard</a>
            </ProjectZCompanionUpgradePanel>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>Customize</h2>
              <div className="navLinks">
                <button className={filter === 'all' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'companion_skin' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('companion_skin')}>Companion</button>
                <button className={filter === 'title' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('title')}>Titles</button>
                <button className={filter === 'aura' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('aura')}>Auras</button>
                <button className={filter === 'badge' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('badge')}>Badges</button>
                <button className={filter === 'theme' ? 'btn blue' : 'btn secondary'} onClick={() => setFilter('theme')}>Themes</button>
              </div>
            </section>

            <section className="pz-cosmetic-grid" style={{ marginTop: 18 }}>
              {filteredCosmetics.map((item) => (
                <div
                  key={item.cosmetic_key}
                  className="card pz-cosmetic-card"
                  style={{
                    opacity: item.unlocked ? 1 : .54,
                    filter: item.unlocked ? 'none' : 'grayscale(.28)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                    <p style={{ fontSize: 40, margin: 0 }}>{item.icon}</p>
                    <span style={{ ...rarityStyle(item.rarity), padding: '6px 10px', borderRadius: 999, fontWeight: 800, fontSize: 13 }}>
                      {rarityLabel(item.rarity)}
                    </span>
                  </div>

                  <h3>{categoryIcon(item.cosmetic_type)} {item.display_name}</h3>
                  <p className="muted">
                    {cosmeticTypeLabel(item.cosmetic_type)}<br />
                    {item.description}
                  </p>

                  <p>
                    <strong>{item.unlocked ? 'Unlocked' : 'Locked'}</strong><br />
                    <span className="muted">{item.unlock_reason}</span>
                  </p>

                  <button
                    className={item.selected ? 'btn secondary' : 'btn blue'}
                    disabled={!item.unlocked || item.selected || busyKey === item.cosmetic_key}
                    onClick={() => equipCosmetic(item.cosmetic_key)}
                  >
                    {item.selected ? 'Equipped' : busyKey === item.cosmetic_key ? 'Equipping...' : item.unlocked ? 'Equip' : 'Locked'}
                  </button>
                </div>
              ))}
            </section>

            <section className="notice" style={{ marginTop: 18 }}>
              <strong>Design rule:</strong> Studio items are earned through learning habits. They are not grades, marks, or IB criteria scores.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
