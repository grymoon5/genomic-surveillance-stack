import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDB, runQuery } from './db';

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let clients: WebSocket[] = [];
wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'backend-service' });
});

app.post('/api/alerts', async (req, res) => {
  const { id, case_type, lng, lat } = req.body;

  if (!id || !case_type || typeof lng !== 'number' || typeof lat !== 'number') {
    return res.status(400).json({ error: 'Payload must include id, case_type, lng, and lat.' });
  }

  try {
    const esc = (v: any) => typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`;
    const insertSql = `INSERT INTO infection_logs (id, case_type, lng, lat, timestamp) VALUES (${esc(id)}, ${esc(case_type)}, ${Number(lng)}, ${Number(lat)}, CURRENT_TIMESTAMP);`;
    await runQuery(insertSql);
  } catch (error) {
    console.error('DB insert failed:', error);
    return res.status(500).json({ error: 'Failed to store alert.' });
  }

  const payload = JSON.stringify({
    event: 'NEW_CASE',
    id,
    case_type,
    lng,
    lat,
    timestamp: new Date().toISOString()
  });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });

  res.status(202).json({ status: 'ingested' });
});

app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const rows = await runQuery('SELECT * FROM infection_logs ORDER BY timestamp DESC LIMIT 300;');
    return res.json(rows);
  } catch (error) {
    console.error('Failed to query logs:', error);
    return res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

async function startServer() {
  try {
    await initDB();
    server.listen(3000, () => {
      console.log('Backend running on port 3000');
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

startServer();
