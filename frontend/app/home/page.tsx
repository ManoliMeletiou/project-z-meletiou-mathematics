'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  groupLabel,
  projectZNavigationForRole,
  ProjectZNavItem
} from '../../lib/projectZNavigation';

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

function roleTone(role: string): string {
  if (role === 'student') return 'Student learning loop';
  if (role === 'teacher') return 'Teacher workflow';
  if (role === 'parent') return 'Parent support view';
  if (role === 'admin') return 'System tools';
  return 'Sign in to begin';
}

function groupedPrimary(items: ProjectZNavItem[]) {
  return items.filter((item) => item.priority === 'primary');
}

export default function HomePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('Smart Home loads your role-specific navigation.');

  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);
      setStatus(profile.role === 'guest' ? 'Sign in to unlock your role-based Project Z workflow.' : 'Smart Home is ready.');
    }

    loadProfile();
  }, []);

  const navigation = useMemo(() => projectZNavigationForRole(role), [role]);
  const primaryItems = useMemo(() => groupedPrimary(navigation.items), [navigation.items]);

  return (
    <main
      className="page"
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(99,102,241,.16), transparent 31%), radial-gradient(circle at top right, rgba(20,184,166,.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Project Z Smart Home</strong>
            <span>{email || 'Sign in'} - {roleTone(role)}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Landing</a>
            <a className="btn secondary" href="/role-navigation">Role Navigation</a>
            <a className="btn secondary" href="/help">Help</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="notice" style={{ marginBottom: 18 }}>
          <strong>Status:</strong> {status}
        </section>

        <section
          className="card"
          style={{
            ...cardStyle(0),
            padding: 32,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -70,
              top: -70,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'rgba(99,102,241,.13)'
            }}
          />

          <p
            style={{
              display: 'inline-flex',
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.78)',
              border: '1px solid rgba(15,23,42,.08)',
              marginBottom: 12
            }}
          >
            🧭 {navigation.label}
          </p>

          <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 860 }}>
            {navigation.headline}
          </h1>

          <p style={{ fontSize: 18, maxWidth: 790, color: '#475569' }}>
            {navigation.subheading}
          </p>

          <div className="navLinks" style={{ marginTop: 18 }}>
            <a className="btn blue" href={navigation.primaryAction.href}>
              {navigation.primaryAction.icon} Open {navigation.primaryAction.title}
            </a>
            <a className="btn secondary" href="/role-navigation">See all role links</a>
          </div>
        </section>

        <section className="grid grid3" style={{ marginTop: 18 }}>
          {primaryItems.map((item, index) => (
            <a
              key={item.href}
              className="card"
              href={item.href}
              style={{
                ...cardStyle(index + 1),
                color: 'inherit',
                textDecoration: 'none'
              }}
            >
              <p style={{ fontSize: 34, margin: '0 0 8px' }}>{item.icon}</p>
              <h2>{item.title}</h2>
              <p className="muted">{item.description}</p>
            </a>
          ))}
        </section>

        <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
          <h2>Your workflow</h2>
          <div className="grid grid3">
            {navigation.guidance.map((item, index) => (
              <div key={item}>
                <strong>{index + 1}. {groupLabel(index === 0 ? 'start' : index < 3 ? 'learn' : 'support')}</strong>
                <p className="muted">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
