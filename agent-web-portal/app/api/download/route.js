import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Firefox user-agent check on the server as a secondary validation
function isFirefoxUA(ua) {
  return ua.toLowerCase().includes('firefox');
}

export async function POST(request) {
  const userAgent = request.headers.get('user-agent') || '';

  if (!isFirefoxUA(userAgent)) {
    return NextResponse.json({ error: 'Firefox required' }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Log the download event
      await supabase.from('downloads').insert({
        agent_id: user.id,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        browser: userAgent.substring(0, 200),
      });
    }

    // Try to get a signed URL from Supabase Storage first
    // Falls back to the Dropbox URL if the storage bucket isn't set up
    const { data: signedData } = await supabase.storage
      .from('downloads')
      .createSignedUrl('KitchenHubAgentSetup.exe', 60 * 5); // 5 min expiry

    const downloadUrl = signedData?.signedUrl
      || 'https://www.dropbox.com/scl/fi/u2w64qsxnzm933e4946n7/KitchenHubAgentSetup.exe?rlkey=bxtp6nrwy692t88yyia8zcz0m&st=6qmol1wv&dl=1';

    return NextResponse.json({ url: downloadUrl });
  } catch (err) {
    console.error('[DOWNLOAD API]', err.message);
    return NextResponse.json(
      { url: 'https://www.dropbox.com/scl/fi/u2w64qsxnzm933e4946n7/KitchenHubAgentSetup.exe?rlkey=bxtp6nrwy692t88yyia8zcz0m&st=6qmol1wv&dl=1' }
    );
  }
}
