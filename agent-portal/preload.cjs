const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Consent
  getConsentStatus: ()       => ipcRenderer.invoke('get-consent-status'),
  acceptConsent:    ()       => ipcRenderer.invoke('accept-consent'),
  resetConsent:     ()       => ipcRenderer.invoke('reset-consent'),
  stopRemoteControl: ()      => ipcRenderer.invoke('stop-remote-control'),

  // Identity
  getIdentity: ()            => ipcRenderer.invoke('get-identity'),
  loginAgent: (loginId)      => ipcRenderer.invoke('login-agent', loginId),
  logoutAgent: ()            => ipcRenderer.invoke('logout-agent'),

  // Tickets
  sendTicket: (ticket)       => ipcRenderer.invoke('send-ticket', ticket),

  // Chat
  sendAgentMessage: (text)   => ipcRenderer.invoke('send-agent-message', text),
  getConnectionStatus: ()    => ipcRenderer.invoke('get-connection-status'),

  // ── WebRTC Signaling bridge (renderer ↔ main ↔ WS server) ───────────
  // Renderer calls this to send an answer or ICE candidate back to server
  sendWebRTCSignal: (payload) => ipcRenderer.invoke('webrtc-signal-out', payload),

  // Listeners (main → renderer)
  onScreenshotNotification: (cb) => {
    ipcRenderer.on('screenshot-captured-notification', (_e, data) => cb(data));
  },
  onAdminMessage: (cb) => {
    ipcRenderer.on('admin-message', (_e, data) => cb(data));
  },
  onTicketActioned: (cb) => {
    ipcRenderer.on('ticket-actioned', (_e, data) => cb(data));
  },
  onRemoteControlStatus: (cb) => {
    ipcRenderer.on('remote-control-status', (_e, data) => cb(data));
  },
  onRemoteClick: (cb) => {
    ipcRenderer.on('remote-click', (_e, data) => cb(data));
  },
  onRemoteType: (cb) => {
    ipcRenderer.on('remote-type', (_e, data) => cb(data));
  },
  onConnectionStatus: (cb) => {
    ipcRenderer.on('connection-status', (_e, status) => cb(status));
  },

  // WebRTC: main process forwards incoming signals (offer / ICE) to renderer
  onWebRTCSignalIn: (cb) => {
    ipcRenderer.on('webrtc-signal-in', (_e, payload) => cb(payload));
  },
});
