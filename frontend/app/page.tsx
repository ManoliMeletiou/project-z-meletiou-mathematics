'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../lib/projectZAuth';
import { dashboardPathForRole, roleHomeMessage, roleLabel } from '../lib/projectZRoleHome';

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

function roleCards() {
  return [
    {
      title: 'Students',
      icon: '🎒',
      description: 'Start assignments, view memorandums, submit corrections, ask the tutor, and track progress.',
      path: '/student-dashboard',
      button: 'Open student dashboard'
    },
    {
      title: 'Teachers',
      icon: '🧑‍🏫',
      description: 'Manage the full assignment lifecycle: generate, audit, publish, review, memo, and corrections.',
      path: '/assignment-lifecycle',
      button: 'Open teacher dashboard'
    },
    {
      title: 'Parents',
      icon: '🏡',
      description: 'View a calm, parent-safe overview of progress and how to support learning at home.',
      path: '/parent-dashboard',
      button: 'Open parent dashboard'
    }
  ];
}

export default function ProjectZHomePage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading your Project Z home...');

  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);
      setStatus(profile.role === 'guest' ? 'Welcome. Sign in to open your dashboard.' : `Welcome back. You are signed in as ${profile.role}.`);
    }

    loadProfile();
  }, []);

  const dashboardPath = dashboardPathForRole(role);

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
            <strong>Project Z</strong>
            <span>{email || 'Not signed in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/help">Help</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
            <a className="btn secondary" href="/auth">Sign in</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

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
              right: -70,
              top: -70,
              width: 230,
              height: 230,
              borderRadius: '50%',
              background: 'rgba(99,102,241,.12)'
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
            ✨ User-friendly maths learning
          </p>

          <h1 style={{ fontSize: 44, lineHeight: 1.02, margin: '4px 0 12px', maxWidth: 820 }}>
            One clear place for students, teachers, and parents.
          </h1>

          <p style={{ fontSize: 18, maxWidth: 780, color: '#475569' }}>
            Project Z guides each person to the correct dashboard so nobody has to guess where to click.
            The app should always feel simple, calm, and obvious.
          </p>

          <section
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 22,
              background: 'rgba(255,255,255,.78)',
              border: '1px solid rgba(15,23,42,.08)'
            }}
          >
            <h2 style={{ marginBottom: 6 }}>Your smart home</h2>
            <p className="muted">
              {status}<br />
              {roleHomeMessage(role)}
            </p>
            <div className="navLinks">
              <a className="btn blue" href={dashboardPath}>
                {role === 'guest' ? 'Sign in' : `Open ${roleLabel(role)} dashboard`}
              </a>
              <a className="btn secondary" href="/help">I need help choosing</a>
            </div>
          </section>
        </section>

        <section className="grid grid3" style={{ marginTop: 18 }}>
          {roleCards().map((card, index) => (
            <div key={card.title} className="card" style={cardStyle(index + 1)}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>{card.icon}</p>
              <h2>{card.title}</h2>
              <p className="muted">{card.description}</p>
              <a className="btn blue" href={card.path}>{card.button}</a>
            </div>
          ))}
        </section>

        <section className="card" style={{ ...cardStyle(3), marginTop: 18 }}>
          <h2>What makes this user-friendly?</h2>
          <div className="grid grid3">
            <div>
              <strong>Clear next step</strong>
              <p className="muted">Each dashboard tells users what to do first.</p>
            </div>
            <div>
              <strong>Role-based home</strong>
              <p className="muted">Students, teachers, and parents do not see the same workflow.</p>
            </div>
            <div>
              <strong>Simple language</strong>
              <p className="muted">The app avoids confusing technical or teacher-only wording.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
