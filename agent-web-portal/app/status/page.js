'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { key: 'registered',    label: 'Account Created',  desc: 'Your agent profile has been registered.' },
  { key: 'under_review',  label: 'Profile Under Review', desc: 'Our operations team is reviewing your availability and background.' },
  { key: 'approved',      label: 'Application Approved', desc: 'Your agent workstation access is active.' },
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
  
  // Activity logs state
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalBottomRef = useRef(null);

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

        // Initialize activity logs if questionnaire is already submitted
        if (appData && appData.experience_text) {
          generateTerminalLogs(user.id);
        }

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

  // Handle scrolling of activity logs
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const generateTerminalLogs = (userId) => {
    const formattedId = userId.substring(0, 8).toUpperCase();
    const initialLogs = [
      { t: '16:32:01', l: 'info', m: `Initializing agent application verification workflow...` },
      { t: '16:32:02', l: 'success', m: `Account verification complete for User ID: ${formattedId}` },
      { t: '16:32:03', l: 'info', m: `Registering background and shift preferences in database...` },
      { t: '16:32:04', l: 'success', m: `Intake records successfully saved.` },
      { t: '16:32:06', l: 'info', m: `Verifying shift availability parameters... SAVED` },
      { t: '16:32:07', l: 'info', m: `Generating agent workstation workspace credentials...` },
      { t: '16:32:09', l: 'success', m: `Access Key created and encrypted. Pending manager sign-off.` },
      { t: '16:32:10', l: 'warning', m: `Awaiting administrator verification. Notification dispatched.` },
      { t: '16:32:12', l: 'info', m: `Standing by for application approval signature...` },
      { t: '16:32:15', l: 'info', m: `Monitoring application status replication stream... STABLE` },
    ];
    setTerminalLogs(initialLogs);

    // Add dummy real-time ticks
    const interval = setInterval(() => {
      setTerminalLogs(prev => {
        const time = new Date().toTimeString().split(' ')[0];
        const newTicks = [
          ...prev,
          { t: time, l: 'info', m: 'Heartbeat checked. Monitoring for approval status update...' }
        ];
        // Cap logs at 30 entries
        return newTicks.slice(-30);
      });
    }, 15000);

    return () => clearInterval(interval);
  };

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
      
      // Instantly start activity simulation logs
      const { data: { user } } = await createClient().auth.getUser();
      generateTerminalLogs(user.id);

    } catch (err) {
      setError(err.message || 'Failed to submit application form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #eff6ff', borderTopColor: '#2563eb', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  // Database tables have not been created yet
  if (dbMissing) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", color: '#111827' }}>
        <div style={{ width: '100%', maxWidth: 540, borderRadius: 12, padding: '36px', border: '1px solid #fee2e2', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 36, marginBottom: 14, textAlign: 'center' }}>⚙️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 12, textAlign: 'center' }}>
            Database Setup Required
          </h1>
          <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
            To run the agent onboarding platform, you need to initialize the required schema tables in your Supabase project. We have provided a schema script for you.
          </p>

          <div style={{ background: '#f9fafb', borderRadius: 6, padding: '16px 20px', border: '1px solid #e5e7eb', marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>How to set up the tables:</h3>
            <ol style={{ paddingLeft: 16, fontSize: 12, color: '#4b5563', lineHeight: 1.8 }}>
              <li>Open your <strong>Supabase Dashboard</strong>.</li>
              <li>Navigate to the <strong>SQL Editor</strong> tab.</li>
              <li>Open the file <code style={{ color: '#2563eb', background: '#eff6ff', padding: '2px 5px', borderRadius: 3, fontFamily: 'monospace' }}>schema.sql</code> located at the root of the project.</li>
              <li>Copy its entire content, paste it into the editor, and click <strong>Run</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
          </div>

          <button onClick={() => window.location.reload()} style={{
            width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'background 0.2s'
          }}>
            🔄 I've Run the Schema, Refresh Page
          </button>
          
          <button onClick={handleLogout} style={{
            width: '100%', padding: '10px', marginTop: 10, background: 'transparent', color: '#6b7280',
            fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}>
            Log Out
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = getStepIndex(agent?.status);
  const showQuestionnaire = !application || !application.experience_text || !application.availability;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '0 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Inter', sans-serif", color: '#111827' }}>
      
      {/* Top Header Panel */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, width: '100%',
        borderBottom: '1px solid #e5e7eb',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        marginBottom: 40
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 24, height: 24, borderRadius: 5, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.01em' }}>
              Bluestar <span style={{ color: '#2563eb' }}>KitchenHub</span>
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Agent ID: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>KH-{agent?.id?.substring(0,6).toUpperCase()}</strong>
            </span>
            <button onClick={handleLogout} style={{
              padding: '6px 14px', background: 'transparent', color: '#6b7280',
              fontSize: 11, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
            }}>Log Out</button>
          </div>
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: 960, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        
        {showQuestionnaire ? (
          /* Application Questionnaire Form */
          <div style={{ borderRadius: 12, padding: '36px', maxWidth: 640, margin: '0 auto', border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: '#111827', marginBottom: 8 }}>
              Complete Your Onboarding Profile
            </h1>
            <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Provide the details below to complete your registration. Our team will review your application parameters manually.
            </p>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#b91c1c', fontSize: 12, marginBottom: 20 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Customer Service & Operations Background *
                </label>
                <textarea
                  style={{
                    width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #d1d5db',
                    borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none',
                    minHeight: 110, resize: 'vertical', lineHeight: 1.5, fontFamily: 'sans-serif'
                  }}
                  name="experience_text"
                  placeholder="Describe your previous experience with ticket queues, customer support, data entry, or resolving user issues."
                  value={form.experience_text}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Weekly Shift Availability *
                </label>
                <select
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 14px center / 14px',
                    border: '1px solid #d1d5db', borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none',
                    appearance: 'none'
                  }}
                  name="availability"
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

              <div style={{ padding: '12px 16px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e4ed8', lineHeight: 1.55 }}>
                💡 <strong>Application Under Review:</strong> Once submitted, your profile is routed directly to our operations pipeline. You will be updated automatically.
              </div>

              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '12px', background: '#2563eb', color: '#fff',
                fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: 6,
                opacity: submitting ? 0.7 : 1
              }}>
                {submitting ? 'Submitting Profile...' : 'Submit Profile Data →'}
              </button>
            </form>
          </div>
        ) : (
          /* Two Column Timeline & Real-time Progress tracker */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left Column: Onboarding status details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: '#111827', marginBottom: 8 }}>
                  Application Under Review
                </h1>
                <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                  Welcome, <strong style={{ color: '#111827' }}>{agent?.full_name?.split(' ')[0]}</strong>! Your application has been submitted successfully. 
                  Our operations team is currently reviewing your shift window and experience background.
                </p>
                <div style={{ padding: '10px 14px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e4ed8', lineHeight: 1.5 }}>
                  💡 <strong>System Note:</strong> Keep this connection window open. The moment the administrator approves your profile, this page will automatically redirect to your workspace dashboard.
                </div>
              </div>

              {/* Status Timeline */}
              <div style={{ padding: '24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STEPS.map((step, i) => {
                    const done = i <= stepIndex;
                    const active = i === stepIndex;
                    return (
                      <div key={step.key} style={{ display: 'flex', gap: 16, paddingBottom: i < STEPS.length - 1 ? 24 : 0, position: 'relative' }}>
                        {/* Connector line */}
                        {i < STEPS.length - 1 && (
                          <div style={{
                            position: 'absolute', left: 13, top: 28, width: 2, bottom: -12,
                            background: done && i < stepIndex ? '#2563eb' : '#e5e7eb',
                            transition: 'background 0.5s',
                          }} />
                        )}
                        {/* Dot */}
                        <div style={{
                          width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
                          background: done ? (active ? '#2563eb' : 'rgba(37,99,235,0.1)') : '#f3f4f6',
                          border: `2.5px solid ${done ? '#3b82f6' : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, zIndex: 1,
                          boxShadow: active ? '0 0 15px rgba(37,99,235,0.2)' : 'none',
                          transition: 'all 0.4s',
                          color: done ? '#fff' : '#9ca3af'
                        }}>
                          {done && i < stepIndex ? '✓' : active ? (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                          ) : ''}
                        </div>
                        {/* Text */}
                        <div style={{ paddingTop: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: done ? '#111827' : '#9ca3af', marginBottom: 2 }}>{step.label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{step.desc}</div>
                          {active && step.key === 'under_review' && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} className="glow-point" />
                              AWAITING ADMINISTRATOR APPROVAL...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Onboarding Activity History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{
                  padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'sans-serif', fontSize: 12, color: '#4b5563', fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                    <span>Onboarding Status Stream</span>
                  </div>
                  <div style={{ color: '#2563eb', fontSize: 11, fontWeight: 700 }}>ACTIVE</div>
                </div>

                {/* Log Lines Container */}
                <div style={{
                  height: 380, overflowY: 'auto', padding: '16px',
                  background: '#fff', display: 'flex', flexDirection: 'column', gap: 8
                }}>
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} style={{
                      display: 'flex', gap: 12, padding: '8px 12px', borderRadius: 6,
                      background: log.l === 'success' ? '#f0fdf4' : log.l === 'warning' ? '#fef3c7' : '#eff6ff',
                      border: `1px solid ${log.l === 'success' ? '#bbf7d0' : log.l === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                      fontSize: 12, color: '#374151', lineHeight: 1.45
                    }}>
                      <span style={{ color: '#6b7280', fontFamily: 'monospace', flexShrink: 0 }}>[{log.t}]</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{
                          color: log.l === 'success' ? '#16a34a' : log.l === 'warning' ? '#b45309' : '#1d4ed8',
                          textTransform: 'uppercase', fontSize: 10, marginRight: 8, letterSpacing: '0.04em'
                        }}>[{log.l === 'info' ? 'System' : log.l}]</strong>
                        <span style={{ color: '#374151' }}>{log.m}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
                Active Heartbeat Listener (Interval: 15s) · Secure Session Connected
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

