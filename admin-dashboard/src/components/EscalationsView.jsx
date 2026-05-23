import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const PRIORITY = {
  high:   { label: 'High',   bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  medium: { label: 'Medium', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
  low:    { label: 'Low',    bg: 'rgba(75,80,96,0.15)',   color: '#4b5060' },
};

const STATUS = {
  pending:  { label: 'Pending',  icon: Clock,        color: '#f59e0b' },
  approved: { label: 'Approved', icon: CheckCircle,  color: '#22c55e' },
  rejected: { label: 'Declined', icon: XCircle,      color: '#ef4444' },
};

function TicketRow({ ticket, onUpdateStatus }) {
  const [open, setOpen]   = useState(false);
  const [note, setNote]   = useState(ticket.adminNote);
  const pr  = PRIORITY[ticket.priority];
  const st  = STATUS[ticket.adminStatus];
  const Icon = st.icon;

  return (
    <div style={{ borderBottom: '1px solid #1e2028' }}>
      {/* Row */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 20px', alignItems: 'center', padding: '11px 16px', cursor: 'pointer', gap: 12 }}
        onMouseEnter={e => e.currentTarget.style.background = '#1a1c25'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

        {/* ID */}
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#4b5060', fontWeight: 600 }}>{ticket.id}</span>

        {/* Subject */}
        <div>
          <div style={{ fontSize: 13, color: '#c5c8d6', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.subject}</div>
          <div style={{ fontSize: 11, color: '#4b5060', marginTop: 1 }}>{ticket.customer} · by {ticket.agentName}</div>
        </div>

        {/* Priority */}
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: pr.bg, color: pr.color, width: 'fit-content' }}>{pr.label}</span>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={12} color={st.color} />
          <span style={{ fontSize: 12, color: st.color }}>{st.label}</span>
        </div>

        {/* Time */}
        <span style={{ fontSize: 11, color: '#4b5060' }}>{ticket.forwardedAt}</span>

        {open ? <ChevronUp size={13} color="#4b5060" /> : <ChevronDown size={13} color="#4b5060" />}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #1e2028', background: '#13151b' }}>
          {/* Order + Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 0 12px' }}>
            <div style={{ background: '#16181f', border: '1px solid #23262f', borderRadius: 7, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Customer</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#c5c8d6' }}>{ticket.customer}</div>
              <div style={{ fontSize: 11, color: '#4b5060', marginTop: 2 }}>{ticket.email}</div>
            </div>
            <div style={{ background: '#16181f', border: '1px solid #23262f', borderRadius: 7, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Order</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#c5c8d6' }}>{ticket.order.product}</div>
              <div style={{ fontSize: 11, color: '#4b5060', marginTop: 2 }}>{ticket.order.id} · <span style={{ color: '#818cf8', fontWeight: 600 }}>{ticket.order.price}</span></div>
            </div>
          </div>

          {/* Agent notes */}
          <div style={{ background: '#1a1523', border: '1px solid #2d1f40', borderRadius: 7, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Agent Notes</div>
            <div style={{ fontSize: 12, color: '#a89dc5', fontStyle: 'italic', lineHeight: 1.6 }}>"{ticket.agentNotes}"</div>
          </div>

          {/* Action area */}
          {ticket.adminStatus === 'pending' ? (
            <div>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Add an admin note before actioning…"
                style={{ width: '100%', padding: '8px 10px', background: '#1a1c25', border: '1px solid #23262f', borderRadius: 7, color: '#c5c8d6', fontSize: 12, resize: 'none', outline: 'none', marginBottom: 10, fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onUpdateStatus(ticket.id, 'approved', note)}
                  style={{ padding: '7px 16px', background: '#166534', border: '1px solid #15803d', borderRadius: 7, color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={12} /> Approve
                </button>
                <button onClick={() => onUpdateStatus(ticket.id, 'rejected', note)}
                  style={{ padding: '7px 16px', background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 7, color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <XCircle size={12} /> Decline
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#1a1c25', border: '1px solid #23262f', borderRadius: 7, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon size={13} color={st.color} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{st.label}</div>
                <div style={{ fontSize: 12, color: '#8b8fa8', fontStyle: 'italic' }}>"{note || 'No note provided.'}"</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EscalationsView({ tickets, onUpdateStatus }) {
  const pending  = tickets.filter(t => t.adminStatus === 'pending');
  const resolved = tickets.filter(t => t.adminStatus !== 'pending');

  return (
    <div>
      {/* Pending */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Clock size={13} color="#f59e0b" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pending Review ({pending.length})</span>
        </div>
        <div style={{ background: '#16181f', border: '1px solid #23262f', borderRadius: 8, overflow: 'hidden' }}>
          {/* Table head */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 20px', padding: '8px 16px', gap: 12, background: '#13151b', borderBottom: '1px solid #23262f' }}>
            {['Ticket', 'Subject', 'Priority', 'Status', 'Received', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          {pending.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#4b5060', fontSize: 12 }}>
              <CheckCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              All clear — no pending escalations.
            </div>
          ) : pending.map(t => <TicketRow key={t.id} ticket={t} onUpdateStatus={onUpdateStatus} />)}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <CheckCircle size={13} color="#22c55e" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actioned ({resolved.length})</span>
          </div>
          <div style={{ background: '#16181f', border: '1px solid #23262f', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 20px', padding: '8px 16px', gap: 12, background: '#13151b', borderBottom: '1px solid #23262f' }}>
              {['Ticket', 'Subject', 'Priority', 'Status', 'Received', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {resolved.map(t => <TicketRow key={t.id} ticket={t} onUpdateStatus={onUpdateStatus} />)}
          </div>
        </div>
      )}
    </div>
  );
}
