'use client';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Sign In', href: '/login' },
];

const STATS = [
  { value: '24/7', label: 'Shift Coverage' },
  { value: '100%', label: 'Remote Operations' },
  { value: '< 24h', label: 'Review Turnaround' },
  { value: 'Secure', label: 'Encrypted Ingestion' },
];

const FEATURES = [
  {
    title: 'Queue Management Console',
    desc: 'A dedicated desktop workstation client gives you direct access to your assigned restaurant review queue. Organized, fast, and purpose-built for high-volume ticket resolution.',
  },
  {
    title: 'Flexible Shift Scheduling',
    desc: 'Choose from a range of shift windows that match your availability. Full-time, part-time, evenings, or nights — structured coverage options to fit your schedule.',
  },
  {
    title: 'Encrypted Operator Credentials',
    desc: 'Every approved operator receives a unique login token generated at onboarding. Your credentials are provisioned manually by the administration team, never auto-issued.',
  },
  {
    title: 'Real-Time Escalation Routing',
    desc: 'Complex or high-priority disputes are automatically escalated with full audit trails. Stay informed at every stage with structured status updates in the client.',
  },
  {
    title: 'Performance Transparency',
    desc: 'Monitor resolution rates, shift history, and queue throughput metrics directly within the workstation. Clear visibility into your contribution and standing.',
  },
  {
    title: 'Direct Admin Support',
    desc: 'A support channel connects you to your designated supervisor. Structured escalation paths mean issues are resolved quickly without lengthy wait times.',
  },
];

const STEPS = [
  {
    num: 1,
    title: 'Create Your Account',
    desc: 'Register with your full name, email address, and a secure password. A verification link will be sent to confirm your identity.',
  },
  {
    num: 2,
    title: 'Complete Your Profile',
    desc: 'Provide a brief background on your customer service experience and select your preferred shift availability window.',
  },
  {
    num: 3,
    title: 'Administrator Review',
    desc: 'Our operations team reviews your profile and manually provisions your unique desktop login credentials upon approval.',
  },
  {
    num: 4,
    title: 'Download & Start Working',
    desc: 'Install the KitchenHub workstation client, sign in with your issued login ID, and begin handling your assigned queue.',
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111827', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #e5e7eb',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 17, color: '#111827', letterSpacing: '-0.01em' }}>
              Bluestar <span style={{ color: '#2563eb' }}>KitchenHub</span>
            </span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
            <Link href="/register" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#2563eb', padding: '8px 20px', borderRadius: 6, textDecoration: 'none' }}>
              Apply Now
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '4px 12px', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Now Accepting Applications</span>
            </div>

            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 44, lineHeight: 1.12, color: '#111827', marginBottom: 20, letterSpacing: '-0.02em' }}>
              Work From Home.<br />Handle Real Restaurant<br />Operations.
            </h1>

            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              Join the Bluestar KitchenHub remote operations network. Manage assigned restaurant review queues, resolve customer disputes, and maintain brand standards — entirely from your own workstation.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: '#2563eb', padding: '12px 28px', borderRadius: 6, textDecoration: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                Apply for a Position
              </Link>
              <Link href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', border: '1px solid #d1d5db' }}>
                See How It Works
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
              Network Operations Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {STATS.map((s) => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 30, color: '#111827', lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', lineHeight: 1.65 }}>
              Operator profiles are reviewed and approved manually by our operations administrators. You will receive your unique workstation credentials upon approval.
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Platform Features</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 30, color: '#111827', letterSpacing: '-0.01em', maxWidth: 520, lineHeight: 1.2 }}>
              Everything you need to run a productive remote shift.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#e5e7eb', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: '#fff', padding: '28px 26px' }}>
                <h3 style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Onboarding Process</div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 30, color: '#111827', letterSpacing: '-0.01em' }}>
              From application to active in four steps.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 36 }}>
            {STEPS.map((s) => (
              <div key={s.num}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: '#2563eb' }}>{s.num}</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section style={{ background: '#1e3a8a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 26, color: '#fff', marginBottom: 8, letterSpacing: '-0.01em' }}>
              Ready to join the operations team?
            </h2>
            <p style={{ fontSize: 14, color: '#93c5fd', lineHeight: 1.65, maxWidth: 520 }}>
              Submit your application today. Our team reviews every profile and responds within one business day with your onboarding details.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/register" style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', background: '#fff', padding: '12px 28px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Submit Application
            </Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: '#bfdbfe', background: 'transparent', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', border: '1px solid rgba(191,219,254,0.3)', whiteSpace: 'nowrap' }}>
              Existing Operator Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 20, height: 20, borderRadius: 4 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>Bluestar KitchenHub</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/login" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>Operator Login</Link>
            <Link href="/register" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>Register</Link>
          </div>
          <span style={{ fontSize: 12, color: '#4b5563' }}>© 2026 Bluestar KitchenHub. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
