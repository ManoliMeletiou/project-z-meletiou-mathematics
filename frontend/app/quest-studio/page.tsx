'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
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

function cardStyle(index: number): CSSProperties {
  const gradients = [
    'linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ecfeff 100%)',
    'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 52%, #eef2ff 100%)',
    'linear-gradient(135deg, #fff7ed 0%, #f8fafc 52%, #fdf2f8 100%)',
    'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 52%, #f0fdf4 100%)'
  ];

  return {
    background: gradients[index % gradients.length],
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: '0 18px 45px rgba(15,23,42,.08)',
    borderRadius: 24
  };
}

function rarityStyle(rarity: string): CSSProperties {
  if (rarity === 'legendary') {
    return { background: '#fef3c7', color: '#78350f', border: '1px solid rgba(120,53,15,.22)' };
  }

  if (rarity === 'epic') {
    return { background: '#f5f3ff', color: '#5b21b6', border: '1px solid rgba(91,33,182,.22)' };
  }

  if (rarity === 'rare') {
    return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid rgba(29,78,216,.20)' };
  }

  return { background: '#f1f5f9', color: '#334155', border: '1px solid rgba(51,65,85,.15)' };
}

function typeOrder(type: string) {
  if (type === 'companion_skin') return 0;
  if (type === 'title') return 1;
  if (type === 'aura') return 2;
  if (type === 'badge') return 3;
  if (type === 'theme') return 4;
  return 5;
}

export default function QuestStudioPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [identity, setIdentity] = useState<QuestIdentity | null>(null);
  const [cosmetics, setCosmetics] = useState<QuestCosmetic[]>([]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('Quest Studio loads your companion identity.');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadPage() {
    const profile = await getCurrentProfile();
    setRole(profile.role);
    setEmail(profile.email);

    if (profile.role !== 'student') {
      setStatus(profile.role === 'guest' ? 'Sign in as a student to use Quest Studio.' : 'Quest Studio is for student accounts.');
      return;
    }

    const [nextIdentity, nextCosmetics] = await Promise.all([
      fetchQuestIdentity(),
      fetchQuestCosmetics()
    ]);

    setIdentity(nextIdentity);
    setCosmetics(nextCosmetics);
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
    const nextCosmetics = await fetchQuestCosmetics();

    if (nextIdentity) {
      setIdentity(nextIdentity);
      setStatus('Quest identity updated.');
    } else {
      setStatus('This item could not be equipped. It may still be locked.');
    }

    setCosmetics(nextCosmetics);
    setBusyKey(null);
  }

  return (
    <main
      className="page"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.18), transparent 31%), radial-gradient(circle at top right, rgba(20,184,166,.16), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Quest Studio</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/student-dashboard">Dashboard</a>
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/student-generated-assignments">Assignments</a>
            <a className="btn secondary" href="/tutor">Tutor</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        {role === 'guest' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Sign in required</h2>
            <p className="muted">Sign in as a student to customize your Math Companion.</p>
            <a className="btn blue" href="/auth">Sign in</a>
          </section>
        )}

        {role !== 'guest' && role !== 'student' && (
          <section className="card" style={cardStyle(0)}>
            <h2>Student-only studio</h2>
            <p className="muted">Quest Studio is designed for students aged 12–19.</p>
          </section>
        )}

        {role === 'student' && identity && (
          <>
            <section
              className="card"
              style={{
                ...cardStyle(0),
                padding: 34,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -80,
                  top: -80,
                  width: 260,
                  height: 260,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,.13)'
                }}
              />

              <p
                style={{
                  display: 'inline-flex',
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,.82)',
                  border: '1px solid rgba(15,23,42,.08)',
                  marginBottom: 14
                }}
              >
                ✨ Premium student identity
              </p>

              <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 820 }}>
                Customize your Math Companion.
              </h1>

              <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
                Unlock clean, age-friendly visual upgrades through practice, corrections, streaks, and progress.
                This is your learning identity — not your grade.
              </p>

              <section
                style={{
                  marginTop: 22,
                  padding: 22,
                  borderRadius: 28,
                  background: 'rgba(255,255,255,.78)',
                  border: '1px solid rgba(15,23,42,.08)'
                }}
              >
                <div className="grid grid2">
                  <div>
                    <p style={{ fontSize: 78, margin: 0 }}>{identity.skin.icon}</p>
                    <h2>{identity.skin.name}</h2>
                    <p className="muted">
                      {identity.title.icon} {identity.title.name}<br />
                      {identity.aura.icon} {identity.aura.name} Aura<br />
                      {identity.badge.icon} {identity.badge.name}<br />
                      {identity.theme.icon} {identity.theme.name}
                    </p>
                  </div>

                  <div>
                    <h2>Level {identity.level}</h2>
                    <p className="stat">{identity.total_xp}</p>
                    <p className="muted">
                      XP total<br />
                      Current streak: {identity.current_streak}<br />
                      Companion stage: {identity.companion_stage}
                    </p>
                    <a className="btn blue" href="/student-quest">Open Student Quest</a>
                  </div>
                </div>
              </section>
            </section>

            <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
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

            <section className="grid grid3" style={{ marginTop: 18 }}>
              {filteredCosmetics.map((item, index) => (
                <div
                  key={item.cosmetic_key}
                  className="card"
                  style={{
                    ...cardStyle(index),
                    opacity: item.unlocked ? 1 : 0.58,
                    filter: item.unlocked ? 'none' : 'grayscale(.25)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                    <p style={{ fontSize: 36, margin: 0 }}>{item.icon}</p>
                    <span
                      style={{
                        ...rarityStyle(item.rarity),
                        padding: '6px 10px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      {rarityLabel(item.rarity)}
                    </span>
                  </div>

                  <h3>{item.display_name}</h3>
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

            <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
              <h2>Design rule</h2>
              <p>
                Cosmetics are earned through healthy learning behaviours: practice, correction, consistency,
                and progress. They are not marks, grades, or IB criteria scores.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
