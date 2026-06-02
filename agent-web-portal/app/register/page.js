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
        minHeight: '100vh', background: '#f9fafb',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', fontFamily: "'Inter', sans-serif", color: '#111827'
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: '#111827', letterSpacing: '-0.01em' }}>
            Bluestar <span style={{ color: '#2563eb' }}>KitchenHub</span>
          </span>
        </Link>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 440, padding: '40px 36px', textAlign: 'center',
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 12 }}>
            Verify Your Email
          </h1>
          <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            A verification link has been sent to <strong style={{ color: '#111827' }}>{form.email}</strong>.
            Please check your inbox and click the link to verify your email and activate your account.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/login" style={{
              width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
              fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6,
              textDecoration: 'none', textAlign: 'center', transition: 'background 0.2s'
            }}>
              Proceed to Sign In →
            </Link>
            <button onClick={() => setVerificationSent(false)} style={{
              width: '100%', padding: '10px', background: 'transparent', color: '#6b7280',
              fontSize: 12, fontWeight: 500, border: '1px solid #d1d5db', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              ← Back to Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: "'Inter', sans-serif", color: '#111827'
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
        <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18, color: '#111827', letterSpacing: '-0.01em' }}>
          Bluestar <span style={{ color: '#2563eb' }}>KitchenHub</span>
        </span>
      </Link>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440, padding: '36px 32px',
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 6 }}>
          Apply as an Agent
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="full_name" type="text" placeholder="e.g. Jane Smith" value={form.full_name} onChange={handleChange} required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Email Address *
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="email" type="email" placeholder="e.g. jane@example.com" value={form.email} onChange={handleChange} required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Phone Number
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="phone" type="tel" placeholder="e.g. +1 (555) 000-0000" value={form.phone} onChange={handleChange}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Password *
            </label>
            <input
              style={{
                width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none'
              }}
              name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: 8
          }}>
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" /> Creating Account...
                </span>
              : 'Create Account →'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
          Your details are protected under our security standards. Approved profiles will receive access credentials for the workspace environment.
        </p>
      </div>
    </div>
  );
}

