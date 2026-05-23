import React from 'react';
import { Users, Inbox, CheckCircle, ShieldAlert } from 'lucide-react';

export default function StatsBar({ agents, tickets }) {
  const online     = agents.filter(a => a.status !== 'offline').length;
  const active     = agents.filter(a => a.status === 'active').length;
  const idle       = agents.filter(a => a.status === 'idle').length;
  const totalOpen  = agents.reduce((s, a) => s + a.ticketsOpen, 0);
  const totalDone  = agents.reduce((s, a) => s + a.ticketsResolved, 0);
  const pending    = tickets.filter(t => t.adminStatus === 'pending').length;

  const cards = [
    { label: 'Agents Online',       value: online,    sub: `${active} active · ${idle} idle`, icon: Users,       accent: '#6366f1' },
    { label: 'Open Tickets',        value: totalOpen,  sub: 'Across all agents',               icon: Inbox,       accent: '#f59e0b' },
    { label: 'Resolved Today',      value: totalDone,  sub: 'Combined team total',             icon: CheckCircle, accent: '#22c55e' },
    { label: 'Pending Escalations', value: pending,    sub: 'Awaiting admin action',           icon: ShieldAlert, accent: '#ef4444' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} style={{
            background: '#16181f',
            border: '1px solid #23262f',
            borderRadius: 8,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${c.accent}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16} color={c.accent} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e4e9', lineHeight: 1.1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#6b7080', marginTop: 1 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: '#3a3d48', marginTop: 2 }}>{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
