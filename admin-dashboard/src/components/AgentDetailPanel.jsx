import React, { useState } from 'react';
import { X, Calendar, Clock, Inbox, CheckCircle, ArrowUpRight, Mail, Phone, Monitor, Camera, Send } from 'lucide-react';

const STATUS = {
  active:  { label: 'Active',  bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', dot: '#22c55e' },
  idle:    { label: 'Idle',    bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', dot: '#f59e0b' },
  offline: { label: 'Offline', bg: 'rgba(75,80,96,0.15)',  color: '#4b5060', dot: '#3a3d48' },
};

export default function AgentDetailPanel({ 
  agent, 
  messages = [], 
  onClose, 
  onMessage, 
  onTriggerScreenshot, 
  onStartTakeover, 
  onStopTakeover, 
  isTakeoverActive,
  messageStatus = 'idle',
  screenshotStatus = 'idle'
}) {
  const st = STATUS[agent.status] || STATUS.offline;
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = () => {
    if (!messageText.trim() || messageStatus === 'sending') return;
    onMessage?.(agent.id, messageText.trim());
    setMessageText('');
  };

  const handleTrigger = () => {
    if (screenshotStatus === 'capturing') return;
    onTriggerScreenshot?.(agent.id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 400, height: '100%', background: '#16181f', borderLeft: '1px solid #23262f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #23262f', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#272a38', color: '#818cf8', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {agent.avatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e4e9' }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: '#4b5060' }}>{agent.email} · {agent.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
              {st.label}
            </span>
            <button onClick={onClose}
              style={{ background: 'none', border: '1px solid #23262f', borderRadius: 6, padding: '5px 6px', cursor: 'pointer', color: '#4b5060', display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#c5c8d6'; e.currentTarget.style.borderColor = '#3a3d48'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4b5060'; e.currentTarget.style.borderColor = '#23262f'; }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { icon: Calendar, label: 'Shift',     value: agent.shift    || '—' },
              { icon: Clock,    label: 'Last Seen',  value: agent.lastSeen || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ background: '#1a1c25', border: '1px solid #23262f', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Icon size={11} color="#4b5060" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#c5c8d6' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Ticket stats */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Ticket Load</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { icon: Inbox,       label: 'Open',     value: agent.ticketsOpen      ?? 0, color: '#f59e0b' },
                { icon: CheckCircle, label: 'Resolved', value: agent.ticketsResolved  ?? 0, color: '#22c55e' },
                { icon: ArrowUpRight,label: 'Escalated',value: agent.ticketsForwarded ?? 0, color: '#818cf8' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ background: '#1a1c25', border: '1px solid #23262f', borderRadius: 7, padding: '10px', textAlign: 'center' }}>
                  <Icon size={14} color={color} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e4e9', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#4b5060', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot timeline */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Camera size={12} color="#4b5060" />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Screen Timeline</span>
            </div>
            {(!agent.screenshots || agent.screenshots.length === 0) ? (
              <div style={{ background: '#1a1c25', border: '1px solid #23262f', borderRadius: 7, padding: '20px', textAlign: 'center', color: '#4b5060', fontSize: 12 }}>
                No screenshots yet
              </div>
            ) : (
              <div>
                {/* Latest screenshot thumbnail */}
                {agent.screenshots[0]?.url && (
                  <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #23262f' }}>
                    <img
                      src={agent.screenshots[0].url}
                      alt="Latest screenshot"
                      style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div style={{ padding: '6px 10px', background: '#13151b', fontSize: 10, color: '#4b5060', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6366f1' }}>Latest capture</span>
                      <span style={{ fontFamily: 'monospace' }}>{agent.screenshots[0].time}</span>
                    </div>
                  </div>
                )}

                {/* Timeline list */}
                {agent.screenshots.map((shot, idx) => (
                  <div key={shot.id || idx} style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: idx === 0 ? '#6366f1' : '#23262f', border: `1.5px solid ${idx === 0 ? '#818cf8' : '#3a3d48'}`, flexShrink: 0 }} />
                      {idx < agent.screenshots.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 28, background: '#23262f' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 10 }}>
                      <div style={{ background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: '#c5c8d6' }}>{shot.label || 'Screen captured'}</div>
                        <div style={{ fontSize: 10, color: '#4b5060', fontFamily: 'monospace', flexShrink: 0, marginLeft: 8 }}>{shot.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send message */}
          {agent.status !== 'offline' && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Message Agent</div>
              
              {/* Message thread scroll view */}
              <div style={{ maxHeight: 120, overflowY: 'auto', background: '#13151b', border: '1px solid #23262f', borderRadius: 6, padding: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.length === 0 ? (
                  <span style={{ fontSize: 10, color: '#4b5060', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>No message history.</span>
                ) : (
                  messages.map((m, idx) => {
                    const isAdm = m.sender === 'admin';
                    return (
                      <div key={idx} style={{ alignSelf: isAdm ? 'flex-end' : 'flex-start', maxWidth: '85%', textAlign: 'left' }}>
                        <div style={{ background: isAdm ? '#1e2130' : '#1a1c25', border: `1px solid ${isAdm ? '#2b2e40' : '#23262f'}`, borderRadius: 6, padding: '5px 8px', fontSize: 11 }}>
                          <div style={{ fontSize: 8, color: isAdm ? '#818cf8' : '#8b8fa8', fontWeight: 600, marginBottom: 1 }}>{isAdm ? 'You' : 'Agent'}</div>
                          <div style={{ color: '#c5c8d6', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message…"
                  disabled={messageStatus === 'sending'}
                  style={{ flex: 1, padding: '7px 10px', background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, color: '#c5c8d6', fontSize: 12, outline: 'none' }}
                />
                <button onClick={handleSendMessage}
                  disabled={messageStatus === 'sending' || !messageText.trim()}
                  style={{ padding: '7px 10px', background: messageStatus === 'sent' ? '#166534' : messageStatus === 'sending' ? '#1e293b' : '#4f46e5', border: 'none', borderRadius: 6, color: '#fff', cursor: messageStatus === 'sending' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                  {messageStatus === 'sent' ? <CheckCircle size={13} /> : <Send size={13} />}
                  {messageStatus === 'sent' ? 'Sent' : messageStatus === 'sending' ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {agent.status !== 'offline' && (
          <div style={{ borderTop: '1px solid #23262f', padding: '12px 18px', display: 'flex', gap: 8 }}>
            <button onClick={handleTrigger}
              disabled={screenshotStatus === 'capturing'}
              style={{ flex: 1, padding: '8px', background: '#1a1c25', border: `1px solid ${screenshotStatus === 'capturing' ? '#6366f1' : screenshotStatus === 'sent' ? '#22c55e' : '#23262f'}`, borderRadius: 7, color: screenshotStatus === 'capturing' ? '#818cf8' : screenshotStatus === 'sent' ? '#22c55e' : '#8b8fa8', fontSize: 12, fontWeight: 600, cursor: screenshotStatus === 'capturing' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Camera size={13} />
              {screenshotStatus === 'capturing' ? 'Capturing…' : screenshotStatus === 'sent' ? 'Triggered!' : 'Capture Screen'}
            </button>
            <button onClick={() => onStartTakeover?.(agent.id)}
              style={{ flex: 1, padding: '8px', background: '#4f46e5', border: '1px solid #4f46e5', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}>
              <Monitor size={13} /> Takeover Control
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
