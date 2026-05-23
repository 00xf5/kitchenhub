/**
 * KitchenHub Relay Server
 * Port 3001 — bridges Electron agent portals ↔ admin dashboard
 */

const express    = require('express');
const http       = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

const PORT           = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const SCREENSHOTS_DIR = path.join(os.tmpdir(), 'kitchenhub_screenshots');

try {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
} catch (err) {
  console.error('[SERVER] Could not create screenshots directory:', err.message);
}

// ── In-memory stores ────────────────────────────────────────────────
/** @type {Map<string, { ws: WebSocket, info: object }>} */
const agentConnections = new Map();   // agentId → { ws, info }
const adminConnections = new Set();   // Set of admin WebSockets
let   tickets = [];                   // all escalation tickets

// ── Multer (screenshot upload) ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SCREENSHOTS_DIR),
  filename:    (_req, file, cb)  => cb(null, file.originalname),
});
const upload = multer({ storage });

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────
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

// ── REST API ─────────────────────────────────────────────────────────

// Agent list
app.get('/api/agents', (_req, res) => {
  res.json(getAgentList());
});

// Ticket list
app.get('/api/tickets', (_req, res) => {
  res.json(tickets);
});

// Agent creates ticket
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

// Admin actions a ticket
app.patch('/api/tickets/:id', (req, res) => {
  const { id }           = req.params;
  const { adminStatus, adminNote } = req.body;
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  ticket.adminStatus = adminStatus;
  ticket.adminNote   = adminNote ?? ticket.adminNote;
  broadcastToAdmins({ type: 'ticket-updated', ticket });
  // Notify the responsible agent
  if (ticket.agentId) {
    sendToAgent(ticket.agentId, { type: 'ticket-actioned', ticket });
  }
  res.json(ticket);
});

// Screenshot upload (agent → server)
app.post('/api/screenshots/upload', upload.single('screenshot'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const { agentId, timestamp } = req.body;
  const url = `http://localhost:${PORT}/api/screenshots/file/${req.file.filename}`;

  // Update agent's screenshot list
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
    // Keep last 20 only
    conn.info.screenshots = conn.info.screenshots.slice(0, 20);
  }

  broadcastToAdmins({
    type: 'screenshot-ready',
    agentId,
    filename: req.file.filename,
    url,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    label: 'Screen captured',
  });

  broadcastAgentUpdate();
  res.json({ ok: true, filename: req.file.filename, url });
});

// Serve screenshot files
app.get('/api/screenshots/file/:filename', (req, res) => {
  const fp = path.join(SCREENSHOTS_DIR, req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).send('Not found');
  res.sendFile(fp);
});

// List screenshots for agent
app.get('/api/screenshots/:agentId', (req, res) => {
  const conn = agentConnections.get(req.params.agentId);
  res.json(conn ? (conn.info.screenshots || []) : []);
});

// ── WebSocket ─────────────────────────────────────────────────────────
// Keep-alive ping interval to detect half-open TCP connections
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[SERVER] Client unresponsive. Terminating connection.');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('connection', (ws) => {
  let clientType = null;
  let clientId   = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ── Agent registers ────────────────────────────────────────────
      case 'agent-register': {
        clientType = 'agent';
        clientId   = msg.agentId;
        agentConnections.set(clientId, {
          ws,
          info: {
            id:               msg.agentId,
            name:             msg.name,
            avatar:           msg.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
            email:            msg.email || `${msg.agentId.toLowerCase()}@kitchenhub.com`,
            shift:            msg.shift || '9:00 AM – 5:00 PM',
            status:           'active',
            lastSeen:         'Just now',
            idleMinutes:      0,
            ticketsOpen:      0,
            ticketsResolved:  0,
            ticketsForwarded: 0,
            screenshots:      [],
            connectedAt:      Date.now(),
            screenResolution: msg.screenResolution || { width: 1366, height: 800 },
          },
        });
        console.log(`[SERVER] Agent connected: ${clientId}`);
        broadcastAgentUpdate();
        break;
      }

      // ── Agent heartbeat ────────────────────────────────────────────
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

      // ── Agent sends ticket ──────────────────────────────────────────
      case 'ticket-created': {
        const conn = agentConnections.get(msg.ticket?.agentId);
        if (conn) {
          conn.info.ticketsOpen      = (conn.info.ticketsOpen || 0) + 1;
          conn.info.ticketsForwarded = (conn.info.ticketsForwarded || 0) + 1;
          broadcastAgentUpdate();
        }
        break;
      }

      // ── Admin registers ────────────────────────────────────────────
      case 'admin-register': {
        clientType = 'admin';
        adminConnections.add(ws);
        console.log(`[SERVER] Admin connected. Total admins: ${adminConnections.size}`);
        // Send current state immediately
        ws.send(JSON.stringify({ type: 'agents-update', agents: getAgentList() }));
        ws.send(JSON.stringify({ type: 'tickets-snapshot', tickets }));
        break;
      }

      // ── Admin messages an agent ────────────────────────────────
      case 'message-agent': {
        const sent = sendToAgent(msg.agentId, {
          type: 'admin-message',
          text: msg.text,
          timestamp: new Date().toLocaleTimeString(),
        });
        ws.send(JSON.stringify({ type: 'message-sent', ok: sent, agentId: msg.agentId }));
        break;
      }

      // ── Admin triggers screenshot ──────────────────────────────
      case 'trigger-screenshot': {
        const sent = sendToAgent(msg.agentId, { type: 'take-screenshot' });
        ws.send(JSON.stringify({ type: 'trigger-sent', ok: sent, agentId: msg.agentId }));
        break;
      }

      // ── WebRTC Signaling Relay (Admin → Agent) ─────────────────
      // The server acts as a pure relay — no WebRTC involvement here.
      // Admin sends offer; server forwards to target agent.
      case 'webrtc-offer': {
        console.log(`[SERVER] Relaying WebRTC offer to agent: ${msg.agentId}`);
        sendToAgent(msg.agentId, { type: 'webrtc-offer', sdp: msg.sdp });
        break;
      }

      // ── WebRTC Signaling Relay (Agent → Admin) ─────────────────
      // Agent sends answer/ICE; server broadcasts back to all admins
      // (in practice only the admin that initiated the session will use it).
      case 'webrtc-answer': {
        console.log(`[SERVER] Relaying WebRTC answer from agent: ${msg.agentId}`);
        broadcastToAdmins({ type: 'webrtc-answer', sdp: msg.sdp, agentId: msg.agentId });
        break;
      }

      case 'webrtc-ice-candidate': {
        // Could come from either side; route based on presence of agentId target.
        if (msg.target === 'agent' && msg.agentId) {
          sendToAgent(msg.agentId, { type: 'webrtc-ice-candidate', candidate: msg.candidate });
        } else {
          broadcastToAdmins({ type: 'webrtc-ice-candidate', candidate: msg.candidate, agentId: msg.agentId });
        }
        break;
      }

      // ── Agent messages back to Admin (two-way) ─────────────────────
      case 'agent-message': {
        console.log(`[SERVER] Agent message from ${msg.agentId}: ${msg.text}`);
        broadcastToAdmins({
          type: 'agent-message',
          agentId: msg.agentId,
          text: msg.text,
          name: msg.name,
          timestamp: msg.timestamp || new Date().toLocaleTimeString()
        });
        break;
      }

      // ── Remote Takeover Events ─────────────────────────────────────
      case 'remote-control-start': {
        console.log(`[SERVER] Admin starting remote control for agent: ${msg.agentId}`);
        sendToAgent(msg.agentId, { type: 'remote-control-start', adminName: msg.adminName });
        break;
      }

      case 'remote-control-stop': {
        console.log(`[SERVER] Admin stopping remote control for agent: ${msg.agentId}`);
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
      if (conn) {
        conn.info.status  = 'offline';
        conn.info.lastSeen = new Date().toLocaleTimeString();
      }
      console.log(`[SERVER] Agent disconnected: ${clientId}`);
      broadcastAgentUpdate();
    } else if (clientType === 'admin') {
      adminConnections.delete(ws);
      console.log(`[SERVER] Admin disconnected. Total admins: ${adminConnections.size}`);
    }
  });

  ws.on('error', (err) => console.error('[SERVER] WS error:', err.message));
});

// ── Start ─────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] KitchenHub relay running on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] WebSocket ready on ws://0.0.0.0:${PORT}`);
  console.log(`[SERVER] Screenshots stored in: ${SCREENSHOTS_DIR}`);
});
