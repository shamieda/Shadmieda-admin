import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Lazy initialization
let app: FirebaseApp | undefined;

const getFirebaseApp = () => {
    if (typeof window === 'undefined') return undefined; // Don't init on server if not needed
    if (!app) {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    return app;
};

let messagingInstance: any = null;

export const messaging = async () => {
    if (typeof window === 'undefined') return null;
    if (messagingInstance) return messagingInstance;

    const currentApp = getFirebaseApp();
    if (!currentApp) return null;

    console.log("[FCM] Checking if messaging is supported...");
    try {
        const { isSupported, getMessaging } = await import("firebase/messaging");
        const supported = await isSupported();
        console.log("[FCM] Messaging supported:", supported);
        if (supported) {
            messagingInstance = getMessaging(currentApp);
            console.log("[FCM] Messaging instance created.");
            return messagingInstance;
        }
    } catch (e) {
        console.error("[FCM] Failed to load firebase/messaging", e);
    }
    return null;
};

export const requestForToken = async () => {
    if (typeof window === 'undefined') return null;
    try {
        console.log("[FCM] requestForToken started...");
        const msg = await messaging();
        if (!msg) {
            throw new Error("Messaging not supported or failed to initialize.");
        }

        // Explicitly request permission
        console.log("[FCM] Requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("[FCM] Permission status:", permission);
        if (permission !== 'granted') {
            throw new Error(`Permission not granted (${permission}). Sila "Allow" notifikasi di browser setting.`);
        }

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            throw new Error("Missing VAPID Key in environment.");
        }
        console.log("[FCM] Using VAPID Key (first 10 chars):", vapidKey.substring(0, 10));

        // Ensure Service Worker is registered and ACTIVE
        console.log("[FCM] Checking Service Worker registration...");
        let registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
            console.log("[FCM] No registration found, registering new one...");
            // Use same versioning as PushNotificationManager to prevent duplicates
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js?v=1.6');
        }

        // Wait for Service Worker to be active
        console.log("[FCM] Waiting for Service Worker to be active...");
        let retryCount = 0;
        while (!registration.active && retryCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 200));
            registration = await navigator.serviceWorker.getRegistration() || registration;
            retryCount++;
        }

        if (!registration.active) {
            throw new Error("Service Worker failed to activate. Sila refresh page.");
        }

        console.log("[FCM] SW Registration status:", !!registration, "Active:", !!registration.active);

        const { getToken } = await import("firebase/messaging");

        try {
            const currentToken = await getToken(msg, {
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration
            });

            if (currentToken) {
                console.log('FCM Token:', currentToken);
                return currentToken;
            } else {
                console.log('No registration token available.');
                throw new Error("No token returned from Firebase.");
            }
        } catch (getTokenError: any) {
            console.error("getToken specific error:", getTokenError);
            throw new Error(`GetToken Failed: ${getTokenError.message || getTokenError}`);
        }

    } catch (err: any) {
        console.error('An error occurred while retrieving token: ', err);
        throw err; // Re-throw to be caught by caller
    }
};

export const onMessageListener = async (callback: (payload: any) => void) => {
    if (typeof window === 'undefined') return;
    try {
        console.log("[FCM] onMessageListener: Getting messaging instance...");
        const msg = await messaging();
        if (!msg) {
            console.error("[FCM] onMessageListener: Messaging not supported.");
            return;
        }

        console.log("[FCM] onMessageListener: Attaching onMessage handler...");
        const { onMessage } = await import("firebase/messaging");
        onMessage(msg, (payload) => {
            console.log("[FCM] onMessageListener: Message received!", payload);
            try {
                callback(payload);
            } catch (cbError) {
                console.error("[FCM] Error in onMessage callback:", cbError);
            }
        });
        console.log("[FCM] onMessageListener: Handler attached successfully.");
    } catch (error) {
        console.error("[FCM] onMessageListener: Error setting up listener:", error);
    }
};
