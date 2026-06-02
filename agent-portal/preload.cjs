const { contextBridge } = require('electron');

// STUPID SIMPLE preload: no WebRTC complexity, no IPC chains
// Renderer connects directly to Go backend via WebSocket
contextBridge.exposeInMainWorld('electronAPI', {
  // Minimal: Backend URL
  getBackendURL: () => process.env.BACKEND_URL || 'http://localhost:3000',
});
