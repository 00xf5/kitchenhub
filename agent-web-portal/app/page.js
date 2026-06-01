'use client';
import Link from 'next/link';

const features = [
  {
    icon: '💸',
    title: 'Earn From Home',
    desc: 'Set your own schedule and earn competitive hourly rates handling restaurant reviews from anywhere.',
  },
  {
    icon: '🕐',
    title: 'Flexible Shifts',
    desc: 'Choose morning, afternoon or evening shifts. Full-time and part-time opportunities available.',
  },
  {
    icon: '🛠️',
    title: 'Powerful Tools',
    desc: 'Our purpose-built desktop app gives you everything you need — tickets, templates, and real-time support.',
  },
  {
    icon: '🚀',
    title: 'Fast Onboarding',
    desc: 'Register, apply, and get approved automatically within hours. Download the app and start the same day.',
  },
  {
    icon: '🎯',
    title: 'Clear KPIs',
    desc: 'Transparent performance metrics. Know exactly how you\'re doing and what it takes to level up.',
  },
  {
    icon: '🤝',
    title: 'Team Support',
    desc: 'Dedicated admin team available backstage. Never feel alone when handling a tough customer case.',
  },
];

const steps = [
  { n: '01', title: 'Register', desc: 'Create your free agent account in under 2 minutes.' },
  { n: '02', title: 'Apply', desc: 'Tell us a bit about yourself and your availability.' },
  { n: '03', title: 'Get Approved', desc: 'Applications are reviewed and approved within 3 hours.' },
  { n: '04', title: 'Start Working', desc: 'Download the app, log in with your ID, and start earning.' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>⭐</div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>
            Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn-ghost" style={{ padding: '8px 20px', fontSize: 13 }}>Log In</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>Become an Agent</Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        padding: '120px 40px 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow blobs */}
        <div style={{
          position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 100, left: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 'var(--radius-full)',
            background: 'var(--brand-dim)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: 12, fontWeight: 600, color: 'var(--brand-light)',
            marginBottom: 32, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-light)', display: 'inline-block' }} />
            Now Hiring — Remote Agents
          </div>

          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 900,
            fontSize: 'clamp(38px, 6vw, 76px)', lineHeight: 1.1,
            color: 'var(--text-primary)', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px',
          }}>
            Turn Customer Reviews Into{' '}
            <span className="gradient-text">Your Income</span>
          </h1>

          <p style={{
            fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 560, margin: '0 auto 48px',
          }}>
            Join hundreds of remote agents managing restaurant feedback for Bluestar KitchenHub.
            Flexible hours, great pay, zero commute.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '15px 36px', fontSize: 16 }}>
              Become an Agent →
            </Link>
            <Link href="#how-it-works" className="btn-ghost" style={{ padding: '15px 36px', fontSize: 16 }}>
              How It Works
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 60, display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['500+', 'Active Agents'], ['3hrs', 'Avg. Approval Time'], ['4.8★', 'Agent Satisfaction']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)' }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 36, color: 'var(--text-primary)', marginBottom: 12 }}>
            Everything You Need to Succeed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Built for remote agents who want results, not complexity.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="glass" style={{
              padding: '28px 28px', borderRadius: 'var(--radius-lg)',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 40px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 36, color: 'var(--text-primary)', marginBottom: 12 }}>
            From Zero to Earning in 4 Steps
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ position: 'relative', textAlign: 'center' }}>
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 22, left: 'calc(50% + 30px)', right: '-50%',
                  height: 1, background: 'linear-gradient(90deg, var(--border-strong), transparent)',
                  display: 'none',
                }} />
              )}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--brand-dim)', border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--brand-light)',
              }}>{s.n}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{
          maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '60px 48px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(34,211,238,0.07) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 34, color: 'var(--text-primary)', marginBottom: 16 }}>
            Ready to Join the Team?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.65 }}>
            Create your free account today and get approved in as little as 3 hours.
            No experience required.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '15px 40px', fontSize: 16 }}>
            Apply Now — It's Free
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '28px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>© 2026 Bluestar KitchenHub. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>Agent Login</Link>
          <Link href="/register" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>Register</Link>
        </div>
      </footer>
    </div>
  );
}
