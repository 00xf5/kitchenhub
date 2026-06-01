'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATS = [
  { label: 'Ingestion Latency', value: '14ms', status: 'Optimal', desc: 'Secure regional POP response pings.' },
  { label: 'Active Operator Nodes', value: '96 / 100', status: 'Active', desc: 'Global queue coverage metrics.' },
  { label: 'Clearance Status', value: 'Encrypted', status: 'Validated', desc: 'Heartbeat stream fully ciphered.' },
  { label: 'Central Ingestion', value: 'Nominal', status: 'Stable', desc: 'Shift ticket queue volumes.' },
];

const capabilities = [
  {
    title: 'Distributed Queue Console',
    desc: 'Access restaurant operations pipelines and customer review streams securely from any desktop node using our optimized client application.'
  },
  {
    title: 'Shift Availability Metrics',
    desc: 'Select standard high-volume shifts and maintain dedicated network coverage with full transparency on compliance logs.'
  },
  {
    title: 'Provisioned Security Tokens',
    desc: 'Each operator node receives a unique, manual cryptographic welcome token key to authorize local client handshakes.'
  }
];

const steps = [
  { num: '01', title: 'Register Profile', desc: 'Submit operator details and contact credentials via the registration portal.' },
  { num: '02', title: 'Intake Assessment', desc: 'Complete the short experience and shift availability profile.' },
  { num: '03', title: 'Admin Clearance', desc: 'Operations team validates hardware parameters and provisions your node.' },
  { num: '04', title: 'Connect Workstation', desc: 'Install the client client app, input your access token, and begin operations.' }
];

export default function LandingPage() {
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    setSystemTime(new Date().toTimeString().split(' ')[0]);
    const timer = setInterval(() => {
      setSystemTime(new Date().toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)' }}>

      {/* ── TOP NAV ────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(6, 8, 12, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Bluestar KitchenHub Logo" style={{ width: 24, height: 24, borderRadius: 5 }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Bluestar <span style={{ color: 'var(--text-secondary)' }}>KitchenHub</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/login" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Operator Login
          </Link>
          <Link href="/register" className="btn-primary" style={{ padding: '7px 16px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}>
            Join Operator Network
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <section style={{
        padding: '120px 40px 60px',
        textAlign: 'center',
        position: 'relative',
        maxWidth: 900,
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)',
          marginBottom: 24, letterSpacing: '0.05em', fontFamily: 'monospace'
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          POP STATUS: ONLINE ({systemTime})
        </div>

        <h1 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 800,
          fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.15,
          color: 'var(--text-primary)', marginBottom: 20,
          letterSpacing: '-0.02em'
        }}>
          Become a Bluestar Operations Node.
        </h1>

        <p style={{
          fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6,
          maxWidth: 620, margin: '0 auto 32px',
        }}>
          Coordinate assigned restaurant ticket queues, moderate customer reviews, and resolve escalated dispute pipelines. Manage live operations from home using our secure, low-latency client workstation.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary" style={{ padding: '10px 24px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}>
            Submit Node Application
          </Link>
          <Link href="#capabilities" className="btn-ghost" style={{ padding: '9px 22px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}>
            System Architecture
          </Link>
        </div>
      </section>

      {/* ── ULTRA-CLEAN LIVE METRICS GRID ──────────────────── */}
      <section style={{ padding: '0 40px 80px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {STATS.map((stat) => (
            <div key={stat.label} className="panel" style={{
              padding: '20px', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace',
                  background: stat.status === 'Optimal' || stat.status === 'Active' || stat.status === 'Stable' ? 'rgba(16,185,129,0.06)' : 'rgba(59,130,246,0.06)',
                  color: stat.status === 'Optimal' || stat.status === 'Active' || stat.status === 'Stable' ? '#34d399' : 'var(--brand-light)',
                  border: `0.5px solid ${stat.status === 'Optimal' || stat.status === 'Active' || stat.status === 'Stable' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)'}`
                }}>
                  {stat.status}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'monospace' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SYSTEM CAPABILITIES (Saas Style Features) ───────── */}
      <section id="capabilities" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto', width: '100%', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
            Core Systems Capabilities
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Engineered for persistent queue moderation and low-latency command handshakes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {capabilities.map((c) => (
            <div key={c.title} className="panel" style={{
              padding: '24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)'
            }}>
              <h3 style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 8 }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SPENT TIMELINE ONBOARDING STEPS ─────────────────── */}
      <section style={{ padding: '80px 40px', background: '#07080c', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
              Operator Provisioning Timeline
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Four simple verification stages to activate your operations node key.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {steps.map((s) => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>
                  {s.num} // STAGE
                </span>
                <h3 style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MINIMALIST CTA ──────────────────────────────────── */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
            Initialize Security Assessment
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Confirm node parameters and shift availability. Operator profiles are manually reviewed by network administrators to provision custom cryptographic歡迎 packets.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '10px 28px', fontSize: 13, borderRadius: 'var(--radius-sm)' }}>
            Provision Operator Node →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)', padding: '24px 40px', background: '#050608',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace'
      }}>
        <span>© 2026 Bluestar KitchenHub Operations Node Network.</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Login</Link>
          <Link href="/register" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
