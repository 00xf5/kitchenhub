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
      {/* Background radial glow */}
      <div style={{
        position: 'fixed', bottom: -200, left: -200, width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo Header */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
        <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
          Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
        </span>
      </Link>

      {/* Card Wrapper */}
      <div className="panel glass animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: '36px 32px', border: '1px solid var(--border-strong)' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>
          Operator Sign In
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Audit active node status. New here?{' '}
          <Link href="/register" style={{ color: 'var(--brand-light)', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Operator Email</label>
            <input className="input" name="email" type="email" placeholder="operator@kitchenhub.com" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Security Password</label>
            <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', fontSize: 13, marginTop: 6,
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" /> Authorizing...
                </span>
              : 'Authorize Session →'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          🔐 <strong>Session Access Audit:</strong> Ingestion channel connections are recorded for compliance. Unauthorized connections will be immediately terminated.
        </div>
      </div>
    </div>
  );
}
