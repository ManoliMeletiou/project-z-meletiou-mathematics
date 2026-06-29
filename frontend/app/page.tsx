const portals = [
  {
    title: 'Student Portal',
    href: '/dashboard',
    text: 'Practise generated questions, submit answers, ask for guided hints, and build mastery.',
    tag: 'Adaptive practice'
  },
  {
    title: 'Teacher Portal',
    href: '/teacher',
    text: 'Track class progress, see intervention needs, and prepare assignments and feedback.',
    tag: 'Class intelligence'
  },
  {
    title: 'Parent Portal',
    href: '/parent',
    text: 'See weekly summaries, progress trends, and simple recommendations for support at home.',
    tag: 'Weekly insight'
  }
];

export default function HomePage() {
  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Project Z</strong>
            <span>Meletiou Mathematics</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/auth">Sign in</a>
            <a className="btn blue" href="/dashboard">Start Practice</a>
          </div>
        </nav>

        <section className="hero">
          <p className="kicker">AI Mathematics Learning Platform</p>
          <h1>Mathematics that adapts to every learner.</h1>
          <p className="lead">
            Project Z is the live foundation for an AI-powered learning ecosystem:
            verified question generation, guided hints, teacher insights, and parent summaries.
          </p>

          <div className="grid grid3" style={{ marginTop: 34 }}>
            {portals.map((portal) => (
              <a className="card portalCard" href={portal.href} key={portal.href}>
                <span className="badge">{portal.tag}</span>
                <h2 style={{ marginTop: 18 }}>{portal.title}</h2>
                <p className="muted">{portal.text}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="grid grid3" style={{ marginTop: 20 }}>
          <div className="card">
            <h2>Verified-first design</h2>
            <p className="muted">Questions are generated with deterministic answer checking and a local fallback if the external engine is unavailable.</p>
          </div>
          <div className="card">
            <h2>MYP-ready structure</h2>
            <p className="muted">Built around skills, mastery, feedback, and teacher-led interpretation for richer criteria.</p>
          </div>
          <div className="card">
            <h2>Live MVP online</h2>
            <p className="muted">This deployed version is now interactive and testable across student, teacher, parent, and auth routes.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
