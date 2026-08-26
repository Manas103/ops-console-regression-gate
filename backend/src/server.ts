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

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`ops-console backend listening on :${PORT}`);
  console.log(`active defects: [${activeDefects().join(',')}]`);
  console.log(`flake mode: ${isFlakeModeActive() ? 'ON' : 'off'}`);
});
