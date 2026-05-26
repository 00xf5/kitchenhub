import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor, ShieldAlert, Bell, Search, LogOut,
  Users, BarChart3, Settings, HelpCircle, ChevronRight,
  LayoutGrid, Menu, Wifi, WifiOff
} from 'lucide-react';
import StatsBar from './components/StatsBar';
import AgentTable from './components/AgentTable';
import AgentDetailPanel from './components/AgentDetailPanel';
import EscalationsView from './components/EscalationsView';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nxzvpcbudbqotujuuczo.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54enZwY2J1ZGJxb3R1anV1Y3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQ0MzcsImV4cCI6MjA4MzM5MDQzN30.45hqzbpj27CRlI3gRhtlS_VOIsuitYKDhEOPrpSminc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NAV = [
  { id: 'monitoring',  label: 'Monitoring',  icon: Monitor },
  { id: 'escalations', label: 'Escalations', icon: ShieldAlert, badge: true },
  { id: 'team',        label: 'Team',         icon: Users },
  { id: 'analytics',  label: 'Analytics',   icon: BarChart3 },
];

const NAV_BOTTOM = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help',     label: 'Help',     icon: HelpCircle },
];

// ── Supabase backend hook ──────────────────────────────────────────
function useSupabaseBackend({
  selectedAgentId,
  takeoverAgentId,
  onAgentsUpdate,
  onTicketCreated,
  onTicketUpdated,
  onScreenshotReady,
  onAgentMessage,
  onWebRTCAnswer,
  onWebRTCIceCandidate,
}) {
  const [connected, setConnected] = useState(true);
  const activeChannelsRef = useRef({});

  // 1. Live agent tracking via Presence
  useEffect(() => {
    const telemetryChannel = supabase.channel('kitchenhub:telemetry');

    telemetryChannel.on('presence', { event: 'sync' }, () => {
      const state = telemetryChannel.presenceState();
      const roster = Object.keys(state).map(key => {
        return state[key][state[key].length - 1];
      });
      onAgentsUpdate(roster);
    });

    telemetryChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log('[SUPABASE] Dashboard subscribed to telemetry channel');
        setConnected(true);
      } else {
        setConnected(false);
      }
    });

    return () => {
      telemetryChannel.unsubscribe();
    };
  }, [onAgentsUpdate]);

  // 2. Persistent Tickets via Postgres Changes
  useEffect(() => {
    const ticketsChannel = supabase.channel('public:tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
        const t = payload.new;
        const mapped = {
          id: t.id,
          agentId: t.agent_id,
          agentName: t.agent_name,
          title: t.title,
          description: t.description,
          adminStatus: t.admin_status,
          adminNote: t.admin_note,
          createdAt: new Date(t.created_at).getTime(),
          forwardedAt: new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        onTicketCreated(mapped);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, payload => {
        const t = payload.new;
        const mapped = {
          id: t.id,
          agentId: t.agent_id,
          agentName: t.agent_name,
          title: t.title,
          description: t.description,
          adminStatus: t.admin_status,
          adminNote: t.admin_note,
          createdAt: new Date(t.created_at).getTime(),
          forwardedAt: new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        onTicketUpdated(mapped);
      });

    ticketsChannel.subscribe();

    return () => {
      ticketsChannel.unsubscribe();
    };
  }, [onTicketCreated, onTicketUpdated]);

  // 3. Dynamic Private Channel Subscription (for selected/takeover agents)
  useEffect(() => {
    const targetId = takeoverAgentId || selectedAgentId;
    if (!targetId) return;

    const channelName = `kitchenhub:agent:${targetId}`;
    console.log(`[SUPABASE] Joining agent channel: ${channelName}`);
    
    const agentChannel = supabase.channel(channelName);

    agentChannel.on('broadcast', { event: '*' }, ({ event, payload }) => {
      console.log(`[SUPABASE] Received broadcast from agent: ${event}`, payload);
      switch (event) {
        case 'screenshot-ready':
          onScreenshotReady(payload);
          break;
        case 'agent-message':
          onAgentMessage(payload);
          break;
        case 'webrtc-answer':
          onWebRTCAnswer?.(payload);
          break;
        case 'webrtc-ice-candidate':
          onWebRTCIceCandidate?.(payload);
          break;
      }
    });

    agentChannel.subscribe();
    activeChannelsRef.current[targetId] = agentChannel;

    return () => {
      console.log(`[SUPABASE] Leaving agent channel: ${channelName}`);
      agentChannel.unsubscribe();
      delete activeChannelsRef.current[targetId];
    };
  }, [selectedAgentId, takeoverAgentId, onScreenshotReady, onAgentMessage, onWebRTCAnswer, onWebRTCIceCandidate]);

  // Direct Broadcast helper
  const send = useCallback((payload) => {
    const { type, agentId, ...rest } = payload;
    if (!agentId) return;

    let channel = activeChannelsRef.current[agentId];
    const isTemp = !channel;
    
    if (isTemp) {
      channel = supabase.channel(`kitchenhub:agent:${agentId}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: type,
            payload: rest
          }).then(() => {
            channel.unsubscribe();
          });
        }
      });
    } else {
      channel.send({
        type: 'broadcast',
        event: type,
        payload: rest
      }).catch(err => {
        console.warn('[SUPABASE] Broadcast send failed:', err.message);
      });
    }
  }, []);

  return { connected, send };
}

// ── WebRTC offer-side hook (admin dashboard) ───────────────────────────
// Initiated when the admin starts takeover of a specific agent.
function useWebRTCOffer(agentId, active, sendWS) {
  const [remoteStream, setRemoteStream] = useState(null);
  const pcRef = useRef(null);

  const teardown = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  const handleAnswer = useCallback(async (sdp) => {
    if (pcRef.current) {
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('[WebRTC] Remote description set (answer received)');
      } catch (err) {
        console.error('[WebRTC] Failed to set remote description:', err);
      }
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] ICE candidate error:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!active || !agentId) {
      teardown();
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWS({
          type: 'webrtc-ice-candidate',
          agentId,
          target: 'agent',
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      console.log('[WebRTC] Track received:', e.streams);
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] State:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        teardown();
      }
    };

    // Create a data channel to satisfy peer connection requirements if no track is immediately added
    pc.createDataChannel('ping');

    // Create and send WebRTC offer
    pc.createOffer().then(async (offer) => {
      await pc.setLocalDescription(offer);
      sendWS({
        type: 'webrtc-offer',
        agentId,
        sdp: offer,
      });
      console.log('[WebRTC] Offer sent to agent', agentId);
    }).catch(err => {
      console.error('[WebRTC] Failed to create offer:', err);
    });

    return () => teardown();
  }, [active, agentId, sendWS, teardown]);

  return { remoteStream, handleAnswer, handleIceCandidate, teardown };
}

// ── App ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]       = useState('monitoring');
  const [agents, setAgents]             = useState([]);
  const [tickets, setTickets]           = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed]       = useState(false);
  const [agentChats, setAgentChats]     = useState({});
  const [takeoverAgentId, setTakeoverAgentId] = useState(null);

  const [messageStatus, setMessageStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const [screenshotStatus, setScreenshotStatus] = useState('idle'); // 'idle' | 'capturing' | 'sent'

  // Ref to break circular dependency between WebRTC hook sending and server WS hook
  const wsSendRef = useRef(null);
  const sendWS = useCallback((payload) => {
    if (wsSendRef.current) wsSendRef.current(payload);
  }, []);

  // WebRTC offer hook
  const { remoteStream, handleAnswer, handleIceCandidate, teardown: teardownWebRTC } = useWebRTCOffer(
    takeoverAgentId,
    !!takeoverAgentId,
    sendWS
  );

  const videoRefCallback = useCallback((node) => {
    if (node && remoteStream) {
      node.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Update selectedAgent if the live agent list refreshes
  useEffect(() => {
    if (selectedAgent) {
      const fresh = agents.find(a => a.id === selectedAgent.id);
      if (fresh) setSelectedAgent(fresh);
    }
  }, [agents, selectedAgent]);

  // WebSocket callbacks
  const handleAgentsUpdate    = useCallback((list) => setAgents(list), []);
  const handleTicketsSnapshot = useCallback((list) => setTickets(list), []);
  const handleTicketCreated   = useCallback((t)    => setTickets(prev => [t, ...prev.filter(x => x.id !== t.id)]), []);
  const handleTicketUpdated   = useCallback((t)    => setTickets(prev => prev.map(x => x.id === t.id ? t : x)), []);
  const handleScreenshotReady = useCallback(({ agentId, filename, url, time, label }) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const shots = [{ id: filename, filename, url, time, label: label || 'Screen captured' }, ...(a.screenshots || [])].slice(0, 20);
      return { ...a, screenshots: shots };
    }));
  }, []);
  const handleAgentMessage    = useCallback((msg) => {
    setAgentChats(prev => ({
      ...prev,
      [msg.agentId]: [...(prev[msg.agentId] || []), { sender: 'agent', text: msg.text, timestamp: msg.timestamp }]
    }));
  }, []);

  const handleWebRTCAnswer = useCallback((msg) => {
    if (msg.agentId === takeoverAgentId) {
      handleAnswer(msg.sdp);
    }
  }, [takeoverAgentId, handleAnswer]);

  const handleWebRTCIceCandidate = useCallback((msg) => {
    if (msg.agentId === takeoverAgentId) {
      handleIceCandidate(msg.candidate);
    }
  }, [takeoverAgentId, handleIceCandidate]);

  const handleMessageSent = useCallback((msg) => {
    if (selectedAgent && msg.agentId === selectedAgent.id) {
      setMessageStatus(msg.ok ? 'sent' : 'idle');
      if (msg.ok) {
        setTimeout(() => setMessageStatus('idle'), 2500);
      }
    }
  }, [selectedAgent]);

  const handleTriggerSent = useCallback((msg) => {
    if (selectedAgent && msg.agentId === selectedAgent.id) {
      setScreenshotStatus(msg.ok ? 'sent' : 'idle');
      if (msg.ok) {
        setTimeout(() => setScreenshotStatus('idle'), 2500);
      }
    }
  }, [selectedAgent]);

  const { connected, send } = useSupabaseBackend({
    selectedAgentId:   selectedAgent?.id,
    takeoverAgentId:   takeoverAgentId,
    onAgentsUpdate:    handleAgentsUpdate,
    onTicketCreated:   handleTicketCreated,
    onTicketUpdated:   handleTicketUpdated,
    onScreenshotReady: handleScreenshotReady,
    onAgentMessage:    handleAgentMessage,
    onWebRTCAnswer:    handleWebRTCAnswer,
    onWebRTCIceCandidate: handleWebRTCIceCandidate,
  });

  // Keep sending ref updated
  useEffect(() => {
    wsSendRef.current = send;
  }, [send]);

  // Load tickets on mount
  useEffect(() => {
    supabase.from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[SUPABASE] Failed to fetch tickets:', error.message);
          return;
        }
        if (data) {
          const mapped = data.map(t => ({
            id: t.id,
            agentId: t.agent_id,
            agentName: t.agent_name,
            title: t.title,
            description: t.description,
            adminStatus: t.admin_status,
            adminNote: t.admin_note,
            createdAt: new Date(t.created_at).getTime(),
            forwardedAt: new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          }));
          setTickets(mapped);
        }
      });
  }, []);

  // Admin actions
  const handleUpdateTicket = useCallback(async (id, adminStatus, adminNote) => {
    try {
      const updatePayload = {};
      if (adminStatus !== undefined) updatePayload.admin_status = adminStatus;
      if (adminNote !== undefined) updatePayload.admin_note = adminNote;

      const { data, error } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const mapped = {
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

      setTickets(prev => prev.map(t => t.id === id ? mapped : t));
      
      // Notify the specific agent that their ticket was actioned
      send({
        type: 'ticket-actioned',
        agentId: mapped.agentId,
        ticket: mapped
      });
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  }, [send]);

  const handleMessageAgent = useCallback((agentId, text) => {
    setMessageStatus('sending');
    send({ type: 'message-agent', agentId, text });
    setAgentChats(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { sender: 'admin', text, timestamp: new Date().toLocaleTimeString() }]
    }));
  }, [send]);

  const handleTriggerScreenshot = useCallback((agentId) => {
    setScreenshotStatus('capturing');
    send({ type: 'trigger-screenshot', agentId });
  }, [send]);

  const handleStartTakeover = useCallback((agentId) => {
    send({ type: 'remote-control-start', agentId, adminName: 'Arthur Dent' });
    setTakeoverAgentId(agentId);
  }, [send]);

  const handleStopTakeover = useCallback((agentId) => {
    send({ type: 'remote-control-stop', agentId });
    setTakeoverAgentId(null);
    teardownWebRTC();
  }, [send, teardownWebRTC]);

  const handleImageClick = useCallback((e) => {
    if (!takeoverAgentId) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    
    const agent = agents.find(a => a.id === takeoverAgentId);
    const resolution = agent?.screenResolution || { width: 1366, height: 800 };
    const naturalWidth = resolution.width;
    const naturalHeight = resolution.height;
    
    // Scale and coordinate offsets calculation for object-fit: contain
    const imgRatio = naturalWidth / naturalHeight;
    const rectRatio = rect.width / rect.height;
    
    let displayWidth = rect.width;
    let displayHeight = rect.height;
    let offsetLeft = 0;
    let offsetTop = 0;
    
    if (rectRatio > imgRatio) {
      displayWidth = rect.height * imgRatio;
      offsetLeft = (rect.width - displayWidth) / 2;
    } else {
      displayHeight = rect.width / imgRatio;
      offsetTop = (rect.height - displayHeight) / 2;
    }
    
    const clickX = e.clientX - rect.left - offsetLeft;
    const clickY = e.clientY - rect.top - offsetTop;
    
    if (clickX < 0 || clickX > displayWidth || clickY < 0 || clickY > displayHeight) {
      console.log("Click was outside the active screen viewport bounds.");
      return;
    }
    
    const targetX = Math.round((clickX / displayWidth) * naturalWidth);
    const targetY = Math.round((clickY / displayHeight) * naturalHeight);
    
    console.log(`Sending click to ${takeoverAgentId} at: (${targetX}, ${targetY}) on ${naturalWidth}x${naturalHeight} display`);
    send({
      type: 'remote-click',
      agentId: takeoverAgentId,
      x: targetX,
      y: targetY
    });
  }, [send, takeoverAgentId, agents]);

  const takeoverAgent = agents.find(a => a.id === takeoverAgentId);

  const pendingCount = tickets.filter(t => t.adminStatus === 'pending').length;
  const onlineCount  = agents.filter(a => a.status !== 'offline').length;
  const activeCount  = agents.filter(a => a.status === 'active').length;

  const filteredAgents = agents.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.name?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || a.status === statusFilter)
    );
  });

  const PAGE_TITLE = { monitoring: 'Monitoring', escalations: 'Escalations', team: 'Team', analytics: 'Analytics' };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#111318', paddingTop: connected ? 0 : 28, transition: 'padding-top 0.2s' }}>
      
      {/* Offline banner */}
      {!connected && (
        <div style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '6px 12px', zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <WifiOff size={14} />
          <span>Connection to KitchenHub relay server offline. Retrying...</span>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ width: collapsed ? 56 : 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#16181f', borderRight: '1px solid #23262f', transition: 'width 0.2s ease', overflow: 'hidden' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #23262f', flexShrink: 0, gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LayoutGrid size={14} color="#fff" />
          </div>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e4e9', whiteSpace: 'nowrap' }}>KitchenHub</span>}
        </div>

        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {!collapsed && <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 8px 6px' }}>Main</div>}
          {NAV.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} title={collapsed ? item.label : undefined}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: collapsed ? '9px 14px' : '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', position: 'relative', background: active ? '#1f2130' : 'transparent', color: active ? '#818cf8' : '#8b8fa8', fontWeight: active ? 600 : 400, fontSize: 13, marginBottom: 2, transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1a1c25'; e.currentTarget.style.color = '#c5c8d6'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? '#818cf8' : '#8b8fa8'; } }}
              >
                {active && <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: 3, borderRadius: '0 3px 3px 0', background: '#6366f1' }} />}
                <Icon size={15} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>}
                {!collapsed && item.badge && pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live status mini-panel */}
        {!collapsed && (
          <div style={{ margin: '0 10px 10px', padding: '12px', borderRadius: 8, background: '#1a1c25', border: '1px solid #23262f' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Live Status</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b8fa8' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Active
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>{activeCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8b8fa8' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4b5060', display: 'inline-block' }} />Offline
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5060' }}>{agents.length - onlineCount}</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: '#23262f', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: '#6366f1', width: `${agents.length ? (onlineCount / agents.length) * 100 : 0}%`, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 10, color: '#4b5060', marginTop: 5 }}>{onlineCount}/{agents.length} online</div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #23262f', padding: '8px 8px' }}>
          {NAV_BOTTOM.map(item => { const Icon = item.icon; return (
            <button key={item.id} title={collapsed ? item.label : undefined}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: collapsed ? '9px 14px' : '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: '#4b5060', fontSize: 13, marginBottom: 2 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1a1c25'; e.currentTarget.style.color = '#8b8fa8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4b5060'; }}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>
          ); })}
        </div>

        <div style={{ borderTop: '1px solid #23262f', padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>AD</div>
            {!collapsed && <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#c5c8d6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Arthur Dent</div>
                <div style={{ fontSize: 11, color: '#4b5060' }}>Sr. Manager</div>
              </div>
              <LogOut size={13} color="#4b5060" style={{ cursor: 'pointer', flexShrink: 0 }} />
            </>}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #23262f', gap: 12, background: '#16181f' }}>
          <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5060', display: 'flex', padding: 4, borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.color = '#c5c8d6'}
            onMouseLeave={e => e.currentTarget.style.color = '#4b5060'}>
            <Menu size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#4b5060' }}>
            <span>Admin</span><ChevronRight size={12} />
            <span style={{ color: '#c5c8d6', fontWeight: 500 }}>{PAGE_TITLE[activeTab]}</span>
          </div>

          <div style={{ position: 'relative', flex: '0 0 240px', marginLeft: 8 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4b5060' }} />
            <input type="text" placeholder="Search agents…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6, background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, color: '#c5c8d6', fontSize: 12, outline: 'none' }} />
          </div>

          <div style={{ flex: 1 }} />

          {/* Download Agent Button */}
          <a
            href="https://nxzvpcbudbqotujuuczo.supabase.co/storage/v1/object/public/releases/KitchenHubAgentSetup.exe"
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 6,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
            onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
          >
            <Monitor size={13} />
            <span>Download Agent App</span>
          </a>

          <div style={{ width: 1, height: 20, background: '#23262f' }} />

          {/* WS connection badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: connected ? '#22c55e' : '#ef4444' }}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>

          <div style={{ width: 1, height: 20, background: '#23262f' }} />

          <button style={{ position: 'relative', background: 'none', border: '1px solid #23262f', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#4b5060' }}>
            <Bell size={14} />
            {pendingCount > 0 && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
          </button>

          <div style={{ width: 1, height: 20, background: '#23262f' }} />
          <span style={{ fontSize: 11, color: '#4b5060' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e4e9' }}>{PAGE_TITLE[activeTab]}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#4b5060' }}>
              {activeTab === 'monitoring'  && 'Live agent activity — real-time screen captures, idle detection, and workload.'}
              {activeTab === 'escalations' && 'Review and action tickets escalated by your team.'}
              {activeTab === 'team'        && 'Agent rosters and shift details.'}
              {activeTab === 'analytics'   && 'Productivity and SLA performance metrics.'}
            </p>
          </div>

          <StatsBar agents={agents} tickets={tickets} />

          {activeTab === 'monitoring' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ padding: '5px 10px', background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, color: '#c5c8d6', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="idle">Idle</option>
                  <option value="offline">Offline</option>
                </select>
                <span style={{ fontSize: 12, color: '#4b5060' }}>{filteredAgents.length} agents</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? '#22c55e' : '#f59e0b' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
                  {connected ? 'Telemetry live' : 'Connecting…'}
                </div>
              </div>
              {agents.length === 0 && !connected ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5060' }}>
                  <WifiOff size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <p style={{ fontWeight: 500, color: '#6b7080' }}>Waiting for server connection…</p>
                  <p style={{ fontSize: 11, color: '#3a3d48', marginTop: 4 }}>Make sure the KitchenHub server is running on port 3001.</p>
                </div>
              ) : (
                <AgentTable agents={filteredAgents} onSelectAgent={setSelectedAgent} />
              )}
            </>
          )}

          {activeTab === 'escalations' && (
            <EscalationsView tickets={tickets} onUpdateStatus={handleUpdateTicket} />
          )}

          {(activeTab === 'team' || activeTab === 'analytics') && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5060' }}>
              <BarChart3 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontWeight: 500, color: '#6b7080' }}>{PAGE_TITLE[activeTab]} — Coming soon</p>
            </div>
          )}
        </main>
      </div>

      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          messages={agentChats[selectedAgent.id] || []}
          onClose={() => setSelectedAgent(null)}
          onMessage={handleMessageAgent}
          onTriggerScreenshot={handleTriggerScreenshot}
          onStartTakeover={handleStartTakeover}
          onStopTakeover={handleStopTakeover}
          isTakeoverActive={takeoverAgentId === selectedAgent.id}
          messageStatus={messageStatus}
          screenshotStatus={screenshotStatus}
        />
      )}

      {/* Remote control Modal */}
      {takeoverAgent && (
        <div style={{ position: 'fixed', inset: 0, background: '#090a0f', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #23262f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#13151b', height: 50, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e4e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remote Session takeover — {takeoverAgent.name} ({takeoverAgent.id})</span>
              </div>
              <button onClick={() => handleStopTakeover(takeoverAgent.id)}
                style={{ padding: '6px 14px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
                Disconnect & Exit Takeover
              </button>
            </div>

            {/* Streaming Area & Actions */}
            <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 50px)', minHeight: 0 }}>
              {/* Left: Screen stream */}
              <div style={{ flex: 1, background: '#090a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
                {remoteStream ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video
                      ref={videoRefCallback}
                      autoPlay
                      playsInline
                      onClick={handleImageClick}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'crosshair', border: '1px solid #23262f', borderRadius: 4 }}
                    />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, fontSize: 10, color: '#8b8fa8', fontFamily: 'monospace' }}>
                      Click anywhere on video to send native click | WebRTC Live Stream
                    </div>
                  </div>
                ) : takeoverAgent.screenshots && takeoverAgent.screenshots[0] ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={`${takeoverAgent.screenshots[0].url}?t=${takeoverAgent.screenshots[0].timestamp || Date.now()}`}
                      alt="Remote screen stream"
                      onClick={handleImageClick}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'crosshair', border: '1px solid #23262f', borderRadius: 4 }}
                    />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, fontSize: 10, color: '#8b8fa8', fontFamily: 'monospace' }}>
                      Click anywhere on image to send native click | Stream: {takeoverAgent.screenshots[0].time}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#4b5060', fontSize: 13, textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '4px border-indigo-500 border-t-transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    Waiting for remote screen stream...
                  </div>
                )}
              </div>

              {/* Right: Keyboard injection & Chat Log */}
              <div style={{ width: 320, borderLeft: '1px solid #23262f', display: 'flex', flexDirection: 'column', background: '#13151b' }}>
                {/* Keyboard Input injection */}
                <div style={{ padding: 16, borderBottom: '1px solid #23262f' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Keyboard Text Injection</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      id="remote-keyboard-input"
                      placeholder="Enter text to type..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          send({ type: 'remote-type', agentId: takeoverAgent.id, text: e.target.value });
                          e.target.value = '';
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, color: '#c5c8d6', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('remote-keyboard-input');
                        if (input && input.value) {
                          send({ type: 'remote-type', agentId: takeoverAgent.id, text: input.value });
                          input.value = '';
                        }
                      }}
                      style={{ padding: '6px 12px', background: '#4f46e5', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Type
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: '#4b5060', marginTop: 4 }}>Injects native text inputs into agent's currently active element.</div>
                </div>

                {/* Live Chat Session Log */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: '#16181f', borderBottom: '1px solid #23262f', fontSize: 11, fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Chat Log</div>
                  <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(agentChats[takeoverAgent.id] || []).length === 0 ? (
                      <span style={{ margin: 'auto', fontSize: 11, color: '#4b5060', fontStyle: 'italic', textAlign: 'center' }}>No messages exchanged yet.</span>
                    ) : (
                      (agentChats[takeoverAgent.id] || []).map((c, idx) => {
                        const isAdm = c.sender === 'admin';
                        return (
                          <div key={idx} style={{ alignSelf: isAdm ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                            <div style={{ background: isAdm ? '#1e2130' : '#1a1c25', border: `1px solid ${isAdm ? '#2b2e40' : '#23262f'}`, borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
                              <div style={{ fontSize: 9, color: isAdm ? '#818cf8' : '#8b8fa8', fontWeight: 600, marginBottom: 2 }}>{isAdm ? 'You' : takeoverAgent.name}</div>
                              <div style={{ color: '#c5c8d6' }}>{c.text}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div style={{ padding: 10, borderTop: '1px solid #23262f', background: '#16181f', display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      id="takeover-chat-input"
                      placeholder="Chat with agent..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleMessageAgent(takeoverAgent.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', background: '#1a1c25', border: '1px solid #23262f', borderRadius: 6, color: '#c5c8d6', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('takeover-chat-input');
                        if (input && input.value) {
                          handleMessageAgent(takeoverAgent.id, input.value);
                          input.value = '';
                        }
                      }}
                      style={{ padding: '6px 10px', background: '#166534', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
