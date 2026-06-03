# Render Deployment Guide for Agent Backend

## Architecture
- **agent-backend**: Render (Go web service)
- **admin-dashboard**: Vercel
- **agent-web-portal**: Vercel
- **agent-portal**: Distributed exe (local desktop application)

## Deployment Steps

### 1. Push to GitHub
Ensure the agent-backend directory is in a Git repository and pushed to GitHub.

### 2. Connect to Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `agent-backend` directory (or root if monorepo)
5. Render will auto-detect Go from `render.yaml`

### 3. Configure Environment Variables
In Render dashboard, set these environment variables:

**Required:**
- `AGENT_ID` - Your agent ID (e.g., BSK-AG-41139)
- `AGENT_NAME` - Agent display name
- `AGENT_EMAIL` - Agent contact email
- `SUPABASE_URL` - Your Supabase project URL (for WebRTC signaling)
- `SUPABASE_ANON_KEY` - Your Supabase anon key

**Optional:**
- `BACKEND_PORT` - Server port (default: 3000)

### 4. Deploy
Render will automatically:
- Build: `go build -o agent-backend .`
- Start: `./agent-backend`
- Expose on port 3000 (or custom BACKEND_PORT)

## Endpoints
- `GET /status` - Agent status endpoint
- `GET /screenshot` - Static screenshot endpoint
- `WS /ws/video` - WebSocket video stream with remote input

## Notes
- The agent-backend does NOT need screen capture (control.exe) when deployed to Render
- Screen capture is handled by the local agent-portal exe
- Render backend acts as signaling/proxy for WebRTC connections
