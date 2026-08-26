import type { Incident } from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // response body was not JSON, keep the default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function fetchIncidents(status?: string): Promise<Incident[]> {
  const qs = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  return fetch(`/api/incidents${qs}`).then((r) => handle<Incident[]>(r));
}

export function fetchIncident(id: number): Promise<Incident> {
  return fetch(`/api/incidents/${id}`).then((r) => handle<Incident>(r));
}

export function ackIncident(id: number): Promise<Incident> {
  return fetch(`/api/incidents/${id}/ack`, { method: 'POST' }).then((r) => handle<Incident>(r));
}

export function resolveIncident(id: number): Promise<Incident> {
  return fetch(`/api/incidents/${id}/resolve`, { method: 'POST' }).then((r) =>
    handle<Incident>(r)
  );
}
