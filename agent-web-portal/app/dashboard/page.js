'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CHECKLIST = [
  'Read the Quick Start Guide',
  'Download and install the KitchenHub Desktop App',
  'Log in with your unique Login ID',
  'Complete your first ticket',
  'Set your shift availability',
];

function FirefoxModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="glass" style={{ maxWidth: 460, width: '100%', borderRadius: 'var(--radius-xl)', padding: '40px 36px', textAlign: 'center', border: '1px solid rgba(255,165,0,0.3)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🦊</div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>
          Firefox Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          For security and compatibility reasons, the <strong style={{ color: 'var(--text-primary)' }}>KitchenHub Desktop App</strong> can only be downloaded using{' '}
          <strong style={{ color: '#ff9500' }}>Mozilla Firefox</strong>.
        </p>
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '18px 20px',
          textAlign: 'left', marginBottom: 28, border: '1px solid var(--border)',
        }}>
          {['Open Mozilla Firefox on this computer', 'Navigate back to this page', 'Click the Download button again'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 14 : 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-dim)',
                border: '1px solid var(--brand)', color: 'var(--brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step}</span>
            </div>
          ))}
        </div>
        <a
          href="https://www.mozilla.org/firefox/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginBottom: 12, padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.3)', color: '#ff9500', fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
        >
          Download Firefox — It's Free →
        </a>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%', fontSize: 13 }}>
          I Understand, Close
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
  const [checklist, setChecklist] = useState(() => {
    if (typeof window === 'undefined') return Array(CHECKLIST.length).fill(false);
    try { return JSON.parse(localStorage.getItem('kh-checklist') || 'null') || Array(CHECKLIST.length).fill(false); } catch { return Array(CHECKLIST.length).fill(false); }
  });

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
      window.location.href = 'https://www.dropbox.com/scl/fi/j1f2op535dadjxoe9p6hr/KitchenHubAgentSetup.exe?rlkey=f5jjy5o130gfs2lm0uhankhub&st=82r36mi0&dl=1';
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
        <div style={{ width: 36, height: 36, border: '3px solid var(--brand-dim)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {showFirefoxModal && <FirefoxModal onClose={() => setShowFirefoxModal(false)} />}

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(7,8,13,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⭐</div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>
            KitchenHub <span style={{ color: 'var(--brand-light)', fontSize: 11, fontWeight: 600, background: 'var(--brand-dim)', padding: '2px 8px', borderRadius: 99 }}>AGENT</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Hey, <strong style={{ color: 'var(--text-primary)' }}>{agent?.full_name?.split(' ')[0]}</strong>
          </span>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>Log Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── APPROVAL BANNER ─────────────────────────────────── */}
        <div style={{
          padding: '22px 28px', borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,211,238,0.07) 100%)',
          border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 36 }}>✅</div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--green)', marginBottom: 4 }}>
              You are now a Professional Bluestar Agent
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your account has been approved. Download the desktop app below to get started.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── LOGIN ID CARD ────────────────────────────────────── */}
          <div className="glass" style={{
            borderRadius: 'var(--radius-xl)', padding: '28px',
            gridColumn: '1 / -1',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(22,24,32,0.7) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Your Unique Agent Login ID
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 36,
                color: 'var(--text-primary)', letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--cyan) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {agent?.login_id || 'BSK-AG-XXXXX'}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '9px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  background: copied ? 'rgba(34,197,94,0.15)' : 'var(--brand-dim)',
                  color: copied ? 'var(--green)' : 'var(--brand-light)',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy ID'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Use this ID to log in to the KitchenHub Desktop App. Keep it safe.
            </p>
          </div>

          {/* ── DOWNLOAD SECTION ─────────────────────────────────── */}
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '28px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Download Desktop App
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 8 }}>
                  KitchenHub Agent App
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  Windows 64-bit · Requires Mozilla Firefox to download
                </div>
                <button
                  id="downloadBtn"
                  onClick={handleDownloadClick}
                  disabled={downloadLoading}
                  className="btn-primary"
                  style={{ opacity: downloadLoading ? 0.7 : 1, cursor: downloadLoading ? 'wait' : 'pointer' }}
                >
                  {downloadLoading
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" /> Preparing...</>
                    : '⬇ Download for Windows (64-bit)'}
                </button>
              </div>
              <div style={{
                padding: '16px 20px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)',
                fontSize: 12, color: '#fbbf24', lineHeight: 1.65, maxWidth: 280,
              }}>
                🦊 <strong>Firefox Required:</strong> This download is only available via Mozilla Firefox for security reasons. Clicking this button on another browser will show you instructions.
              </div>
            </div>
          </div>

          {/* ── TRAINING CHECKLIST ───────────────────────────────── */}
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '28px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Getting Started Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CHECKLIST.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px',
                    borderRadius: 'var(--radius-md)', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${checklist[i] ? 'var(--brand)' : 'var(--border-strong)'}`,
                    background: checklist[i] ? 'var(--brand)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: '#fff', transition: 'all 0.2s',
                  }}>
                    {checklist[i] ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 13, color: checklist[i] ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checklist[i] ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--brand)', width: `${(checklist.filter(Boolean).length / CHECKLIST.length) * 100}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{checklist.filter(Boolean).length}/{CHECKLIST.length} completed</div>
          </div>

          {/* ── QUICK START GUIDE ────────────────────────────────── */}
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '28px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Quick Start Guide
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { n: '1', t: 'Install the App', d: 'Run the downloaded .exe installer and follow the setup wizard.' },
                { n: '2', t: 'Launch & Log In', d: 'Open KitchenHub Agent and enter your Login ID when prompted.' },
                { n: '3', t: 'Accept the Terms', d: 'Read and accept the monitoring consent on first launch.' },
                { n: '4', t: 'Start Your Shift', d: 'Your ticket queue will appear automatically. Respond and escalate as needed.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-dim)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--brand-light)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{s.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Support */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Support</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Having trouble? Contact your support team via the in-app chat or reach out to your supervisor.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
