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
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: "'Inter', sans-serif", color: '#111827'
    }}>
      {/* Logo Header */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
        <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: '#111827', letterSpacing: '-0.01em' }}>
          Bluestar <span style={{ color: '#2563eb' }}>KitchenHub</span>
        </span>
      </Link>

      {/* Card Wrapper */}
      <div style={{
        width: '100%', maxWidth: 400, padding: '36px 32px',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 6 }}>
          Sign In
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          Access your agent workspace. New here?{' '}
          <Link href="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#b91c1c', fontSize: 12, marginBottom: 20
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="email" type="email" placeholder="jane@example.com" value={form.email} onChange={handleChange} required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Password
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: 6
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" /> Signing In...
                </span>
              : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
          🔐 <strong>Secure Connection:</strong> Your session is encrypted and protected under standard security protocols.
        </div>
      </div>
    </div>
  );
}

