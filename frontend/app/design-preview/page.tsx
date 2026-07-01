import {
  projectZDesignPrinciples,
  projectZVisualThemes
} from '../../lib/projectZDesignSystem';

function RolePreview({ theme, index }: { theme: typeof projectZVisualThemes[number]; index: number }) {
  const previewClass =
    theme.role === 'student' ? 'pz-student-theme' :
    theme.role === 'teacher' ? 'pz-teacher-theme' :
    theme.role === 'parent' ? 'pz-parent-theme' :
    'pz-guest-theme';

  return (
    <section className={`card pz-theme ${previewClass}`} style={{ minHeight: 360, padding: 22, overflow: 'hidden' }}>
      <div className="pz-role-badge">{index + 1}. {theme.label}</div>
      <h2 style={{ marginTop: 18 }}>{theme.label}</h2>
      <p className="muted">{theme.mood}</p>

      <div className="grid grid2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="pz-orb">{theme.role === 'student' ? '🎮' : theme.role === 'teacher' ? '📊' : theme.role === 'parent' ? '🌱' : '✨'}</div>
          <h3>Atmosphere</h3>
          <p className="muted">{theme.background}</p>
        </div>

        <div className="card">
          <h3>Layout language</h3>
          <p className="muted">{theme.layoutLanguage}</p>
          <progress value={index === 0 ? 72 : index === 1 ? 87 : index === 2 ? 76 : 54} max={100} style={{ width: '100%' }} />
        </div>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        {theme.primaryExperience.slice(0, 3).map((item) => (
          <div key={item} className="notice">
            <strong>Design goal:</strong> {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DesignPreviewPage() {
  return (
    <main className="page pz-theme pz-guest-theme">
      <div className="container">
        <nav className="nav" style={{ marginBottom: 22 }}>
          <div className="brand">
            <strong>Project Z Design Preview</strong>
            <span>Phase 45 visual design system</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/home">Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Navigation</a>
            <a className="btn secondary" href="/student-dashboard">Student</a>
            <a className="btn secondary" href="/teacher-engagement-insights">Teacher</a>
            <a className="btn secondary" href="/parent-engagement-view">Parent</a>
          </div>
        </nav>

        <section className="pz-hero-panel" style={{ marginBottom: 18 }}>
          <div className="pz-role-badge">🎨 Visual foundation</div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, maxWidth: 920 }}>
            One platform. Four role experiences. One premium visual language.
          </h1>
          <p style={{ fontSize: 18, maxWidth: 820 }} className="muted">
            This preview shows the background and layout direction for students, teachers, parents,
            and guests before we do deeper page-by-page redesigns.
          </p>
          <div className="navLinks" style={{ marginTop: 18 }}>
            <a className="btn blue" href="/home">Open Smart Home</a>
            <a className="btn secondary" href="/role-navigation">Open Role Navigation</a>
          </div>
        </section>

        <section className="grid grid2">
          {projectZVisualThemes.map((theme, index) => (
            <RolePreview key={theme.role} theme={theme} index={index} />
          ))}
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2>Design principles</h2>
          <div className="grid grid3">
            {projectZDesignPrinciples().map((principle) => (
              <div key={principle} className="notice">
                {principle}
              </div>
            ))}
          </div>
        </section>

        <section className="card pz-quest-path" style={{ marginTop: 18 }}>
          <h2>Future student quest path foundation</h2>
          <p className="muted">
            The design system now includes reusable quest-path, orb, glass card, heatmap,
            side-rail, progress, and role theme classes for the next redesign phases.
          </p>
        </section>
      </div>
    </main>
  );
}
