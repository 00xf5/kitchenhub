# Agent Portal - Quick Start Guide

## Architecture

**Go Backend** (`agent-backend/`)
- Handles all WebRTC logic (answering offers, sending ICE candidates)
- Captures virtual desktop via `control.exe`
- Streams frames to Electron clients via WebSocket
- Receives input (mouse/keyboard) from clients
- Runs on `localhost:3000`

**Electron Client** (`agent-portal/`)
- Displays video stream on HTML5 canvas
- Captures mouse/keyboard events and sends to backend
- No WebRTC complexity - just display + input forwarding
- Connects to backend via WebSocket

## Build & Run

### 1. Build Go Backend

```bash
cd agent-backend
go mod tidy
go build -o agent-backend.exe
```

### 2. Start Go Backend

```bash
cd agent-backend
./agent-backend.exe
```

Expected output:
```
[BACKEND] Starting for agent: BSK-AG-41139
[HTTP] Server listening on :3000
```

### 3. Start Electron Client

In a new terminal:

```bash
cd agent-portal
npm install
npm run dev
```

or to run the built app:

```bash
npm start
```

## Testing

### Manual Frame Streaming

```bash
# In PowerShell, get a frame from the backend
$response = Invoke-WebRequest -Uri "http://localhost:3000/screenshot"
```

### WebSocket Connection Test

```bash
# Connect to WebSocket and receive frames
# The Electron app does this automatically
```

### WebRTC Offer Injection (Testing)

```bash
# Post a WebRTC offer to the backend
$offer = @{
    sdp = "v=0`no=- 0 0 IN IP4 127.0.0.1`ns=`nt=0 0`na=group:BUNDLE 0`na=extmap-allow-mixed`na=msid-semantic: WMS screen`nm=application 9 UDP/TLS/RTP/SAVPB 120 124 123 119`nc=IN IP4 0.0.0.0`na=rtcp:9 IN IP4 0.0.0.0`na=rtcp-mux`na=rtcp-rsize`na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00`na=setup:actpass`na=mid:0`na=sendonly`na=rtpmap:120 VP8/90000`na=rtpmap:124 rtx/90000`na=fmtp:124 apt=120`na=rtpmap:123 H264/90000`na=rtpmap:119 rtx/90000`na=fmtp:119 apt=123`na=ice-ufrag:test`na=ice-pwd:testtesttesttesttesttesttes"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/webrtc/offer" -Method POST -ContentType "application/json" -Body $offer
```

## Troubleshooting

### Backend won't start

- Check if port 3000 is in use: `netstat -ano | findstr :3000`
- Check if `control.exe` is accessible at `agent-portal/bin/control.exe`
- Set environment variables:
  ```bash
  $env:AGENT_ID="BSK-AG-41139"
  $env:AGENT_NAME="Kitchen Agent"
  ```

### Electron won't connect

- Verify backend is running on port 3000
- Check browser console for WebSocket errors
- Ensure preload.cjs is properly configured

### No frames appearing

- Check if `backstage.jpg` exists in temp directory
- Verify `control.exe` session is running
- Check backend logs for frame encoding errors

## Environment Variables

Create a `.env` file in `agent-backend/`:

```env
AGENT_ID=BSK-AG-41139
AGENT_NAME=Kitchen Agent
AGENT_EMAIL=agent@kitchen.local
```

## Next Steps

1. **Implement Supabase Realtime** - Add listener for WebRTC offers from admin
2. **Handle Remote Input** - Pipe keyboard/mouse events to control.go
3. **Add Error Recovery** - Reconnection logic for broken WebSocket
4. **Production Deployment** - Package Electron + Go backend together
