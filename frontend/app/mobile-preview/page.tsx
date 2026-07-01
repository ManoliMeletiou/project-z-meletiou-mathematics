'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import { dashboardPathForRole, roleLabel } from '../../lib/projectZRoleHome';

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

export default function MobilePreviewPage() {
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);
    }

    loadProfile();
  }, []);

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
            <strong>Mobile Preview</strong>
            <span>{email || 'Not signed in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/student-dashboard">Student</a>
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/quest-studio">Studio</a>
            <a className="btn secondary" href="/assignment-lifecycle">Teacher</a>
            <a className="btn secondary" href="/parent-dashboard">Parent</a>
            <a className="btn secondary" href="/help">Help</a>
          </div>
        </nav>

        <section className="card" style={{ ...cardStyle(0), padding: 32 }}>
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
            📱 Phone-friendly design
          </p>

          <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: '4px 0 12px', maxWidth: 780 }}>
            Project Z should feel clear on every screen.
          </h1>

          <p style={{ fontSize: 18, maxWidth: 760, color: '#475569' }}>
            This page checks the app’s mobile spacing, card layout, button size, navigation wrapping,
            readability, and touch-friendly controls.
          </p>

          <div className="navLinks" style={{ marginTop: 18 }}>
            <a className="btn blue" href={dashboardPathForRole(role)}>
              {role === 'guest' ? 'Sign in' : `Open ${roleLabel(role)} dashboard`}
            </a>
            <a className="btn secondary" href="/help">Need help?</a>
          </div>
        </section>

        <section className="grid grid3" style={{ marginTop: 18 }}>
          <div className="card" style={cardStyle(1)}>
            <h2>Readable cards</h2>
            <p className="muted">
              Cards now have softer spacing, better rounded corners, clearer shadows, and responsive stacking on phones.
            </p>
            <progress value={82} max={100} style={{ width: '100%' }} />
            <p className="muted">82% visual polish</p>
          </div>

          <div className="card" style={cardStyle(2)}>
            <h2>Touch-friendly buttons</h2>
            <p className="muted">
              Buttons are easier to tap, especially on small screens. Navigation wraps instead of overflowing.
            </p>
            <a className="btn blue" href="/home">Try Smart Home</a>
          </div>

          <div className="card" style={cardStyle(3)}>
            <h2>Small-screen layout</h2>
            <p className="muted">
              Multi-column grids become single-column layouts on phones, so students and parents do not need to pinch or zoom.
            </p>
            <a className="btn secondary" href="/student-dashboard">Open student dashboard</a>
          </div>
        </section>

        <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
          <h2>UX checklist</h2>
          <div className="grid grid3">
            <div>
              <strong>✅ No horizontal scrolling</strong>
              <p className="muted">Cards and grids collapse cleanly.</p>
            </div>
            <div>
              <strong>✅ Large tap targets</strong>
              <p className="muted">Buttons and form controls are easier to use.</p>
            </div>
            <div>
              <strong>✅ Calmer visuals</strong>
              <p className="muted">Spacing, focus states, and cards feel more professional.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
