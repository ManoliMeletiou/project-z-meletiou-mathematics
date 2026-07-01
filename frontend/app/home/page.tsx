'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile, ProjectZRole } from '../../lib/projectZAuth';
import { dashboardPathForRole, roleHomeMessage, roleLabel } from '../../lib/projectZRoleHome';

function cardStyle(): CSSProperties {
  return {
    background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ecfeff 100%)',
    border: '1px solid rgba(15,23,42,.08)',
    boxShadow: '0 18px 45px rgba(15,23,42,.08)',
    borderRadius: 24
  };
}

export default function SmartHomePage() {
  const router = useRouter();
  const [role, setRole] = useState<ProjectZRole>('guest');
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking your role...');

  useEffect(() => {
    async function loadProfile() {
      const profile = await getCurrentProfile();
      setRole(profile.role);
      setEmail(profile.email);

      if (profile.role === 'guest') {
        setStatus('You are not signed in yet. Sign in to open your dashboard.');
        return;
      }

      setStatus(`You are signed in as ${profile.role}. Opening the right dashboard...`);

      window.setTimeout(() => {
        router.push(dashboardPathForRole(profile.role));
      }, 900);
    }

    loadProfile();
  }, [router]);

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
            <strong>Smart Home</strong>
            <span>{email || 'Not signed in'} - role: {role}</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/student-quest">Quest</a>
            <a className="btn secondary" href="/quest-studio">Studio</a>
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/help">Help</a>
            <a className="btn secondary" href="/mobile-preview">Mobile</a>
            <a className="btn secondary" href="/auth">Sign in</a>
            <a className="btn secondary" href="/account">Account</a>
          </div>
        </nav>

        <section className="card" style={{ ...cardStyle(), padding: 34 }}>
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
            🧭 Taking you to the right place
          </p>

          <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: '4px 0 12px' }}>
            {role === 'guest' ? 'Sign in to continue' : `Opening your ${roleLabel(role)} dashboard`}
          </h1>

          <p style={{ fontSize: 18, maxWidth: 760, color: '#475569' }}>
            {status}<br />
            {roleHomeMessage(role)}
          </p>

          <div className="navLinks" style={{ marginTop: 18 }}>
            <a className="btn blue" href={dashboardPathForRole(role)}>
              {role === 'guest' ? 'Sign in' : `Open ${roleLabel(role)} dashboard now`}
            </a>
            <a className="btn secondary" href="/help">I need help</a>
          </div>
        </section>
      </div>
    </main>
  );
}
