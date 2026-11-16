import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as aiServices from './services/aiProxy';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large files/graphs
  app.use(express.json({ limit: '50mb' }));

  Object.entries(aiServices).forEach(([methodName, handler]) => {
    if (typeof handler === 'function') {
      app.post(`/api/ai/${methodName}`, async (req, res) => {
        try {
          const args = Array.isArray(req.body?.args) ? req.body.args : [];
          const result = await (handler as (...a: any[]) => Promise<any>)(...args);
          res.json({ result });
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
