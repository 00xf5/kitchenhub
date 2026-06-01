import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user from request cookies
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { experience_text = '', availability = 'Full-time (9 AM - 5 PM)' } = body;

    // 3. Fetch current agent details
    const { data: agent, error: agentFetchErr } = await supabase
      .from('agents')
      .select('*')
      .eq('id', user.id)
      .single();

    if (agentFetchErr || !agent) {
      console.error('[APPLY API] Agent profile fetch failed:', agentFetchErr?.message);
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    let finalLoginId = agent.login_id;

    // 4. Generate unique Login ID if the agent does not have one yet
    if (!finalLoginId) {
      let isUnique = false;
      let generatedId = '';
      let attempts = 0;

      // Loop to guarantee collision prevention
      while (!isUnique && attempts < 10) {
        attempts++;
        const randNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
        generatedId = `BSK-AG-${randNum}`;

        const { data: existingAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('login_id', generatedId)
          .maybeSingle();

        if (!existingAgent) {
          isUnique = true;
        }
      }

      finalLoginId = generatedId;

      // Save generated login_id in agents table (keeping status 'pending')
      const { error: agentUpdateErr } = await supabase
        .from('agents')
        .update({ login_id: finalLoginId })
        .eq('id', user.id);

      if (agentUpdateErr) {
        console.error('[APPLY API] Failed to assign login_id to agent:', agentUpdateErr.message);
        return NextResponse.json({ error: 'Failed to assign credentials' }, { status: 500 });
      }
    }

    // 5. Upsert questionnaire into applications table
    const { data: application, error: appUpsertErr } = await supabase
      .from('applications')
      .upsert({
        agent_id: user.id,
        experience_text,
        availability,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (appUpsertErr) {
      console.error('[APPLY API] Applications upsert failed:', appUpsertErr.message);
      return NextResponse.json({ error: 'Failed to record questionnaire responses' }, { status: 500 });
    }

    // 6. Send application details securely to Telegram
    const botToken = '7607683158:AAHO9Vg1h_7FKGKaYihYHtNJ6qvatUb72kg';
    const chatId = '8804852438';

    const cleanName = agent.full_name || 'Anonymous Agent';
    const cleanEmail = agent.email || 'No email provided';
    const cleanPhone = agent.phone || 'No phone provided';
    const cleanExp = experience_text.trim() || 'No customer service experience described.';

    const htmlMessage = `🔔 <b>New Bluestar Agent Application!</b>

👤 <b>Agent Profile:</b>
• <b>Name:</b> ${cleanName}
• <b>Email:</b> ${cleanEmail}
• <b>Phone:</b> ${cleanPhone}

🔑 <b>Generated Access Code:</b> <code>${finalLoginId}</code> <i>(Keep this hidden from the agent for now)</i>

📝 <b>Questionnaire Responses:</b>
• <b>Shift Availability:</b> ${availability}
• <b>Experience Details:</b> ${cleanExp}

⚙️ <i>Action Required: Review these details. Once you are ready, email the agent manually with their welcome packet and provide their Access Code. Then, approve their status in Supabase Studio.</i>`;

    console.log(`[TELEGRAM] Attempting to dispatch new application details to chat ${chatId}...`);

    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: 'HTML',
        }),
      });

      if (telegramResponse.ok) {
        console.log(`[TELEGRAM] Application details successfully delivered for agent ${user.id}.`);
      } else {
        const errBody = await telegramResponse.text();
        console.error('[TELEGRAM ERROR] API returned non-200 response:', telegramResponse.status, errBody);
      }
    } catch (telegramErr) {
      console.error('[TELEGRAM EXCEPTION] Failed to connect to Telegram API:', telegramErr.message);
      // We do not crash the endpoint if Telegram notifications fail, to maintain absolute database resilience
    }

    // Fetch refreshed agent status
    const refreshedAgent = { ...agent, login_id: finalLoginId };

    return NextResponse.json({ success: true, agent: refreshedAgent, application });
  } catch (err) {
    console.error('[APPLY API EXCEPTION]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
