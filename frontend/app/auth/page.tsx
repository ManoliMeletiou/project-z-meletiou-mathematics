export default function AuthPage() {
  return (
    <main className="page">
      <div className="container">
        <nav className="nav">
          <div className="brand">
            <strong>Authentication</strong>
            <span>Sign in and registration</span>
          </div>
          <div className="navLinks">
            <a className="btn secondary" href="/">Home</a>
          </div>
        </nav>

        <section className="card" style={{ maxWidth: 620 }}>
          <h1 style={{ fontSize: 40 }}>Create your Project Z profile</h1>
          <p className="muted">This screen is ready for Supabase Auth wiring. For now it is a front-end working form shell.</p>

          <div className="grid">
            <label className="label">
              Email
              <input className="input" placeholder="name@example.com" />
            </label>

            <label className="label">
              Password
              <input className="input" type="password" placeholder="Password" />
            </label>

            <label className="label">
              Role
              <select className="select">
                <option>Student</option>
                <option>Teacher</option>
                <option>Parent</option>
              </select>
            </label>

            <button className="btn blue">Continue</button>
          </div>

          <p className="notice" style={{ marginTop: 18 }}>
            Next production step: connect this form to Supabase Auth and profile creation.
          </p>
        </section>
      </div>
    </main>
  );
}
