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

export default function ProjectZHelpPage() {
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
          'radial-gradient(circle at top left, rgba(99,102,241,.16), transparent 30%), radial-gradient(circle at top right, rgba(14,165,233,.14), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)'
      }}
    >
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Help</strong>
            <span>{email || 'Not signed in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/auth">Sign in</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="card" style={{ ...cardStyle(0), padding: 30 }}>
          <h1 style={{ fontSize: 38, lineHeight: 1.05, margin: '4px 0 12px' }}>
            Where should I go?
          </h1>
          <p style={{ fontSize: 18, maxWidth: 760, color: '#475569' }}>
            Project Z has different dashboards for different users. Choose the one that matches what you need to do.
          </p>
          <a className="btn blue" href={dashboardPathForRole(role)}>
            {role === 'guest' ? 'Sign in first' : `Open my ${roleLabel(role)} dashboard`}
          </a>
        </section>

        <section className="grid grid3" style={{ marginTop: 18 }}>
          <div className="card" style={cardStyle(1)}>
            <h2>🎒 I am a student</h2>
            <p className="muted">
              Use this for assignments, memorandums, corrections, tutor help, and your progress.
            </p>
            <a className="btn blue" href="/student-dashboard">Student dashboard</a>
          </div>

          <div className="card" style={cardStyle(2)}>
            <h2>🧑‍🏫 I am a teacher</h2>
            <p className="muted">
              Use this to manage the full assignment lifecycle and see what needs attention.
            </p>
            <a className="btn blue" href="/assignment-lifecycle">Teacher lifecycle dashboard</a>
          </div>

          <div className="card" style={cardStyle(3)}>
            <h2>🏡 I am a parent</h2>
            <p className="muted">
              Use this to see a calm overview of progress and how to support at home.
            </p>
            <a className="btn blue" href="/parent-dashboard">Parent dashboard</a>
          </div>
        </section>

        <section className="card" style={{ ...cardStyle(0), marginTop: 18 }}>
          <h2>Simple rule</h2>
          <p>
            Start at <strong>Smart Home</strong>. Project Z will guide you to the right dashboard for your role.
          </p>
          <a className="btn secondary" href="/home">Open Smart Home</a>
        </section>
      </div>
    </main>
  );
}
