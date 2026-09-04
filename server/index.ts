import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { getAiTaskRecommendation } from './ai.ts';
import type { RecommendTaskPayload } from './ai.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);

export function createRecommendationServer() {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for mobile app client
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Health check endpoint
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'quiet-growth-backend' }));
      return;
    }

    // POST /recommend-task
    if (req.method === 'POST' && url.pathname === '/recommend-task') {
      let body = '';

      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          let payload: RecommendTaskPayload = {};
          if (body.trim()) {
            try {
              payload = JSON.parse(body);
            } catch (jsonErr) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON request body.' }));
              return;
            }
          }

          const result = await getAiTaskRecommendation(payload);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error: any) {
          const isApiKeyMissing = error.message?.includes('NO_API_KEY');
          const statusCode = isApiKeyMissing ? 503 : 500;

          console.warn(`[Backend Error] /recommend-task failed: ${error.message}`);

          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: error.message || 'Failed to generate task recommendation.',
            code: isApiKeyMissing ? 'NO_API_KEY' : 'AI_ERROR'
          }));
        }
      });
      return;
    }

    // Static file serving for mobile app UI
    if (req.method === 'GET' || req.method === 'HEAD') {
      const safePath = url.pathname === '/' ? '/01-quiet-growth-dashboard.html' : url.pathname;
      const resolvedPath = path.join(process.cwd(), safePath);

      // Prevent directory traversal
      if (resolvedPath.startsWith(process.cwd()) && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        const ext = path.extname(resolvedPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.ico': 'image/x-icon'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          fs.createReadStream(resolvedPath).pipe(res);
        }
        return;
      }
    }

    // 404 Not Found for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found.' }));
  });

  return server;
}

export function startServer(port: number = PORT): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = createRecommendationServer();
    server.listen(port, () => {
      console.log(`[Quiet Growth Backend] Server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

// Auto-start when run directly via CLI (e.g. node server/index.ts)
if (process.argv[1] && process.argv[1].endsWith('server/index.ts')) {
  startServer(PORT);
}
