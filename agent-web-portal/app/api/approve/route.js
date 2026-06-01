import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Get current authenticated session from cookies
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Call the database idempotent approval check (RPC)
    const { error: rpcErr } = await supabase.rpc('check_and_approve_agent', {
      agent_uuid: user.id,
    });

    if (rpcErr) {
      console.error('[APPROVE API RPC ERROR]:', rpcErr.message);
      // We continue anyway to fetch their current profile state
    }

    // 3. Fetch the agent's current database profile
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('*')
      .eq('id', user.id)
      .single();

    if (agentErr || !agent) {
      console.error('[APPROVE API AGENT FETCH ERROR]:', agentErr?.message);
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    // 4. Send approval onboarding email if approved and not sent yet
    const isApproved = agent.status === 'approved';
    const emailSent = agent.email_sent === true; // Safe check for undefined/null/false

    if (isApproved && !emailSent) {
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bluestar KitchenHub Onboarding <onboarding@resend.dev>';

      if (apiKey) {
        try {
          console.log(`[RESEND] Attempting to send welcome email to ${agent.email}...`);

          const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations! You are now a Bluestar Agent</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #0891b2); padding: 40px 40px 30px 40px; text-align: center;">
              <span style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #93c5fd; display: block; margin-bottom: 8px;">Bluestar KitchenHub</span>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">Welcome to the Team!</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px; background-color: #1e293b;">
              <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Dear <strong>${agent.full_name || 'Agent'}</strong>,
              </p>
              
              <p style="margin-top: 0; margin-bottom: 28px; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                We are thrilled to inform you that your application has been approved! You are now officially a Professional Agent at Bluestar KitchenHub.
              </p>
              
              <!-- Login ID Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; display: block; margin-bottom: 8px;">Your Unique Login ID</span>
                    <span style="font-size: 32px; font-weight: 800; color: #38bdf8; font-family: monospace; letter-spacing: 2px; display: block;">${agent.login_id || 'PENDING'}</span>
                    <span style="font-size: 12px; color: #64748b; display: block; margin-top: 8px;">Keep this key secure. You will need it to log in to the Desktop App.</span>
                  </td>
                </tr>
              </table>
              
              <!-- Onboarding Steps -->
              <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.3px;">Getting Started in 3 Steps</h2>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                <!-- Step 1 -->
                <tr>
                  <td valign="top" style="padding-bottom: 20px; width: 32px;">
                    <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; font-size: 14px; font-weight: 700; line-height: 24px;">1</div>
                  </td>
                  <td style="padding-left: 12px; padding-bottom: 20px;">
                    <strong style="color: #ffffff; font-size: 15px; display: block; margin-bottom: 4px;">Go to Your Dashboard</strong>
                    <span style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Log in to the web portal to access support, review the training module, and monitor your onboarding progress.</span>
                  </td>
                </tr>
                <!-- Step 2 -->
                <tr>
                  <td valign="top" style="padding-bottom: 20px; width: 32px;">
                    <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; font-size: 14px; font-weight: 700; line-height: 24px;">2</div>
                  </td>
                  <td style="padding-left: 12px; padding-bottom: 20px;">
                    <strong style="color: #ffffff; font-size: 15px; display: block; margin-bottom: 4px;">Download the Desktop App using Firefox</strong>
                    <span style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Open Mozilla Firefox, visit your web dashboard, and download the secure Electron-based KitchenHub Agent Setup.</span>
                  </td>
                </tr>
                <!-- Step 3 -->
                <tr>
                  <td valign="top" style="width: 32px;">
                    <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; font-size: 14px; font-weight: 700; line-height: 24px;">3</div>
                  </td>
                  <td style="padding-left: 12px;">
                    <strong style="color: #ffffff; font-size: 15px; display: block; margin-bottom: 4px;">Install & Start Work</strong>
                    <span style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Run the installer, log in with your unique Login ID above, and start handling customer feedback and review moderation!</span>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <hr style="border: 0; border-top: 1px solid #334155; margin-bottom: 30px; margin-top: 0;">
              
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #94a3b8; text-align: center;">
                If you have any questions, feel free to contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #0f172a; text-align: center; border-top: 1px solid #1e293b;">
              <span style="font-size: 12px; color: #64748b;">&copy; 2026 Bluestar KitchenHub. All rights reserved.</span>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          // OPTION B: Call Resend via standard HTTP fetch REST API (Zero NPM Dependencies)
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [agent.email],
              subject: 'Congratulations! You are now a Bluestar Professional Agent',
              html: emailHtml,
            }),
          });

          if (resendResponse.ok) {
            console.log(`[RESEND] Email successfully dispatched to ${agent.email}.`);
            
            // Mark email_sent = true in agents database (wrapped in safety try/catch)
            try {
              const { error: updateErr } = await supabase
                .from('agents')
                .update({ email_sent: true })
                .eq('id', user.id);

              if (updateErr) {
                console.error('[APPROVE API] Failed to update agents.email_sent:', updateErr.message);
              } else {
                console.log(`[APPROVE API] Updated agents.email_sent status to true for agent ${user.id}.`);
                // Reflect in return object
                agent.email_sent = true;
              }
            } catch (err) {
              console.error('[APPROVE API] DB Update exception:', err.message);
            }
          } else {
            const errBody = await resendResponse.text();
            console.error(`[RESEND API ERROR] Failed to send email via Resend:`, resendResponse.status, errBody);
          }
        } catch (emailErr) {
          console.error('[APPROVE API] Email dispatch exception:', emailErr.message);
        }
      } else {
        console.warn(
          '[RESEND WARNING] RESEND_API_KEY environment variable is not defined. Email delivery will be skipped until the API key is provided.'
        );
      }
    }

    return NextResponse.json({ success: true, agent });
  } catch (err) {
    console.error('[APPROVE API EXCEPTION]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
