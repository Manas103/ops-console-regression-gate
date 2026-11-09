import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { router } from './routes.js';
import { activeDefects, isFlakeModeActive } from './defects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use('/api', router);

const staticDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(staticDir));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// PORT=0 (or unset PORT with an explicit 0 default) asks the OS for any free
// port; the actual bound port is only known after listen() resolves, via
// server.address(), so it is logged from there rather than from the
// requested value. scripts/run-shard.mjs and scripts/run-nightly-benchmark.mjs
// parse this exact "listening on :<port>" line to discover the port they
// bound to, which is how multiple sharded backend instances run concurrently
// without ever colliding on a fixed port.
const REQUESTED_PORT = Number(process.env.PORT ?? 4000);
const server = app.listen(REQUESTED_PORT, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : REQUESTED_PORT;
  console.log(`ops-console backend listening on :${actualPort}`);
  console.log(`active defects: [${activeDefects().join(',')}]`);
  console.log(`flake mode: ${isFlakeModeActive() ? 'ON' : 'off'}`);
});
