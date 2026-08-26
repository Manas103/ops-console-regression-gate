# Seeded Regression Defects

Thirty independently toggleable defects, each activated alone by setting `ACTIVE_DEFECTS=<id>`
on the backend process (`backend/src/defects.ts`). `scripts/run-regression-matrix.mjs` starts
the backend once per defect id, runs the full suite (API contract tests + Selenium journeys)
against it, and records whether any test failed (caught) or the suite passed regardless
(missed). Raw result: `docs/regression_matrix.csv`.

| id | What it breaks | Caught |
|---|---|---|
| 1 | `X-Total-Count` header never set on the incident list response | yes |
| 2 | An unknown incident id returns 200 with an empty body instead of 404 | yes |
| 3 | Acknowledging a non-OPEN incident is silently accepted instead of rejected with 409 | yes |
| 4 | Resolving an incident that was never acknowledged is silently accepted, skipping the required ACKNOWLEDGED step | yes |
| 5 | Resolving an already-resolved incident is silently accepted instead of rejected with 409 | yes |
| 6 | The status filter's case-insensitive comparison is skipped, so `?status=open` no longer matches `OPEN` | no |
| 7 | `acknowledgedAt` is never set on acknowledge | yes |
| 8 | `resolvedAt` is never set on resolve | yes |
| 9 | Acknowledging an unknown id fabricates a 200 success instead of 404 | yes |
| 10 | Resolving an unknown id fabricates a 200 success instead of 404 | yes |
| 11 | The acknowledge response omits the updated incident body | yes |
| 12 | The resolve response omits the updated status field | yes |
| 13 | Two seeded incidents share an identical `createdAt` timestamp | no |
| 14 | The severity filter is accepted but silently ignored | yes |
| 15 | A non-numeric incident id crashes the handler (500) instead of returning 400 | yes |
| 16 | An unknown status query value is silently accepted and returns an empty list instead of 400 | yes |
| 17 | The incident list response is served as `text/plain` instead of `application/json` | yes |
| 18 | Timestamps are serialized as epoch millis instead of ISO-8601 strings | yes |
| 19 | The `/api/health` endpoint is missing entirely (404) | yes |
| 20 | Combined status and severity filters are ORed instead of ANDed | yes |
| 21 | The incident list is returned oldest-first instead of newest-first | yes |
| 22 | Incident lookup by id is off by one, returning the previous incident | yes |
| 23 | Error responses omit the `error` message field entirely | no |
| 24 | One fixture incident is silently dropped, seeding only 7 incidents instead of the documented 8 | yes |
| 25 | Severity values are never validated; incident 5 is seeded with an out-of-domain `SEV9` | yes |
| 26 | Unsupported HTTP methods return 200 instead of 405 | yes |
| 27 | Incident status is serialized lowercase instead of the uppercase enum contract | yes |
| 28 | Resolving an incident corrupts its title as a side effect | yes |
| 29 | The internal-only `internalNotes` field leaks into the public API response | yes |
| 30 | The per-incident processing lock is skipped, so two concurrent acknowledge requests can both succeed | yes |

**27 of 30 caught.** The three misses (6, 13, 23) share a pattern: none of them break a
state transition or a status code the test suite asserts on directly. Defect 6 needs a
lowercase-query-parameter test case the suite does not have; defect 13 needs a uniqueness
assertion on `createdAt` the suite does not make; defect 23 needs an assertion on the `error`
field's presence on a request the suite already expects to fail for a different, correctly
asserted reason (the status code). Reporting the 3 misses by name, not just the count, is the
point: a suite that claims to catch everything is not believable, and naming what it does not
catch is what makes the 27 credible.
