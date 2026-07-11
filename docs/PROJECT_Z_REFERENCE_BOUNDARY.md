# Project Z Reference Boundary

## Writable systems

| System | Authoritative Project Z target |
|---|---|
| GitHub | `ManoliMeletiou/project-z-meletiou-mathematics` |
| Vercel | `project-z-meletiou-mathematics.vercel.app` |
| Supabase | `jlesueqjdvmxkqaqmnke` |

## Read-only systems

The following are references only and must never receive a mutation from Project Z work:

- `ManoliMeletiou/meletiou-mathematics-platform`
- `meletiou-mathematics-platform.vercel.app`
- the reference application's database and hosting configuration
- every GitHub repository, deployment, database, document workspace, or connector target not explicitly listed as writable above

Allowed actions are read, inspect, compare, and independently recreate inside Project Z. Forbidden actions include commits, branches, pull requests, deployments, environment changes, migrations, data writes, issue changes, and configuration changes in a reference system.

Before every external write, the operator or automation must verify the target repository/project identifier against the writable table above. If the identifier does not match exactly, the write must stop.

