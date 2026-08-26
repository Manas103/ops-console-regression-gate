#!/usr/bin/env node
// Starts the backend once per seeded defect (1 through 30), runs the full test suite
// (API contract tests + Selenium journeys) against it, and records whether the suite caught
// the defect (any test failure) or missed it (suite passed despite the injected defect).
// Writes docs/regression_matrix.csv. See docs/DEFECTS.md for what each defect id breaks.
//
// Usage: node scripts/run-regression-matrix.mjs
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const MVN = 'C:\\Users\\Manas\\tools\\apache-maven-3.9.9\\bin\\mvn.cmd';
const results = ['defect_id,caught'];

function waitForHealth(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const r = spawnSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', 'http://localhost:4000/api/health']);
    if (r.stdout && r.stdout.toString().trim() === '200') return true;
    spawnSync('powershell', ['-Command', 'Start-Sleep -Milliseconds 300']);
  }
  return false;
}

for (let defectId = 1; defectId <= 30; defectId++) {
  const backend = spawn('node', ['backend/dist/server.js'], {
    env: { ...process.env, ACTIVE_DEFECTS: String(defectId) },
    stdio: 'ignore',
  });
  waitForHealth();
  const test = spawnSync(MVN, ['-o', '-q', '-f', 'tests/pom.xml', 'test'], { shell: true });
  const caught = test.status !== 0 ? 'yes' : 'no';
  results.push(`${defectId},${caught}`);
  console.log(`defect ${defectId} -> caught=${caught}`);
  backend.kill();
  spawnSync('taskkill', ['//F', '//IM', 'node.exe']);
}

writeFileSync('docs/regression_matrix.csv', results.join('\n') + '\n');
const caughtCount = results.slice(1).filter((r) => r.endsWith(',yes')).length;
console.log(`\n${caughtCount} of 30 seeded regressions caught before merge.`);
