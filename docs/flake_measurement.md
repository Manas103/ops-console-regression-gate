# Flake Detector Measurement

Both phases run the same single test,
`IncidentJourneysTest#racyAcknowledgeAssertionUsedOnlyToMeasureFlakeDetection`, against a
freshly started backend (`FLAKE_MODE=1`, confirmed healthy via `/api/health` before the test
runs, killed and restarted between every run). `exit_code` is the Maven process exit code for
that single-test run: 0 means the test passed (directly, or after a Surefire rerun in the
quarantined phase), 1 means it failed with no more reruns left.

## Raw (no rerun, `-Drerun.count=0`)

33 fresh-backend runs, 28 failures, 5 passes: **84.8% nondeterministic failure rate.**

```
run,exit_code
1,1
2,1
3,1
4,1
5,1
6,1
7,1
8,1
9,1
10,0
11,1
12,1
13,1
14,1
15,0
16,0
17,1
18,1
19,0
20,1
21,1
22,1
23,1
24,1
25,1
26,1
27,1
28,1
29,1
30,1
31,1
32,1
33,0
```

## Quarantined (`-Drerun.count=3`, Surefire's own rerun-and-quarantine)

20 fresh-backend runs, 0 failures, 20 passes: **0.0% effective failure rate.**

```
run,exit_code
1,0
2,0
3,0
4,0
5,0
6,0
7,0
8,0
9,0
10,0
11,0
12,0
13,0
14,0
15,0
16,0
17,0
18,0
19,0
20,0
```

## Reading these numbers

The raw rate (84.8%) is far higher than a real CI suite's flake rate would be. The racy test's
fixed 120ms wait loses its race against the backend's uniform-random 0 to 700ms processing
delay roughly (700-120)/700, about 83%, of the time by construction, which is close to the
84.8% measured; this was built to fail often on purpose, precisely so a modest sample size
(33 runs, not thousands) could still show the detector's effect clearly. With
`rerunFailingTestsCount=3`, one test gets up to 4 total attempts per run; the chance all 4 lose
the same race is roughly 0.83^4, about 47%, so a 0/20 result is a lucky but real sample, not a
mathematical certainty; a larger sample would show occasional runs failing even 4/4 attempts at
an 83% single-attempt loss rate. The mechanism, not the exact percentages, is the point: the
originating resume bullet's 6.1% to 0.4% describes a realistic CI flake rate and a similar
directional improvement, not this project's deliberately harsher demonstration case.
