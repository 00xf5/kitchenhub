const { app, BrowserWindow, ipcMain, desktopCapturer, powerMonitor, screen } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');
const WebSocket = require('ws');

// robotjs — true OS-level SendInput() for mouse and keyboard injection
// Works across ALL applications on the agent's desktop (not just the Electron window)
let robot;
try {
  robot = require('robotjs');
  robot.setMouseDelay(0);
  robot.setKeyboardDelay(0);
  console.log('[ROBOT] robotjs loaded — OS-level input injection enabled');
} catch (err) {
  robot = null;
  console.warn('[ROBOT] robotjs not available, falling back to sendInputEvent:', err.message);
}

const isDev          = !app.isPackaged;
const screenshotsDir = path.join(app.getAppPath(), 'screenshots');
const consentFile    = path.join(app.getPath('userData'), 'consent.json');
// ── Server configuration ─────────────────────────────────────────────
function loadServerConfig() {
  const configFile = path.join(app.getPath('userData'), 'server-config.json');
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (data.serverUrl && data.serverWs) {
        console.log(`[CONFIG] Loaded server config from file: ${data.serverUrl}`);
        return { url: data.serverUrl, ws: data.serverWs };
      }
    }
  } catch (e) {
    console.warn('[CONFIG] Failed to read server-config.json:', e.message);
  }
  return {
    url: process.env.KITCHEN_SERVER_URL || 'http://localhost:3001',
    ws: process.env.KITCHEN_SERVER_WS  || 'ws://localhost:3001'
  };
}

const serverConfig = loadServerConfig();
const SERVER_URL   = serverConfig.url;
const SERVER_WS    = serverConfig.ws;

// ── Agent identity (persisted per machine) ───────────────────────────
const identityFile = path.join(app.getPath('userData'), 'identity.json');
function loadIdentity() {
  try {
    if (fs.existsSync(identityFile)) return JSON.parse(fs.readFileSync(identityFile, 'utf8'));
  } catch {}
  // Default identity — in production this would come from a login flow
  const id = { agentId: 'AGT-LOCAL', name: 'Local Agent', email: 'agent@kitchenhub.com', shift: '9:00 AM – 5:00 PM' };
  fs.writeFileSync(identityFile, JSON.stringify(id));
  return id;
}
const IDENTITY = loadIdentity();

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

// ── State ─────────────────────────────────────────────────────────────
let trackingInterval = null;
let heartbeatInterval = null;
let ws = null;
let wsReconnectTimer = null;
let lastActivityTime = Date.now();
let mainWindow = null;

// ── Consent helpers ───────────────────────────────────────────────────
function hasConsent() {
  try {
    if (fs.existsSync(consentFile)) return !!JSON.parse(fs.readFileSync(consentFile, 'utf8')).agreed;
  } catch {}
  return false;
}
function saveConsent(agreed) {
  fs.writeFileSync(consentFile, JSON.stringify({ agreed, timestamp: new Date().toISOString() }));
}

// ── HTTP helpers ─────────────────────────────────────────────────────
function httpPost(endpoint, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const opts = {
      hostname: 'localhost', port: 3001,
      path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function uploadScreenshot(filepath, filename) {
  return new Promise((resolve, reject) => {
    const fileBuffer  = fs.readFileSync(filepath);
    const boundary    = `----FormBoundary${Date.now()}`;
    const agentMeta   = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="agentId"\r\n\r\n${IDENTITY.agentId}`;
    const timeMeta    = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${Date.now()}`;
    const fileHeader  = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="screenshot"; filename="${filename}"\r\nContent-Type: image/png\r\n\r\n`;
    const tail        = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(agentMeta),
      Buffer.from(timeMeta),
      Buffer.from(fileHeader),
      fileBuffer,
      Buffer.from(tail),
    ]);

    const opts = {
      hostname: 'localhost', port: 3001,
      path: '/api/screenshots/upload', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    };

    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── WebSocket client ──────────────────────────────────────────────────
let pingTimeout = null;
function heartbeatWS() {
  clearTimeout(pingTimeout);
  pingTimeout = setTimeout(() => {
    console.warn('[WS] Ping timeout. Terminating socket...');
    if (ws) ws.terminate();
  }, 35000);
}

function getScreenResolution() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    return {
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height
    };
  } catch (err) {
    console.error('[MONITOR] Screen resolution error:', err.message);
    return { width: 1366, height: 800 };
  }
}
function connectWS() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(SERVER_WS);

  ws.on('open', () => {
    console.log('[WS] Connected to server');
    clearTimeout(wsReconnectTimer);
    heartbeatWS();
    if (mainWindow) mainWindow.webContents.send('connection-status', true);
    if (hasConsent()) {
      ws.send(JSON.stringify({ type: 'agent-register', ...IDENTITY, screenResolution: getScreenResolution() }));
      startHeartbeat();
    }
  });

  ws.on('ping', () => {
    heartbeatWS();
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'take-screenshot':
        console.log('[WS] Admin triggered screenshot');
        takeScreenshot();
        break;

      case 'admin-message':
        console.log('[WS] Admin message:', msg.text);
        if (mainWindow) mainWindow.webContents.send('admin-message', { text: msg.text, timestamp: msg.timestamp });
        break;

      case 'ticket-actioned':
        if (mainWindow) mainWindow.webContents.send('ticket-actioned', msg.ticket);
        break;

      case 'remote-control-start':
        console.log('[WS] Admin started remote control takeover');
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.setFullScreen(true);
          mainWindow.focus();
        }
        startTracking(1500); // Fast screenshots as fallback during takeover
        if (mainWindow) {
          mainWindow.webContents.send('remote-control-status', { active: true, adminName: msg.adminName });
        }
        break;

      case 'remote-control-stop':
        console.log('[WS] Admin stopped remote control takeover');
        if (mainWindow) {
          mainWindow.setFullScreen(false);
        }
        stopTracking();
        if (mainWindow) {
          mainWindow.webContents.send('remote-control-status', { active: false });
        }
        break;

      // ── OS-level input injection via robotjs ────────────────────────
      // robotjs.moveMouse() / mouseClick() operate on the REAL OS cursor,
      // so clicks land in any application on the agent's desktop.
      case 'remote-click':
        if (robot) {
          // Coordinates from admin are already in the agent's native screen space
          console.log(`[ROBOT] Moving mouse to (${msg.x}, ${msg.y}) and clicking`);
          robot.moveMouse(msg.x, msg.y);
          robot.mouseClick();
          // Also send to renderer for the visual click ripple animation
          if (mainWindow) {
            const bounds = mainWindow.getBounds();
            const winX = msg.x - bounds.x;
            const winY = msg.y - bounds.y;
            mainWindow.webContents.send('remote-click', { x: winX, y: winY });
          }
        } else {
          // Fallback: sendInputEvent (only works within Electron window)
          if (mainWindow) {
            const bounds = mainWindow.getBounds();
            const winX = msg.x - bounds.x;
            const winY = msg.y - bounds.y;
            mainWindow.webContents.sendInputEvent({ type: 'mouseMove', x: winX, y: winY });
            mainWindow.webContents.sendInputEvent({ type: 'mouseDown', x: winX, y: winY, button: 'left', clickCount: 1 });
            mainWindow.webContents.sendInputEvent({ type: 'mouseUp', x: winX, y: winY, button: 'left', clickCount: 1 });
            mainWindow.webContents.send('remote-click', { x: winX, y: winY });
          }
        }
        break;

      case 'remote-type':
        if (robot) {
          // robotjs.typeString() types into whatever app currently has OS focus
          console.log(`[ROBOT] Typing: "${msg.text}"`);
          robot.typeString(msg.text);
        } else {
          // Fallback: Electron keyCode injection (Electron window only)
          if (mainWindow) {
            for (const char of msg.text) {
              mainWindow.webContents.sendInputEvent({ type: 'char', keyCode: char });
            }
          }
        }
        break;

      // ── WebRTC signaling: server relays offer from admin to agent ───
      // main.cjs forwards to the renderer (where RTCPeerConnection lives)
      case 'webrtc-offer':
        console.log('[WS] Received WebRTC offer from server — forwarding to renderer');
        if (mainWindow) {
          mainWindow.webContents.send('webrtc-signal-in', { type: 'webrtc-offer', sdp: msg.sdp });
        }
        break;

      case 'webrtc-ice-candidate':
        if (mainWindow) {
          mainWindow.webContents.send('webrtc-signal-in', { type: 'webrtc-ice-candidate', candidate: msg.candidate });
        }
        break;
    }
  });

  ws.on('close', () => {
    console.log('[WS] Disconnected. Reconnecting in 5s...');
    clearTimeout(pingTimeout);
    if (mainWindow) mainWindow.webContents.send('connection-status', false);
    wsReconnectTimer = setTimeout(connectWS, 5000);
  });

  ws.on('error', (err) => {
    console.warn('[WS] Error:', err.message);
  });
}

function wsSend(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// ── Heartbeat ─────────────────────────────────────────────────────────
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const idleSec     = (Date.now() - lastActivityTime) / 1000;
    const idleMinutes = Math.floor(idleSec / 60);
    const status      = idleSec > 120 ? 'idle' : 'active';  // idle after 2 min
    wsSend({ type: 'heartbeat', agentId: IDENTITY.agentId, status, idleMinutes });
  }, 10000);
}

// ── Screenshot ────────────────────────────────────────────────────────
async function takeScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if (!sources.length) return;
    const imgBuffer = sources[0].thumbnail.toPNG();
    const filename  = `screenshot_${IDENTITY.agentId}_${Date.now()}.png`;
    const filepath  = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, imgBuffer);
    console.log(`[MONITOR] Saved: ${filename}`);

    // Upload to server
    try {
      await uploadScreenshot(filepath, filename);
      console.log(`[MONITOR] Uploaded: ${filename}`);
    } catch (err) {
      console.warn('[MONITOR] Upload failed (server offline?):', err.message);
    }

    // Notify renderer
    if (mainWindow) mainWindow.webContents.send('screenshot-captured-notification', { filename, timestamp: new Date().toLocaleTimeString() });
  } catch (err) {
    console.error('[MONITOR] Capture failed:', err.message);
  }
}

// startTracking: used when admin initiates remote control takeover (fallback screenshots)
// Normal operation = on-demand screenshots only (admin triggers)
function startTracking(ms = 1500) {
  if (trackingInterval) clearInterval(trackingInterval);
  console.log(`[MONITOR] Remote-control tracking started (${ms / 1000}s interval)`);
  takeScreenshot();
  trackingInterval = setInterval(takeScreenshot, ms);
}

function stopTracking() {
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  console.log('[MONITOR] Tracking stopped.');
}

// ── Window ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Track user activity for idle detection
  mainWindow.webContents.on('before-input-event', () => { lastActivityTime = Date.now(); });

  if (hasConsent()) {
    connectWS(); // Only connect WS — no auto-screenshot interval
  }
}

// ── IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('get-consent-status', () => hasConsent());

ipcMain.handle('accept-consent', () => {
  console.log('[MONITOR] Consent accepted');
  saveConsent(true);
  connectWS(); // Screenshots on-demand only — no auto interval
  setTimeout(() => wsSend({ type: 'agent-register', ...IDENTITY, screenResolution: getScreenResolution() }), 1000);
  return true;
});

ipcMain.handle('reset-consent', () => {
  stopTracking();
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  if (ws) { ws.close(); ws = null; }
  if (fs.existsSync(consentFile)) fs.unlinkSync(consentFile);
  return true;
});

ipcMain.handle('get-identity', () => IDENTITY);

ipcMain.handle('send-ticket', async (_event, ticket) => {
  try {
    const result = await httpPost('/api/tickets', { ...ticket, agentId: IDENTITY.agentId, agentName: IDENTITY.name });
    wsSend({ type: 'ticket-created', ticket: result });
    return result;
  } catch (err) {
    console.error('[IPC] send-ticket failed:', err.message);
    return null;
  }
});

ipcMain.handle('send-agent-message', (_event, text) => {
  wsSend({
    type: 'agent-message',
    agentId: IDENTITY.agentId,
    name: IDENTITY.name,
    text,
    timestamp: new Date().toLocaleTimeString()
  });
  return true;
});

ipcMain.handle('get-connection-status', () => {
  return ws && ws.readyState === WebSocket.OPEN;
});

// ── WebRTC signaling IPC bridge ───────────────────────────────────────
// Renderer calls this to send WebRTC signals (answer / ICE) to the server
// The server then relays them back to the admin.
ipcMain.handle('webrtc-signal-out', (_event, payload) => {
  wsSend({ ...payload, agentId: IDENTITY.agentId });
  return true;
});

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  connectWS();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
