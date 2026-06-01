'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      const redirectToUrl = typeof window !== 'undefined' ? `${window.location.origin}/status` : 'https://bluestar-pi.vercel.app/status';

      // 1. Create Supabase Auth user (Trigger handle_new_user automatically populates agents and applications tables)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: redirectToUrl,
          data: {
            full_name: form.full_name,
            phone: form.phone || null,
          }
        },
      });
      if (authErr) throw authErr;

      // 2. Check if a session was immediately established (email verification disabled)
      if (authData?.session) {
        router.push('/status');
      } else {
        // Email verification is enabled, user must verify email first
        setVerificationSent(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'fixed', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
            Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
          </span>
        </Link>

        {/* Card */}
        <div className="panel glass animate-fade-up" style={{ width: '100%', maxWidth: 440, padding: '40px 36px', textAlign: 'center', border: '1px solid var(--border-strong)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>
            Confirm Credentials
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            An activation link has been sent to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>.
            Please verify the dispatch message in your mail client to generate your operator portal key and access details.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/login" className="btn-primary" style={{ width: '100%', padding: '12px', textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>
              Proceed to Login →
            </Link>
            <button onClick={() => setVerificationSent(false)} className="btn-ghost" style={{ width: '100%', padding: '10px', fontSize: 12 }}>
              ← Modify Credentials
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
        <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
          Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
        </span>
      </Link>

      {/* Card */}
      <div className="panel glass animate-fade-up" style={{ width: '100%', maxWidth: 440, padding: '36px 32px', border: '1px solid var(--border-strong)' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>
          Register Operator Node
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-light)', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: 12, marginBottom: 20, fontFamily: 'monospace'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Operator Full Name *</label>
            <input className="input" name="full_name" type="text" placeholder="Jane Smith" value={form.full_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Primary Email *</label>
            <input className="input" name="email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Contact Telephone</label>
            <input className="input" name="phone" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Access Password *</label>
            <input className="input" name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', fontSize: 13, marginTop: 8,
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" /> Provisioning...
                </span>
              : 'Provision Operator Node →'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
          Operator sessions are initialized in strict compliance with secure auditing standards. Security profiles are manually cryptographic key provisioned.
        </p>
      </div>
    </div>
  );
}
