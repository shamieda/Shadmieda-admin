import { supabase } from "./supabase";
import { createClient } from "./supabase-server";

export const SESSION_COOKIE_NAME = 'shamieda_sid';

/**
 * Saves a refresh token to the database and returns a unique session ID.
 * This should be called after a successful login.
 */
export async function savePersistentSession(userId: string, refreshToken: string) {
    const supabaseServer = await createClient();

    // 1. Invalidate any old sessions for this user on this device if needed 
    // (For now, we just add a new one, but we could limit sessions per user)

    const { data, error } = await supabaseServer
        .from('user_sessions')
        .insert({
            user_id: userId,
            refresh_token: refreshToken,
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'
        })
        .select('session_id')
        .single();

    if (error) {
        console.error("Failed to save persistent session:", error);
        return null;
    }

    return data.session_id;
}

/**
 * Recovers a Supabase session using a session ID from our database.
 */
export async function recoverSessionFromDb(sessionId: string) {
    const supabaseServer = await createClient();

    // 1. Fetch the refresh token from our table
    const { data, error } = await supabaseServer
        .from('user_sessions')
        .select('refresh_token, user_id')
        .eq('session_id', sessionId)
        .single();

    if (error || !data) {
        return null;
    }

    // 2. Refresh the session in Supabase
    const { data: authData, error: authError } = await supabaseServer.auth.refreshSession({
        refresh_token: data.refresh_token
    });

    if (authError || !authData.session) {
        // Token might be revoked or expired, clear it
        await supabaseServer.from('user_sessions').delete().eq('session_id', sessionId);
        return null;
    }

    // 3. Update the refresh token in our DB (Supabase rotates them)
    await supabaseServer
        .from('user_sessions')
        .update({
            refresh_token: authData.session.refresh_token,
            last_used_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

    return authData.session;
}

/**
 * Clears a persistent session from the database.
 */
export async function clearPersistentSession(sessionId: string) {
    const supabaseServer = await createClient();
    await supabaseServer.from('user_sessions').delete().eq('session_id', sessionId);
}

/**
 * Recovers a Supabase session using a session ID, designed for use in Middleware
 * where next/headers (cookies()) are not available.
 */
export async function recoverSessionForMiddleware(supabaseClient: any, sessionId: string) {
    // 1. Fetch the refresh token from our table
    const { data, error } = await supabaseClient
        .from('user_sessions')
        .select('refresh_token, user_id')
        .eq('session_id', sessionId)
        .single();

    if (error || !data) {
        return null;
    }

    // 2. Refresh the session in Supabase
    const { data: authData, error: authError } = await supabaseClient.auth.setSession({
        refresh_token: data.refresh_token,
        access_token: '', // Let Supabase handle access token generation from refresh token
    });

    if (authError || !authData.session) {
        // Token might be revoked or expired, clear it
        await supabaseClient.from('user_sessions').delete().eq('session_id', sessionId);
        return null;
    }

    // 3. Update the refresh token in our DB (Supabase rotates them)
    await supabaseClient
        .from('user_sessions')
        .update({
            refresh_token: authData.session.refresh_token,
            last_used_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

    return authData.session;
}
