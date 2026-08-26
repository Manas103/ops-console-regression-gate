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
}
