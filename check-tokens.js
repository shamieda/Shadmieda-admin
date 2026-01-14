
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokens() {
    const { data, error } = await supabaseAdmin
        .from('fcm_tokens')
        .select('*, users(email)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching tokens:", error);
        return;
    }

    console.log("RECENT FCM TOKENS:");
    data.forEach(t => {
        console.log(`User: ${t.users?.email} | Token: ${t.token.substring(0, 15)}... | Created: ${t.created_at}`);
    });
}

checkTokens();
