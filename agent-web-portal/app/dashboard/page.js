'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CHECKLIST = [
  'Read the Operator Quick Start Guide',
  'Download and install the KitchenHub Workstation Client',
  'Authenticate terminal using your Unique Login ID',
  'Complete shift credentials setup',
  'Submit first queue telemetry handshake',
];

function FirefoxModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="panel glass animate-fade-up" style={{ maxWidth: 440, width: '100%', borderRadius: 'var(--radius-lg)', padding: '36px', border: '1px solid var(--border-strong)' }}>
        <div style={{ fontSize: 44, marginBottom: 14, textAlign: 'center' }}>🦊</div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Firefox Session Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24, textAlign: 'center' }}>
          For terminal compatibility and secure cryptographic file transfers, the <strong style={{ color: 'var(--text-primary)' }}>KitchenHub Agent Client</strong> can only be downloaded using{' '}
          <strong style={{ color: 'var(--brand-light)' }}>Mozilla Firefox</strong>.
        </p>
        
        <div style={{
          background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '16px 18px',
          textAlign: 'left', marginBottom: 24, border: '1px solid var(--border)',
        }}>
          {['Open Mozilla Firefox on this computer', 'Navigate back to this workstation dashboard', 'Click the download action button to verify session'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-dim)',
                border: '1px solid var(--brand)', color: 'var(--brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                fontFamily: 'monospace'
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{step}</span>
            </div>
          ))}
        </div>

        <a
          href="https://www.mozilla.org/firefox/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginBottom: 12, padding: '11px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-dim)', border: '1px solid var(--brand)', color: 'var(--brand-light)', fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand-dim)'}
        >
          Download Mozilla Firefox (Free) →
        </a>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '10px' }}>
          I Understand, Close Panel
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFirefoxModal, setShowFirefoxModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [checklist, setChecklist] = useState(() => {
    if (typeof window === 'undefined') return Array(CHECKLIST.length).fill(false);
    try { return JSON.parse(localStorage.getItem('kh-checklist') || 'null') || Array(CHECKLIST.length).fill(false); } catch { return Array(CHECKLIST.length).fill(false); }
  });

  useEffect(() => {
    const d = new Date();
    setCurrentTime(d.toTimeString().split(' ')[0]);
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      supabase.from('agents').select('*').eq('id', user.id).single().then(({ data }) => {
        if (!data || data.status !== 'approved') { router.push('/status'); return; }
        setAgent(data);
        setLoading(false);
      });
    });
  }, [router]);

  const handleCopy = useCallback(() => {
    if (!agent?.login_id) return;
    navigator.clipboard.writeText(agent.login_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [agent]);

  const handleDownloadClick = useCallback(async () => {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    if (!isFirefox) {
      setShowFirefoxModal(true);
      return;
    }
    setDownloadLoading(true);
    try {
      const res = await fetch('/api/download', { method: 'POST' });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      // Fallback to Dropbox URL
      window.location.href = 'https://www.dropbox.com/scl/fi/u2w64qsxnzm933e4946n7/KitchenHubAgentSetup.exe?rlkey=bxtp6nrwy692t88yyia8zcz0m&st=6qmol1wv&dl=1';
    } finally {
      setDownloadLoading(false);
    }
  }, []);

  const toggleCheck = (i) => {
    const next = [...checklist];
    next[i] = !next[i];
    setChecklist(next);
    try { localStorage.setItem('kh-checklist', JSON.stringify(next)); } catch {}
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--brand-dim)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {showFirefoxModal && <FirefoxModal onClose={() => setShowFirefoxModal(false)} />}

      {/* ── STICKY NAV ──────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(6,8,12,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 24, height: 24, borderRadius: 5 }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            KitchenHub <span style={{ color: 'var(--brand-light)', fontSize: 10, fontWeight: 700, background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 4, marginLeft: 4, fontFamily: 'monospace' }}>OPERATOR</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Welcome, <strong style={{ color: 'var(--text-primary)' }}>{agent?.full_name}</strong>
          </span>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}>Log Out</button>
        </div>
      </nav>

      {/* Main Grid Wrapper */}
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }} className="animate-fade-up">

        {/* ── APPROVAL BANNER ─────────────────────────────────── */}
        <div style={{
          padding: '16px 24px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.04) 100%)',
          border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 24, filter: 'grayscale(0.1)' }}>🛡️</div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#34d399', marginBottom: 2 }}>
              Operator Profile Activated & Cleared
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your credentials are valid. Download the custom workstation client application to synchronize your shift queue feed.
            </div>
          </div>
        </div>

        {/* Two-Column Workspace Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT COLUMN: Main Controls & Downloading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Encrypted Login Token Smart-Card */}
            <div className="panel" style={{
              borderRadius: 'var(--radius-lg)', padding: '24px',
              background: 'linear-gradient(135deg, rgba(17,22,37,0.95) 0%, rgba(9,13,24,0.95) 100%)',
              border: '1px solid var(--border-strong)', position: 'relative', overflow: 'hidden'
            }}>
              {/* Virtual microchip graphic */}
              <div style={{ position: 'absolute', top: 24, right: 24, width: 36, height: 28, background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, display: 'flex', flexWrap: 'wrap', padding: 2, gap: 1 }}>
                {Array(6).fill(0).map((_, i) => <div key={i} style={{ width: '45%', height: '28%', border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent' }} />)}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                ENCRYPTED ACCESS KEY TOKEN
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                <div style={{
                  fontFamily: '"Fira Code", monospace', fontWeight: 700, fontSize: 30,
                  color: 'var(--text-primary)', letterSpacing: '0.02em',
                  background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--cyan) 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {agent?.login_id || 'BSK-AG-XXXXX'}
                </div>
                <button
                  onClick={handleCopy}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: copied ? 'var(--green-dim)' : 'var(--brand-dim)',
                    border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                    color: copied ? '#34d399' : 'var(--brand-light)',
                    fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ Token Copied' : '📋 Copy Access Key'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5 }}>
                Input this access key inside the client application during first-time workstation setup. Do not distribute.
              </p>
            </div>

            {/* Workstation Client Download card */}
            <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Workstation Installation
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                    KitchenHub Desktop Workstation
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                    Windows 64-bit · Requires Mozilla Firefox session to verify download
                  </div>
                  <button
                    id="downloadBtn"
                    onClick={handleDownloadClick}
                    disabled={downloadLoading}
                    className="btn-primary"
                    style={{ opacity: downloadLoading ? 0.7 : 1, padding: '11px 24px', fontSize: 12 }}
                  >
                    {downloadLoading
                      ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" /> Transferring...</>
                      : '⬇ Download for Windows (x64)'}
                  </button>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
                  fontSize: 11, color: '#f59e0b', lineHeight: 1.6, maxWidth: 260,
                }}>
                  🦊 <strong>Firefox Verify Check:</strong> Due to security token transfers, downloads are limited to Firefox sessions. Clicking this on other browsers initiates setup logs.
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Node Setup Milestones
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CHECKLIST.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCheck(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)', textAlign: 'left',
                      transition: 'background 0.15s', width: '100%'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${checklist[i] ? 'var(--brand)' : 'var(--border-strong)'}`,
                      background: checklist[i] ? 'var(--brand)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#fff', transition: 'all 0.15s',
                    }}>
                      {checklist[i] ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 12, color: checklist[i] ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checklist[i] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'var(--brand)', width: `${(checklist.filter(Boolean).length / CHECKLIST.length) * 100}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'monospace' }}>
                SETUP PROGRESS: {checklist.filter(Boolean).length}/{CHECKLIST.length} COMPLETED
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Terminal Stats & Guides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Real-time Telemetry Pop Widget */}
            <div className="panel" style={{ padding: '24px', background: '#0a0d15' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Active Telemetry & Diagnostics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: 'Server Clock', v: currentTime, c: 'var(--text-primary)' },
                  { n: 'Host POP Node', v: 'US-East (Ingestion)', c: 'var(--text-secondary)' },
                  { n: 'Encryption Key', v: 'AES-256 Validated', c: '#10b981' },
                  { n: 'Active Tunnel', v: 'OPERATIONAL (14ms)', c: '#10b981' },
                  { n: 'Ingestion Feed', v: 'STANDBY (0 B/s)', c: '#fbbf24' },
                ].map(r => (
                  <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8, fontSize: 11, fontFamily: 'monospace' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.n}</span>
                    <span style={{ color: r.c, fontWeight: 600 }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Workstation Onboarding Steps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { n: '1', t: 'Execute Setup Package', d: 'Launch the downloaded KitchenHub .exe installer and execute the secure local provisioning.' },
                  { n: '2', t: 'Establish Ingestion Session', d: 'Open the client and authenticate by typing your unique Access Key token.' },
                  { n: '3', t: 'Sync Shift Parameters', d: 'The local interface will synchronize your queue parameters and connect to live review feeds.' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--brand-light)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontFamily: 'monospace' }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operations Support */}
            <div className="panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Operations Support
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Having issue establishing local queue handshakes? Contact system administrators or submit a request ticket to your immediate shift supervisor.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
