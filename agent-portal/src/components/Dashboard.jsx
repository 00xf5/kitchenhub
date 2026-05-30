import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Inbox, CheckCircle, ArrowUpRight, List, Search, Send, FileText, 
  User, ShieldAlert, Sparkles, RefreshCw, AlertCircle, Phone, 
  RotateCcw, DollarSign, Package, MessageSquare, Info
} from 'lucide-react';

const INITIAL_TICKETS = [
  {
    id: 'KH-1042',
    customer: {
      name: 'Sarah Connor',
      email: 'sconnor@cyberdyne.com',
      phone: '+1 (555) 901-2029',
      avatar: 'SC',
    },
    subject: 'Damaged frying pan on arrival',
    messages: [
      { sender: 'customer', text: 'Hi support team, I received my KitchenHub Non-Stick Pan today but the handle is completely bent. How can I get a replacement?', time: '2 hours ago' },
      { sender: 'agent', text: 'Hello Sarah! I am so sorry to hear that. Could you please provide a photo of the box and the damage? I will resolve this immediately.', time: '1 hour ago' },
      { sender: 'customer', text: 'Sure, I have attached a photo. The shipping box looked like it was crushed. Please send a new one as soon as possible.', time: '45 mins ago' }
    ],
    status: 'open',
    priority: 'high',
    order: {
      id: 'ORD-99831',
      product: 'Premium Non-Stick Frying Pan (12")',
      date: 'May 18, 2026',
      price: '$89.99'
    },
    notes: ''
  },
  {
    id: 'KH-1043',
    customer: {
      name: 'Bruce Wayne',
      email: 'bruce@waynecorp.com',
      phone: '+1 (555) 100-1939',
      avatar: 'BW',
    },
    subject: 'Requesting refund for Chef Knife',
    messages: [
      { sender: 'customer', text: 'I purchased the Damascus steel knife, but it does not fit my hand well. I would like to initiate a return and refund.', time: '4 hours ago' }
    ],
    status: 'pending',
    priority: 'medium',
    order: {
      id: 'ORD-99805',
      product: 'Damascus Steel Chef Knife (8")',
      date: 'May 15, 2026',
      price: '$149.50'
    },
    notes: ''
  },
  {
    id: 'KH-1044',
    customer: {
      name: 'Peter Parker',
      email: 'web@dailybugle.net',
      phone: '+1 (555) 789-2311',
      avatar: 'PP',
    },
    subject: 'Where is my order?',
    messages: [
      { sender: 'customer', text: 'Order was placed 5 days ago, tracking says still in warehouse. Any update?', time: 'Yesterday' },
      { sender: 'agent', text: 'Hi Peter, let me check that tracking number. It seems there was a minor sorting delay at the USPS hub.', time: 'Yesterday' },
      { sender: 'customer', text: 'Got it, let me know when it ships out please.', time: '12 hours ago' }
    ],
    status: 'open',
    priority: 'low',
    order: {
      id: 'ORD-99882',
      product: 'KitchenHub Ceramic Mixing Bowl Set',
      date: 'May 20, 2026',
      price: '$45.00'
    },
    notes: ''
  },
  {
    id: 'KH-1039',
    customer: {
      name: 'Tony Stark',
      email: 'tony@starkindustries.com',
      phone: '+1 (555) 300-3000',
      avatar: 'TS',
    },
    subject: 'Double charged on card',
    messages: [
      { sender: 'customer', text: 'Check your billing system, I was charged twice for ORD-99723.', time: '3 days ago' },
      { sender: 'agent', text: 'Hi Tony, I verified our gateway and refunded the duplicate charge. It should clear in 2-3 business days.', time: '2 days ago' },
      { sender: 'customer', text: 'Confirmed, credit card company shows pending credit now. Thank you!', time: '1 day ago' }
    ],
    status: 'resolved',
    priority: 'high',
    order: {
      id: 'ORD-99723',
      product: 'Smart Electric Kettle (WiFi Enabled)',
      date: 'May 10, 2026',
      price: '$120.00'
    },
    notes: 'Double charge processed due to double checkout click. Resolved.'
  }
];

const TEMPLATES = [
  { name: 'Acknowledge', text: 'Hello! Thank you for contacting KitchenHub Support. I have received your request and am looking into this right now. Please allow me a minute.' },
  { name: 'Shipping Apology', text: 'We sincerely apologize for the delay. We are currently experiencing higher volume at our sorting hubs. I have upgraded your shipping speed at no cost, and your order will arrive shortly.' },
  { name: 'Replacement Approved', text: 'Great news! I have approved a replacement for your order. A brand new unit will be shipped to your address on file within 24 hours. You will receive a tracking link via email.' },
  { name: 'Refund Initiated', text: 'I have initiated a full refund back to your original payment method. Please allow 3-5 business days for your financial institution to process the credit.' }
];

// ── WebRTC answer-side hook (agent portal) ──────────────────────────────
// Activated when the admin sends a WebRTC offer via the server relay.
// Signaling path:
//   Admin ──offer──► server ──► main.cjs IPC ──► here (renderer)
//   Admin ◄─answer── server ◄── main.cjs IPC ◄── here (renderer)
function useWebRTCAnswerer() {
  const pcRef     = useRef(null);
  const streamRef = useRef(null);

  const teardown = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onWebRTCSignalIn) return;

    window.electronAPI.onWebRTCSignalIn(async (signal) => {

      // ── Incoming offer from admin ────────────────────────────────
      if (signal.type === 'webrtc-offer') {
        console.log('[WebRTC] Offer received — starting getDisplayMedia()');
        try {
          // Capture the real desktop stream
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 15, max: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          streamRef.current = stream;

          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          });
          pcRef.current = pc;

          // Add all screen tracks to the connection
          stream.getTracks().forEach(track => pc.addTrack(track, stream));

          // Relay ICE candidates back to admin via IPC → WS → server → admin
          pc.onicecandidate = (e) => {
            if (e.candidate && window.electronAPI?.sendWebRTCSignal) {
              window.electronAPI.sendWebRTCSignal({
                type: 'webrtc-ice-candidate',
                candidate: e.candidate,
                target: 'admin',
              });
            }
          };

          pc.onconnectionstatechange = () => {
            console.log('[WebRTC] State:', pc.connectionState);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              teardown();
            }
          };

          // Set remote (admin's offer) and generate answer
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // Send answer back: renderer → IPC → main.cjs → WS → server → admin
          if (window.electronAPI?.sendWebRTCSignal) {
            window.electronAPI.sendWebRTCSignal({ type: 'webrtc-answer', sdp: answer });
          }
          console.log('[WebRTC] Answer sent — live stream established');

          // Handle agent closing the browser share dialog
          stream.getVideoTracks()[0].onended = () => {
            console.log('[WebRTC] Agent ended screen share');
            teardown();
          };
        } catch (err) {
          console.error('[WebRTC] getDisplayMedia failed:', err.message);
        }
      }

      // ── Incoming ICE candidate from admin ──────────────────────────
      if (signal.type === 'webrtc-ice-candidate' && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.warn('[WebRTC] ICE candidate error:', err.message);
        }
      }
    });

    return () => teardown();
  }, [teardown]);

  return { teardown };
}

export default function Dashboard({ onResetConsent }) {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState(INITIAL_TICKETS[0].id);
  const [activeTab, setActiveTab] = useState('all'); // all, inbox, resolved, forwarded
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [escNotes, setEscNotes] = useState('');
  const [showEscModal, setShowEscModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Centralized notification helper with unique IDs and 5s auto-dismiss
  const addNotification = (title, msg, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    setNotifications(prev => [{ id, title, msg, type }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Connection & Remote takeover states
  const [isConnected, setIsConnected] = useState(true);
  const [remoteControl, setRemoteControl] = useState({ active: false, adminName: '' });
  const [remoteCursor, setRemoteCursor] = useState({ x: 0, y: 0, visible: false });
  const [adminMessages, setAdminMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessageText, setChatMessageText] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const currentTicket = tickets.find(t => t.id === selectedTicketId) || tickets[0];
  const chatEndRef = useRef(null);

  // ── WebRTC answer-side — tears down when remote control stops ──────
  const { teardown: teardownWebRTC } = useWebRTCAnswerer();

  // Auto-scroll chat to bottom when message is added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTicket?.messages]);

  // 1. Connection status monitoring
  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getConnectionStatus) {
        window.electronAPI.getConnectionStatus().then(setIsConnected);
      }
      if (window.electronAPI.onConnectionStatus) {
        window.electronAPI.onConnectionStatus(setIsConnected);
      }
    }
  }, []);

  // 2. Listen to IPC screenshot events (for developer validation)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onScreenshotNotification) {
      window.electronAPI.onScreenshotNotification((data) => {
        // No toast notification to prevent spamming the agent screen
      });
    }
  }, []);

  // 3. Listen to Admin Messages (Two-way chat)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onAdminMessage) {
      window.electronAPI.onAdminMessage((msg) => {
        setAdminMessages(prev => [...prev, { sender: 'admin', text: msg.text, time: msg.timestamp || new Date().toLocaleTimeString() }]);
        
        // Increment unread count if chat is closed
        setUnreadChatCount(prev => isChatOpen ? 0 : prev + 1);

        // Toast notification
        addNotification('Message from Admin', msg.text, 'urgent');
      });
    }
  }, [isChatOpen]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // 4. Listen to Ticket Actions (Approved/Declined by Admin)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onTicketActioned) {
      window.electronAPI.onTicketActioned((actionedTicket) => {
        setTickets(prev => prev.map(t => {
          if (t.id === actionedTicket.id) {
            const stLabel = actionedTicket.adminStatus === 'approved' ? 'APPROVED' : 'DECLINED';
            const actionMsg = {
              sender: 'agent',
              text: `🚨 [SYSTEM]: Ticket was ${stLabel} by Administrator Arthur Dent.\nNote: "${actionedTicket.adminNote || 'No notes left'}"`,
              time: 'Just now'
            };
            return {
              ...t,
              status: 'resolved',
              messages: [...t.messages, actionMsg]
            };
          }
          return t;
        }));

        addNotification(
          `Ticket ${actionedTicket.id} Actioned`,
          `Admin status: ${actionedTicket.adminStatus.toUpperCase()}`,
          actionedTicket.adminStatus === 'approved' ? 'success' : 'urgent'
        );
      });
    }
  }, []);

  // 5. Listen to Remote Takeover status
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onRemoteControlStatus) {
      window.electronAPI.onRemoteControlStatus((status) => {
        setRemoteControl(status);
        if (!status.active) {
          teardownWebRTC();
        }
        addNotification(
          status.active ? 'Backstage Session Active' : 'Backstage Session Ended',
          status.active ? `Admin ${status.adminName} is connected backstage` : 'Backstage session ended.',
          status.active ? 'urgent' : 'success'
        );
      });
    }
  }, [teardownWebRTC]);

  // 6. Listen to Remote Clicks (renderer only displays visual click ripple since main process injects native OS events)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onRemoteClick) {
      window.electronAPI.onRemoteClick(({ x, y }) => {
        console.log("Remote click ripple at", x, y);
        
        // Show cursor click ripple
        setRemoteCursor({ x, y, visible: true });
        setTimeout(() => setRemoteCursor(prev => ({ ...prev, visible: false })), 1000);
      });
    }
  }, []);

  const handleSendChatMessage = () => {
    if (!chatMessageText.trim()) return;
    const text = chatMessageText.trim();
    if (window.electronAPI && window.electronAPI.sendAgentMessage) {
      window.electronAPI.sendAgentMessage(text);
    }
    setAdminMessages(prev => [...prev, { sender: 'agent', text, time: new Date().toLocaleTimeString() }]);
    setChatMessageText('');
  };



  // Handle reply submission
  const handleSendReply = () => {
    if (!replyText.trim()) return;

    setTickets(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return {
          ...t,
          status: 'pending', // Move status to pending when agent replies
          messages: [
            ...t.messages,
            { sender: 'agent', text: replyText, time: 'Just now' }
          ]
        };
      }
      return t;
    }));
    setReplyText('');
  };

  // Handle Quick Template insert
  const handleInsertTemplate = (text) => {
    setReplyText(prev => prev + (prev ? ' ' : '') + text);
  };

  // Escalate / Forward ticket to Admin
  const handleEscalate = async () => {
    const notesText = escNotes || 'Forwarded to Admin.';
    const ticketPayload = {
      id: currentTicket.id,
      subject: currentTicket.subject,
      customer: currentTicket.customer.name,
      email: currentTicket.customer.email,
      phone: currentTicket.customer.phone,
      order: currentTicket.order,
      priority: currentTicket.priority,
      agentNotes: notesText,
      messages: currentTicket.messages
    };

    if (window.electronAPI && window.electronAPI.sendTicket) {
      try {
        await window.electronAPI.sendTicket(ticketPayload);
      } catch (err) {
        console.error("Failed to escalate ticket to server:", err);
      }
    }

    setTickets(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return {
          ...t,
          status: 'forwarded',
          notes: notesText
        };
      }
      return t;
    }));
    setEscNotes('');
    setShowEscModal(false);

    addNotification('Ticket Forwarded', `${currentTicket.id} escalated to Administrator.`, 'success');
  };

  // Clear single toast notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Filtered ticket calculations
  const filteredTickets = tickets.filter(t => {
    // Search filter
    const matchesSearch = 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());

    // Sidebar tab filter
    let matchesTab = true;
    if (activeTab === 'inbox') matchesTab = t.status === 'open' || t.status === 'pending';
    else if (activeTab === 'resolved') matchesTab = t.status === 'resolved';
    else if (activeTab === 'forwarded') matchesTab = t.status === 'forwarded';

    // Status dropdown filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = t.status === statusFilter;
    }

    return matchesSearch && matchesTab && matchesStatus;
  });

  // Calculate ticket counts
  const counts = {
    open: tickets.filter(t => t.status === 'open' || t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    forwarded: tickets.filter(t => t.status === 'forwarded').length,
    all: tickets.length
  };

  return (
    <div className={`flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden transition-all ${!isConnected || remoteControl.active ? 'pt-9' : ''}`}>
      
      {/* Connection Offline Bar */}
      {!isConnected && (
        <div className="bg-red-600 text-white text-[11px] font-bold text-center py-1.5 px-4 flex items-center justify-center space-x-2 z-[9999] absolute top-0 left-0 right-0 animate-pulse border-b border-red-700">
          <span>⚠️ DISCONNECTED FROM KITCHENHUB RELAY SERVER. Trying to reconnect...</span>
        </div>
      )}

      {/* Remote Takeover Control Warning Bar */}
      {remoteControl.active && isConnected && (
        <div className="bg-indigo-700 text-white text-[11px] font-bold text-center py-1.5 px-4 flex items-center justify-center space-x-3 z-[9998] absolute top-0 left-0 right-0 shadow-lg border-b border-indigo-600">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping mr-1" />
            <span>⚠️ ACTIVE BACKSTAGE SESSION — Admin {remoteControl.adminName || 'Arthur Dent'} is connected backstage</span>
          </div>
          <button 
            onClick={() => {
              if (window.electronAPI && window.electronAPI.stopRemoteControl) {
                window.electronAPI.stopRemoteControl();
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Remote Click Ripple Pointer */}
      {remoteCursor.visible && (
        <div 
          style={{ 
            position: 'absolute', 
            left: remoteCursor.x - 20, 
            top: remoteCursor.y - 20, 
            width: 40, 
            height: 40, 
            pointerEvents: 'none', 
            zIndex: 99999 
          }}
        >
          <div className="w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white shadow absolute left-[13px] top-[13px]" />
          <div className="w-10 h-10 border-4 border-red-500 rounded-full absolute animate-ping opacity-75" />
        </div>
      )}
      
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
        {notifications.length > 1 && (
          <button 
            onClick={() => setNotifications([])}
            className="self-end px-3 py-1 bg-gray-900/90 hover:bg-gray-800 text-white border border-gray-700 rounded-full text-[11px] font-bold shadow-lg transition-colors flex items-center space-x-1 cursor-pointer mb-2 animate-in fade-in zoom-in duration-200"
          >
            <span>Clear All ({notifications.length})</span>
          </button>
        )}
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`p-4 rounded-lg shadow-xl flex items-start space-x-3 border animate-bounce ${
              notif.type === 'urgent' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : notif.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-brand-50 border-brand-200 text-brand-800'
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">{notif.title}</p>
              <p className="text-xs mt-1">{notif.msg}</p>
            </div>
            <button 
              onClick={() => removeNotification(notif.id)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Main Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-800 flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-brand-400" />
          <span className="font-bold text-lg tracking-wider">KitchenHub</span>
          <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-semibold">Agent</span>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'all' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>All Tickets</span>
            </div>
            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-300">{counts.all}</span>
          </button>

          <button 
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'inbox' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4" />
              <span>Active Inbox</span>
            </div>
            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-300">{counts.open}</span>
          </button>

          <button 
            onClick={() => setActiveTab('resolved')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'resolved' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Resolved</span>
            </div>
            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-300">{counts.resolved}</span>
          </button>

          <button 
            onClick={() => setActiveTab('forwarded')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeTab === 'forwarded' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4" />
              <span>Forwarded</span>
            </div>
            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-300">{counts.forwarded}</span>
          </button>
        </nav>

        {/* Reset Option (Demo Only) */}
        <div className="p-4 border-t border-gray-800 bg-gray-950">
          <button
            onClick={onResetConsent}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-200 rounded-lg text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo & Exit Portal</span>
          </button>
        </div>
      </div>

      {/* Ticket List Sub-Column */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search ID, customer, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          
          {/* Internal filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">Filter: All Statuses</option>
            <option value="open">Status: Open</option>
            <option value="pending">Status: Pending</option>
            <option value="resolved">Status: Resolved</option>
            <option value="forwarded">Status: Forwarded</option>
          </select>
        </div>

        {/* Tickets Grid */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No tickets matched criteria.
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`p-4 cursor-pointer transition-colors relative ${
                  selectedTicketId === ticket.id ? 'bg-brand-50/50 border-l-4 border-brand-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-bold text-gray-500">{ticket.id}</span>
                  <div className="flex items-center space-x-1">
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                      ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.status}
                    </span>
                    {/* Priority Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
                <h4 className="font-semibold text-sm text-gray-800 truncate">{ticket.customer.name}</h4>
                <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{ticket.subject}</p>
                <p className="text-[10px] text-gray-400 mt-2 text-right">
                  {ticket.messages[ticket.messages.length - 1]?.time || 'Just now'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center space-x-2">
              <span>{currentTicket.subject}</span>
              <span className="font-mono text-xs font-normal text-gray-400">({currentTicket.id})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Assigned to: <span className="font-medium text-gray-700">You (Agent)</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEscModal(true)}
              disabled={currentTicket.status === 'forwarded'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                currentTicket.status === 'forwarded'
                  ? 'bg-purple-50 border-purple-200 text-purple-400 cursor-not-allowed'
                  : 'border-purple-200 text-purple-700 hover:bg-purple-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{currentTicket.status === 'forwarded' ? 'Escalated' : 'Forward to Admin'}</span>
            </button>

            {currentTicket.status !== 'resolved' && (
              <button
                onClick={() => {
                  setTickets(prev => prev.map(t => t.id === currentTicket.id ? { ...t, status: 'resolved' } : t));
                  addNotification('Status Update', `Ticket ${currentTicket.id} marked as Resolved.`, 'success');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Resolved</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30 space-y-4">
          {currentTicket.messages.map((msg, index) => {
            const isAgent = msg.sender === 'agent';
            return (
              <div 
                key={index} 
                className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xl rounded-lg p-4 shadow-sm border ${
                  isAgent 
                    ? 'bg-brand-600 border-brand-700 text-white rounded-tr-none' 
                    : 'bg-white border-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  <div className="flex justify-between items-center mb-1 text-[10px] opacity-75 font-semibold">
                    <span>{isAgent ? 'KitchenHub Agent' : currentTicket.customer.name}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}
          {currentTicket.status === 'forwarded' && (
            <div className="flex justify-center p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-800 text-xs font-medium space-x-2 max-w-lg mx-auto">
              <Info className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-bold">Ticket Escalated to Administrator</p>
                <p className="mt-0.5 text-purple-700 italic">Notes: "{currentTicket.notes}"</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Response Templates Row */}
        <div className="px-6 py-2 bg-gray-50 border-t border-b border-gray-200/80 flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-thin">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center mr-1">
            <Sparkles className="w-3 h-3 mr-1 text-brand-500" />
            Templates:
          </span>
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => handleInsertTemplate(tmpl.text)}
              className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600 transition-colors"
            >
              {tmpl.name}
            </button>
          ))}
        </div>

        {/* Input Panel */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="relative border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-500">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendReply();
                }
              }}
              placeholder="Type your response... (Ctrl + Enter to send)"
              className="w-full p-3 text-sm focus:outline-none rounded-lg resize-none border-0"
            />
            <div className="flex justify-end items-center p-2 bg-gray-50 border-t border-gray-100 rounded-b-lg">
              <button
                onClick={handleSendReply}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Send Reply</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Profile Side panel */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-gray-100 text-center">
          <div className="w-16 h-16 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3 shadow-inner">
            {currentTicket.customer.avatar}
          </div>
          <h3 className="font-bold text-base text-gray-800">{currentTicket.customer.name}</h3>
          <p className="text-xs text-gray-500">{currentTicket.customer.email}</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer Details */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer Info</h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{currentTicket.customer.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Role: General Buyer</span>
              </div>
            </div>
          </div>

          {/* Active Order Details */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Details</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-mono font-semibold text-gray-700">{currentTicket.order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product:</span>
                <span className="font-medium text-gray-700 text-right max-w-[150px] truncate" title={currentTicket.order.product}>
                  {currentTicket.order.product}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium text-gray-700">{currentTicket.order.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-bold text-brand-600">{currentTicket.order.price}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CRM Quick Actions</h4>
            <div className="space-y-1.5">
              <button 
                onClick={() => {
                  addNotification('CRM Operation', `Initiated refund for ${currentTicket.order.id}.`, 'success');
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium text-left transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                <span>Initiate Refund</span>
              </button>

              <button 
                onClick={() => {
                  addNotification('CRM Operation', `Created replacement order for ${currentTicket.order.product}.`, 'success');
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium text-left transition-colors"
              >
                <Package className="w-3.5 h-3.5 text-blue-500" />
                <span>Request Replacement</span>
              </button>

              <button 
                onClick={() => {
                  addNotification('CRM Operation', `Logged outbound support call to ${currentTicket.customer.phone}.`, 'info');
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium text-left transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-yellow-500" />
                <span>Log Phone Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation/Forward Modal */}
      {showEscModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 flex items-center space-x-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
              <span>Forward to Administrator</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              This will assign ticket <span className="font-mono text-gray-700 font-semibold">{currentTicket.id}</span> to the Admin review panel. Please add notes explaining why this ticket requires escalation.
            </p>
            <textarea
              rows={3}
              value={escNotes}
              onChange={(e) => setEscNotes(e.target.value)}
              placeholder="E.g., Customer is requesting a full refund outside our 30-day window, but mixing bowl broke under warranty."
              className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowEscModal(false); setEscNotes(''); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-md"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Chat Drawer */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
        {isChatOpen ? (
          <div className="w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 text-left">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="font-bold text-xs tracking-wider uppercase">Admin Channel</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                ×
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50/50 flex flex-col">
              {adminMessages.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center text-center text-gray-400 p-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 mx-auto">
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-xs font-semibold text-gray-600">No direct messages yet.</p>
                  <p className="text-[10px] mt-1 text-gray-400">Communication with administrator is secured and active.</p>
                </div>
              ) : (
                adminMessages.map((m, idx) => {
                  const isAgent = m.sender === 'agent';
                  return (
                    <div key={idx} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-sm border ${
                        isAgent 
                          ? 'bg-brand-600 border-brand-700 text-white rounded-tr-none' 
                          : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                      }`}>
                        <div className="flex justify-between items-center mb-1 text-[9px] opacity-75 font-semibold gap-2">
                          <span>{isAgent ? 'You (Agent)' : 'Admin'}</span>
                          <span>{m.time}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap text-left">{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <div className="p-2 border-t border-gray-100 bg-white flex items-center space-x-2">
              <input
                type="text"
                value={chatMessageText}
                onChange={e => setChatMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Message administrator..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 bg-gray-50 text-gray-900"
              />
              <button
                onClick={handleSendChatMessage}
                className="p-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gray-900 text-white rounded-full shadow-xl hover:bg-gray-800 transition-all border border-gray-800 relative"
          >
            <MessageSquare className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Admin Chat</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce shadow">
                {unreadChatCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
