import { isDefectActive, isFlakeModeActive } from './defects.js';

export type Severity = 'SEV1' | 'SEV2' | 'SEV3';
export type Status = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Incident {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  internalNotes: string;
}

let incidents: Incident[] = [];
const inFlightAck = new Set<number>();

function seed(): Incident[] {
  const base: Array<{ title: string; severity: Severity; description: string }> = [
    { title: 'Payment gateway timeout spike', severity: 'SEV1', description: 'Checkout latency p99 exceeded 8s for the EU payment gateway pool.' },
    { title: 'Order queue consumer lag', severity: 'SEV2', description: 'Kafka consumer group order-fulfillment fell behind by 40k messages.' },
    { title: 'Warehouse sync job failed', severity: 'SEV2', description: 'Nightly inventory sync to warehouse-3 failed with a connection reset.' },
    { title: 'CDN edge cache miss ratio elevated', severity: 'SEV3', description: 'Cache hit ratio on the static asset CDN dropped from 96% to 71%.' },
    { title: 'Auth token refresh errors', severity: 'SEV1', description: 'A subset of mobile clients received 401s after token refresh.' },
    { title: 'Search index replica drift', severity: 'SEV3', description: 'Replica search index diverged from primary by roughly 2 minutes.' },
    { title: 'Email delivery delayed', severity: 'SEV2', description: 'Transactional email queue backed up behind a slow SMTP relay.' },
    { title: 'Disk usage above threshold on log host', severity: 'SEV3', description: 'log-collector-02 crossed 85 percent disk usage.' },
  ];
  const now = Date.now();

  let items: Incident[] = base.map((b, i) => ({
    id: i + 1,
    title: b.title,
    description: b.description,
    // Defect 25: severity values are never validated; incident 5 is seeded
    // with an out-of-domain severity that a correct implementation would reject.
    severity: isDefectActive(25) && i === 4 ? ('SEV9' as Severity) : b.severity,
    status: 'OPEN',
    // Defect 13: two incidents share an identical createdAt timestamp,
    // which breaks any consumer that assumes strictly ordered unique times.
    createdAt: new Date(now - (isDefectActive(13) && i === 1 ? 2 : i) * 3_600_000).toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
    internalNotes: `pager rotation: oncall-${(i % 3) + 1}`,
  }));

  // Defect 24: one fixture is silently dropped, seeding only 7 incidents
  // instead of the documented 8.
  if (isDefectActive(24)) {
    items = items.slice(0, 7);
  }

  return items;
}

export function resetStore(): void {
  incidents = seed();
  inFlightAck.clear();
}
resetStore();

export function listIncidents(filter: {
  status?: string;
  severity?: string;
}): Incident[] {
  let result = [...incidents];

  // Defect 21: list is returned oldest-first instead of newest-first.
  if (isDefectActive(21)) {
    result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else {
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const statusWant = filter.status
    ? isDefectActive(6)
      ? filter.status
      : filter.status.toUpperCase()
    : undefined;
  const severityWant = filter.severity ? filter.severity.toUpperCase() : undefined;

  if (statusWant && severityWant) {
    // Defect 20: combined status+severity filters are ORed instead of ANDed.
    if (isDefectActive(20)) {
      result = result.filter(
        (i) => i.status === statusWant || (!isDefectActive(14) && i.severity === severityWant)
      );
    } else {
      result = result.filter(
        (i) => i.status === statusWant && (isDefectActive(14) || i.severity === severityWant)
      );
    }
  } else if (statusWant) {
    result = result.filter((i) => i.status === statusWant);
  } else if (severityWant) {
    // Defect 14: severity filter is accepted but silently ignored.
    if (!isDefectActive(14)) {
      result = result.filter((i) => i.severity === severityWant);
    }
  }

  return result;
}

export function getIncident(id: number): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

export type TransitionResult =
  | { ok: true; incident: Incident }
  | { ok: false; code: number; error: string };

export async function acknowledge(id: number): Promise<TransitionResult> {
  const inc = incidents.find((i) => i.id === id);
  if (!inc) return { ok: false, code: 404, error: `incident ${id} not found` };

  // Defect 30: the per-incident processing lock is skipped, so two
  // concurrent ack requests can both observe status OPEN and both succeed.
  if (!isDefectActive(30)) {
    if (inFlightAck.has(id)) {
      return { ok: false, code: 409, error: `incident ${id} is already being processed` };
    }
    inFlightAck.add(id);
  }

  const statusAtEntry = inc.status;
  const delayMs = isFlakeModeActive() ? Math.floor(Math.random() * 700) : 40;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  try {
    const alreadyHandled = statusAtEntry !== 'OPEN';
    // Defect 3: acknowledging a non-OPEN incident is silently accepted
    // instead of being rejected with 409.
    if (alreadyHandled && !isDefectActive(3)) {
      return { ok: false, code: 409, error: `incident ${id} is not OPEN (status=${inc.status})` };
    }

    inc.status = 'ACKNOWLEDGED';
    // Defect 7: acknowledgedAt is never set.
    if (!isDefectActive(7)) {
      inc.acknowledgedAt = new Date().toISOString();
    }
    return { ok: true, incident: inc };
  } finally {
    inFlightAck.delete(id);
  }
}

export function resolve(id: number): TransitionResult {
  const inc = incidents.find((i) => i.id === id);
  if (!inc) return { ok: false, code: 404, error: `incident ${id} not found` };

  // Defect 5: resolving an already-resolved incident is silently accepted.
  if (inc.status === 'RESOLVED' && !isDefectActive(5)) {
    return { ok: false, code: 409, error: `incident ${id} is already RESOLVED` };
  }
  // Defect 4: resolving an incident that was never acknowledged is
  // silently accepted, skipping the required ACKNOWLEDGED step.
  if (inc.status === 'OPEN' && !isDefectActive(4)) {
    return {
      ok: false,
      code: 409,
      error: `incident ${id} must be ACKNOWLEDGED before it can be RESOLVED`,
    };
  }

  const originalTitle = inc.title;
  inc.status = 'RESOLVED';
  // Defect 8: resolvedAt is never set.
  if (!isDefectActive(8)) {
    inc.resolvedAt = new Date().toISOString();
  }
  // Defect 28: resolving corrupts the incident title as a side effect.
  if (isDefectActive(28)) {
    inc.title = originalTitle + ' (resolved)';
  }
  return { ok: true, incident: inc };
}

export function toPublic(inc: Incident): Record<string, unknown> {
  const { internalNotes, ...pub } = inc;
  // Defect 29: the internal-only internalNotes field leaks into the public API.
  if (isDefectActive(29)) {
    return { ...pub, internalNotes };
  }
  return pub;
}
