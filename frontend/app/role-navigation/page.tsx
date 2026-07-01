'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import {
  groupLabel,
  priorityLabel,
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

function priorityStyle(priority: string): CSSProperties {
  if (priority === 'primary') {
    return { background: '#eef2ff', color: '#3730a3', border: '1px solid rgba(79,70,229,.18)' };
  }

  if (priority === 'secondary') {
    return { background: '#ecfeff', color: '#155e75', border: '1px solid rgba(21,94,117,.18)' };
  }

  return { background: '#f8fafc', color: '#475569', border: '1px solid rgba(71,85,105,.16)' };
}

function roleColor(role: string): string {
  if (role === 'student') return 'rgba(99,102,241,.16)';
  if (role === 'teacher') return 'rgba(14,165,233,.16)';
  if (role === 'parent') return 'rgba(20,184,166,.16)';
  return 'rgba(148,163,184,.16)';
}

function groupedItems(items: ProjectZNavItem[]) {
  return items.reduce<Record<string, ProjectZNavItem[]>>((acc, item) => {
    acc[item.group] ||= [];
    acc[item.group].push(item);
    return acc;
  }, {});
}

export default function RoleNavigationPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('Role navigation loads your correct app workflow.');

  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);
      setStatus(profile.role === 'guest' ? 'Sign in for your full role-specific navigation.' : 'Your role navigation is ready.');
    }

    loadProfile();
  }, []);

  const navigation = useMemo(() => projectZNavigationForRole(role), [role]);
  const groups = useMemo(() => groupedItems(navigation.items), [navigation.items]);
  const groupKeys = ['start', 'learn', 'review', 'insight', 'manage', 'support'].filter((key) => groups[key]?.length);

  return (
    <main
      className="page pz-theme pz-guest-theme"
      style={{
        minHeight: '100vh',
        background:
          `radial-gradient(circle at top left, ${roleColor(navigation.role)}, transparent 31%), radial-gradient(circle at top right, rgba(20,184,166,.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)`
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Role Navigation</strong>
            <span>{email || 'Sign in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/design-preview">Design</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
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
              background: roleColor(navigation.role)
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
            🧭 {navigation.label} navigation
          </p>

          <h1 style={{ fontSize: 40, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 820 }}>
            {navigation.headline}
          </h1>

          <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
            {navigation.subheading}
          </p>

          <div className="navLinks" style={{ marginTop: 18 }}>
            <a className="btn blue" href={navigation.primaryAction.href}>
              {navigation.primaryAction.icon} Open {navigation.primaryAction.title}
            </a>
            <a className="btn secondary" href="/home">Back to Smart Home</a>
          </div>
        </section>

        <section className="grid grid3" style={{ marginTop: 18 }}>
          {navigation.items
            .filter((item) => item.priority === 'primary')
            .map((item, index) => (
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
                <span
                  style={{
                    ...priorityStyle(item.priority),
                    padding: '6px 10px',
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13
                  }}
                >
                  {priorityLabel(item.priority)}
                </span>
              </a>
            ))}
        </section>

        <section className="card" style={{ ...cardStyle(2), marginTop: 18 }}>
          <h2>How to use this role</h2>
          <div className="grid grid3">
            {navigation.guidance.map((item, index) => (
              <div key={item}>
                <strong>{index + 1}. {item.split('.')[0]}</strong>
                <p className="muted">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {groupKeys.map((groupKey, groupIndex) => (
          <section key={groupKey} className="card" style={{ ...cardStyle(groupIndex), marginTop: 18 }}>
            <h2>{groupLabel(groupKey)}</h2>
            <div className="grid grid3">
              {groups[groupKey].map((item, index) => (
                <a
                  key={item.href}
                  className="card"
                  href={item.href}
                  style={{
                    ...cardStyle(index),
                    color: 'inherit',
                    textDecoration: 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                    <p style={{ fontSize: 30, margin: 0 }}>{item.icon}</p>
                    <span
                      style={{
                        ...priorityStyle(item.priority),
                        padding: '6px 10px',
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {priorityLabel(item.priority)}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.description}</p>
                </a>
              ))}
            </div>
          </section>
        ))}

        <section className="card" style={{ ...cardStyle(1), marginTop: 18 }}>
          <h2>Security note</h2>
          <p>
            Role-based navigation makes the app easier to use. It is not the security layer.
            Real access control still stays in Supabase RLS, role checks, and server-side RPC functions.
          </p>
        </section>
      </div>
    </main>
  );
}
