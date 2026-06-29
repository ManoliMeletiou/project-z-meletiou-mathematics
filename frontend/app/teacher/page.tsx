const students = [
  { name: 'Demo Student A', mastery: 78, need: 'Quadratic factorising', trend: 'Improving' },
  { name: 'Demo Student B', mastery: 62, need: 'Linear equations', trend: 'Needs support' },
  { name: 'Demo Student C', mastery: 91, need: 'Challenge questions', trend: 'Extension ready' },
  { name: 'Demo Student D', mastery: 54, need: 'Prerequisite review', trend: 'Watch closely' }
];

export default function TeacherPage() {
  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Teacher Dashboard</strong>
            <span>Class intelligence and intervention planning</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
            <a className="btn secondary" href="/dashboard">Student</a>
            <a className="btn secondary" href="/parent">Parent</a>
          </div>
        </nav>

        <section className="grid grid3">
          <div className="card">
            <h2>Class mastery</h2>
            <p className="questionText" style={{ fontSize: 36 }}>71%</p>
            <p className="muted">Average across the current demo class.</p>
          </div>
          <div className="card">
            <h2>Priority skill</h2>
            <p className="questionText" style={{ fontSize: 28 }}>Factorising</p>
            <p className="muted">Most common next intervention.</p>
          </div>
          <div className="card">
            <h2>Assignment idea</h2>
            <p className="muted">Set 8 core quadratic questions + 2 reflection prompts.</p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2>Student overview</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Mastery</th>
                <th>Next intervention</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.name}>
                  <td>{student.name}</td>
                  <td>{student.mastery}%</td>
                  <td>{student.need}</td>
                  <td>{student.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="notice" style={{ marginTop: 18 }}>
          Teacher note: this page is a working MVP shell. The next production step is connecting real Supabase classes, assignments, and submissions.
        </section>
      </div>
    </main>
  );
}
