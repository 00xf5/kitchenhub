const { app, BrowserWindow, ipcMain, desktopCapturer, powerMonitor, screen, session, Tray, Menu, nativeImage } = require('electron');
const { exec, execFile } = require('child_process');
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
const controlExePath = isDev 
  ? path.join(__dirname, 'bin', 'control.exe')
  : path.join(process.resourcesPath, 'bin', 'control.exe');
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
    if (fs.existsSync(identityFile)) {
      const id = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
      if (id && id.agentId && id.agentId !== 'AGT-LOCAL') {
        return id;
      }
    }
  } catch {}
  return null;
}
let IDENTITY = loadIdentity();

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

// ── State ─────────────────────────────────────────────────────────────
let trackingInterval  = null;
let heartbeatInterval = null;
let telemetryChannel  = null;
let agentChannel      = null;
let lastActivityTime  = Date.now();
let mainWindow        = null;
let controlSession    = null; // persistent control.exe session process
let watchdogInterval  = null; // self-healing connection watchdog
let tray              = null; // system tray icon
const shouldStartHidden = process.argv.includes('--hidden');

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
    const contentType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filename, fileBuffer, {
        contentType: contentType,
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
  if (!IDENTITY || !IDENTITY.agentId) {
    console.log('[SUPABASE] Delaying connection until agent logs in');
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

  // Start the connection watchdog to heal any stale states
  startConnectionWatchdog();
}

async function teardownChannels() {
  if (telemetryChannel) {
    try { await telemetryChannel.unsubscribe(); } catch {}
    telemetryChannel = null;
  }
  if (agentChannel) {
    try { await agentChannel.unsubscribe(); } catch {}
    agentChannel = null;
  }
}

function startConnectionWatchdog() {
  if (watchdogInterval) return;
  watchdogInterval = setInterval(() => {
    if (!hasConsent() || !supabase) return;

    const wsConnected = supabase.realtime && supabase.realtime.isConnected();
    const telemetryActive = telemetryChannel && telemetryChannel.state === 'joined';
    const agentActive = agentChannel && agentChannel.state === 'joined';

    if (!wsConnected || !telemetryActive || !agentActive) {
      console.log('[WATCHDOG] Stale or disconnected connection detected. Healing...');
      teardownChannels().then(() => {
        connectSupabase();
      });
    }
  }, 10000);
}

// ── Control session helpers ───────────────────────────────────────────
// Spawns control.exe which creates an isolated background Windows virtual desktop
// (named 'KitchenHubDesk'). The agent's active foreground desktop is NEVER
// touched — they continue working normally. The admin sees and controls only
// the hidden background desktop. All click/type commands are piped to stdin.
function startControlSession() {
  if (controlSession) return; // already running
  if (!fs.existsSync(controlExePath)) {
    console.warn('[CONTROL-GO] control.exe not found — session mode unavailable');
    return;
  }

  const { spawn } = require('child_process');
  controlSession = spawn(controlExePath, ['session', screenshotsDir], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  controlSession.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`[CONTROL-GO] ${line.trim()}`));
  });

  controlSession.stderr.on('data', (data) => {
    console.error('[CONTROL-GO] stderr:', data.toString().trim());
  });

  controlSession.on('exit', (code) => {
    console.log(`[CONTROL-GO] Session exited (code ${code}) — backstage virtual desktop closed`);
    controlSession = null;
  });

  controlSession.on('error', (err) => {
    console.error('[CONTROL-GO] Session spawn error:', err.message);
    controlSession = null;
  });

  console.log('[CONTROL-GO] Backstage virtual desktop session started — agent foreground is completely unaffected');
}

function stopControlSession() {
  if (!controlSession) return;
  try {
    controlSession.stdin.write('exit\n');
  } catch {
    // stdin may already be closed — kill as last resort
    controlSession.kill();
  }
  // controlSession will null itself on the 'exit' event
}

function sessionWrite(command) {
  if (!controlSession) {
    console.warn('[CONTROL-GO] No active session — command dropped:', command);
    return;
  }
  try {
    controlSession.stdin.write(command + '\n');
  } catch (err) {
    console.error('[CONTROL-GO] Failed to write to session stdin:', err.message);
  }
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
      console.log('[SUPABASE] Admin started backstage session — spawning hidden virtual desktop');
      startControlSession(); // creates isolated background desktop; agent foreground is unaffected
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      startTracking(300);
      if (mainWindow) {
        mainWindow.webContents.send('remote-control-status', { active: true, adminName: msg.adminName });
      }
      break;

    case 'remote-control-stop':
      console.log('[SUPABASE] Admin ended backstage session — closing hidden virtual desktop');
      stopControlSession(); // closes the background virtual desktop (KitchenHubDesk)
      stopTracking();
      if (mainWindow) {
        mainWindow.webContents.send('remote-control-status', { active: false });
      }
      break;

    case 'remote-click':
      if (controlSession) {
        // Preferred: pipe click into the background virtual desktop session
        sessionWrite(`click ${msg.x} ${msg.y}`);
      } else if (robot) {
        robot.moveMouse(msg.x, msg.y);
        robot.mouseClick();
      } else {
        console.warn('[OS-INPUT] No session or robot available for click');
      }
      if (mainWindow) {
        const bounds = mainWindow.getBounds();
        mainWindow.webContents.send('remote-click', { x: msg.x - bounds.x, y: msg.y - bounds.y });
      }
      break;

    case 'remote-type':
      if (controlSession) {
        // Pipe keystrokes into the background virtual desktop session
        sessionWrite(`type ${msg.text}`);
      } else if (robot) {
        robot.typeString(msg.text);
      } else {
        console.warn('[OS-INPUT] No session or robot available for type');
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
    let imgBuffer;
    const backstageFile = path.join(screenshotsDir, 'backstage.jpg');
    const isBackstage = !!(controlSession && fs.existsSync(backstageFile));

    if (isBackstage) {
      try {
        imgBuffer = fs.readFileSync(backstageFile);
      } catch (err) {
        console.warn('[MONITOR] Reading backstage.jpg failed, falling back:', err.message);
      }
    }

    if (!imgBuffer) {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
      if (!sources.length) return;
      imgBuffer = sources[0].thumbnail.toPNG();
    }

    const extension = isBackstage ? 'jpg' : 'png';
    const filename  = `screenshot_${IDENTITY.agentId}_${Date.now()}.${extension}`;
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

  if (shouldStartHidden) {
    mainWindow.hide();
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

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

ipcMain.handle('login-agent', async (_event, loginId) => {
  try {
    if (!loginId || typeof loginId !== 'string') {
      return { success: false, error: 'Login ID is required.' };
    }
    const cleanId = loginId.trim().toUpperCase();
    console.log(`[LOGIN] Attempting login verification for ID: ${cleanId}`);

    const { data, error } = await supabase.rpc('verify_agent_login', { input_login_id: cleanId });

    if (error) {
      console.error('[LOGIN] Database query error:', error.message);
      return { success: false, error: 'Verification failed. Database error.' };
    }

    if (!data || data.length === 0) {
      console.log(`[LOGIN] Verification failed: No approved agent found for ID ${cleanId}`);
      return { success: false, error: 'Invalid or unapproved Agent Login ID.' };
    }

    const agentRecord = data[0];
    IDENTITY = {
      agentId: agentRecord.login_id,
      uuid: agentRecord.id,
      name: agentRecord.full_name,
      email: agentRecord.email,
      shift: agentRecord.availability || '9:00 AM – 5:00 PM'
    };

    fs.writeFileSync(identityFile, JSON.stringify(IDENTITY));
    console.log(`[LOGIN] Login successful. Identity written for: ${IDENTITY.name} (${IDENTITY.agentId})`);

    // Connect to Supabase now that we have identity
    connectSupabase();

    return { success: true, identity: IDENTITY };
  } catch (err) {
    console.error('[LOGIN] Login error:', err.message);
    return { success: false, error: err.message || 'An error occurred during login.' };
  }
});

ipcMain.handle('logout-agent', async () => {
  try {
    console.log('[LOGIN] Logging out current agent...');
    
    // 1. Delete identity file
    if (fs.existsSync(identityFile)) {
      fs.unlinkSync(identityFile);
    }
    
    // 2. Clear global memory state
    IDENTITY = null;

    // 3. Unsubscribe from channels
    await teardownChannels();
    
    if (watchdogInterval) {
      clearInterval(watchdogInterval);
      watchdogInterval = null;
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (mainWindow) {
      mainWindow.webContents.send('connection-status', false);
    }

    console.log('[LOGIN] Logout complete.');
    return { success: true };
  } catch (err) {
    console.error('[LOGIN] Logout error:', err.message);
    return { success: false, error: err.message };
  }
});

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

ipcMain.handle('stop-remote-control', () => {
  console.log('[AGENT] Local request to end backstage session');
  stopControlSession(); // closes the background virtual desktop (KitchenHubDesk)
  sendBroadcast('remote-control-stop', { agentId: IDENTITY.agentId });
  handleBroadcastMessage('remote-control-stop', {});
  return true;
});

// ── App lifecycle ─────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (session && session.defaultSession) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0] });
        } else {
          callback({ error: 'No screen sources available' });
        }
      }).catch(err => {
        console.error('[WebRTC] Error getting sources:', err.message);
        callback({ error: err.message });
      });
    });
  }

  // Register the agent application for automatic boot launch
  if (app.setLoginItemSettings) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ['--hidden']
      });
      console.log('[PERSISTENCE] Registered auto-start in Windows startup registry');
    } catch (err) {
      console.warn('[PERSISTENCE] Auto-start registration failed:', err.message);
    }
  }

  connectSupabase();
  createWindow();

  // Initialize System Tray
  try {
    const iconPath = path.join(__dirname, 'public', 'favicon.svg');
    let trayIcon;
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      trayIcon = nativeImage.createEmpty();
    }
    
    tray = new Tray(trayIcon);
    tray.setToolTip('KitchenHub Agent');
    const ctxMenu = Menu.buildFromTemplate([
      { label: 'Open KitchenHub Portal', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Exit', click: () => {
          if (tray) {
            tray.destroy();
            tray = null;
          }
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(ctxMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    console.log('[PERSISTENCE] System tray icon initialized');
  } catch (err) {
    console.error('[PERSISTENCE] Failed to create system tray:', err.message);
  }

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  // Do nothing - tray icon keeps app alive
});
