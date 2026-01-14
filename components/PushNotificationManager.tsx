"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { requestForToken, onMessageListener, messaging } from '@/lib/firebase';

export default function PushNotificationManager() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    const [debugInfo, setDebugInfo] = useState<string>("v1.2 Initializing...");

    useEffect(() => {
        console.log('[FCM v1.2] useEffect mounting...');
        initFCM();
    }, []);

    useEffect(() => {
        const logChannel = new BroadcastChannel('sw-logs');
        logChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'LOG') {
                const logMsg = event.data.message;
                const logData = event.data.data;
                setDebugInfo(prev => prev + `\n[SW] ${logMsg} ${logData ? JSON.stringify(logData).substring(0, 50) : ''}`);
            }
        };
        return () => logChannel.close();
    }, []);

    const initFCM = async () => {
        // 0. Check Sender ID & VAPID
        const senderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        setDebugInfo(prev => prev + `\nSender ID: ${senderId?.substring(0, 5)}...`);
        setDebugInfo(prev => prev + `\nVAPID OK: ${!!vapidKey}`);
        console.log('[FCM v1.2] Sender ID:', senderId);
        console.log('[FCM v1.2] VAPID Key exists:', !!vapidKey);

        // 0.1 Check Controller
        if ('serviceWorker' in navigator) {
            let isControlled = !!navigator.serviceWorker.controller;
            setDebugInfo(prev => prev + `\nController: ${isControlled}`);
            console.log('[FCM v1.2] SW Controller:', isControlled);

            if (!isControlled) {
                console.warn('[FCM v1.2] Page is not controlled. Waiting for ready...');
                const registration = await navigator.serviceWorker.ready;
                console.log('[FCM v1.2] SW Ready, but still not controlled. This usually needs a refresh.');
            }
        }

        // 1. Check Permission
        if ('Notification' in window) {
            setDebugInfo(prev => prev + `\nPermission: ${Notification.permission}`);
        }

        // 2. Check Subscription
        await checkSubscription();

        // 3. Setup Listener
        setupListener();

        // 4. Register SW
        if ('serviceWorker' in navigator) {
            try {
                console.log('[FCM v1.2] Registering SW...');
                let registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js?v=1.6');
                console.log('[FCM v1.2] SW Registered:', registration.scope);

                // Wait for active
                let retry = 0;
                while (!registration.active && retry < 10) {
                    await new Promise(r => setTimeout(r, 500));
                    registration = await navigator.serviceWorker.getRegistration() || registration;
                    retry++;
                }

                const isActive = !!registration.active;
                console.log('[FCM v1.2] SW Active:', isActive);
                setDebugInfo(prev => prev + `\nSW Active: ${isActive}`);
            } catch (err: any) {
                console.error('[FCM v1.2] SW Error:', err);
                setDebugInfo(prev => prev + `\nSW Error: ${err.message}`);
            }
        }
    };

    const setupListener = async () => {
        console.log('[FCM v1.2] Setting up onMessage listener...');
        setDebugInfo(prev => prev + `\nSetting up listener...`);
        try {
            await onMessageListener((payload) => {
                console.log("[FCM v1.2] Message received!", payload);
                setDebugInfo(prev => prev + `\n[${new Date().toLocaleTimeString()}] MSG RECEIVED!`);
                if (payload.notification || payload.data) {
                    const title = payload.notification?.title || payload.data?.title || "Notifikasi";
                    const body = payload.notification?.body || payload.data?.body || "";
                    alert(`NOTIFIKASI TERIMA:\n\n${title}\n${body}`);
                }
            });
            console.log('[FCM v1.2] Listener setup complete.');
            setDebugInfo(prev => prev + `\nListener OK`);
        } catch (err: any) {
            console.error('[FCM v1.2] Listener Error:', err);
            setDebugInfo(prev => prev + `\nListener Error: ${err.message}`);
        }
    };

    const checkSubscription = async () => {
        console.log("[FCM v1.2] Checking subscription...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', user.id)
                .single();

            const userId = profile?.id ?? user.id;

            const { data: tokens } = await supabase
                .from('fcm_tokens')
                .select('id, token')
                .eq('user_id', userId);

            console.log("[FCM v1.2] Tokens in DB:", tokens?.length || 0);
            setDebugInfo(prev => prev + `\nDB Tokens: ${tokens?.length || 0}`);
            if (tokens && tokens.length > 0) {
                setIsSubscribed(true);
                setDebugInfo(prev => prev + `\nToken: ${tokens[0].token.substring(0, 10)}...`);
            }
        } catch (err) {
            console.error("[FCM v1.2] checkSubscription error:", err);
        }
    };

    const testLocalNotification = () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Test Local", {
                body: "Ini adalah test notifikasi local (tanpa Firebase).",
                icon: "/logo.png"
            });
            alert("Local notification triggered! Jika tak nampak, bermakna OS tuan block.");
        } else {
            alert("Permission not granted or not supported.");
        }
    };

    const subscribeToPush = async () => {
        setLoading(true);
        console.log("[FCM] Starting subscription process...");
        setDebugInfo(prev => prev + `\nSubscribing...`);
        try {
            const token = await requestForToken();
            if (token) {
                console.log("[FCM] Token obtained:", token);
                setDebugInfo(prev => prev + `\nToken OK: ${token.substring(0, 10)}...`);
                await saveTokenToDb(token);
                setIsSubscribed(true);
                alert("Notifikasi diaktifkan! Sila cuba Test Push.");
            }
        } catch (error: any) {
            console.error('[FCM] Failed to subscribe:', error);
            setDebugInfo(prev => prev + `\nSub Error: ${error.message}`);
            alert("Gagal mengaktifkan notifikasi:\n" + error.message);
        } finally {
            setLoading(false);
        }
    };

    const saveTokenToDb = async (token: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .single();

        const userId = profile?.id ?? user.id;

        console.log("[FCM] Saving token to DB for user:", userId);
        const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
                user_id: userId,
                token: token,
                device_type: 'web'
            }, { onConflict: 'user_id, token' });

        if (error) {
            console.error('[FCM] Error saving token to DB:', error);
            setDebugInfo(prev => prev + `\nDB Save Error: ${error.message}`);
        } else {
            console.log("[FCM] Token saved successfully.");
            setDebugInfo(prev => prev + `\nDB Save OK`);
        }
    };

    const clearToken = async () => {
        setLoading(true);
        setDebugInfo(prev => prev + `\n[FCM] Clearing everything...`);
        try {
            // 1. Delete from Firebase SDK
            try {
                const msg = await messaging();
                if (msg) {
                    const { deleteToken } = await import("firebase/messaging");
                    await deleteToken(msg);
                    setDebugInfo(prev => prev + "\n[FCM] Firebase token deleted.");
                }
            } catch (e) {
                console.warn("Error deleting Firebase token:", e);
            }

            // 2. Delete from DB
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', user.id)
                    .single();

                const userId = profile?.id ?? user.id;
                await supabase.from('fcm_tokens').delete().eq('user_id', userId);
                setDebugInfo(prev => prev + "\n[DB] Tokens deleted.");
            }

            // 3. Unregister all SW
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                await reg.unregister();
            }

            setIsSubscribed(false);
            setDebugInfo(prev => prev + "\n[SW] Unregistered. SILA REFRESH SEKARANG.");
            alert("Semua data dibersihkan. Sila REFRESH (Cmd+Shift+R) sebelum aktifkan semula.");
        } catch (error: any) {
            console.error('[FCM] Error clearing token:', error);
            setDebugInfo(prev => prev + "\nError clearing: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 items-end">
            {debugInfo && (
                <div className="bg-black/80 text-[10px] text-green-400 p-2 rounded mb-2 max-w-[250px] whitespace-pre-wrap font-mono border border-green-500/30 shadow-2xl">
                    <div className="flex justify-between items-center mb-1 border-b border-green-500/30 pb-1">
                        <span>DEBUG FCM v1.2</span>
                        <button onClick={() => setDebugInfo("")} className="text-red-400 hover:text-red-300">X</button>
                    </div>
                    {debugInfo}

                    {debugInfo.includes("Controller: false") && (
                        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400">
                            <p className="mb-1 font-bold">⚠️ Connection Error!</p>
                            <p className="mb-2">Browser tak benarkan SW kawal page ni.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-red-500 text-white py-1 rounded text-[10px] font-bold hover:bg-red-600 transition-colors"
                            >
                                KLIK UNTUK FIX (REFRESH)
                            </button>
                        </div>
                    )}

                    <div className="mt-2 text-yellow-400 border-t border-yellow-500/30 pt-1">
                        ⚠️ Sila guna browser BIASA (bukan Incognito) untuk test yang lebih stabil.
                    </div>
                </div>
            )}

            {!isSubscribed ? (
                <button
                    onClick={subscribeToPush}
                    disabled={loading}
                    className="bg-primary text-black p-3 rounded-full shadow-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
                    title="Aktifkan Push Notification"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellOff className="w-5 h-5" />}
                    <span className="text-xs font-bold">Aktifkan Noti</span>
                </button>
            ) : (
                <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                        <button
                            onClick={testLocalNotification}
                            className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                            title="Test Local Notification"
                        >
                            <span className="text-xs font-bold">Local Test</span>
                        </button>
                        <button
                            onClick={async () => {
                                console.log("[FCM] Triggering Test Push...");
                                setDebugInfo(prev => prev + `\nSending Test Push...`);
                                const { sendTestNotificationAction } = await import("@/app/actions/notifications");
                                const result = await sendTestNotificationAction();
                                if (result.success) {
                                    console.log("[FCM] Test Push action success.");
                                    setDebugInfo(prev => prev + `\nTest Push Sent OK`);
                                    if ((result as any).debug) {
                                        const debug = (result as any).debug;
                                        setDebugInfo(prev => prev + `\n[Server] Tokens: ${debug.tokenCount}`);
                                        setDebugInfo(prev => prev + `\n[Server] First: ${debug.firstToken}`);
                                    }
                                    alert("Test Push dihantar! Jika tak muncul, sila semak Console (F12).");
                                } else {
                                    console.error("[FCM] Test Push action failed:", result.error);
                                    setDebugInfo(prev => prev + `\nTest Push Failed: ${result.error}`);
                                    alert("Gagal menghantar test push: " + result.error);
                                }
                            }}
                            className="bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-all flex items-center gap-2"
                            title="Test Push Notification"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="text-xs font-bold">Test Push</span>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setIsSubscribed(false);
                                subscribeToPush();
                            }}
                            className="bg-gray-500 text-white p-2 px-3 rounded-full shadow-lg hover:bg-gray-600 transition-all flex items-center justify-center"
                            title="Refresh Token"
                        >
                            <Loader2 className="w-3 h-3" />
                            <span className="text-[10px] ml-1">Refresh</span>
                        </button>
                        <button
                            onClick={async () => {
                                console.log("[FCM v1.2] Triggering SW Test...");
                                const registration = await navigator.serviceWorker.getRegistration();
                                if (registration && registration.active) {
                                    registration.active.postMessage({ type: 'TEST_NOTIFICATION' });
                                    alert("Mesej dihantar ke Service Worker. Sila semak Console SW jika tak muncul.");
                                } else {
                                    alert("Service Worker tidak aktif.");
                                }
                            }}
                            className="bg-orange-500 text-white p-2 px-3 rounded-full shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center"
                            title="Test Service Worker"
                        >
                            <span className="text-[10px]">Test SW</span>
                        </button>
                        <button
                            onClick={initFCM}
                            className="bg-purple-500 text-white p-2 px-3 rounded-full shadow-lg hover:bg-purple-600 transition-all flex items-center justify-center"
                            title="Force Debug"
                        >
                            <span className="text-[10px]">Force Debug</span>
                        </button>
                        <button
                            onClick={clearToken}
                            className="bg-red-500/20 text-red-400 border border-red-500/30 p-2 px-3 rounded-full shadow-lg hover:bg-red-500/30 transition-all flex items-center justify-center"
                            title="Clear All"
                        >
                            <span className="text-[10px]">Clear All</span>
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Deep Reset akan buang SEMUA Service Worker & Cache. Teruskan?")) {
                                    clearToken();
                                    window.location.reload();
                                }
                            }}
                            className="bg-purple-600/20 text-purple-400 border border-purple-500/30 p-2 px-3 rounded-full shadow-lg hover:bg-purple-600/30 transition-all flex items-center justify-center"
                            title="Deep Reset"
                        >
                            <span className="text-[10px]">Deep Reset</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
