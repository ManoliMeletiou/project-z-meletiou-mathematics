import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 3100;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
server.stdout.on('data', (chunk) => { logs += chunk.toString(); });
server.stderr.on('data', (chunk) => { logs += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Project Z server did not become ready.\n${logs}`);
}

async function verifyText(path, expected) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, `${path} must return HTTP 200`);
  const text = await response.text();
  for (const value of expected) assert.ok(text.includes(value), `${path} must contain: ${value}`);
}

try {
  await waitForServer();
  const healthResponse = await fetch(`${origin}/api/health`);
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.app, 'Project Z');
  assert.equal(health.version, 'phase-56-identity-role-hardening');
  assert.equal(health.checks.controlledAssignmentFactory, true);

  await verifyText('/home', ['Project Z', 'Choose your starting point', 'More tools']);
  await verifyText('/role-navigation', ['One clear path, with every tool available', 'Suggested path']);
  await verifyText('/assignment-factory', ['Evidence to assignment, without unsafe shortcuts', 'Teacher sign-in required']);
  process.stdout.write('Project Z production smoke test passed.\n');
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once('exit', resolve);
  });
}
