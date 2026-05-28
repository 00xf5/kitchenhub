import React, { useState, useEffect } from 'react';
import { Clock, WifiOff, ChevronRight } from 'lucide-react';

const STATUS = {
  active:  { label: 'Active',  dot: '#22c55e', color: '#22c55e'  },
  idle:    { label: 'Idle',    dot: '#f59e0b', color: '#f59e0b'  },
  offline: { label: 'Offline', dot: '#3a3d48', color: '#4b5060'  },
};

export default function AgentTable({ agents, onSelectAgent }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gridTemplate = isMobile ? '2fr 1.2fr 0.8fr 32px' : '2fr 1fr 1fr 1fr 1fr 1fr 32px';

  return (
    <div style={{ background: '#16181f', border: '1px solid #23262f', borderRadius: 8, overflow: 'hidden' }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        padding: '9px 16px',
        borderBottom: '1px solid #23262f',
        fontSize: 11,
        fontWeight: 600,
        color: '#4b5060',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: '#13151b',
      }}>
        <span>Agent</span>
        <span>Status</span>
        {!isMobile && <span>Shift</span>}
        <span>Open</span>
        {!isMobile && <span>Resolved</span>}
        {!isMobile && <span>Last Seen</span>}
        <span></span>
      </div>

      {/* Rows */}
      {agents.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#4b5060', fontSize: 13 }}>
          No agents match the current filter.
        </div>
      ) : (
        agents.map((agent, i) => {
          const st = STATUS[agent.status] || STATUS.offline;
          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                padding: '11px 16px',
                borderBottom: i < agents.length - 1 ? '1px solid #1e2028' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1c25'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Agent name + ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: agent.status === 'offline' ? '#1e2028' : '#272a38',
                  color: agent.status === 'offline' ? '#4b5060' : '#818cf8',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {agent.avatar}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#c5c8d6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: '#4b5060', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.id}</div>
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: st.dot, flexShrink: 0,
                  boxShadow: agent.status === 'active' ? `0 0 0 2px rgba(34,197,94,0.15)` : 'none',
                }} />
                <span style={{ fontSize: 12, color: st.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.label}</span>
                {agent.status === 'idle' && !isMobile && (
                  <span style={{ fontSize: 10, color: '#6b7080' }}>{agent.idleMinutes}m</span>
                )}
              </div>

              {/* Shift */}
              {!isMobile && (
                <span style={{ fontSize: 12, color: '#6b7080' }}>{agent.shift.split('–')[0].trim()}</span>
              )}

              {/* Open tickets */}
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: agent.ticketsOpen > 5 ? '#ef4444' : agent.ticketsOpen > 3 ? '#f59e0b' : '#c5c8d6',
              }}>
                {agent.ticketsOpen}
              </span>

              {/* Resolved */}
              {!isMobile && (
                <span style={{ fontSize: 12, color: '#6b7080' }}>{agent.ticketsResolved}</span>
              )}

              {/* Last seen */}
              {!isMobile && (
                <span style={{ fontSize: 11, color: '#4b5060' }}>{agent.lastSeen}</span>
              )}

              {/* Arrow */}
              <ChevronRight size={13} color="#3a3d48" style={{ justifySelf: 'end' }} />
            </div>
          );
        })
      )}
    </div>
  );
}
