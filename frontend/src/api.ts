import type { Incident } from './types';
import type { Cart, Order } from './checkoutTypes';

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

export function fetchCart(): Promise<Cart> {
  return fetch('/api/checkout/cart').then((r) => handle<Cart>(r));
}

export function pay(cardNumber: string, amountCents: number): Promise<Order> {
  return fetch('/api/checkout/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber, amountCents }),
  }).then((r) => handle<Order>(r));
}

export function fetchOrder(id: number): Promise<Order> {
  return fetch(`/api/checkout/orders/${id}`).then((r) => handle<Order>(r));
}
