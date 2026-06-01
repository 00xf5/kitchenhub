'use client';
import Link from 'next/link';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'Distributed Queue Console',
    desc: 'Access restaurant operations and live review feeds from any location using the secure console desktop client.',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Precision Scheduling',
    desc: 'Select standard high-volume shifts. Maintain dedicated coverage with full transparency on availability metrics.',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Low-Latency Tooling',
    desc: 'The custom Electron desktop environment utilizes optimized network pipes for rapid ticket processing and state updates.',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure Onboarding',
    desc: 'Create credentials, complete the telemetry questionnaire, and automatically trigger admin verification pipelines.',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Telemetry & KPIs',
    desc: 'Real-time monitoring of response intervals, resolution success rates, and shift metrics recorded via telemetry hooks.',
  },
  {
    icon: (
      <svg className="w-6 h-6" style={{ width: 24, height: 24, color: 'var(--brand-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Synchronized Backstage Support',
    desc: 'Access admin remote session assistance instantly whenever resolving highly escalated dispute claims.',
  },
];

const steps = [
  { n: '01', title: 'Node Registration', desc: 'Initialize your local credentials on the secure onboarding portal.' },
  { n: '02', title: 'Questionnaire Dispatch', desc: 'Provide your operational shift metrics and experience history.' },
  { n: '03', title: 'Admin Verification', desc: 'Your profile is sent securely to our dashboard via Telegram for manual review.' },
  { n: '04', title: 'Terminal Connection', desc: 'Download the desktop app, log in with your access code, and connect to the queue.' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(7,8,13,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg style={{ width: 16, height: 16, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>
              Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
            </span>
          </div>

          {/* Telemetry Status Indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace',
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)',
            padding: '4px 10px', borderRadius: 99, color: 'var(--green)',
            letterSpacing: '0.05em'
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
              display: 'inline-block', boxShadow: '0 0 8px var(--green)'
            }} />
            OPERATIONAL: 1,248 ACTIVE NODES
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn-ghost" style={{ padding: '8px 20px', fontSize: 13 }}>Log In</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>Join the Network</Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        padding: '120px 40px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.3,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 'var(--radius-full)',
            background: 'var(--brand-dim)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: 11, fontWeight: 600, color: 'var(--brand-light)',
            marginBottom: 32, letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'monospace'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-light)', display: 'inline-block' }} />
            Now Recruiting Onboard Operations
          </div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 900,
            fontSize: 'clamp(38px, 5.5vw, 68px)', lineHeight: 1.15,
            color: 'var(--text-primary)', marginBottom: 24, maxWidth: 900, margin: '0 auto 24px',
            letterSpacing: '-0.02em'
          }}>
            Distributed Queue Console for <span className="gradient-text">Restaurant Operations</span>
          </h1>

          <p style={{
            fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 620, margin: '0 auto 48px',
          }}>
            Join our global distributed network of support professionals. Manage assigned customer review feeds, resolve escalated restaurant complaints, and maintain peak brand loyalty using the low-latency Electron console.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '15px 36px', fontSize: 14 }}>
              Apply for Console Access →
            </Link>
            <Link href="#how-it-works" className="btn-ghost" style={{ padding: '15px 36px', fontSize: 14 }}>
              Explore Architecture
            </Link>
          </div>

          {/* Technical stats */}
          <div style={{ marginTop: 80, display: 'flex', gap: 60, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              ['1.2k+', 'Distributed Nodes'],
              ['Telegram Dispatch', 'Instant Telemetry'],
              ['99.98%', 'Queue Uptime']
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center', minWidth: 150 }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.01em' }}>
            System Capabilities
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Designed for low-latency workflow execution and full session compliance.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="glass" style={{
              padding: '32px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.01em' }}>
            Onboarding Protocol
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ position: 'relative', textAlign: 'left', padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--brand-light)',
              }}>{s.n}</div>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '60px 48px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99,102,241,0.02)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.01em' }}>
            Initialize Onboarding Pipeline
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 36px' }}>
            Submit your node specifications and operational availability. Profiles are processed securely via encrypted administrator validation channels.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '14px 40px', fontSize: 14 }}>
            Apply for Node Access →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>© 2026 Bluestar KitchenHub. Node Operations.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/login" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'monospace' }}>Agent Login</Link>
          <Link href="/register" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'monospace' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
