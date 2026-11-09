import { Router } from 'express';
import { acknowledge, getIncident, listIncidents, resolve, toPublic } from './store.js';
import { isDefectActive } from './defects.js';
import { getCart, getOrder, pay } from './checkout.js';

const VALID_STATUS = new Set(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);

export const router = Router();

router.get('/health', (_req, res) => {
  // Defect 19: health check endpoint is missing entirely, which breaks any
  // CI step that polls it before running the test suite.
  if (isDefectActive(19)) {
    return res.status(404).end();
  }
  res.json({ ok: true });
});

router.get('/incidents', (req, res) => {
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;
  const severityParam = typeof req.query.severity === 'string' ? req.query.severity : undefined;

  if (statusParam) {
    const normalized = statusParam.toUpperCase();
    // Defect 16: an unknown status query value is silently accepted and
    // returns an empty list instead of a 400.
    if (!VALID_STATUS.has(normalized) && !isDefectActive(16)) {
      return res.status(400).json(errorBody(`unknown status '${statusParam}'`));
    }
  }

  const results = listIncidents({ status: statusParam, severity: severityParam });
  const body = results.map(toPublic).map(applyFieldDefects);

  // Defect 1: the X-Total-Count header is never set.
  if (!isDefectActive(1)) {
    res.set('X-Total-Count', String(body.length));
  }
  // Defect 17: the response is served as text/plain instead of application/json.
  if (isDefectActive(17)) {
    res.type('text/plain');
  }
  res.json(body);
});

router.get('/incidents/:id', (req, res) => {
  const idParam = req.params.id;
  if (!/^\d+$/.test(idParam)) {
    // Defect 15: a non-numeric id crashes the handler instead of
    // returning a 400. Thrown synchronously so Express's default error
    // handler turns it into a 500.
    if (isDefectActive(15)) {
      throw new Error('invalid id');
    }
    return res.status(400).json(errorBody(`invalid incident id '${idParam}'`));
  }

  const id = Number(idParam);
  // Defect 22: the lookup is off by one, returning the previous incident.
  const lookupId = isDefectActive(22) ? id - 1 : id;
  const inc = getIncident(lookupId);

  if (!inc) {
    // Defect 2: an unknown id returns 200 with an empty body instead of 404.
    if (isDefectActive(2)) {
      return res.status(200).json({});
    }
    return res.status(404).json(errorBody(`incident ${id} not found`));
  }

  res.json(applyFieldDefects(toPublic(inc)));
});

router.post('/incidents/:id/ack', async (req, res) => {
  const id = Number(req.params.id);
  const result = await acknowledge(id);
  if (!result.ok) {
    // Defect 9: acking an unknown id fabricates a 200 success instead of 404.
    if (result.code === 404 && isDefectActive(9)) {
      return res.status(200).json({ ok: true, fabricated: true });
    }
    return res.status(result.code).json(errorBody(result.error));
  }
  // Defect 11: the response omits the updated incident body.
  if (isDefectActive(11)) {
    return res.json({ ok: true });
  }
  res.json(applyFieldDefects(toPublic(result.incident)));
});

router.post('/incidents/:id/resolve', (req, res) => {
  const id = Number(req.params.id);
  const result = resolve(id);
  if (!result.ok) {
    // Defect 10: resolving an unknown id fabricates a 200 success instead of 404.
    if (result.code === 404 && isDefectActive(10)) {
      return res.status(200).json({ ok: true, fabricated: true });
    }
    return res.status(result.code).json(errorBody(result.error));
  }
  const body = applyFieldDefects(toPublic(result.incident));
  // Defect 12: the response omits the updated status field.
  if (isDefectActive(12)) {
    const { status, ...rest } = body as Record<string, unknown>;
    return res.json(rest);
  }
  res.json(body);
});

// Any other method on /incidents/:id (PUT, DELETE, PATCH, ...) should be
// rejected with 405; GET/POST are handled by the routes above and never
// reach here.
router.all('/incidents/:id', (req, res) => {
  // Defect 26: unsupported methods return 200 instead of 405.
  if (isDefectActive(26)) {
    return res.status(200).json({ ok: true });
  }
  res.status(405).json(errorBody(`method ${req.method} not allowed on this resource`));
});

// --- Payment checkout flow. Deterministic, no defect toggles: see checkout.ts. ---

router.get('/checkout/cart', (_req, res) => {
  res.json(getCart());
});

router.post('/checkout/pay', (req, res) => {
  const body = req.body ?? {};
  const result = pay({ cardNumber: String(body.cardNumber ?? ''), amountCents: Number(body.amountCents) });
  if (!result.ok) {
    return res.status(result.code).json({ error: result.error });
  }
  res.status(201).json(result.order);
});

router.get('/checkout/orders/:id', (req, res) => {
  const idParam = req.params.id;
  if (!/^\d+$/.test(idParam)) {
    return res.status(400).json({ error: `invalid order id '${idParam}'` });
  }
  const order = getOrder(Number(idParam));
  if (!order) {
    return res.status(404).json({ error: `order ${idParam} not found` });
  }
  res.json(order);
});

function errorBody(message: string): Record<string, unknown> {
  // Defect 23: error responses omit the `error` message field entirely.
  if (isDefectActive(23)) return {};
  return { error: message };
}

function applyFieldDefects(inc: Record<string, unknown>): Record<string, unknown> {
  const out = { ...inc };
  // Defect 18: timestamps are serialized as epoch millis instead of ISO-8601 strings.
  if (isDefectActive(18)) {
    for (const key of ['createdAt', 'acknowledgedAt', 'resolvedAt']) {
      const v = out[key];
      if (typeof v === 'string') out[key] = new Date(v).getTime();
    }
  }
  // Defect 27: status is serialized lowercase instead of the uppercase enum contract.
  if (isDefectActive(27) && typeof out.status === 'string') {
    out.status = (out.status as string).toLowerCase();
  }
  return out;
}
