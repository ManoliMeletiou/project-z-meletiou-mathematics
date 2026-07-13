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

async function verifyRedirect(path, destination) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
  assert.ok([302, 303, 307, 308].includes(response.status), `${path} must redirect when signed out`);
  const location = response.headers.get('location') || '';
  assert.ok(location.includes(destination), `${path} must redirect to ${destination}`);
}

try {
  await waitForServer();
  const healthResponse = await fetch(`${origin}/api/health`);
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.app, 'Project Z');
  assert.equal(health.version, 'phase-58b-golden-generator-foundation');
  assert.equal(health.checks.controlledAssignmentFactory, true);
  assert.equal(health.checks.verifiedClaimsRouteProtection, true);
  assert.equal(health.checks.accountDataExport, true);
  assert.equal(health.checks.fourteenIbPathwaysRegistered, true);
  assert.equal(health.checks.minimumTwoThousandVariantGateEnforced, true);
  assert.equal(health.checks.curriculumPathwaysReleased, false);
  assert.equal(health.checks.curriculumReviewWorkbench, true);
  assert.equal(health.checks.twoPersonCurriculumApproval, true);
  assert.equal(health.checks.goldenGeneratorFiveFamilies, true);
  assert.equal(health.checks.goldenGeneratorTwoThousandFiveHundredDistinct, true);
  assert.equal(health.checks.generatorHumanMathematicsReviewRequired, true);
  assert.equal(health.checks.goldenGeneratorReleased, false);

  await verifyText('/home', ['Project Z', 'Choose your starting point', 'More tools']);
  await verifyText('/role-navigation', ['One clear path, with every tool available', 'Suggested path']);
  await verifyText('/auth', ['Project Z role-based access', 'Sign in']);
  await verifyText('/account', ['Sign in to Project Z']);
  await verifyRedirect('/assignment-factory', '/auth');
  await verifyRedirect('/curriculum-review', '/auth');
  process.stdout.write('Project Z production smoke test passed.\n');
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once('exit', resolve);
  });
}
