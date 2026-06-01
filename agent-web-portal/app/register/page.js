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

      // 1. Create Supabase Auth user (Trigger handle_new_user automatically populates agents and applications tables)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
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
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 16, height: 16, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>
            Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass" style={{ width: '100%', maxWidth: 460, borderRadius: 'var(--radius-xl)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✉️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 12 }}>
            Verify Your Email
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>
            We've sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>.
            Please check your inbox and click the link to confirm your account and activate your portal credentials.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/login" className="btn-primary" style={{ width: '100%', padding: '14px', textDecoration: 'none', textAlign: 'center', fontSize: 14 }}>
              Proceed to Login →
            </Link>
            <button onClick={() => setVerificationSent(false)} className="btn-ghost" style={{ width: '100%', padding: '12px', fontSize: 13 }}>
              ← Back to Registration
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
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, textDecoration: 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: 16, height: 16, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>
          Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
        </span>
      </Link>

      {/* Card */}
      <div className="glass" style={{ width: '100%', maxWidth: 440, borderRadius: 'var(--radius-xl)', padding: '40px 36px' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 6 }}>
          Create Your Agent Account
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-light)', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
        </p>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5', fontSize: 13, marginBottom: 20,
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="label">Full Name *</label>
            <input className="input" name="full_name" type="text" placeholder="Jane Smith" value={form.full_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input className="input" name="email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" name="phone" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', fontSize: 15, marginTop: 8,
            opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" /> Creating Account...
                </span>
              : 'Create My Agent Account →'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          By registering, you agree to our terms of service. Nodes are provisioned securely via manual verification.
        </p>
      </div>
    </div>
  );
}
