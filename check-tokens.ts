
import { supabaseAdmin } from "./lib/supabase-admin";

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
