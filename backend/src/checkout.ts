// A small payment checkout domain alongside the operations console: one fixed
// cart, one payment attempt, one confirmation lookup. Deterministic by design
// (no randomness, no defect toggles) so the new Spock/Groovy contract layer and
// the new Selenium checkout journey measure a fixed, repeatable contract, the
// same way the incident API's non-defective baseline behavior does.

export interface CartItem {
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: number;
  status: 'APPROVED' | 'DECLINED';
  amountCents: number;
  cardLast4: string;
  createdAt: string;
}

const CART: CartItem[] = [
  { sku: 'OPS-CONSOLE-SEAT', name: 'Operations console seat (annual)', unitPriceCents: 48000, quantity: 1 },
  { sku: 'INCIDENT-EXPORT-ADDON', name: 'Incident export add-on', unitPriceCents: 1200, quantity: 2 },
];

export function cartTotalCents(): number {
  return CART.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function getCart(): { items: CartItem[]; totalCents: number } {
  return { items: CART, totalCents: cartTotalCents() };
}

const orders = new Map<number, Order>();
let nextOrderId = 1;

// A card number ending in 0002 is the fixture's one deterministic decline
// trigger (mirrors a card network test-card convention); every other
// 16-digit card approves. Nothing here is random.
const DECLINE_SUFFIX = '0002';

export interface PayRequest {
  cardNumber: string;
  amountCents: number;
}

export type PayResult =
  | { ok: true; order: Order }
  | { ok: false; code: number; error: string };

export function pay(req: PayRequest): PayResult {
  if (!/^\d{16}$/.test(req.cardNumber)) {
    return { ok: false, code: 400, error: 'cardNumber must be exactly 16 digits' };
  }
  if (!Number.isInteger(req.amountCents) || req.amountCents <= 0) {
    return { ok: false, code: 400, error: 'amountCents must be a positive integer' };
  }
  if (req.amountCents !== cartTotalCents()) {
    return { ok: false, code: 409, error: `amountCents ${req.amountCents} does not match cart total ${cartTotalCents()}` };
  }

  const status: Order['status'] = req.cardNumber.endsWith(DECLINE_SUFFIX) ? 'DECLINED' : 'APPROVED';
  const order: Order = {
    id: nextOrderId++,
    status,
    amountCents: req.amountCents,
    cardLast4: req.cardNumber.slice(-4),
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  return { ok: true, order };
}

export function getOrder(id: number): Order | undefined {
  return orders.get(id);
}

export function resetCheckout(): void {
  orders.clear();
  nextOrderId = 1;
}
