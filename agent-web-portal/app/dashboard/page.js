'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CHECKLIST = [
  'Read the Agent Quick Start Guide',
  'Download and install the KitchenHub Workstation Client',
  'Authenticate using your Workstation Login ID',
  'Complete workstation workspace configuration',
  'Connect to the restaurant review queue',
];

function FirefoxModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        maxWidth: 440, width: '100%', borderRadius: 12, padding: '36px',
        background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        color: '#111827'
      }}>
        <div style={{ fontSize: 44, marginBottom: 14, textAlign: 'center' }}>🦊</div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Firefox Required
        </h2>
        <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, marginBottom: 24, textAlign: 'center' }}>
          For security verification and compatibility, the <strong style={{ color: '#111827' }}>KitchenHub Agent Client</strong> must be downloaded using the{' '}
          <strong style={{ color: '#2563eb' }}>Mozilla Firefox</strong> browser.
        </p>
        
        <div style={{
          background: '#f9fafb', borderRadius: 6, padding: '16px 18px',
          textAlign: 'left', marginBottom: 24, border: '1px solid #e5e7eb',
        }}>
          {['Open Mozilla Firefox on your computer', 'Sign back into your Agent Dashboard', 'Click the download button to get the installer'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#eff6ff',
                border: '1px solid #bfdbfe', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                fontFamily: 'monospace'
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.45 }}>{step}</span>
            </div>
          ))}
        </div>

        <a
          href="https://www.mozilla.org/firefox/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', marginBottom: 12, padding: '11px', borderRadius: 6,
            background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', textAlign: 'center', transition: 'background 0.2s'
          }}
        >
          Download Mozilla Firefox (Free) →
        </a>
        <button onClick={onClose} style={{
          width: '100%', fontSize: 12, padding: '10px', background: 'transparent',
          color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
        }}>
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
      window.location.href = 'https://www.dropbox.com/scl/fi/knbo9qg0qgzzxf8xfiepx/KitchenHubAgentSetup.exe?rlkey=an0lo7orqspz5hhc9zo0eaplh&st=3elmigje&dl=0';
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
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #eff6ff', borderTopColor: '#2563eb', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", color: '#111827' }}>
      {showFirefoxModal && <FirefoxModal onClose={() => setShowFirefoxModal(false)} />}

      {/* ── NAV ──────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 24, height: 24, borderRadius: 5, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#111827' }}>
            KitchenHub <span style={{ color: '#2563eb', fontSize: 10, fontWeight: 700, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4, marginLeft: 4 }}>AGENT</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#4b5563' }}>
            Welcome, <strong style={{ color: '#111827' }}>{agent?.full_name}</strong>
          </span>
          <button onClick={handleLogout} style={{
            padding: '6px 14px', background: 'transparent', color: '#6b7280',
            fontSize: 11, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}>Log Out</button>
        </div>
      </nav>

      {/* Main Grid Wrapper */}
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* ── APPROVAL BANNER ─────────────────────────────────── */}
        <div style={{
          padding: '16px 24px', borderRadius: 8,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 24 }}>🛡️</div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#16a34a', marginBottom: 2 }}>
              Workstation Credentials Active
            </div>
            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>
              Your agent account has been approved. Please follow the checklist below to download the workstation client and connect your workspace.
            </div>
          </div>
        </div>

        {/* Two-Column Workspace Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT COLUMN: Main Controls & Downloading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Access Key Card */}
            <div style={{
              borderRadius: 12, padding: '24px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe', position: 'relative', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Workstation Access Key
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                <div style={{
                  fontFamily: '"Fira Code", monospace', fontWeight: 700, fontSize: 30,
                  color: '#2563eb', letterSpacing: '0.02em',
                }}>
                  {agent?.login_id || 'KH-AG-XXXXX'}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                    background: copied ? '#d1fae5' : '#2563eb',
                    border: `1px solid ${copied ? '#10b981' : '#2563eb'}`,
                    color: copied ? '#065f46' : '#fff',
                    fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ Key Copied' : '📋 Copy Access Key'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#4b5563', marginTop: 14, lineHeight: 1.5 }}>
                Enter this access key inside the client application during first-time workstation setup. Keep this key secure and do not share it.
              </p>
            </div>

            {/* Workstation Client Download card */}
            <div style={{ borderRadius: 12, padding: '24px', background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Workstation Installation
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                    KitchenHub Desktop Workstation
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
                    Windows 64-bit · Requires Mozilla Firefox to verify download
                  </div>
                  <button
                    id="downloadBtn"
                    onClick={handleDownloadClick}
                    disabled={downloadLoading}
                    style={{
                      background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600,
                      border: 'none', borderRadius: 6, cursor: 'pointer', padding: '11px 24px',
                      opacity: downloadLoading ? 0.7 : 1, transition: 'background 0.2s'
                    }}
                  >
                    {downloadLoading
                      ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" /> Verifying...</>
                      : '⬇ Download for Windows (x64)'}
                  </button>
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 6,
                  background: '#fef3c7', border: '1px solid #fde68a',
                  fontSize: 11, color: '#b45309', lineHeight: 1.6, maxWidth: 260,
                }}>
                  🦊 <strong>Firefox Check:</strong> To secure installer download parameters, files must be requested through a Firefox browser session. Clicking on other browsers displays instructions.
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ borderRadius: 12, padding: '24px', background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Workspace Setup Steps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CHECKLIST.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCheck(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                      borderRadius: 6, textAlign: 'left',
                      transition: 'background 0.15s', width: '100%'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${checklist[i] ? '#2563eb' : '#d1d5db'}`,
                      background: checklist[i] ? '#2563eb' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#fff', transition: 'all 0.15s',
                    }}>
                      {checklist[i] ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 12, color: checklist[i] ? '#9ca3af' : '#4b5563', textDecoration: checklist[i] ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20, height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#2563eb', width: `${(checklist.filter(Boolean).length / CHECKLIST.length) * 100}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, fontFamily: 'monospace' }}>
                SETUP PROGRESS: {checklist.filter(Boolean).length}/{CHECKLIST.length} COMPLETED
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Terminal Stats & Guides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Connection Status Widget */}
            <div style={{ padding: '24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Workspace Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: 'Onboarding Server Time', v: currentTime, c: '#111827' },
                  { n: 'Onboarding Region', v: 'US-East Hub', c: '#4b5563' },
                  { n: 'Security Protocol', v: 'TLS v1.3 Verified', c: '#16a34a' },
                  { n: 'Status Stream', v: 'ACTIVE (Standby)', c: '#16a34a' },
                ].map(r => (
                  <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, fontSize: 11 }}>
                    <span style={{ color: '#6b7280' }}>{r.n}</span>
                    <span style={{ color: r.c, fontWeight: 600, fontFamily: 'monospace' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start Guide */}
            <div style={{ padding: '24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Workstation Setup Instructions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { n: '1', t: 'Run the Setup Package', d: 'Launch the downloaded setup installer executable file to deploy the client application locally.' },
                  { n: '2', t: 'Authenticate Client', d: 'Open the client, and type your Workstation Access Key to link your agent profile.' },
                  { n: '3', t: 'Sync Shift Queue', d: 'The workstation client will automatically load your queues and connect you to the review feed.' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontFamily: 'monospace' }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.45 }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operations Support */}
            <div style={{ padding: '20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Workspace Support
              </div>
              <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                Having trouble setting up your local client? Contact your onboarding administrator or reach out to support.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

