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
const userDataDir    = app.getPath('userData');
const screenshotsDir = path.join(userDataDir, 'screenshots');
const consentFile    = path.join(userDataDir, 'consent.json');
// ── Supabase configuration ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nxzvpcbudbqotujuuczo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54enZwY2J1ZGJxb3R1anV1Y3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQ0MzcsImV4cCI6MjA4MzM5MDQzN30.45hqzbpj27CRlI3gRhtlS_VOIsuitYKDhEOPrpSminc';

let supabase;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  console.log('[SUPABASE] Client successfully initialized');
} catch (err) {
  console.error('[SUPABASE] Failed to initialize Supabase client:', err.message);
}

// ── Agent identity (persisted per machine) ───────────────────────────
const identityFile = path.join(userDataDir, 'identity.json');
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
let telemetryChannel = null;
let agentChannel = null;
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

// ── Supabase Helpers ──────────────────────────────────────────────────
async function uploadScreenshotToSupabase(filepath, filename) {
  try {
    const fileBuffer = fs.readFileSync(filepath);
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filename, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (err) {
    console.error('[SUPABASE] Storage upload failed:', err.message);
    throw err;
  }
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

function sendBroadcast(event, payload) {
  if (agentChannel) {
    agentChannel.send({
      type: 'broadcast',
      event: event,
      payload: payload
    }).catch(err => {
      console.warn(`[SUPABASE] Failed to send broadcast for ${event}:`, err.message);
    });
  }
}

function connectSupabase() {
  if (!supabase) return;
  if (!hasConsent()) {
    console.log('[SUPABASE] Delaying connection until user gives consent');
    return;
  }

  // 1. Join Presence channel for live roster telemetry
  telemetryChannel = supabase.channel('kitchenhub:telemetry');
  
  telemetryChannel.on('presence', { event: 'sync' }, () => {
    console.log('[SUPABASE] Roster presence sync');
  });

  telemetryChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[SUPABASE] Subscribed to telemetry channel');
      if (mainWindow) mainWindow.webContents.send('connection-status', true);
      
      const presenceState = {
        id: IDENTITY.agentId,
        name: IDENTITY.name,
        email: IDENTITY.email || `${IDENTITY.agentId.toLowerCase()}@kitchenhub.com`,
        shift: IDENTITY.shift || '9:00 AM – 5:00 PM',
        status: 'active',
        lastSeen: 'Just now',
        idleMinutes: 0,
        ticketsOpen: 0,
        ticketsResolved: 0,
        ticketsForwarded: 0,
        connectedAt: Date.now(),
        screenResolution: getScreenResolution(),
      };
      await telemetryChannel.track(presenceState);
      console.log('[SUPABASE] Presence tracked for agent');
      startHeartbeat();
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      console.warn('[SUPABASE] Telemetry channel closed/errored:', status);
      if (mainWindow) mainWindow.webContents.send('connection-status', false);
    }
  });

  // 2. Join private signaling channel
  agentChannel = supabase.channel(`kitchenhub:agent:${IDENTITY.agentId}`);

  agentChannel.on('broadcast', { event: '*' }, (payload) => {
    console.log(`[SUPABASE] Received broadcast: ${payload.event}`, payload.payload);
    handleBroadcastMessage(payload.event, payload.payload);
  });

  agentChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[SUPABASE] Subscribed to private channel: kitchenhub:agent:${IDENTITY.agentId}`);
    }
  });
}

function handleBroadcastMessage(event, msg) {
  switch (event) {
    case 'take-screenshot':
      console.log('[SUPABASE] Admin triggered screenshot');
      takeScreenshot();
      break;

    case 'admin-message':
      console.log('[SUPABASE] Admin message:', msg.text);
      if (mainWindow) mainWindow.webContents.send('admin-message', { text: msg.text, timestamp: msg.timestamp });
      break;

    case 'ticket-actioned':
      if (mainWindow) mainWindow.webContents.send('ticket-actioned', msg.ticket);
      break;

    case 'remote-control-start':
      console.log('[SUPABASE] Admin started remote control takeover');
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
      console.log('[SUPABASE] Admin stopped remote control takeover');
      if (mainWindow) {
        mainWindow.setFullScreen(false);
      }
      stopTracking();
      if (mainWindow) {
        mainWindow.webContents.send('remote-control-status', { active: false });
      }
      break;

    case 'remote-click':
      if (robot) {
        console.log(`[ROBOT] Moving mouse to (${msg.x}, ${msg.y}) and clicking`);
        robot.moveMouse(msg.x, msg.y);
        robot.mouseClick();
        if (mainWindow) {
          const bounds = mainWindow.getBounds();
          const winX = msg.x - bounds.x;
          const winY = msg.y - bounds.y;
          mainWindow.webContents.send('remote-click', { x: winX, y: winY });
        }
      } else {
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
        console.log(`[ROBOT] Typing: "${msg.text}"`);
        robot.typeString(msg.text);
      } else {
        if (mainWindow) {
          for (const char of msg.text) {
            mainWindow.webContents.sendInputEvent({ type: 'char', keyCode: char });
          }
        }
      }
      break;

    case 'webrtc-offer':
      console.log('[SUPABASE] Received WebRTC offer — forwarding to renderer');
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
}

// ── Heartbeat ─────────────────────────────────────────────────────────
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const idleSec     = (Date.now() - lastActivityTime) / 1000;
    const idleMinutes = Math.floor(idleSec / 60);
    const status      = idleSec > 120 ? 'idle' : 'active';
    
    if (telemetryChannel) {
      telemetryChannel.track({
        id: IDENTITY.agentId,
        name: IDENTITY.name,
        email: IDENTITY.email || `${IDENTITY.agentId.toLowerCase()}@kitchenhub.com`,
        shift: IDENTITY.shift || '9:00 AM – 5:00 PM',
        status,
        lastSeen: status === 'active' ? 'Just now' : `${idleMinutes}m ago`,
        idleMinutes,
        connectedAt: Date.now(),
        screenResolution: getScreenResolution(),
      }).catch(err => {
        console.warn('[SUPABASE] Heartbeat presence track failed:', err.message);
      });
    }
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

    try {
      const publicUrl = await uploadScreenshotToSupabase(filepath, filename);
      console.log(`[MONITOR] Uploaded to Supabase: ${publicUrl}`);

      sendBroadcast('screenshot-ready', {
        agentId: IDENTITY.agentId,
        filename,
        url: publicUrl,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        label: 'Screen captured',
        timestamp: Date.now()
      });

      if (mainWindow) mainWindow.webContents.send('screenshot-captured-notification', { filename, timestamp: new Date().toLocaleTimeString() });
    } catch (err) {
      console.warn('[MONITOR] Upload failed:', err.message);
    }
  } catch (err) {
    console.error('[MONITOR] Capture failed:', err.message);
  }
}

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
    connectSupabase();
  }
}

// ── IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('get-consent-status', () => hasConsent());

ipcMain.handle('accept-consent', () => {
  console.log('[MONITOR] Consent accepted');
  saveConsent(true);
  connectSupabase();
  return true;
});

ipcMain.handle('reset-consent', async () => {
  stopTracking();
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  if (telemetryChannel) {
    await telemetryChannel.unsubscribe();
    telemetryChannel = null;
  }
  if (agentChannel) {
    await agentChannel.unsubscribe();
    agentChannel = null;
  }
  if (fs.existsSync(consentFile)) fs.unlinkSync(consentFile);
  return true;
});

ipcMain.handle('get-identity', () => IDENTITY);

ipcMain.handle('send-ticket', async (_event, ticket) => {
  try {
    const ticketId = `KH-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: ticketId,
      agent_id: IDENTITY.agentId,
      agent_name: IDENTITY.name,
      title: ticket.title || 'Support Request',
      description: ticket.description || '',
      admin_status: 'pending',
      admin_note: '',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(newTicket)
      .select()
      .single();

    if (error) throw error;

    // Broadcast ticket creation to listening admin dashboards
    sendBroadcast('ticket-created', { ticket: {
      id: data.id,
      agentId: data.agent_id,
      agentName: data.agent_name,
      title: data.title,
      description: data.description,
      adminStatus: data.admin_status,
      adminNote: data.admin_note,
      createdAt: new Date(data.created_at).getTime(),
      forwardedAt: new Date(data.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }});

    return {
      id: data.id,
      agentId: data.agent_id,
      agentName: data.agent_name,
      title: data.title,
      description: data.description,
      adminStatus: data.admin_status,
      adminNote: data.admin_note,
      createdAt: new Date(data.created_at).getTime(),
      forwardedAt: new Date(data.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.error('[IPC] send-ticket failed:', err.message);
    return null;
  }
});

ipcMain.handle('send-agent-message', (_event, text) => {
  sendBroadcast('agent-message', {
    agentId: IDENTITY.agentId,
    name: IDENTITY.name,
    text,
    timestamp: new Date().toLocaleTimeString()
  });
  return true;
});

ipcMain.handle('get-connection-status', () => {
  return telemetryChannel && telemetryChannel.state === 'joined';
});

ipcMain.handle('webrtc-signal-out', (_event, payload) => {
  sendBroadcast(payload.type, { ...payload, agentId: IDENTITY.agentId });
  return true;
});

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  connectSupabase();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
