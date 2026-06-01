'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MOCK_NODES = [
  { id: 'DESKTOP-682U49Q', user: 'Owner', status: 'live', idle: 'Active 58s', region: 'US-East', ping: '12ms', task: 'Review Resolution Stream' },
  { id: 'DESKTOP-5VXN3Y2', user: 'Jay', status: 'standby', idle: 'Idle 14h 57m', region: 'US-West', ping: '24ms', task: 'Queue Coverage Standby' },
  { id: 'DESKTOP-8039S1Q', user: 'D.Berry', status: 'standby', idle: 'Idle 14h 55m', region: 'EU-Central', ping: '19ms', task: 'Queue Coverage Standby' },
  { id: 'DESKTOP-CHENL8P', user: 'bnyll', status: 'standby', idle: 'Idle 56m', region: 'AP-South', ping: '32ms', task: 'Queue Coverage Standby' },
  { id: 'DESKTOP-E1B8NCR', user: 'shawn', status: 'standby', idle: 'Idle 16h 11m', region: 'US-East', ping: '14ms', task: 'Queue Coverage Standby' },
  { id: 'DESKTOP-EOLVLN8', user: 'grdmll', status: 'standby', idle: 'Idle 14h 50m', region: 'EU-West', ping: '21ms', task: 'Queue Coverage Standby' },
  { id: 'DESKTOP-6126GK', user: 'foldingsteve', status: 'offline', idle: 'Offline', region: 'US-West', ping: '--', task: 'Offline' },
  { id: 'DESKTOP-K0S4ROT', user: 'brandon', status: 'offline', idle: 'Offline', region: 'AP-East', ping: '--', task: 'Offline' },
];

const features = [
  {
    icon: (
      <svg style={{ width: 20, height: 20, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Distributed Ingestion Console',
    desc: 'Access enterprise restaurant ticket pipelines and review feeds from a secure, hardware-authorized desktop portal client.',
  },
  {
    icon: (
      <svg style={{ width: 20, height: 20, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Precision Availability Metrics',
    desc: 'Schedule shifts, coordinate queue coverage, and maintain dedicated node uptime with clean analytical reports.',
  },
  {
    icon: (
      <svg style={{ width: 20, height: 20, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Authorized Operator Tokens',
    desc: 'Register credentials, satisfy operator telemetry checks, and dynamically provision individual operator session logins.',
  },
];

const steps = [
  { n: '01', title: 'Register Operator ID', desc: 'Secure an operator profile using your verification email and contact coordinates.' },
  { n: '02', title: 'Intake Assessment', desc: 'Detail your customer operations background and confirm weekly shift parameters.' },
  { n: '03', title: 'Manual Approval', desc: 'Administrator validates your hardware availability and flags your profile for activation.' },
  { n: '04', title: 'Establish Connection', desc: 'Download the custom client, input your unique Login ID, and begin queue operations.' },
];

export default function LandingPage() {
  const [selectedNode, setSelectedNode] = useState(MOCK_NODES[0]);
  const [currentTime, setCurrentTime] = useState('16:30:00');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredNodes = MOCK_NODES.filter(node => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return node.status === 'live' || node.status === 'standby';
    if (activeTab === 'offline') return node.status === 'offline';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(6,8,12,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>Log In</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '7px 18px', fontSize: 12 }}>Become an Agent</Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 40px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.25,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', borderRadius: 'var(--radius-full)',
            background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.2)',
            fontSize: 10, fontWeight: 600, color: 'var(--brand-light)',
            marginBottom: 24, letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'monospace'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} className="glow-point" />
            ONBOARDING SYSTEM ACTIVE
          </div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1.15,
            color: 'var(--text-primary)', marginBottom: 20,
            letterSpacing: '-0.02em'
          }}>
            Distributed Operator Console for <span className="brand-gradient-text">Restaurant Operations</span>
          </h1>

          <p style={{
            fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6,
            maxWidth: 640, margin: '0 auto 36px',
          }}>
            Coordinate assigned customer response queues, manage restaurant dispute pipelines, and maintain peak service delivery utilizing our secure, high-performance desktop workstation platform.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <Link href="/register" className="btn-primary" style={{ padding: '12px 30px', fontSize: 13 }}>
              Apply for Console Access
            </Link>
            <Link href="#operations-demo" className="btn-ghost" style={{ padding: '12px 26px', fontSize: 13 }}>
              Explore Live Console Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE LIVE CONSOLE MOCKUP ────────────────── */}
      <section id="operations-demo" style={{ padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
            Global Operations Session Monitor
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Interactive demonstration of our distributed queue node tracking grid. Select individual connection items to audit telemetry feeds.
          </p>
        </div>

        {/* Console Container */}
        <div className="panel" style={{ background: '#090d16', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)' }}>
          {/* Console Header Bar */}
          <div style={{
            padding: '12px 20px', background: '#0c0f1b', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>BSK-CONSOLE://Ingestion-Node-Grid</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>SYSTEM CLOCK: <strong style={{ color: 'var(--text-primary)' }}>{currentTime}</strong></span>
              <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
              <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} className="glow-point" />
                ONLINE
              </span>
            </div>
          </div>

          {/* Console Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 300px', minHeight: 400, background: '#080a10' }}>
            {/* Sidebar Controls */}
            <div style={{ borderRight: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Session Filters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button 
                    onClick={() => setActiveTab('all')} 
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', background: activeTab === 'all' ? 'var(--brand-dim)' : 'transparent',
                      color: activeTab === 'all' ? 'var(--brand-light)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', transition: 'all 0.15s'
                    }}
                  >
                    <span>🖥️ All Assigned Nodes</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>8</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('active')} 
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', background: activeTab === 'active' ? 'var(--brand-dim)' : 'transparent',
                      color: activeTab === 'active' ? 'var(--brand-light)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', transition: 'all 0.15s'
                    }}
                  >
                    <span>🟢 Active Sessions</span>
                    <span style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>6</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('offline')} 
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', background: activeTab === 'offline' ? 'var(--brand-dim)' : 'transparent',
                      color: activeTab === 'offline' ? 'var(--brand-light)' : 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', transition: 'all 0.15s'
                    }}
                  >
                    <span>⚪ Offline Nodes</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>2</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 11, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>System Diagnostics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Load:</span><span style={{ color: 'var(--green)' }}>14% Nominal</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tunnel:</span><span style={{ color: 'var(--green)' }}>Encrypted</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DB Link:</span><span style={{ color: 'var(--green)' }}>Optimal</span></div>
                </div>
              </div>
            </div>

            {/* Main Session Grid */}
            <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)', background: '#0a0d16',
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <span>Session Name</span>
                <span>Assigned Operator</span>
                <span>Connection status</span>
                <span>Active Ping</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode.id === node.id;
                  return (
                    <div 
                      key={node.id} 
                      onClick={() => setSelectedNode(node)}
                      style={{
                        padding: '12px 16px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', alignItems: 'center',
                        background: isSelected ? 'rgba(59,130,246,0.07)' : 'transparent',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🖥️ {node.id}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{node.user}</span>
                      <span>
                        <span className={`status-indicator ${node.status === 'live' ? 'status-online' : node.status === 'standby' ? 'status-standby' : 'status-offline'}`}>
                          {node.status === 'live' ? 'Live Session' : node.status === 'standby' ? 'Standby' : 'Offline'}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: node.status === 'offline' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                        {node.ping}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Telemetry Panel */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, background: '#0a0c14' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Details</div>
              
              <div className="panel" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>NODE IDENTIFIER</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{selectedNode.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>OPERATOR</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedNode.user}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ACTIVE WORKFLOW</div>
                  <div style={{ fontSize: 12, color: 'var(--brand-light)', fontFamily: 'monospace', fontWeight: 600 }}>{selectedNode.task}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TELEMETRY STATUS</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedNode.idle}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SERVER INGESTION POP</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedNode.region} ({selectedNode.ping})</div>
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <Link href="/register" className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: 12, display: 'flex', justifyContent: 'center' }}>
                  Register as Node Operator →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES ────────────────────────────────── */}
      <section style={{ padding: '60px 40px 80px', maxWidth: 1100, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)', marginBottom: 8 }}>
            System Capabilities
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Engineered for high-volume data streams and secure queue execution.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="panel panel-interactive" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ONBOARDING STEPS ─────────────────────────────────── */}
      <section style={{ padding: '60px 40px 80px', background: '#080a10', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)', marginBottom: 8 }}>
              Operator Activation Timeline
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Follow these secure steps to provision and verify your operations endpoint.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {steps.map((s) => (
              <div key={s.n} className="panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 4, background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                  fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--brand-light)'
                }}>{s.n}</div>
                <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div className="panel" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 36px', background: 'linear-gradient(180deg, #0d111d 0%, #090c15 100%)', border: '1px solid var(--border-strong)' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 12 }}>
            Provision Operator Endpoint
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 28px' }}>
            Submit your telemetry logs and availability metrics. Activated node accounts are manually cryptographic keys provisioned via security management.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '12px 36px', fontSize: 13 }}>
            Initialize Security Assessment
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px 40px', background: '#05070a',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>© 2026 Bluestar KitchenHub Operations Network. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/login" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'monospace' }}>Operator Login</Link>
          <Link href="/register" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'monospace' }}>Register Node</Link>
        </div>
      </footer>
    </div>
  );
}
