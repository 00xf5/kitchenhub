'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { key: 'registered',    label: 'Account Created',     desc: 'Your account has been successfully registered.' },
  { key: 'under_review',  label: 'Application Received', desc: 'Our team has received your application.' },
  { key: 'approved',      label: 'Approved! 🎉',         desc: 'Congratulations — you are now a Bluestar Agent.' },
];

function getStepIndex(status) {
  if (status === 'approved') return 2;
  return 1; // pending or under_review both sit at step 1
}

export default function StatusPage() {
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);
  const [form, setForm] = useState({ experience_text: '', availability: 'Full-time (9 AM - 5 PM)' });
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    let channel;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Test if agents table exists by making a simple select
        const { data: agentCheck, error: agentCheckErr } = await supabase
          .from('agents')
          .select('*')
          .eq('id', user.id)
          .single();

        if (agentCheckErr && (agentCheckErr.code === 'PGRST205' || agentCheckErr.message?.includes("Could not find the table"))) {
          setDbMissing(true);
          setLoading(false);
          return;
        }

        let currentAgent = agentCheck;
        if (currentAgent?.status === 'approved') {
          router.push('/dashboard');
          return;
        }

        setAgent(currentAgent);

        // Fetch application questionnaire details
        const { data: appData } = await supabase
          .from('applications')
          .select('*')
          .eq('agent_id', user.id)
          .single();

        setApplication(appData);
        setLoading(false);

        // Realtime subscription — auto-redirect on approval
        channel = supabase
          .channel('agent-status-' + user.id)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'agents', filter: `id=eq.${user.id}`,
          }, (payload) => {
            setAgent(payload.new);
            if (payload.new.status === 'approved') {
              router.push('/dashboard');
            }
          })
          .subscribe();
      } catch (err) {
        console.error('Onboarding load error:', err);
        setLoading(false);
      }
    }
    load();
    return () => { if (channel) channel.unsubscribe(); };
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_text: form.experience_text,
          availability: form.availability,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to submit application.');
      }

      const data = await response.json();

      if (data.agent?.status === 'approved') {
        router.push('/dashboard');
        return;
      }

      setAgent(data.agent);
      setApplication({ experience_text: form.experience_text, availability: form.availability });
    } catch (err) {
      setError(err.message || 'Failed to submit application form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--brand-dim)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  // Database tables have not been created yet
  if (dbMissing) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ width: '100%', maxWidth: 580, borderRadius: 'var(--radius-xl)', padding: '40px 36px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 44, marginBottom: 16, textAlign: 'center' }}>⚙️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
            Database Tables Missing
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, marginBottom: 24, textAlign: 'center' }}>
            To run the agent onboarding platform, you need to create the required database tables in your Supabase project. We have provided a schema script for you.
          </p>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>How to set up the tables:</h3>
            <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <li>Open your <strong>Supabase Dashboard</strong>.</li>
              <li>Navigate to the <strong>SQL Editor</strong> tab.</li>
              <li>Open the file <code style={{ color: 'var(--cyan)', background: 'rgba(34,211,238,0.08)', padding: '2px 6px', borderRadius: 4 }}>schema.sql</code> located at the root of the web portal directory.</li>
              <li>Copy its entire content, paste it into the editor, and click <strong>Run</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
          </div>

          <button onClick={() => window.location.reload()} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            🔄 I've Run the Schema, Refresh Page
          </button>
          
          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', padding: '12px', marginTop: 12 }}>
            Log Out
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = getStepIndex(agent?.status);
  const showQuestionnaire = !application || !application.experience_text || !application.availability;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand) 0%, var(--cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⭐</div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>KitchenHub</span>
        </Link>
        <button onClick={handleLogout} className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>Log Out</button>
      </div>

      <div style={{ width: '100%', maxWidth: 620, position: 'relative', zIndex: 1 }}>
        
        {showQuestionnaire ? (
          /* Application Questionnaire Form */
          <div className="glass animate-fade-up" style={{ borderRadius: 'var(--radius-xl)', padding: '40px 36px' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', marginBottom: 8 }}>
              Complete Your Application Profile
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Please provide the following details to submit your application for review. Applications are automatically processed.
            </p>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 20 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="label">Customer Service Experience *</label>
                <textarea
                  className="input"
                  name="experience_text"
                  placeholder="Describe any past experience with customer relations, call centers, email support, or review moderation. (Tip: Type 'force-approve' to test approval instantly)"
                  style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.5 }}
                  value={form.experience_text}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label className="label">Weekly Shift Availability *</label>
                <select
                  className="input"
                  name="availability"
                  style={{ appearance: 'none', background: 'var(--bg-elevated) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%238b8fa8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 16px center / 16px' }}
                  value={form.availability}
                  onChange={handleFormChange}
                  required
                >
                  <option value="Full-time (9 AM - 5 PM)">Full-time (9 AM - 5 PM)</option>
                  <option value="Part-time (Flexible hours)">Part-time (Flexible hours)</option>
                  <option value="Weekends & Evenings">Weekends & Evenings</option>
                  <option value="Night Shift (10 PM - 6 AM)">Night Shift (10 PM - 6 AM)</option>
                </select>
              </div>

              <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'var(--cyan-dim)', border: '1px solid rgba(34,211,238,0.15)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                💡 <strong>Note:</strong> Once submitted, your profile will be sent to our management team for manual review. We will contact you soon.
              </div>

              <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 8, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting Application...' : 'Submit Application Form →'}
              </button>
            </form>
          </div>
        ) : (
          /* Timeline / Reviewing screen */
          <div className="animate-fade-up">
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 10 }}>
                Application Under Review
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65 }}>
                Hey <strong style={{ color: 'var(--text-primary)' }}>{agent?.full_name?.split(' ')[0]}</strong>! Your application has been received.
                Our team is reviewing your profile and will contact you shortly via email with onboarding details.
              </p>
            </div>

            {/* Timeline */}
            <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '36px 40px', marginBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 20, paddingBottom: i < STEPS.length - 1 ? 32 : 0, position: 'relative' }}>
                      {/* Connector line */}
                      {i < STEPS.length - 1 && (
                        <div style={{
                          position: 'absolute', left: 19, top: 40, width: 2, bottom: 0,
                          background: done && i < stepIndex ? 'var(--brand)' : 'var(--border-strong)',
                          transition: 'background 0.5s',
                        }} />
                      )}
                      {/* Dot */}
                      <div style={{
                        width: 40, height: 40, flexShrink: 0, borderRadius: '50%',
                        background: done ? (active ? 'var(--brand)' : 'rgba(99,102,241,0.3)') : 'var(--bg-elevated)',
                        border: `2px solid ${done ? 'var(--brand)' : 'var(--border-strong)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, zIndex: 1,
                        boxShadow: active ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.4s',
                      }}>
                        {done && i < stepIndex ? '✓' : active ? (
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        ) : ''}
                      </div>
                      {/* Text */}
                      <div style={{ paddingTop: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: done ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: 4, transition: 'color 0.4s' }}>{step.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step.desc}</div>
                        {active && step.key === 'under_review' && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--brand-light)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-light)', display: 'inline-block', animation: 'ping 1.2s infinite' }} />
                            Reviewing your details…
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info card */}
            <div style={{
              padding: '18px 22px', borderRadius: 'var(--radius-md)',
              background: 'var(--cyan-dim)', border: '1px solid rgba(34,211,238,0.2)',
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
            }}>
              💡 <strong style={{ color: 'var(--text-primary)' }}>Tip:</strong> Keep this tab open — the page will automatically refresh and redirect you to your dashboard the moment your profile is approved.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

