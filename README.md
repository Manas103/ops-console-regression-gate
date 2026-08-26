# End-to-End Regression Suite and CI Quality Gate for an Operations Console

REST Assured API contract tests layered beneath page-object Selenium journeys over a small
React operations console, 30 independently toggleable seeded regressions to measure what the
suite actually catches, a Surefire rerun-and-quarantine flake detector, and a GitHub Actions
workflow that gates every merge. Every number below was measured on this machine, not targeted.

## Why this exists

A regression suite is a claim about what it catches, and the only way to make that claim
credible is to seed real defects and count. This project seeds 30 independent, individually
toggleable defects in a small operations console and its API, runs the full suite once per
defect, and reports the count including the misses by name. The flake detector exists for the
adjacent, equally real problem: a suite that is occasionally wrong for reasons that have
nothing to do with the code under test erodes trust in the whole gate, and "rerun the failure
once before you believe it" is the standard, disclosed fix, measured here rather than asserted.

## What this is not

- **Not a large production console.** Two views (incident list with a status filter, incident
  detail with acknowledge/resolve), eight seeded incidents, an in-memory store. Enough surface
  to carry 30 independent defects and a real state machine (OPEN to ACKNOWLEDGED to RESOLVED),
  not a full operations product.
- **Not Katalon.** Selenium directly, via the Page Object pattern, per the requisition this
  project set out to answer.
- **Not a flaky app.** The one test used to measure the flake detector
  (`racyAcknowledgeAssertionUsedOnlyToMeasureFlakeDetection`) is deliberately racy by
  construction (a fixed sleep instead of an explicit wait) and only loses its race when the
  backend's `FLAKE_MODE=1` injects a random processing delay; every other test in the suite
  waits properly and is not flaky. Nothing about the app itself is nondeterministic.
- **Not 50 real GitHub Actions runs.** The workflow (`.github/workflows/ci.yml`) is real and
  gates merges on push once pushed to GitHub, but the flake-rate measurement below was run
  locally, restarting the backend fresh before every one of the runs counted, the same command
  the workflow itself runs.

**Machine and toolchain.** Windows 11, 8 physical / 16 logical cores. Backend: Node 22.17.1,
Express, TypeScript, compiled with `tsc`. Frontend: React 18, TypeScript, Vite. Tests: Java 21
(Temurin), Maven 3.9.9 (not on `PATH`, invoked from its full path), Selenium 4.27.0, REST
Assured 5.5.0, Chrome 151.0.7922.174 (Selenium Manager resolves the matching driver).

## Architecture

```
backend/src/
  server.ts     Express app, serves the built frontend and mounts /api
  routes.ts     GET /incidents, GET /incidents/:id, POST /ack, POST /resolve, GET /health
  store.ts      in-memory incident store, the OPEN/ACKNOWLEDGED/RESOLVED state machine
  defects.ts    reads ACTIVE_DEFECTS and FLAKE_MODE from the environment
frontend/src/
  App.tsx                    top-level list/detail routing
  components/IncidentList.tsx     status filter, seeded incident rows
  components/IncidentDetail.tsx   status, acknowledge/resolve actions
  api.ts, types.ts
tests/src/test/java/com/manas/opsconsole/
  api/IncidentApiContractTest.java        REST Assured, 20 contract tests against the live API
  e2e/IncidentJourneysTest.java           Selenium journeys, page-object pattern, 5 tests
  e2e/pages/OperationsConsolePage.java, IncidentDetailPage.java     the page objects
  support/ChromeDriverFactory.java, TestConfig.java
scripts/run-regression-matrix.mjs   starts the backend once per seeded defect, runs the suite, records caught/missed
docs/DEFECTS.md               all 30 seeded defects, what each breaks, caught or missed
docs/regression_matrix.csv    raw per-defect result
docs/flake_measurement.md     raw vs. quarantined nondeterministic-failure-rate measurement
.github/workflows/ci.yml      builds both apps, starts the backend, runs the suite, gates merge
```

**Design deep-dive: why 30 independently toggleable defects instead of 30 git branches.** A
single `ACTIVE_DEFECTS=<id>` environment variable read once at backend startup means the exact
same commit produces 31 distinct, reproducible behaviors (0 = baseline, 1 through 30 = one
defect each) with no checkout, no rebuild, and no risk of a defect's fix accidentally leaking
into another defect's branch. The cost is that every defect has to be expressible as a runtime
conditional in already-committed code, which is a real constraint (see `docs/DEFECTS.md`'s
honest note on the 3 misses).

**Design deep-dive: why Surefire's own `rerunFailingTestsCount` instead of a hand-rolled
retry loop.** Surefire already reports reruns as a distinct "Flakes" category, separate from
both "Failures" (never passed) and clean passes, in both the console summary and the XML
report that CI tooling reads. Reusing that instead of writing a custom JUnit extension keeps
the quarantine behavior visible to any tool that already understands Surefire's report format.

## Validation

- `mvn -o test` (from `tests/`): 25 tests (20 API contract, 5 Selenium journeys), 0 failures.
  Raw output: `docs/test_output.txt`.
- `docs/regression_matrix.csv`: one row per seeded defect, real per-defect suite runs.
- `docs/flake_measurement.md`: raw vs. quarantined nondeterministic-failure-rate runs.

## Findings: what broke

Building the regression matrix runner surfaced a real ordering bug in this project's own test
fixtures, not in the app: `IncidentJourneysTest` and `IncidentApiContractTest` were designed to
target disjoint incident id ranges (1 to 2 for the E2E journeys, 3 and up for the API tests) so
both classes could run against the same live backend without interfering, per the class
javadoc. The first honest full-suite run against a backend left running from a prior manual
check showed a stale `RESOLVED` status on incident 1 that should have been `OPEN`: a leftover
Node process from an earlier session had never been killed and was still bound to port 4000,
so the "fresh backend" the tests assumed was in fact serving days-old mutated state. The fix is
process hygiene, not application code: every measurement run below (`scripts/run-regression-matrix.mjs`,
the flake-measurement script) starts a fresh backend, confirms `/api/health` responds, and
kills it explicitly afterward, rather than assuming a clean process.

## Measured results

Machine: Windows 11, 8 physical / 16 logical cores, Java 21.0.11, Node 22.17.1, Chrome
151.0.7922.174.

**27 of 30 deliberately seeded regressions caught before merge.** Full per-defect table and
the reasoning behind the 3 misses (case-insensitive status filter, a duplicate seed timestamp,
a missing `error` field on an already-correctly-rejected request): `docs/DEFECTS.md`.

**Flake detector.** With the racy test's fixed 120ms wait racing the backend's
`FLAKE_MODE=1` random 0 to 700ms processing delay, the raw (no rerun) nondeterministic
failure rate measured over 33 fresh-backend runs was 28/33, 84.8%. With Surefire's
`rerunFailingTestsCount=3` quarantine active, the same racy test's effective failure rate
over 20 further fresh-backend runs was 0/20, 0%. Both numbers differ substantially from the
6.1% to 0.4% figure in the originating resume bullet, because this project's induced race
(a fixed sleep against a wide random delay) is intentionally more aggressive than the
resume's real-world flake rate would be; the mechanism (rerun-and-quarantine cutting a
measured nondeterministic-failure rate close to zero) is the same shape and is what this
measurement demonstrates, not the specific percentages. Reported as measured, not adjusted to
match. Full raw data: `docs/flake_measurement.md`.

## Building and running

```
# Backend
cd backend && npm ci && npm run build && node dist/server.js   # listens on :4000

# Frontend (built into backend's static dir)
cd frontend && npm ci && npm run build

# Tests (from tests/, backend already running)
"C:\Users\Manas\tools\apache-maven-3.9.9\bin\mvn.cmd" -o test

# Regression matrix (starts/stops the backend once per defect)
node scripts/run-regression-matrix.mjs

# Flake measurement (raw)
FLAKE_MODE=1 node backend/dist/server.js &
mvn -o -f tests/pom.xml -Dtest=IncidentJourneysTest#racyAcknowledgeAssertionUsedOnlyToMeasureFlakeDetection -Drerun.count=0 test

# Flake measurement (quarantined)
FLAKE_MODE=1 node backend/dist/server.js &
mvn -o -f tests/pom.xml -Dtest=IncidentJourneysTest#racyAcknowledgeAssertionUsedOnlyToMeasureFlakeDetection -Drerun.count=3 test
```

## Limitations

- The flake measurement's sample sizes (33 raw, 20 quarantined) are smaller than a full
  50-run set on each side; both were run for real, restarting the backend fresh every time,
  and the sizes actually used are stated plainly rather than rounded up.
- The flake rate itself (84.8% raw) is far higher than a real CI suite's would be; the racy
  test was deliberately built to fail often so a small sample size could still show the
  detector working, not to model a realistic flake rate.
- The regression matrix restarts the backend once per defect but reuses the same Maven JVM
  invocation pattern as a real CI run; it does not run inside an actual GitHub Actions runner.
- Branch protection requiring the `merge-gate` check was not configured via the GitHub API in
  this build (would need an authenticated API call beyond `gh repo create`); the workflow
  itself is real and runs on every push.
