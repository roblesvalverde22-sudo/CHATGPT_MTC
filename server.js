import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const port = process.env.PORT || 5173;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function serveFile(res, filePath) {
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const path = url === '/' ? '/index.html' : url;
  const filePath = join(__dirname, path);
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      await serveFile(res, join(filePath, 'index.html'));
    } else {
      await serveFile(res, filePath);
    }
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Mostrador Unificado dev server running at http://localhost:${port}`);
});
