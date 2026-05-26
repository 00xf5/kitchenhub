/**
 * KitchenHub Relay Server
 * Fully instrumented for deployment diagnostics.
 */

// ── Step 0: Catch EVERYTHING before any code runs ────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error('[FATAL] Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});

console.log('[STARTUP] Step 1: Process handlers registered');
console.log('[STARTUP] Node version:', process.version);
console.log('[STARTUP] Platform:', process.platform, process.arch);
console.log('[STARTUP] PORT env:', process.env.PORT);
console.log('[STARTUP] CWD:', process.cwd());
console.log('[STARTUP] __dirname:', __dirname);

// ── Step 1: Core modules ─────────────────────────────────────────────
let express, http, cors, path, fs;
try {
  express = require('express');
  console.log('[STARTUP] Step 2a: express loaded');
  http = require('http');
  console.log('[STARTUP] Step 2b: http loaded');
  cors = require('cors');
  console.log('[STARTUP] Step 2c: cors loaded');
  path = require('path');
  fs   = require('fs');
  console.log('[STARTUP] Step 2d: path + fs loaded');
} catch (err) {
  console.error('[FATAL] Failed loading core modules:', err.message);
  process.exit(1);
}

// ── Step 2: Optional / native modules ───────────────────────────────
let WebSocketServer, WebSocket, multer, uuidv4;
try {
  const ws = require('ws');
  WebSocketServer = ws.WebSocketServer;
  WebSocket       = ws.WebSocket;
  console.log('[STARTUP] Step 3a: ws loaded');
} catch (err) {
  console.error('[FATAL] ws failed to load:', err.message, err.stack);
  process.exit(1);
}

try {
  multer = require('multer');
  console.log('[STARTUP] Step 3b: multer loaded');
} catch (err) {
  console.warn('[STARTUP] multer failed to load (non-fatal):', err.message);
  multer = null;
}

try {
  uuidv4 = require('uuid').v4;
  console.log('[STARTUP] Step 3c: uuid loaded');
} catch (err) {
  console.warn('[STARTUP] uuid failed to load (non-fatal):', err.message);
  uuidv4 = () => Math.random().toString(36).slice(2);
}

// ── Step 3: Config ───────────────────────────────────────────────────
const PORT           = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
console.log('[STARTUP] Step 4: PORT =', PORT, '| Screenshots dir:', SCREENSHOTS_DIR);

try {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log('[STARTUP] Step 4a: Screenshots dir created');
  } else {
    console.log('[STARTUP] Step 4a: Screenshots dir already exists');
  }
} catch (err) {
  console.warn('[STARTUP] Could not create screenshots dir (non-fatal):', err.message);
}

// ── Step 4: Build Express app ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

let wss;
try {
  wss = new WebSocketServer({ server });
  console.log('[STARTUP] Step 5: WebSocketServer attached');
} catch (err) {
  console.error('[FATAL] WebSocketServer failed:', err.message);
  process.exit(1);
}

app.use(cors());
app.use(express.json());
console.log('[STARTUP] Step 6: Middleware registered');

// ── Health check / root (required by most platforms) ─────────────────
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'KitchenHub Relay Server',
    uptime: process.uptime(),
    node: process.version,
    port: PORT,
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
console.log('[STARTUP] Step 7: Health check routes registered');

// ── In-memory stores ─────────────────────────────────────────────────
const agentConnections = new Map();
const adminConnections = new Set();
let   tickets = [];

// ── Multer (safe — only set up if module loaded) ──────────────────────
let upload = null;
if (multer) {
  try {
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, SCREENSHOTS_DIR),
      filename:    (_req, file, cb)  => cb(null, file.originalname),
    });
    upload = multer({ storage });
    console.log('[STARTUP] Step 8: multer diskStorage configured');
  } catch (err) {
    console.warn('[STARTUP] multer diskStorage setup failed (non-fatal):', err.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
function broadcastToAdmins(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of adminConnections) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function sendToAgent(agentId, payload) {
  const conn = agentConnections.get(agentId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

function getAgentList() {
  return Array.from(agentConnections.values()).map(c => c.info);
}

function broadcastAgentUpdate() {
  broadcastToAdmins({ type: 'agents-update', agents: getAgentList() });
}

// ── REST API ──────────────────────────────────────────────────────────
app.get('/api/agents',  (_req, res) => res.json(getAgentList()));
app.get('/api/tickets', (_req, res) => res.json(tickets));

app.post('/api/tickets', (req, res) => {
  const ticket = {
    id: `KH-${Math.floor(1000 + Math.random() * 9000)}`,
    ...req.body,
    adminStatus: 'pending',
    adminNote: '',
    forwardedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
  };
  tickets.unshift(ticket);
  broadcastToAdmins({ type: 'ticket-created', ticket });
  res.status(201).json(ticket);
});

app.patch('/api/tickets/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  const { adminStatus, adminNote } = req.body;
  ticket.adminStatus = adminStatus;
  ticket.adminNote   = adminNote ?? ticket.adminNote;
  broadcastToAdmins({ type: 'ticket-updated', ticket });
  if (ticket.agentId) sendToAgent(ticket.agentId, { type: 'ticket-actioned', ticket });
  res.json(ticket);
});

// Screenshot endpoints — only active if multer loaded
if (upload) {
  app.post('/api/screenshots/upload', upload.single('screenshot'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const { agentId, timestamp } = req.body;
    const url = `${req.protocol}://${req.get('host')}/api/screenshots/file/${req.file.filename}`;
    const conn = agentConnections.get(agentId);
    if (conn) {
      conn.info.screenshots = conn.info.screenshots || [];
      conn.info.screenshots.unshift({
        id: uuidv4(),
        filename: req.file.filename,
        url,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        label: 'Screen captured',
        timestamp: timestamp || Date.now(),
      });
      conn.info.screenshots = conn.info.screenshots.slice(0, 20);
    }
    broadcastToAdmins({ type: 'screenshot-ready', agentId, filename: req.file.filename, url,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), label: 'Screen captured' });
    broadcastAgentUpdate();
    res.json({ ok: true, filename: req.file.filename, url });
  });
}

app.get('/api/screenshots/file/:filename', (req, res) => {
  const fp = path.join(SCREENSHOTS_DIR, req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).send('Not found');
  res.sendFile(fp);
});

app.get('/api/screenshots/:agentId', (req, res) => {
  const conn = agentConnections.get(req.params.agentId);
  res.json(conn ? (conn.info.screenshots || []) : []);
});

console.log('[STARTUP] Step 9: All REST routes registered');

// ── WebSocket ─────────────────────────────────────────────────────────
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) { return ws.terminate(); }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('close', () => clearInterval(pingInterval));

wss.on('connection', (ws) => {
  let clientType = null;
  let clientId   = null;
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'agent-register': {
        clientType = 'agent';
        clientId   = msg.agentId;
        agentConnections.set(clientId, {
          ws,
          info: {
            id: msg.agentId, name: msg.name,
            avatar: msg.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
            email: msg.email || `${msg.agentId.toLowerCase()}@kitchenhub.com`,
            shift: msg.shift || '9:00 AM – 5:00 PM',
            status: 'active', lastSeen: 'Just now', idleMinutes: 0,
            ticketsOpen: 0, ticketsResolved: 0, ticketsForwarded: 0,
            screenshots: [], connectedAt: Date.now(),
            screenResolution: msg.screenResolution || { width: 1366, height: 800 },
          },
        });
        console.log(`[SERVER] Agent connected: ${clientId}`);
        broadcastAgentUpdate();
        break;
      }
      case 'heartbeat': {
        const conn = agentConnections.get(msg.agentId);
        if (conn) {
          conn.info.status      = msg.status;
          conn.info.idleMinutes = msg.idleMinutes || 0;
          conn.info.lastSeen    = msg.status === 'active' ? 'Just now' : `${msg.idleMinutes}m ago`;
          broadcastAgentUpdate();
        }
        break;
      }
      case 'ticket-created': {
        const conn = agentConnections.get(msg.ticket?.agentId);
        if (conn) {
          conn.info.ticketsOpen      = (conn.info.ticketsOpen || 0) + 1;
          conn.info.ticketsForwarded = (conn.info.ticketsForwarded || 0) + 1;
          broadcastAgentUpdate();
        }
        break;
      }
      case 'admin-register': {
        clientType = 'admin';
        adminConnections.add(ws);
        console.log(`[SERVER] Admin connected. Total: ${adminConnections.size}`);
        ws.send(JSON.stringify({ type: 'agents-update', agents: getAgentList() }));
        ws.send(JSON.stringify({ type: 'tickets-snapshot', tickets }));
        break;
      }
      case 'message-agent': {
        const sent = sendToAgent(msg.agentId, { type: 'admin-message', text: msg.text, timestamp: new Date().toLocaleTimeString() });
        ws.send(JSON.stringify({ type: 'message-sent', ok: sent, agentId: msg.agentId }));
        break;
      }
      case 'trigger-screenshot': {
        const sent = sendToAgent(msg.agentId, { type: 'take-screenshot' });
        ws.send(JSON.stringify({ type: 'trigger-sent', ok: sent, agentId: msg.agentId }));
        break;
      }
      case 'webrtc-offer': {
        sendToAgent(msg.agentId, { type: 'webrtc-offer', sdp: msg.sdp });
        break;
      }
      case 'webrtc-answer': {
        broadcastToAdmins({ type: 'webrtc-answer', sdp: msg.sdp, agentId: msg.agentId });
        break;
      }
      case 'webrtc-ice-candidate': {
        if (msg.target === 'agent' && msg.agentId) {
          sendToAgent(msg.agentId, { type: 'webrtc-ice-candidate', candidate: msg.candidate });
        } else {
          broadcastToAdmins({ type: 'webrtc-ice-candidate', candidate: msg.candidate, agentId: msg.agentId });
        }
        break;
      }
      case 'agent-message': {
        broadcastToAdmins({ type: 'agent-message', agentId: msg.agentId, text: msg.text, name: msg.name, timestamp: msg.timestamp || new Date().toLocaleTimeString() });
        break;
      }
      case 'remote-control-start': {
        sendToAgent(msg.agentId, { type: 'remote-control-start', adminName: msg.adminName });
        break;
      }
      case 'remote-control-stop': {
        sendToAgent(msg.agentId, { type: 'remote-control-stop' });
        break;
      }
      case 'remote-click': {
        sendToAgent(msg.agentId, { type: 'remote-click', x: msg.x, y: msg.y });
        break;
      }
      case 'remote-type': {
        sendToAgent(msg.agentId, { type: 'remote-type', text: msg.text });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (clientType === 'agent' && clientId) {
      const conn = agentConnections.get(clientId);
      if (conn) { conn.info.status = 'offline'; conn.info.lastSeen = new Date().toLocaleTimeString(); }
      console.log(`[SERVER] Agent disconnected: ${clientId}`);
      broadcastAgentUpdate();
    } else if (clientType === 'admin') {
      adminConnections.delete(ws);
      console.log(`[SERVER] Admin disconnected. Total: ${adminConnections.size}`);
    }
  });

  ws.on('error', (err) => console.error('[SERVER] WS error:', err.message));
});

console.log('[STARTUP] Step 10: WebSocket handler registered');

// ── Start ─────────────────────────────────────────────────────────────
console.log('[STARTUP] Step 11: Calling server.listen()...');
server.listen(PORT, '0.0.0.0', () => {
  console.log('[STARTUP] ✅ SERVER IS UP AND RUNNING');
  console.log(`[STARTUP] HTTP: http://0.0.0.0:${PORT}`);
  console.log(`[STARTUP] WS:   ws://0.0.0.0:${PORT}`);
  console.log(`[STARTUP] Uptime: ${process.uptime().toFixed(2)}s`);
});

server.on('error', (err) => {
  console.error('[FATAL] server.listen() error:', err.message);
  console.error('[FATAL] Code:', err.code);
  process.exit(1);
});
