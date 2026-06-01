'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { key: 'registered',    label: 'Profile Registered',  desc: 'Your operator node identity has been securely created.' },
  { key: 'under_review',  label: 'Assessment Received', desc: 'Availability metrics and intake logs successfully indexed.' },
  { key: 'approved',      label: 'Activated & Cleared', desc: 'Secure BSK credentials generated. Ready for shift connection.' },
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
  
  // Terminal logs state
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

        // Initialize terminal logs if questionnaire is already submitted
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

  // Handle scrolling of terminal logs
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const generateTerminalLogs = (userId) => {
    const formattedId = userId.substring(0, 8).toUpperCase();
    const initialLogs = [
      { t: '16:32:01', l: 'info', m: `Initializing secure SSH session pipeline to POP US-East...` },
      { t: '16:32:02', l: 'success', m: `Session authorized. User identity successfully matched to token UUID:${formattedId}` },
      { t: '16:32:03', l: 'info', m: `Syncing agent metadata profile with central operations database...` },
      { t: '16:32:04', l: 'success', m: `Intake records successfully updated in table "applications".` },
      { t: '16:32:06', l: 'info', m: `Checking operator clearance availability parameters... APPROVED` },
      { t: '16:32:07', l: 'info', m: `Generating encrypted operator Smart-Card access credentials...` },
      { t: '16:32:09', l: 'success', m: `Secure key generated. Login Token: [BSK-AG-XXXXX] encrypted.` },
      { t: '16:32:10', l: 'warning', m: `Manual administrator verification signature required. Telemetry dispatch forwarded to Telegram.` },
      { t: '16:32:12', l: 'info', m: `Awaiting secure operator clearance sign-off from system control room...` },
      { t: '16:32:15', l: 'info', m: `Poller active. Listening for Postgres replication stream changes... STABLE [14ms]` },
    ];
    setTerminalLogs(initialLogs);

    // Add dummy real-time ticks
    const interval = setInterval(() => {
      setTerminalLogs(prev => {
        const time = new Date().toTimeString().split(' ')[0];
        const newTicks = [
          ...prev,
          { t: time, l: 'info', m: 'Keep-Alive: Heartbeat poll dispatched. Listening for status change...' }
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
      
      // Instantly start terminal simulation logs
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--brand-dim)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }

  // Database tables have not been created yet
  if (dbMissing) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="panel glass animate-fade-up" style={{ width: '100%', maxWidth: 540, borderRadius: 'var(--radius-lg)', padding: '36px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 36, marginBottom: 14, textAlign: 'center' }}>⚙️</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
            Database Tables Missing
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
            To run the agent onboarding platform, you need to initialize the required schema tables in your Supabase project. We have provided a schema script for you.
          </p>

          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>How to set up the tables:</h3>
            <ol style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <li>Open your <strong>Supabase Dashboard</strong>.</li>
              <li>Navigate to the <strong>SQL Editor</strong> tab.</li>
              <li>Open the file <code style={{ color: 'var(--cyan)', background: 'rgba(6,182,212,0.06)', padding: '2px 5px', borderRadius: 3, fontFamily: 'monospace' }}>schema.sql</code> located at the root of the project.</li>
              <li>Copy its entire content, paste it into the editor, and click <strong>Run</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
          </div>

          <button onClick={() => window.location.reload()} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
            🔄 I've Run the Schema, Refresh Page
          </button>
          
          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', padding: '10px', marginTop: 10 }}>
            Log Out
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = getStepIndex(agent?.status);
  const showQuestionnaire = !application || !application.experience_text || !application.availability;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Header Panel */}
      <div style={{ width: '100%', maxWidth: 960, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Bluestar KitchenHub" style={{ width: 24, height: 24, borderRadius: 5 }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            Bluestar <span style={{ color: 'var(--brand-light)' }}>KitchenHub</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Node ID: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>BSK-NODE-{agent?.id?.substring(0,6).toUpperCase()}</strong>
          </span>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}>Log Out</button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 960, position: 'relative', zIndex: 1 }}>
        
        {showQuestionnaire ? (
          /* Application Questionnaire Form */
          <div className="panel glass animate-fade-up" style={{ borderRadius: 'var(--radius-lg)', padding: '36px', maxWidth: 640, margin: '0 auto', border: '1px solid var(--border-strong)' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
              Complete Your Onboarding Profile
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Provide the following details to register your operations node. Your security profile will be manually verified by the administrator.
            </p>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 12, marginBottom: 20 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Customer Service & Operations Background *</label>
                <textarea
                  className="input"
                  name="experience_text"
                  placeholder="Describe your previous experience with ticket queue moderation, user support, call centers, or escalations."
                  style={{ minHeight: 110, resize: 'vertical', lineHeight: 1.5, fontFamily: 'sans-serif' }}
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
                  style={{ appearance: 'none', background: 'var(--bg-elevated) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 14px center / 14px' }}
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

              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--cyan-dim)', border: '1px solid rgba(6,182,212,0.15)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                💡 <strong>Clearance Processing Note:</strong> Once submitted, your profile is routed directly to our operations pipeline. You will be updated automatically.
              </div>

              <button className="btn-primary" type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', fontSize: 13, marginTop: 6, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Registering Intake Details...' : 'Submit Profile Data →'}
              </button>
            </form>
          </div>
        ) : (
          /* Two Column Timeline & Real-time Provisioning Terminal */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start' }} className="animate-fade-up">
            
            {/* Left Column: Onboarding status details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="panel" style={{ padding: '24px', background: '#0a0d16', border: '1px solid var(--border-strong)' }}>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Assessment Under Review
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                  Welcome aboard, <strong style={{ color: 'var(--text-primary)' }}>{agent?.full_name?.split(' ')[0]}</strong>! Your availability parameters have been submitted. 
                  Our management team is reviewing your profile metrics to generate your welcoming BSK access token.
                </p>
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--cyan-dim)', border: '1px solid rgba(6,182,212,0.15)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  💡 <strong>System Tip:</strong> Keep this connection window open. The moment the administrator signs your clearance credentials, this screen will instantly transition to your operational dashboard.
                </div>
              </div>

              {/* Status Timeline */}
              <div className="panel" style={{ padding: '24px' }}>
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
                            background: done && i < stepIndex ? 'var(--brand)' : 'var(--border)',
                            transition: 'background 0.5s',
                          }} />
                        )}
                        {/* Dot */}
                        <div style={{
                          width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
                          background: done ? (active ? 'var(--brand)' : 'rgba(59,130,246,0.15)') : 'var(--bg-elevated)',
                          border: `2.5px solid ${done ? 'var(--brand-light)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, zIndex: 1,
                          boxShadow: active ? '0 0 15px rgba(59,130,246,0.3)' : 'none',
                          transition: 'all 0.4s',
                          color: '#fff'
                        }}>
                          {done && i < stepIndex ? '✓' : active ? (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                          ) : ''}
                        </div>
                        {/* Text */}
                        <div style={{ paddingTop: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: done ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: 2 }}>{step.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
                          {active && step.key === 'under_review' && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--brand-light)', fontFamily: 'monospace' }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-light)', display: 'inline-block' }} className="glow-point" />
                              AWAITING MANUAL ACTIVATION SIGNATURE...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Real-time Terminal Log Console */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="panel" style={{ background: '#020407', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
                {/* Terminal Header */}
                <div style={{
                  padding: '10px 16px', background: '#0a0c14', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>BSK-TERMINAL://Intake-Stream-Log</span>
                  </div>
                  <div style={{ color: 'var(--cyan)' }}>CONNECTED</div>
                </div>

                {/* Terminal Lines Container */}
                <div style={{
                  height: 380, overflowY: 'auto', padding: '16px',
                  fontFamily: '"Fira Code", monospace', fontSize: 11, color: '#34d399',
                  background: '#030509', display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {terminalLogs.map((log, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, lineHeight: 1.45 }}>
                      <span style={{ color: '#4b5563', flexShrink: 0 }}>[{log.t}]</span>
                      <span style={{
                        color: log.l === 'success' ? '#10b981' : log.l === 'warning' ? '#fbbf24' : '#3b82f6',
                        flexShrink: 0, fontWeight: 700
                      }}>
                        [{log.l.toUpperCase()}]
                      </span>
                      <span style={{ color: log.l === 'warning' ? '#fde047' : '#e2e8f0' }}>{log.m}</span>
                    </div>
                  ))}
                  <div ref={terminalBottomRef} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right' }}>
                Active Heartbeat Listener (Interval: 15s) · Secure TLS v1.3 Connection
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
