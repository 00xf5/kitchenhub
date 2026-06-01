'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (authErr) throw authErr;

      // Redirect based on agent status
      const { data: agent } = await supabase
        .from('agents')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (agent?.status === 'approved') {
        router.push('/dashboard');
      } else {
        router.push('/status');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', bottom: -200, left: -200, width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
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
      <div className="glass" style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--radius-xl)', padding: '40px 36px' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 6 }}>
          Welcome Back
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
          New here?{' '}
          <Link href="/register" style={{ color: 'var(--brand-light)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
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
            <label className="label">Email Address</label>
            <input className="input" name="email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" name="password" type="password" placeholder="Your password" value={form.password} onChange={handleChange} required />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', fontSize: 15, marginTop: 8,
            opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" /> Signing In...
                </span>
              : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
