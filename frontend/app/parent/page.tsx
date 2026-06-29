export default function ParentPage() {
  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Parent Portal</strong>
            <span>Weekly progress and home support</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/dashboard">Student</a>
            <a className="btn secondary" href="/teacher">Teacher</a>
          </div>
        </nav>

        <section className="grid grid2">
          <div className="card">
            <h2>This week</h2>
            <p>Demo learner completed 12 questions and improved accuracy in linear equations.</p>
            <span className="badge">+14% accuracy</span>
          </div>

          <div className="card">
            <h2>Recommended support</h2>
            <p>Practise factorising quadratics for 10 minutes, three times this week.</p>
            <span className="badge">Short focused practice</span>
          </div>

          <div className="card">
            <h2>Confidence</h2>
            <p className="muted">Learner confidence is strongest in linear equations and developing in quadratics.</p>
          </div>

          <div className="card">
            <h2>Parent action</h2>
            <p className="muted">Ask your child to explain one worked example out loud. Explanation builds retention.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
