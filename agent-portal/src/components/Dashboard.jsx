import React, { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws/video');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Electron] Connected to backend');
      setStatus('Connected');
      // Focus canvas for keyboard input
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'frame' && msg.data) {
          renderFrame(msg.data);
        }
      } catch (err) {
        console.warn('[Electron] Frame decode error:', err.message);
      }
    };

    ws.onerror = (err) => {
      console.error('[Electron] WebSocket error:', err);
      setStatus('Connection error');
    };

    ws.onclose = () => {
      console.log('[Electron] Disconnected from backend');
      setStatus('Disconnected');
    };

    return () => ws.close();
  }, []);

  // ── Render Frame to Canvas ────────────────────────────────
  const renderFrame = (base64Data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      if (!isStreaming) setIsStreaming(true);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  };

  // ── Mouse/Keyboard Events ────────────────────────────────
  const sendInput = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    sendInput({ type: 'mouse_move', x, y });
  };

  const handleMouseDown = (e) => {
    const buttons = ['left', 'middle', 'right'];
    sendInput({ type: 'mouse_down', button: buttons[e.button] || 'left' });
  };

  const handleMouseUp = (e) => {
    const buttons = ['left', 'middle', 'right'];
    sendInput({ type: 'mouse_up', button: buttons[e.button] || 'left' });
  };

  const handleKeyDown = (e) => {
    sendInput({ type: 'key_down', key: e.key, code: e.code });
  };

  const handleKeyUp = (e) => {
    sendInput({ type: 'key_up', key: e.key, code: e.code });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', fontFamily: 'Arial' }}>
      {/* Header */}
      <div style={{ padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Agent Remote Control</h2>
          <p style={{ margin: 0, fontSize: '12px', color: isStreaming ? '#4caf50' : '#ff9800' }}>
            Status: {status}
          </p>
        </div>
      </div>

      {/* Video Canvas */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#000' }}>
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          tabIndex={0}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            cursor: 'crosshair',
            background: '#1a1a1a',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: '10px', background: '#1a1a1a', borderTop: '1px solid #333', fontSize: '12px', color: '#aaa' }}>
        {isStreaming ? '✓ Receiving stream' : '⏳ Waiting for stream...'}
      </div>
    </div>
  );
}
