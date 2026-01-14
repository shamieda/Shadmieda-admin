"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { requestForToken, onMessageListener } from '@/lib/firebase';

/**
 * PushNotificationManager - AUTOMATIC VERSION
 * 
 * Logic:
 * 1. On mount, check if user is logged in.
 * 2. If browser already has notification permission, silently register/update token.
 * 3. If no permission, wait 2 seconds (UX) and then trigger the browser's permission prompt.
 * 4. Ensure token is only linked to the current user (Nuclear Cleanup logic in saveTokenToDb).
 */
export default function PushNotificationManager() {
    const [hasAttempted, setHasAttempted] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        console.log('[FCM Auto] Initializing...');

        const runAutoSubscription = async () => {
            if (hasAttempted) return;
            setHasAttempted(true);

            try {
                // 1. Check if user is logged in
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    console.log('[FCM Auto] No user session, skipping.');
                    return;
                }

                // 2. Setup Listener (for foreground messages)
                setupListener();

                // 3. Check Current Permission State
                const permission = Notification.permission;
                console.log('[FCM Auto] Current browser permission:', permission);

                if (permission === 'granted') {
                    // SILENT UPDATE: Already allowed, just refresh the token in DB
                    console.log('[FCM Auto] Permission granted. Refreshing token silently...');
                    await subscribeToPush(true);
                } else if (permission === 'default') {
                    // AUTO PROMPT: Wait a bit after load so it's not too jarring
                    console.log('[FCM Auto] Permission default. Prompting user in 2s...');
                    setTimeout(async () => {
                        await subscribeToPush(false);
                    }, 2000);
                } else {
                    console.log('[FCM Auto] Permission is BLOCKED by user.');
                }

                // 4. Register Service Worker (always needed for push)
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/firebase-messaging-sw.js?v=1.6')
                        .catch(err => console.error('[FCM Auto] SW Registration failed:', err));
                }

            } catch (err) {
                console.error('[FCM Auto] Error during initialization:', err);
            }
        };

        runAutoSubscription();
    }, [hasAttempted]);

    const setupListener = async () => {
        try {
            await onMessageListener((payload) => {
                console.log("[FCM Auto] Foreground message received!", payload);
                if (payload.notification || payload.data) {
                    const title = payload.notification?.title || payload.data?.title || "Notifikasi";
                    const body = payload.notification?.body || payload.data?.body || "";
                    // Use a standard alert as a fallback for foreground
                    alert(`NOTIFIKASI:\n\n${title}\n${body}`);
                }
            });
        } catch (err: any) {
            console.error('[FCM Auto] Listener Error:', err);
        }
    };

    const subscribeToPush = async (isSilent: boolean) => {
        if (!isSilent) console.log("[FCM Auto] Requesting token...");
        try {
            const token = await requestForToken();
            if (token) {
                await saveTokenToDb(token);
                if (!isSilent) console.log("[FCM Auto] Successfully registered device.");
            }
        } catch (error: any) {
            if (!isSilent) console.warn('[FCM Auto] Subscription failed (might be blocked):', error.message);
        }
    };

    const saveTokenToDb = async (token: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get actual user profile ID (which might be different from auth.user.id)
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        const userId = profile?.id ?? user.id;

        // NUCLEAR CLEANUP: Prevent token hijacking/duplication
        // If this token exists for ANY ANY OTHER USER, delete it.
        await supabase
            .from('fcm_tokens')
            .delete()
            .eq('token', token)
            .neq('user_id', userId);

        // UPSERT: Add/Update token for current user
        const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
                user_id: userId,
                token: token,
                device_type: 'web'
            }, { onConflict: 'user_id, token' });

        if (error) {
            console.error('[FCM Auto] DB Sync Error:', error.message);
        } else {
            console.log("[FCM Auto] Token synced to DB successfully.");
        }
    };

    // UI is now invisible/automatic
    return null;
}
